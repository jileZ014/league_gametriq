import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';

import { PaymentsService } from '../payments.service';
import { StripeService } from '../stripe.service';
import { SubscriptionService } from '../subscription.service';
import { Payment } from '../entities/payment.entity';
import { PaymentLedger } from '../entities/payment-ledger.entity';
import { PaymentAudit } from '../entities/payment-audit.entity';
import { DiscountCode } from '../entities/discount-code.entity';
import { RegistrationOrder } from '../entities/registration-order.entity';
import { Subscription } from '../entities/subscription.entity';
import { Refund } from '../entities/refund.entity';

import { MockDataGenerator, TestPerformanceMonitor } from '../../../test/setup';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: jest.Mocked<Repository<Payment>>;
  let ledgerRepository: jest.Mocked<Repository<PaymentLedger>>;
  let auditRepository: jest.Mocked<Repository<PaymentAudit>>;
  let discountRepository: jest.Mocked<Repository<DiscountCode>>;
  let orderRepository: jest.Mocked<Repository<RegistrationOrder>>;
  let subscriptionRepository: jest.Mocked<Repository<Subscription>>;
  let refundRepository: jest.Mocked<Repository<Refund>>;
  let stripeService: jest.Mocked<StripeService>;
  let subscriptionService: jest.Mocked<SubscriptionService>;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let dataSource: jest.Mocked<DataSource>;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useFactory: () => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(PaymentLedger),
          useFactory: () => ({
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(PaymentAudit),
          useFactory: () => ({
            create: jest.fn(),
            save: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(DiscountCode),
          useFactory: () => ({
            findOne: jest.fn(),
            update: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(RegistrationOrder),
          useFactory: () => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(Subscription),
          useFactory: () => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(Refund),
          useFactory: () => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          }),
        },
        {
          provide: StripeService,
          useFactory: () => ({
            createPaymentIntent: jest.fn(),
            confirmPaymentIntent: jest.fn(),
            createCustomer: jest.fn(),
            retrievePaymentIntent: jest.fn(),
            createRefund: jest.fn(),
            createSubscription: jest.fn(),
            updateSubscription: jest.fn(),
            cancelSubscription: jest.fn(),
            createPrice: jest.fn(),
          }),
        },
        {
          provide: SubscriptionService,
          useFactory: () => ({
            createSubscription: jest.fn(),
            updateSubscription: jest.fn(),
            cancelSubscription: jest.fn(),
            calculateProration: jest.fn(),
          }),
        },
        {
          provide: ConfigService,
          useFactory: () => ({
            get: jest.fn(),
          }),
        },
        {
          provide: EventEmitter2,
          useFactory: () => ({
            emit: jest.fn(),
          }),
        },
        {
          provide: DataSource,
          useFactory: () => ({
            createQueryRunner: jest.fn(() => mockQueryRunner),
          }),
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentRepository = module.get(getRepositoryToken(Payment));
    ledgerRepository = module.get(getRepositoryToken(PaymentLedger));
    auditRepository = module.get(getRepositoryToken(PaymentAudit));
    discountRepository = module.get(getRepositoryToken(DiscountCode));
    orderRepository = module.get(getRepositoryToken(RegistrationOrder));
    subscriptionRepository = module.get(getRepositoryToken(Subscription));
    refundRepository = module.get(getRepositoryToken(Refund));
    stripeService = module.get(StripeService);
    subscriptionService = module.get(SubscriptionService);
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);
    dataSource = module.get(DataSource);

    // Setup default config values
    configService.get.mockImplementation((key: string) => {
      const configMap = {
        'stripe.publishableKey': 'pk_test_123',
        'stripe.secretKey': 'sk_test_123',
        'stripe.webhookSecret': 'whsec_test_123',
        'app.baseUrl': 'http://localhost:3000',
        'app.currency': 'usd',
      };
      return configMap[key];
    });

    jest.clearAllMocks();
  });

  describe('Tournament Entry Payments', () => {
    it('should process tournament entry fees correctly', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        organizationId: 'org-1',
        tournamentId: 'tournament-1',
        totalAmount: 5000, // $50.00
        currency: 'usd',
        status: 'pending',
        items: [
          {
            type: 'tournament_entry',
            tournamentId: 'tournament-1',
            teamId: 'team-1',
            amount: 5000,
            description: 'Tournament Entry Fee',
          },
        ],
      };

      const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_test_123',
        amount: 5000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test_123_secret_abc',
        metadata: {
          orderId: 'order-1',
          tournamentId: 'tournament-1',
          teamId: 'team-1',
        },
      };

      const mockPayment = MockDataGenerator.generateMockPayment({
        orderId: 'order-1',
        paymentIntentId: 'pi_test_123',
        amount: 5000,
        status: 'pending',
      });

      orderRepository.create.mockReturnValue(mockOrder as any);
      orderRepository.save.mockResolvedValue(mockOrder as any);
      stripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent as Stripe.PaymentIntent);
      paymentRepository.create.mockReturnValue(mockPayment);
      paymentRepository.save.mockResolvedValue(mockPayment);

      const { duration, result } = await TestPerformanceMonitor.measureAsync(async () => {
        return service.createTournamentPayment({
          userId: 'user-1',
          organizationId: 'org-1',
          tournamentId: 'tournament-1',
          teamId: 'team-1',
          amount: 5000,
          currency: 'usd',
          paymentMethodId: 'pm_test_123',
        });
      });

      expect(duration).toMatchPerformanceThreshold(2000); // Should complete within 2 seconds
      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'usd',
        payment_method: 'pm_test_123',
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          orderId: 'order-1',
          tournamentId: 'tournament-1',
          teamId: 'team-1',
          type: 'tournament_entry',
        },
      });
      expect(result.paymentIntent.id).toBe('pi_test_123');
      expect(auditRepository.save).toHaveBeenCalled();
    });

    it('should handle refund scenarios properly', async () => {
      const mockPayment = MockDataGenerator.generateMockPayment({
        status: 'succeeded',
        amount: 5000,
        paymentIntentId: 'pi_test_123',
      });

      const mockStripeRefund: Partial<Stripe.Refund> = {
        id: 're_test_123',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
        payment_intent: 'pi_test_123',
      };

      const mockRefund = {
        id: 'refund-1',
        paymentId: mockPayment.id,
        stripeRefundId: 're_test_123',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
        reason: 'requested_by_customer',
        metadata: {
          tournamentId: 'tournament-1',
          reason: 'Team withdrawal',
        },
      };

      paymentRepository.findOne.mockResolvedValue(mockPayment);
      stripeService.createRefund.mockResolvedValue(mockStripeRefund as Stripe.Refund);
      refundRepository.create.mockReturnValue(mockRefund as any);
      refundRepository.save.mockResolvedValue(mockRefund as any);
      paymentRepository.update.mockResolvedValue({} as any);

      const result = await service.createRefund({
        paymentId: mockPayment.id,
        amount: 5000,
        reason: 'Team withdrawal',
        metadata: {
          tournamentId: 'tournament-1',
        },
      });

      expect(stripeService.createRefund).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 5000,
        reason: 'requested_by_customer',
        metadata: {
          tournamentId: 'tournament-1',
          reason: 'Team withdrawal',
        },
      });
      expect(result.status).toBe('succeeded');
      expect(ledgerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'refund',
          amount: -5000, // Negative for refund
        })
      );
    });

    it('should apply discount codes accurately', async () => {
      const mockDiscountCode = {
        id: 'discount-1',
        code: 'EARLYBIRD',
        discountType: 'percentage',
        discountValue: 20, // 20% off
        maxUses: 100,
        currentUses: 5,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        isActive: true,
        applicableToTournaments: ['tournament-1'],
      };

      const orderData = {
        userId: 'user-1',
        organizationId: 'org-1',
        tournamentId: 'tournament-1',
        teamId: 'team-1',
        amount: 5000, // $50.00
        currency: 'usd',
        discountCode: 'EARLYBIRD',
      };

      discountRepository.findOne.mockResolvedValue(mockDiscountCode as any);
      orderRepository.create.mockReturnValue({
        ...orderData,
        totalAmount: 4000, // $40.00 after 20% discount
        discountAmount: 1000,
        discountCodeId: 'discount-1',
      } as any);

      const result = await service.calculateOrderTotal(orderData);

      expect(result.totalAmount).toBe(4000); // $40.00
      expect(result.discountAmount).toBe(1000); // $10.00 discount
      expect(result.originalAmount).toBe(5000); // $50.00
      expect(discountRepository.update).toHaveBeenCalledWith(
        'discount-1',
        { currentUses: 6 }
      );
    });

    it('should calculate fees with taxes correctly', async () => {
      const orderData = {
        userId: 'user-1',
        organizationId: 'org-1',
        tournamentId: 'tournament-1',
        teamId: 'team-1',
        amount: 5000,
        currency: 'usd',
        billingAddress: {
          country: 'US',
          state: 'AZ', // Arizona - 8.6% tax rate
          postalCode: '85001',
        },
      };

      // Mock tax calculation service
      const mockTaxCalculation = {
        taxAmount: 430, // 8.6% of $50.00
        taxRate: 0.086,
        taxBreakdown: [
          { type: 'state', rate: 0.086, amount: 430 },
        ],
      };

      jest.spyOn(service as any, 'calculateTaxes').mockResolvedValue(mockTaxCalculation);

      const result = await service.calculateOrderTotal(orderData);

      expect(result.subtotal).toBe(5000);
      expect(result.taxAmount).toBe(430);
      expect(result.totalAmount).toBe(5430);
      expect(result.taxBreakdown).toEqual(mockTaxCalculation.taxBreakdown);
    });

    it('should handle failed payments gracefully', async () => {
      const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_test_123',
        status: 'requires_payment_method',
        last_payment_error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
        } as Stripe.PaymentIntent.LastPaymentError,
      };

      stripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent as Stripe.PaymentIntent);
      paymentRepository.create.mockReturnValue(MockDataGenerator.generateMockPayment({
        status: 'failed',
      }));

      const result = await service.createTournamentPayment({
        userId: 'user-1',
        organizationId: 'org-1',
        tournamentId: 'tournament-1',
        teamId: 'team-1',
        amount: 5000,
        currency: 'usd',
        paymentMethodId: 'pm_test_123',
      });

      expect(result.status).toBe('requires_payment_method');
      expect(result.error).toEqual({
        type: 'card_error',
        code: 'card_declined',
        message: 'Your card was declined.',
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('payment.failed', expect.any(Object));
    });
  });

  describe('Subscription Management', () => {
    it('should create subscriptions with correct pricing', async () => {
      const subscriptionData = {
        userId: 'user-1',
        organizationId: 'org-1',
        planId: 'plan_premium',
        paymentMethodId: 'pm_test_123',
        billingCycle: 'monthly',
      };

      const mockStripeSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
        items: {
          data: [{
            id: 'si_test_123',
            price: {
              id: 'price_test_123',
              unit_amount: 4900, // $49.00
              currency: 'usd',
              recurring: {
                interval: 'month',
                interval_count: 1,
              },
            } as Stripe.Price,
          }] as Stripe.SubscriptionItem[],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
      };

      const mockSubscription = {
        id: 'subscription-1',
        userId: 'user-1',
        organizationId: 'org-1',
        stripeSubscriptionId: 'sub_test_123',
        planId: 'plan_premium',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount: 4900,
        currency: 'usd',
        billingCycle: 'monthly',
      };

      stripeService.createSubscription.mockResolvedValue(mockStripeSubscription as Stripe.Subscription);
      subscriptionService.createSubscription.mockResolvedValue(mockSubscription as any);

      const result = await service.createSubscription(subscriptionData);

      expect(stripeService.createSubscription).toHaveBeenCalledWith({
        customer: expect.any(String),
        items: [{
          price: expect.any(String),
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: 'user-1',
          organizationId: 'org-1',
          planId: 'plan_premium',
        },
      });
      expect(result.status).toBe('active');
    });

    it('should handle upgrade/downgrade scenarios', async () => {
      const existingSubscription = {
        id: 'subscription-1',
        stripeSubscriptionId: 'sub_test_123',
        planId: 'plan_basic',
        amount: 2900, // $29.00
        status: 'active',
      };

      const upgradeData = {
        subscriptionId: 'subscription-1',
        newPlanId: 'plan_premium',
        prorationBehavior: 'always_invoice',
      };

      const mockUpdatedSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_123',
        status: 'active',
        items: {
          data: [{
            price: {
              unit_amount: 4900, // $49.00
              currency: 'usd',
            } as Stripe.Price,
          }] as Stripe.SubscriptionItem[],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
      };

      subscriptionRepository.findOne.mockResolvedValue(existingSubscription as any);
      stripeService.updateSubscription.mockResolvedValue(mockUpdatedSubscription as Stripe.Subscription);
      subscriptionService.calculateProration.mockResolvedValue({
        prorationAmount: 2000, // $20.00 prorated amount
        immediateCharge: true,
      });

      const result = await service.upgradeSubscription(upgradeData);

      expect(subscriptionService.calculateProration).toHaveBeenCalledWith(
        existingSubscription,
        'plan_premium'
      );
      expect(stripeService.updateSubscription).toHaveBeenCalledWith(
        'sub_test_123',
        expect.objectContaining({
          proration_behavior: 'always_invoice',
        })
      );
      expect(result.prorationAmount).toBe(2000);
    });

    it('should process proration correctly', async () => {
      const subscription = {
        id: 'subscription-1',
        planId: 'plan_basic',
        amount: 2900, // $29.00
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-01-31'),
        billingCycle: 'monthly',
      };

      const newPlan = {
        id: 'plan_premium',
        amount: 4900, // $49.00
        billingCycle: 'monthly',
      };

      // Mock current date to be mid-cycle (Jan 15th)
      const mockCurrentDate = new Date('2024-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockCurrentDate as any);

      const result = await subscriptionService.calculateProration(subscription, newPlan.id);

      // Should calculate prorated amount for remaining 16 days
      // Daily rate difference: ($49 - $29) / 31 days = $0.645
      // Remaining days: 16
      // Prorated amount: $0.645 * 16 ≈ $10.32
      expect(result.prorationAmount).toBeWithinRange(1000, 1100); // $10.00 - $11.00
      expect(result.immediateCharge).toBe(true);

      (global.Date as any).mockRestore();
    });

    it('should handle subscription cancellation', async () => {
      const subscription = {
        id: 'subscription-1',
        stripeSubscriptionId: 'sub_test_123',
        status: 'active',
        userId: 'user-1',
      };

      const mockCancelledSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_123',
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
      };

      subscriptionRepository.findOne.mockResolvedValue(subscription as any);
      stripeService.cancelSubscription.mockResolvedValue(mockCancelledSubscription as Stripe.Subscription);
      subscriptionRepository.update.mockResolvedValue({} as any);

      const result = await service.cancelSubscription('subscription-1', {
        reason: 'user_requested',
        cancelAtPeriodEnd: false,
      });

      expect(stripeService.cancelSubscription).toHaveBeenCalledWith('sub_test_123', {
        invoice_now: false,
        prorate: false,
      });
      expect(subscriptionRepository.update).toHaveBeenCalledWith('subscription-1', {
        status: 'canceled',
        canceledAt: expect.any(Date),
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('subscription.canceled', expect.any(Object));
    });
  });

  describe('Payment Processing Performance', () => {
    it('should handle 100 concurrent payment requests', async () => {
      const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 5000,
        currency: 'usd',
      };

      stripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent as Stripe.PaymentIntent);
      paymentRepository.create.mockReturnValue(MockDataGenerator.generateMockPayment());
      paymentRepository.save.mockResolvedValue(MockDataGenerator.generateMockPayment());
      orderRepository.create.mockReturnValue({} as any);
      orderRepository.save.mockResolvedValue({} as any);

      const paymentPromises = Array.from({ length: 100 }, (_, i) =>
        service.createTournamentPayment({
          userId: `user-${i}`,
          organizationId: 'org-1',
          tournamentId: 'tournament-1',
          teamId: `team-${i}`,
          amount: 5000,
          currency: 'usd',
          paymentMethodId: 'pm_test_123',
        })
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        return Promise.allSettled(paymentPromises);
      });

      expect(duration).toMatchPerformanceThreshold(10000); // Should handle 100 requests within 10 seconds
    });

    it('should efficiently query payment history', async () => {
      const mockPayments = Array.from({ length: 1000 }, (_, i) =>
        MockDataGenerator.generateMockPayment({ id: `payment-${i}` })
      );

      paymentRepository.find.mockResolvedValue(mockPayments);

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        return service.getPaymentHistory('user-1', {
          limit: 50,
          offset: 0,
          status: 'succeeded',
        });
      });

      expect(duration).toMatchPerformanceThreshold(100); // Should complete within 100ms
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      const stripeError = new Error('Card declined') as any;
      stripeError.type = 'StripeCardError';
      stripeError.code = 'card_declined';
      stripeError.decline_code = 'generic_decline';

      stripeService.createPaymentIntent.mockRejectedValue(stripeError);

      await expect(
        service.createTournamentPayment({
          userId: 'user-1',
          organizationId: 'org-1',
          tournamentId: 'tournament-1',
          teamId: 'team-1',
          amount: 5000,
          currency: 'usd',
          paymentMethodId: 'pm_test_123',
        })
      ).rejects.toThrow('Card declined');

      expect(auditRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payment_failed',
          details: expect.objectContaining({
            error: 'Card declined',
            errorType: 'StripeCardError',
            errorCode: 'card_declined',
          }),
        })
      );
    });

    it('should rollback transactions on payment failure', async () => {
      stripeService.createPaymentIntent.mockRejectedValue(new Error('Payment failed'));
      orderRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createTournamentPayment({
          userId: 'user-1',
          organizationId: 'org-1',
          tournamentId: 'tournament-1',
          teamId: 'team-1',
          amount: 5000,
          currency: 'usd',
          paymentMethodId: 'pm_test_123',
        })
      ).rejects.toThrow();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('Webhook Processing', () => {
    it('should process successful payment webhooks', async () => {
      const webhookEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
            amount: 5000,
            currency: 'usd',
            metadata: {
              orderId: 'order-1',
              tournamentId: 'tournament-1',
            },
          },
        },
      };

      const mockPayment = MockDataGenerator.generateMockPayment({
        paymentIntentId: 'pi_test_123',
        status: 'pending',
      });

      paymentRepository.findOne.mockResolvedValue(mockPayment);
      paymentRepository.update.mockResolvedValue({} as any);
      orderRepository.update.mockResolvedValue({} as any);

      await service.handleWebhookEvent(webhookEvent as any);

      expect(paymentRepository.update).toHaveBeenCalledWith(
        mockPayment.id,
        {
          status: 'succeeded',
          updatedAt: expect.any(Date),
        }
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('payment.succeeded', expect.any(Object));
    });

    it('should process failed payment webhooks', async () => {
      const webhookEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'requires_payment_method',
            last_payment_error: {
              code: 'card_declined',
              message: 'Your card was declined.',
            },
          },
        },
      };

      const mockPayment = MockDataGenerator.generateMockPayment({
        paymentIntentId: 'pi_test_123',
        status: 'processing',
      });

      paymentRepository.findOne.mockResolvedValue(mockPayment);
      paymentRepository.update.mockResolvedValue({} as any);

      await service.handleWebhookEvent(webhookEvent as any);

      expect(paymentRepository.update).toHaveBeenCalledWith(
        mockPayment.id,
        {
          status: 'failed',
          metadata: expect.objectContaining({
            lastError: {
              code: 'card_declined',
              message: 'Your card was declined.',
            },
          }),
        }
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('payment.failed', expect.any(Object));
    });
  });
});