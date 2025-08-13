import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';

import { AppModule } from '../../src/app.module';
import { TournamentService } from '../../src/modules/tournaments/tournament.service';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { WebSocketGateway } from '../../src/websocket/websocket.gateway';
import { Tournament, TournamentStatus, TournamentFormat } from '../../src/modules/tournaments/entities/tournament.entity';
import { TeamStatus } from '../../src/modules/tournaments/entities/tournament-team.entity';
import { MatchStatus } from '../../src/modules/tournaments/entities/tournament-match.entity';

import { IntegrationTestHelper, getTestDataSource } from '../integration-setup';
import { TestPerformanceMonitor } from '../../src/test/setup';

describe('Tournament Management E2E Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tournamentService: TournamentService;
  let paymentsService: PaymentsService;
  let websocketGateway: WebSocketGateway;
  let httpServer: any;
  let wsServer: Server;
  let clientSocket: ClientSocket;

  // Test data
  let testUser: any;
  let testTournament: Tournament;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    httpServer = app.getHttpServer();
    dataSource = await getTestDataSource();
    tournamentService = moduleFixture.get<TournamentService>(TournamentService);
    paymentsService = moduleFixture.get<PaymentsService>(PaymentsService);
    websocketGateway = moduleFixture.get<WebSocketGateway>(WebSocketGateway);
    wsServer = websocketGateway.server;

    // Create test user and get auth token
    testUser = await IntegrationTestHelper.createTestUser({
      id: 'user-integration-test',
      email: 'integration@test.com',
      roles: ['admin', 'tournament_manager'],
    });

    // Mock JWT token for authentication
    authToken = 'test-jwt-token'; // In real tests, generate actual JWT
  });

  afterAll(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
    }

    // Recreate test user for each test
    testUser = await IntegrationTestHelper.createTestUser({
      id: 'user-integration-test',
      email: 'integration@test.com',
      roles: ['admin', 'tournament_manager'],
    });
  });

  describe('Complete Tournament Flow', () => {
    it('should allow admin to create tournament', async () => {
      const createTournamentDto = {
        name: 'Integration Test Tournament',
        format: TournamentFormat.SINGLE_ELIMINATION,
        minTeams: 4,
        maxTeams: 16,
        startDate: '2024-12-01T08:00:00Z',
        endDate: '2024-12-03T20:00:00Z',
        entryFee: 5000, // $50.00
        description: 'Test tournament for integration testing',
        settings: {
          consolationBracket: false,
          thirdPlaceGame: true,
          minRestTime: 30,
          gameDuration: 60,
        },
        courts: [
          { name: 'Court 1', isActive: true },
          { name: 'Court 2', isActive: true },
        ],
      };

      const { duration, result } = await TestPerformanceMonitor.measureAsync(async () => {
        return request(httpServer)
          .post('/tournaments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createTournamentDto)
          .expect(201);
      });

      expect(duration).toMatchPerformanceThreshold(2000); // Should create within 2 seconds
      expect(result.body).toMatchObject({
        name: createTournamentDto.name,
        format: createTournamentDto.format,
        status: TournamentStatus.DRAFT,
        minTeams: createTournamentDto.minTeams,
        maxTeams: createTournamentDto.maxTeams,
        currentTeamCount: 0,
      });

      testTournament = result.body;

      // Verify courts were created
      const courtsResponse = await request(httpServer)
        .get(`/tournaments/${testTournament.id}/courts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(courtsResponse.body).toHaveLength(2);
    });

    it('should allow teams to register for tournament', async () => {
      // First create a tournament
      testTournament = await IntegrationTestHelper.createTestTournament({
        status: TournamentStatus.REGISTRATION_OPEN,
        entryFee: 5000,
      });

      const teams = [
        {
          teamId: 'team-1',
          teamName: 'Phoenix Warriors',
          divisionId: 'boys-u16',
          roster: [
            { playerId: 'player-1', name: 'John Smith', position: 'PG' },
            { playerId: 'player-2', name: 'Mike Jones', position: 'SG' },
          ],
          coaches: [
            { coachId: 'coach-1', name: 'Coach Johnson', role: 'head_coach' },
          ],
        },
        {
          teamId: 'team-2',
          teamName: 'Desert Eagles',
          divisionId: 'boys-u16',
          roster: [
            { playerId: 'player-3', name: 'Chris Brown', position: 'PF' },
            { playerId: 'player-4', name: 'David Wilson', position: 'C' },
          ],
          coaches: [
            { coachId: 'coach-2', name: 'Coach Williams', role: 'head_coach' },
          ],
        },
        {
          teamId: 'team-3',
          teamName: 'Cactus Crushers',
          divisionId: 'boys-u16',
          roster: [],
          coaches: [],
        },
        {
          teamId: 'team-4',
          teamName: 'Sun Devils',
          divisionId: 'boys-u16',
          roster: [],
          coaches: [],
        },
      ];

      // Register teams concurrently to test race conditions
      const registrationPromises = teams.map(team =>
        request(httpServer)
          .post(`/tournaments/${testTournament.id}/register`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(team)
          .expect(201)
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        await Promise.all(registrationPromises);
      });

      expect(duration).toMatchPerformanceThreshold(3000); // Should handle concurrent registrations within 3 seconds

      // Verify all teams were registered
      const tournamentResponse = await request(httpServer)
        .get(`/tournaments/${testTournament.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(tournamentResponse.body.currentTeamCount).toBe(4);
    });

    it('should process entry fees during team registration', async () => {
      testTournament = await IntegrationTestHelper.createTestTournament({
        status: TournamentStatus.REGISTRATION_OPEN,
        entryFee: 5000,
      });

      const teamRegistration = {
        teamId: 'team-payment-test',
        teamName: 'Payment Test Team',
        paymentMethodId: 'pm_test_card_visa',
        billingAddress: {
          line1: '123 Main St',
          city: 'Phoenix',
          state: 'AZ',
          postal_code: '85001',
          country: 'US',
        },
      };

      // Mock Stripe payment intent creation
      jest.spyOn(paymentsService, 'createTournamentPayment').mockResolvedValue({
        id: 'payment-test-123',
        paymentIntent: {
          id: 'pi_test_123',
          status: 'succeeded',
          client_secret: 'pi_test_123_secret_abc',
        } as any,
        order: {
          id: 'order-test-123',
          totalAmount: 5000,
          status: 'completed',
        } as any,
      } as any);

      const registrationResponse = await request(httpServer)
        .post(`/tournaments/${testTournament.id}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(teamRegistration)
        .expect(201);

      expect(registrationResponse.body.registration.paymentStatus).toBe('completed');

      // Verify payment was processed
      expect(paymentsService.createTournamentPayment).toHaveBeenCalledWith({
        userId: testUser.id,
        organizationId: testUser.organizationId,
        tournamentId: testTournament.id,
        teamId: teamRegistration.teamId,
        amount: 5000,
        currency: 'usd',
        paymentMethodId: teamRegistration.paymentMethodId,
        billingAddress: teamRegistration.billingAddress,
      });
    });

    it('should generate bracket when tournament starts', async () => {
      // Create tournament with registered teams
      testTournament = await IntegrationTestHelper.createTestTournament({
        status: TournamentStatus.REGISTRATION_CLOSED,
        currentTeamCount: 8,
      });

      // Create 8 test teams
      const teams = await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          IntegrationTestHelper.createTestTeam(testTournament.id, {
            teamId: `team-${i + 1}`,
            teamName: `Team ${i + 1}`,
            seed: i + 1,
            status: TeamStatus.CONFIRMED,
          })
        )
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        return request(httpServer)
          .post(`/tournaments/${testTournament.id}/generate-bracket`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      expect(duration).toMatchPerformanceThreshold(3000); // Should generate bracket within 3 seconds

      // Verify bracket was generated
      const bracketResponse = await request(httpServer)
        .get(`/tournaments/${testTournament.id}/bracket`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(bracketResponse.body.rounds).toBeDefined();
      expect(bracketResponse.body.rounds).toHaveLength(3); // 8 teams = 3 rounds
      expect(bracketResponse.body.rounds[0].matches).toHaveLength(4); // First round: 4 matches

      // Verify matches were created
      const matchesResponse = await request(httpServer)
        .get(`/tournaments/${testTournament.id}/matches`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(matchesResponse.body).toHaveLength(7); // 8 teams single elimination = 7 matches
    });

    it('should process match results and advance winners', async () => {
      // Setup tournament with bracket
      testTournament = await IntegrationTestHelper.createTestTournament({
        status: TournamentStatus.IN_PROGRESS,
        currentRound: 1,
        totalRounds: 3,
      });

      const match = await IntegrationTestHelper.createTestMatch(testTournament.id, {
        matchNumber: 1,
        round: 1,
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        status: MatchStatus.IN_PROGRESS,
        nextMatches: {
          winnerTo: { matchId: 5, position: 'home' },
        },
      });

      const nextMatch = await IntegrationTestHelper.createTestMatch(testTournament.id, {
        id: 'match-5',
        matchNumber: 5,
        round: 2,
        homeTeamId: null,
        awayTeamId: 'team-3',
        status: MatchStatus.PENDING,
      });

      const matchResult = {
        homeScore: 75,
        awayScore: 68,
        scoreByPeriod: [
          { period: 1, homeScore: 18, awayScore: 15 },
          { period: 2, homeScore: 22, awayScore: 18 },
          { period: 3, homeScore: 19, awayScore: 20 },
          { period: 4, homeScore: 16, awayScore: 15 },
        ],
        gameStats: {
          homeTeam: { fouls: 12, timeouts: 3 },
          awayTeam: { fouls: 15, timeouts: 2 },
        },
      };

      const resultResponse = await request(httpServer)
        .patch(`/tournaments/${testTournament.id}/matches/${match.id}/result`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(matchResult)
        .expect(200);

      expect(resultResponse.body.winnerId).toBe('team-1');
      expect(resultResponse.body.homeScore).toBe(75);
      expect(resultResponse.body.awayScore).toBe(68);
      expect(resultResponse.body.status).toBe(MatchStatus.COMPLETED);

      // Verify winner was advanced to next match
      const nextMatchResponse = await request(httpServer)
        .get(`/tournaments/${testTournament.id}/matches/match-5`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(nextMatchResponse.body.homeTeamId).toBe('team-1');
      expect(nextMatchResponse.body.status).toBe(MatchStatus.SCHEDULED);
    });

    it('should determine tournament champion', async () => {
      testTournament = await IntegrationTestHelper.createTestTournament({
        status: TournamentStatus.IN_PROGRESS,
        currentRound: 3,
        totalRounds: 3,
      });

      // Create championship match
      const championshipMatch = await IntegrationTestHelper.createTestMatch(testTournament.id, {
        matchNumber: 7,
        round: 3,
        position: 1,
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        status: MatchStatus.IN_PROGRESS,
        matchType: 'championship',
      });

      const finalResult = {
        homeScore: 82,
        awayScore: 79,
        scoreByPeriod: [
          { period: 1, homeScore: 20, awayScore: 18 },
          { period: 2, homeScore: 21, awayScore: 22 },
          { period: 3, homeScore: 19, awayScore: 21 },
          { period: 4, homeScore: 22, awayScore: 18 },
        ],
      };

      await request(httpServer)
        .patch(`/tournaments/${testTournament.id}/matches/${championshipMatch.id}/result`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(finalResult)
        .expect(200);

      // Verify tournament was completed and champion was determined
      const completedTournamentResponse = await request(httpServer)
        .get(`/tournaments/${testTournament.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(completedTournamentResponse.body.status).toBe(TournamentStatus.COMPLETED);
      expect(completedTournamentResponse.body.championId).toBe('team-1');
      expect(completedTournamentResponse.body.runnerUpId).toBe('team-2');
      expect(completedTournamentResponse.body.completedAt).toBeDefined();
    });

    it('should generate final reports', async () => {
      testTournament = await IntegrationTestHelper.createTestTournament({
        status: TournamentStatus.COMPLETED,
        championId: 'team-1',
        runnerUpId: 'team-2',
        completedAt: new Date(),
      });

      // Generate tournament summary report
      const reportResponse = await request(httpServer)
        .post(`/tournaments/${testTournament.id}/reports/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'pdf',
          sections: ['standings', 'statistics', 'bracket', 'financial_summary'],
        })
        .expect(200);

      expect(reportResponse.body.reportId).toBeDefined();
      expect(reportResponse.body.status).toBe('generating');

      // Verify report was queued for generation
      const reportStatusResponse = await request(httpServer)
        .get(`/reports/${reportResponse.body.reportId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(['generating', 'completed']).toContain(reportStatusResponse.body.status);
    });
  });

  describe('Payment Integration', () => {
    it('should charge entry fees during team registration', async () => {
      testTournament = await IntegrationTestHelper.createTestTournament({
        status: TournamentStatus.REGISTRATION_OPEN,
        entryFee: 7500, // $75.00
      });

      const paymentData = {
        teamId: 'team-payment-integration',
        teamName: 'Payment Integration Team',
        paymentMethodId: 'pm_test_card_visa',
        discountCode: 'EARLY20', // 20% discount
      };

      // Mock discount code validation
      jest.spyOn(paymentsService, 'calculateOrderTotal').mockResolvedValue({
        originalAmount: 7500,
        discountAmount: 1500,
        subtotal: 6000,
        taxAmount: 520, // 8.67% AZ tax
        totalAmount: 6520,
        currency: 'usd',
      } as any);

      const registrationResponse = await request(httpServer)
        .post(`/tournaments/${testTournament.id}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(paymentsService.calculateOrderTotal).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 7500,
          discountCode: 'EARLY20',
        })
      );

      expect(registrationResponse.body.payment).toMatchObject({
        originalAmount: 7500,
        discountAmount: 1500,
        finalAmount: 6520,
      });
    });

    it('should process refunds for cancelled registrations', async () => {
      testTournament = await IntegrationTestHelper.createTestTournament({
        status: TournamentStatus.REGISTRATION_OPEN,
        entryFee: 5000,
      });

      const team = await IntegrationTestHelper.createTestTeam(testTournament.id, {
        teamId: 'team-refund-test',
        registration: {
          registeredAt: new Date(),
          registeredBy: testUser.id,
          paymentStatus: 'completed',
          paymentId: 'payment-refund-test',
        },
      });

      const payment = await IntegrationTestHelper.createTestPayment({
        id: 'payment-refund-test',
        amount: 5000,
        status: 'succeeded',
        metadata: {
          tournamentId: testTournament.id,
          teamId: team.teamId,
        },
      });

      // Mock refund processing
      jest.spyOn(paymentsService, 'createRefund').mockResolvedValue({
        id: 'refund-test-123',
        paymentId: payment.id,
        amount: 5000,
        status: 'succeeded',
        reason: 'Team withdrawal',
      } as any);

      const refundResponse = await request(httpServer)
        .post(`/tournaments/${testTournament.id}/teams/${team.id}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Team withdrawal',
          amount: 5000,
        })
        .expect(200);

      expect(refundResponse.body.refund.status).toBe('succeeded');
      expect(paymentsService.createRefund).toHaveBeenCalledWith({
        paymentId: payment.id,
        amount: 5000,
        reason: 'Team withdrawal',
        metadata: {
          tournamentId: testTournament.id,
          teamId: team.teamId,
        },
      });
    });

    it('should handle failed payments gracefully', async () => {
      testTournament = await IntegrationTestHelper.createTestTournament({
        status: TournamentStatus.REGISTRATION_OPEN,
        entryFee: 5000,
      });

      // Mock payment failure
      jest.spyOn(paymentsService, 'createTournamentPayment').mockRejectedValue({
        type: 'StripeCardError',
        code: 'card_declined',
        message: 'Your card was declined.',
        decline_code: 'generic_decline',
      });

      const teamRegistration = {
        teamId: 'team-failed-payment',
        teamName: 'Failed Payment Team',
        paymentMethodId: 'pm_test_card_declined',
      };

      const registrationResponse = await request(httpServer)
        .post(`/tournaments/${testTournament.id}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(teamRegistration)
        .expect(402); // Payment Required

      expect(registrationResponse.body.error).toMatchObject({
        type: 'StripeCardError',
        code: 'card_declined',
        message: 'Your card was declined.',
      });

      // Verify team was not registered
      const tournamentResponse = await request(httpServer)
        .get(`/tournaments/${testTournament.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(tournamentResponse.body.currentTeamCount).toBe(0);
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(async (done) => {
      // Connect WebSocket client for real-time tests
      clientSocket = Client(`http://localhost:${httpServer.address().port}`, {
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        done();
      });
    });

    afterEach(() => {
      if (clientSocket?.connected) {
        clientSocket.disconnect();
      }
    });

    it('should broadcast live scores to spectators', (done) => {
      testTournament = IntegrationTestHelper.createTestTournament({
        status: TournamentStatus.IN_PROGRESS,
      });

      const match = IntegrationTestHelper.createTestMatch(testTournament.id, {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        status: MatchStatus.IN_PROGRESS,
      });

      // Subscribe to game updates
      clientSocket.emit('subscribe', {
        games: [match.id],
      });

      clientSocket.on('game_update', (data) => {
        expect(data.gameId).toBe(match.id);
        expect(data.homeScore).toBe(45);
        expect(data.awayScore).toBe(42);
        expect(data.period).toBe(2);
        done();
      });

      // Simulate score update
      setTimeout(() => {
        request(httpServer)
          .patch(`/tournaments/${testTournament.id}/matches/${match.id}/live-score`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            homeScore: 45,
            awayScore: 42,
            period: 2,
            timeRemaining: '5:30',
          })
          .expect(200);
      }, 100);
    });

    it('should update standings in real-time', (done) => {
      clientSocket.emit('subscribe', {
        tournaments: [testTournament?.id || 'tournament-realtime-test'],
      });

      clientSocket.on('tournament_update', (data) => {
        expect(data.type).toBe('standings');
        expect(data.data.standings).toBeDefined();
        done();
      });

      // Simulate standings update
      setTimeout(() => {
        websocketGateway.broadcastTournamentUpdate(testTournament?.id || 'tournament-realtime-test', {
          tournamentId: testTournament?.id || 'tournament-realtime-test',
          type: 'standings',
          data: {
            standings: [
              { teamId: 'team-1', wins: 2, losses: 0 },
              { teamId: 'team-2', wins: 1, losses: 1 },
            ],
          },
          timestamp: new Date(),
        });
      }, 100);
    });

    it('should notify teams of advancement', (done) => {
      clientSocket.emit('subscribe', {
        tournaments: [testTournament?.id || 'tournament-advancement-test'],
      });

      clientSocket.on('tournament_update', (data) => {
        if (data.type === 'team_advance') {
          expect(data.data.teamId).toBe('team-1');
          expect(data.data.toMatch).toBe('match-5');
          expect(data.data.round).toBe(2);
          done();
        }
      });

      // Simulate team advancement
      setTimeout(() => {
        websocketGateway.broadcastTournamentUpdate(testTournament?.id || 'tournament-advancement-test', {
          tournamentId: testTournament?.id || 'tournament-advancement-test',
          type: 'team_advance',
          data: {
            teamId: 'team-1',
            toMatch: 'match-5',
            round: 2,
          },
          timestamp: new Date(),
        });
      }, 100);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent tournament operations', async () => {
      const tournaments = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          IntegrationTestHelper.createTestTournament({
            name: `Concurrent Tournament ${i + 1}`,
            status: TournamentStatus.REGISTRATION_OPEN,
          })
        )
      );

      const registrationPromises = tournaments.flatMap(tournament =>
        Array.from({ length: 4 }, (_, teamIndex) =>
          request(httpServer)
            .post(`/tournaments/${tournament.id}/register`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              teamId: `team-${tournament.id}-${teamIndex + 1}`,
              teamName: `Team ${teamIndex + 1}`,
              paymentMethodId: 'pm_test_card_visa',
            })
        )
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        const results = await Promise.allSettled(registrationPromises);
        const failures = results.filter(result => result.status === 'rejected');
        expect(failures.length).toBeLessThan(registrationPromises.length * 0.1); // <10% failure rate
      });

      expect(duration).toMatchPerformanceThreshold(15000); // Should handle 40 concurrent registrations within 15 seconds
    });

    it('should efficiently handle large tournament bracket generation', async () => {
      const largeTournament = await IntegrationTestHelper.createTestTournament({
        name: 'Large Tournament Test',
        format: TournamentFormat.SINGLE_ELIMINATION,
        maxTeams: 64,
        currentTeamCount: 64,
        status: TournamentStatus.REGISTRATION_CLOSED,
      });

      // Create 64 teams
      await Promise.all(
        Array.from({ length: 64 }, (_, i) =>
          IntegrationTestHelper.createTestTeam(largeTournament.id, {
            teamId: `large-team-${i + 1}`,
            teamName: `Large Team ${i + 1}`,
            seed: i + 1,
            status: TeamStatus.CONFIRMED,
          })
        )
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        await request(httpServer)
          .post(`/tournaments/${largeTournament.id}/generate-bracket`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      expect(duration).toMatchPerformanceThreshold(5000); // Should generate 64-team bracket within 5 seconds

      // Verify correct number of matches were created (64 teams = 63 matches)
      const matchesResponse = await request(httpServer)
        .get(`/tournaments/${largeTournament.id}/matches`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(matchesResponse.body).toHaveLength(63);
    });
  });
});