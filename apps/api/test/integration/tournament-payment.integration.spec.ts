import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TournamentService } from '../../src/modules/tournaments/tournament.service';
import { PaymentService } from '../../src/modules/payments/payment.service';
import { MockDataGenerator, TestPerformanceMonitor } from '../../src/test/setup';

describe('Tournament Payment Integration (e2e)', () => {
  let app: INestApplication;
  let tournamentService: TournamentService;
  let paymentService: PaymentService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    tournamentService = app.get<TournamentService>(TournamentService);
    paymentService = app.get<PaymentService>(PaymentService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Tournament Registration with Payment', () => {
    it('should complete full tournament registration flow with payment', async () => {
      // Step 1: Create tournament
      const tournament = await request(app.getHttpServer())
        .post('/tournaments')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Holiday Classic 2024',
          format: 'SINGLE_ELIMINATION',
          maxTeams: 16,
          entryFee: 250,
          startDate: '2024-12-20',
          endDate: '2024-12-22',
        })
        .expect(201);

      expect(tournament.body.id).toBeDefined();

      // Step 2: Register team
      const registration = await request(app.getHttpServer())
        .post(`/tournaments/${tournament.body.id}/register`)
        .set('Authorization', 'Bearer test-token')
        .send({
          teamId: 'team-123',
          teamName: 'Phoenix Warriors',
          divisionId: 'division-1',
          roster: Array.from({ length: 10 }, (_, i) => ({
            playerId: `player-${i}`,
            playerName: `Player ${i}`,
            jerseyNumber: i + 1,
          })),
        })
        .expect(201);

      expect(registration.body.registrationId).toBeDefined();
      expect(registration.body.paymentRequired).toBe(true);
      expect(registration.body.amount).toBe(250);

      // Step 3: Create payment intent
      const paymentIntent = await request(app.getHttpServer())
        .post('/payments/create-intent')
        .set('Authorization', 'Bearer test-token')
        .send({
          amount: 250,
          currency: 'usd',
          metadata: {
            tournamentId: tournament.body.id,
            registrationId: registration.body.registrationId,
            teamId: 'team-123',
          },
        })
        .expect(201);

      expect(paymentIntent.body.clientSecret).toBeDefined();
      expect(paymentIntent.body.paymentIntentId).toBeDefined();

      // Step 4: Confirm payment (simulate Stripe webhook)
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntent.body.paymentIntentId,
            amount: 25000, // Amount in cents
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              tournamentId: tournament.body.id,
              registrationId: registration.body.registrationId,
              teamId: 'team-123',
            },
          },
        },
      };

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('stripe-signature', 'test-signature')
        .send(webhookPayload)
        .expect(200);

      // Step 5: Verify registration is confirmed
      const updatedRegistration = await request(app.getHttpServer())
        .get(`/tournaments/${tournament.body.id}/registrations/${registration.body.registrationId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(updatedRegistration.body.status).toBe('CONFIRMED');
      expect(updatedRegistration.body.paymentStatus).toBe('PAID');
      expect(updatedRegistration.body.paymentId).toBe(paymentIntent.body.paymentIntentId);
    });

    it('should handle payment failure and allow retry', async () => {
      const tournament = await tournamentService.create({
        name: 'Test Tournament',
        format: 'SINGLE_ELIMINATION',
        maxTeams: 8,
        entryFee: 150,
        startDate: new Date('2024-12-20'),
        endDate: new Date('2024-12-21'),
      }, 'user-1', 'org-1');

      const registration = await tournamentService.registerTeam(
        tournament.id,
        {
          teamId: 'team-456',
          teamName: 'Test Team',
          divisionId: 'division-1',
        },
        'user-1',
        'org-1'
      );

      // Simulate failed payment
      const failedPayment = await paymentService.createPaymentIntent({
        amount: 150,
        currency: 'usd',
        metadata: {
          tournamentId: tournament.id,
          registrationId: registration.id,
        },
      });

      // Process failed webhook
      await paymentService.processWebhook({
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: failedPayment.id,
            status: 'failed',
            last_payment_error: {
              message: 'Card declined',
            },
          },
        },
      });

      // Verify registration is still pending
      const pendingRegistration = await tournamentService.getRegistration(
        tournament.id,
        registration.id,
        'org-1'
      );
      expect(pendingRegistration.status).toBe('PENDING_PAYMENT');

      // Retry payment with new card
      const retryPayment = await paymentService.retryPayment(
        failedPayment.id,
        { paymentMethodId: 'pm_card_visa' }
      );

      expect(retryPayment.status).toBe('processing');
    });

    it('should handle refunds for cancelled tournaments', async () => {
      // Create and pay for tournament registration
      const tournament = await tournamentService.create({
        name: 'Cancelled Tournament',
        format: 'ROUND_ROBIN',
        maxTeams: 12,
        entryFee: 200,
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-26'),
      }, 'admin-1', 'org-1');

      const teams = Array.from({ length: 8 }, (_, i) => ({
        teamId: `team-${i}`,
        teamName: `Team ${i}`,
        paymentId: `pi_test_${i}`,
        amount: 200,
      }));

      // Register and pay for all teams
      for (const team of teams) {
        const registration = await tournamentService.registerTeam(
          tournament.id,
          team,
          'user-1',
          'org-1'
        );

        await paymentService.confirmPayment(team.paymentId, {
          tournamentId: tournament.id,
          registrationId: registration.id,
        });
      }

      // Cancel tournament
      await tournamentService.cancelTournament(tournament.id, 'admin-1', 'org-1', {
        reason: 'Weather emergency',
        refundPolicy: 'FULL_REFUND',
      });

      // Verify all refunds processed
      const refunds = await paymentService.getRefundsByTournament(tournament.id);
      expect(refunds).toHaveLength(8);
      expect(refunds.every(r => r.status === 'succeeded')).toBe(true);
      expect(refunds.reduce((sum, r) => sum + r.amount, 0)).toBe(1600);
    });
  });

  describe('Multi-Tournament Package Payments', () => {
    it('should handle package deal for multiple tournaments', async () => {
      const tournaments = await Promise.all([
        tournamentService.create({
          name: 'Spring League',
          entryFee: 300,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-05-31'),
        }, 'admin-1', 'org-1'),
        tournamentService.create({
          name: 'Summer League',
          entryFee: 300,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-08-31'),
        }, 'admin-1', 'org-1'),
        tournamentService.create({
          name: 'Fall League',
          entryFee: 300,
          startDate: new Date('2024-09-01'),
          endDate: new Date('2024-11-30'),
        }, 'admin-1', 'org-1'),
      ]);

      // Create package deal
      const packageDeal = await paymentService.createPackage({
        name: 'Season Pass',
        tournaments: tournaments.map(t => t.id),
        originalPrice: 900,
        discountedPrice: 750,
        discountPercentage: 16.67,
      });

      // Purchase package for team
      const packagePayment = await paymentService.purchasePackage({
        packageId: packageDeal.id,
        teamId: 'team-789',
        paymentMethodId: 'pm_card_visa',
      });

      expect(packagePayment.amount).toBe(750);
      expect(packagePayment.metadata.packageId).toBe(packageDeal.id);

      // Verify team is registered for all tournaments
      for (const tournament of tournaments) {
        const registration = await tournamentService.getTeamRegistration(
          tournament.id,
          'team-789',
          'org-1'
        );
        expect(registration).toBeDefined();
        expect(registration.status).toBe('CONFIRMED');
        expect(registration.paymentType).toBe('PACKAGE');
      }
    });
  });

  describe('Payment Installments', () => {
    it('should handle installment payments for tournament', async () => {
      const tournament = await tournamentService.create({
        name: 'Premium Tournament',
        entryFee: 500,
        allowInstallments: true,
        installmentSchedule: {
          numberOfPayments: 3,
          initialPayment: 200,
          subsequentPayments: 150,
        },
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-03'),
      }, 'admin-1', 'org-1');

      // Register with installment plan
      const registration = await tournamentService.registerTeam(
        tournament.id,
        {
          teamId: 'team-installment',
          teamName: 'Installment Team',
          paymentPlan: 'INSTALLMENT',
        },
        'user-1',
        'org-1'
      );

      // Process first installment
      const firstPayment = await paymentService.processInstallment({
        registrationId: registration.id,
        installmentNumber: 1,
        amount: 200,
      });

      expect(firstPayment.status).toBe('succeeded');
      expect(registration.paymentStatus).toBe('PARTIAL');

      // Process remaining installments
      for (let i = 2; i <= 3; i++) {
        const payment = await paymentService.processInstallment({
          registrationId: registration.id,
          installmentNumber: i,
          amount: 150,
        });
        expect(payment.status).toBe('succeeded');
      }

      // Verify full payment
      const finalRegistration = await tournamentService.getRegistration(
        tournament.id,
        registration.id,
        'org-1'
      );
      expect(finalRegistration.paymentStatus).toBe('PAID');
      expect(finalRegistration.totalPaid).toBe(500);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high volume of concurrent registrations', async () => {
      const tournament = await tournamentService.create({
        name: 'High Volume Tournament',
        maxTeams: 64,
        entryFee: 100,
        startDate: new Date('2024-12-15'),
        endDate: new Date('2024-12-17'),
      }, 'admin-1', 'org-1');

      const registrationPromises = Array.from({ length: 50 }, (_, i) => 
        tournamentService.registerTeam(
          tournament.id,
          {
            teamId: `team-concurrent-${i}`,
            teamName: `Concurrent Team ${i}`,
          },
          `user-${i}`,
          'org-1'
        )
      );

      const { result: registrations, duration } = await TestPerformanceMonitor.measureAsync(
        () => Promise.all(registrationPromises)
      );

      expect(duration).toMatchPerformanceThreshold(10000); // 10 seconds for 50 concurrent
      expect(registrations).toHaveLength(50);
      expect(registrations.every(r => r.id)).toBe(true);

      // Process payments concurrently
      const paymentPromises = registrations.map(reg =>
        paymentService.createPaymentIntent({
          amount: 100,
          metadata: {
            tournamentId: tournament.id,
            registrationId: reg.id,
          },
        })
      );

      const { result: payments, duration: paymentDuration } = await TestPerformanceMonitor.measureAsync(
        () => Promise.all(paymentPromises)
      );

      expect(paymentDuration).toMatchPerformanceThreshold(15000);
      expect(payments).toHaveLength(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tournament at capacity', async () => {
      const tournament = await tournamentService.create({
        name: 'Small Tournament',
        maxTeams: 4,
        entryFee: 50,
        startDate: new Date('2024-12-10'),
        endDate: new Date('2024-12-10'),
      }, 'admin-1', 'org-1');

      // Fill tournament
      for (let i = 0; i < 4; i++) {
        await tournamentService.registerTeam(
          tournament.id,
          { teamId: `team-${i}`, teamName: `Team ${i}` },
          'user-1',
          'org-1'
        );
      }

      // Try to register when full
      await expect(
        tournamentService.registerTeam(
          tournament.id,
          { teamId: 'team-overflow', teamName: 'Overflow Team' },
          'user-1',
          'org-1'
        )
      ).rejects.toThrow('Tournament is at capacity');
    });

    it('should handle payment after registration deadline', async () => {
      const tournament = await tournamentService.create({
        name: 'Deadline Tournament',
        registrationDeadline: new Date(Date.now() - 86400000), // Yesterday
        entryFee: 100,
        startDate: new Date('2024-12-20'),
        endDate: new Date('2024-12-21'),
      }, 'admin-1', 'org-1');

      await expect(
        tournamentService.registerTeam(
          tournament.id,
          { teamId: 'late-team', teamName: 'Late Team' },
          'user-1',
          'org-1'
        )
      ).rejects.toThrow('Registration deadline has passed');
    });

    it('should handle duplicate payment attempts', async () => {
      const tournament = await tournamentService.create({
        name: 'Duplicate Payment Test',
        entryFee: 75,
        startDate: new Date('2024-12-18'),
        endDate: new Date('2024-12-18'),
      }, 'admin-1', 'org-1');

      const registration = await tournamentService.registerTeam(
        tournament.id,
        { teamId: 'dup-team', teamName: 'Duplicate Team' },
        'user-1',
        'org-1'
      );

      // First payment
      const payment1 = await paymentService.createPaymentIntent({
        amount: 75,
        metadata: { registrationId: registration.id },
      });

      await paymentService.confirmPayment(payment1.id);

      // Attempt duplicate payment
      const payment2 = await paymentService.createPaymentIntent({
        amount: 75,
        metadata: { registrationId: registration.id },
      });

      await expect(
        paymentService.confirmPayment(payment2.id)
      ).rejects.toThrow('Registration already paid');
    });
  });
});