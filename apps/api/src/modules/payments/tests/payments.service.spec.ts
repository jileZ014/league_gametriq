import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../payments.service';
import { StripeService } from '../stripe.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let stripeService: jest.Mocked<StripeService>;
  let paymentRepository: jest.Mocked<Repository<any>>;
  let ledgerRepository: jest.Mocked<Repository<any>>;
  let auditRepository: jest.Mocked<Repository<any>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let dataSource: jest.Mocked<DataSource>;

  const mockPaymentIntent: Stripe.PaymentIntent = {
    id: 'pi_test123',
    object: 'payment_intent',
    amount: 10000,
    currency: 'usd',
    status: 'requires_payment_method',
    client_secret: 'pi_test123_secret',
    created: 1234567890,
    livemode: false,
    metadata: {
      orderId: 'order123',
      userId: 'user123',
    },
    customer: 'cus_test123',
    payment_method_types: ['card'],
  } as Stripe.PaymentIntent;

  const mockPayment = {
    id: 'payment123',
    userId: 'user123',
    orderId: 'order123',
    paymentIntentId: 'pi_test123',
    amount: 100,
    currency: 'usd',
    status: 'pending',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: StripeService,
          useValue: {
            createPaymentIntent: jest.fn(),
            retrievePaymentIntent: jest.fn(),
            confirmPaymentIntent: jest.fn(),
            createRefund: jest.fn(),
            getOrCreateCustomer: jest.fn(),
            listPaymentMethods: jest.fn(),
            updateCustomer: jest.fn(),
            constructWebhookEvent: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                STRIPE_TEST_MODE: 'true',
                STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
              };
              return config[key];
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken('Payment'),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken('PaymentLedger'),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken('PaymentAudit'),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    stripeService = module.get(StripeService);
    paymentRepository = module.get(getRepositoryToken('Payment'));
    ledgerRepository = module.get(getRepositoryToken('PaymentLedger'));
    auditRepository = module.get(getRepositoryToken('PaymentAudit'));
    eventEmitter = module.get(EventEmitter2);
    dataSource = module.get(DataSource);
  });

  describe('createPaymentIntent', () => {
    it('should create a new payment intent', async () => {
      const params = {
        orderId: 'order123',
        amount: 100,
        currency: 'usd',
        userId: 'user123',
        idempotencyKey: 'key123',
      };

      paymentRepository.findOne.mockResolvedValue(null);
      stripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);
      paymentRepository.save.mockResolvedValue(mockPayment);
      ledgerRepository.save.mockResolvedValue({});
      auditRepository.save.mockResolvedValue({});

      const result = await service.createPaymentIntent(params);

      expect(result).toEqual({
        id: 'pi_test123',
        clientSecret: 'pi_test123_secret',
        amount: 100,
        currency: 'usd',
        status: 'requires_payment_method',
        metadata: mockPaymentIntent.metadata,
      });

      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // 100 * 100 cents
          currency: 'usd',
          metadata: expect.objectContaining({
            orderId: 'order123',
            userId: 'user123',
            environment: 'test',
          }),
        }),
        'key123',
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.intent.created',
        expect.objectContaining({
          payment: expect.any(Object),
          paymentIntent: mockPaymentIntent,
        }),
      );
    });

    it('should return existing payment intent for duplicate request', async () => {
      paymentRepository.findOne.mockResolvedValue(mockPayment);
      stripeService.retrievePaymentIntent.mockResolvedValue(mockPaymentIntent);

      const params = {
        orderId: 'order123',
        amount: 100,
        currency: 'usd',
        userId: 'user123',
        idempotencyKey: 'key123',
      };

      const result = await service.createPaymentIntent(params);

      expect(stripeService.createPaymentIntent).not.toHaveBeenCalled();
      expect(stripeService.retrievePaymentIntent).toHaveBeenCalledWith('pi_test123');
    });

    it('should throw error for invalid amount', async () => {
      const params = {
        orderId: 'order123',
        amount: 0,
        currency: 'usd',
        userId: 'user123',
        idempotencyKey: 'key123',
      };

      await expect(service.createPaymentIntent(params)).rejects.toThrow(
        'Amount must be greater than 0',
      );
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should confirm a payment intent', async () => {
      const confirmedIntent = {
        ...mockPaymentIntent,
        status: 'succeeded' as Stripe.PaymentIntent.Status,
      };

      paymentRepository.findOne.mockResolvedValue(mockPayment);
      stripeService.confirmPaymentIntent.mockResolvedValue(confirmedIntent);
      paymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: 'succeeded',
      });
      auditRepository.save.mockResolvedValue({});

      const result = await service.confirmPaymentIntent('pi_test123', 'user123');

      expect(result.status).toBe('succeeded');
      expect(stripeService.confirmPaymentIntent).toHaveBeenCalledWith(
        'pi_test123',
        { payment_method: undefined },
      );
    });

    it('should throw error if payment not found', async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.confirmPaymentIntent('pi_test123', 'user123'),
      ).rejects.toThrow('Payment intent not found');
    });

    it('should throw error if payment already processed', async () => {
      paymentRepository.findOne.mockResolvedValue({
        ...mockPayment,
        status: 'succeeded',
      });

      await expect(
        service.confirmPaymentIntent('pi_test123', 'user123'),
      ).rejects.toThrow('Payment is already succeeded');
    });
  });

  describe('processRefund', () => {
    it('should process a full refund', async () => {
      const mockRefund: Stripe.Refund = {
        id: 're_test123',
        object: 'refund',
        amount: 10000,
        currency: 'usd',
        created: 1234567890,
        payment_intent: 'pi_test123',
        reason: 'requested_by_customer',
        status: 'succeeded',
        metadata: {},
      } as Stripe.Refund;

      const succeededPayment = {
        ...mockPayment,
        status: 'succeeded',
      };

      paymentRepository.findOne.mockResolvedValue(succeededPayment);
      stripeService.createRefund.mockResolvedValue(mockRefund);
      paymentRepository.save.mockResolvedValue({
        ...succeededPayment,
        status: 'refunded',
      });
      ledgerRepository.save.mockResolvedValue({});
      auditRepository.save.mockResolvedValue({});

      const result = await service.processRefund({
        paymentIntentId: 'pi_test123',
        reason: 'requested_by_customer',
        userId: 'user123',
        idempotencyKey: 'key123',
      });

      expect(result).toEqual({
        id: 're_test123',
        paymentIntentId: 'pi_test123',
        amount: 100,
        currency: 'usd',
        status: 'succeeded',
        reason: 'requested_by_customer',
        created: new Date(1234567890 * 1000),
      });

      expect(stripeService.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: 'pi_test123',
          amount: 10000,
          reason: 'requested_by_customer',
        }),
        'key123',
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.refunded',
        expect.any(Object),
      );
    });

    it('should process a partial refund', async () => {
      const mockRefund: Stripe.Refund = {
        id: 're_test123',
        object: 'refund',
        amount: 5000,
        currency: 'usd',
        created: 1234567890,
        payment_intent: 'pi_test123',
        reason: 'requested_by_customer',
        status: 'succeeded',
        metadata: {},
      } as Stripe.Refund;

      const succeededPayment = {
        ...mockPayment,
        status: 'succeeded',
      };

      paymentRepository.findOne.mockResolvedValue(succeededPayment);
      stripeService.createRefund.mockResolvedValue(mockRefund);
      paymentRepository.save.mockResolvedValue(succeededPayment);

      const result = await service.processRefund({
        paymentIntentId: 'pi_test123',
        amount: 50,
        reason: 'requested_by_customer',
        userId: 'user123',
        idempotencyKey: 'key123',
      });

      expect(result.amount).toBe(50);
      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'succeeded' }),
      );
    });

    it('should throw error for non-succeeded payment', async () => {
      paymentRepository.findOne.mockResolvedValue(mockPayment);

      await expect(
        service.processRefund({
          paymentIntentId: 'pi_test123',
          reason: 'requested_by_customer',
          userId: 'user123',
          idempotencyKey: 'key123',
        }),
      ).rejects.toThrow('Can only refund succeeded payments');
    });

    it('should throw error if refund amount exceeds payment', async () => {
      paymentRepository.findOne.mockResolvedValue({
        ...mockPayment,
        status: 'succeeded',
      });

      await expect(
        service.processRefund({
          paymentIntentId: 'pi_test123',
          amount: 200,
          reason: 'requested_by_customer',
          userId: 'user123',
          idempotencyKey: 'key123',
        }),
      ).rejects.toThrow('Refund amount exceeds payment amount');
    });
  });

  describe('handleWebhook', () => {
    it('should handle payment succeeded webhook', async () => {
      const event: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: mockPaymentIntent,
        },
        created: 1234567890,
        livemode: false,
        pending_webhooks: 0,
        request: null,
        api_version: '2023-10-16',
      };

      stripeService.constructWebhookEvent.mockResolvedValue(event);
      paymentRepository.findOne.mockResolvedValue(mockPayment);
      
      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          save: jest.fn(),
        };
        return cb(manager);
      });

      const result = await service.handleWebhook('sig_test', Buffer.from('test'));

      expect(result).toEqual({ received: true });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.succeeded',
        expect.any(Object),
      );
    });

    it('should handle payment failed webhook', async () => {
      const failedIntent = {
        ...mockPaymentIntent,
        status: 'payment_failed' as Stripe.PaymentIntent.Status,
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined',
        },
      };

      const event: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: failedIntent,
        },
        created: 1234567890,
        livemode: false,
        pending_webhooks: 0,
        request: null,
        api_version: '2023-10-16',
      };

      stripeService.constructWebhookEvent.mockResolvedValue(event);
      paymentRepository.findOne.mockResolvedValue(mockPayment);
      paymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: 'failed',
      });
      auditRepository.save.mockResolvedValue({});

      const result = await service.handleWebhook('sig_test', Buffer.from('test'));

      expect(result).toEqual({ received: true });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.failed',
        expect.any(Object),
      );
    });

    it('should throw error for invalid signature', async () => {
      stripeService.constructWebhookEvent.mockRejectedValue(
        new Error('Invalid webhook signature'),
      );

      await expect(
        service.handleWebhook('invalid_sig', Buffer.from('test')),
      ).rejects.toThrow('Webhook processing failed');
    });
  });

  describe('getUserPaymentHistory', () => {
    it('should return paginated payment history', async () => {
      const payments = [mockPayment];
      paymentRepository.findAndCount.mockResolvedValue([payments, 1]);

      const result = await service.getUserPaymentHistory('user123', 20, 0);

      expect(result).toEqual({
        payments: [
          {
            id: 'payment123',
            orderId: 'order123',
            amount: 100,
            currency: 'usd',
            status: 'pending',
            createdAt: mockPayment.createdAt,
            updatedAt: mockPayment.updatedAt,
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      });

      expect(paymentRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        order: { createdAt: 'DESC' },
        take: 20,
        skip: 0,
      });
    });
  });

  describe('getUserPaymentMethods', () => {
    it('should return formatted payment methods', async () => {
      const mockCustomer: Stripe.Customer = {
        id: 'cus_test123',
        object: 'customer',
        invoice_settings: {
          default_payment_method: 'pm_test123',
        },
      } as Stripe.Customer;

      const mockPaymentMethods: Stripe.ApiList<Stripe.PaymentMethod> = {
        object: 'list',
        data: [
          {
            id: 'pm_test123',
            object: 'payment_method',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              exp_month: 12,
              exp_year: 2025,
            } as Stripe.PaymentMethod.Card,
          } as Stripe.PaymentMethod,
        ],
        has_more: false,
        url: '',
      };

      stripeService.getOrCreateCustomer.mockResolvedValue(mockCustomer);
      stripeService.listPaymentMethods.mockResolvedValue(mockPaymentMethods);

      const result = await service.getUserPaymentMethods('user123');

      expect(result).toEqual([
        {
          id: 'pm_test123',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            expMonth: 12,
            expYear: 2025,
          },
          isDefault: true,
        },
      ]);
    });
  });

  describe('getPublicConfig', () => {
    it('should return public Stripe configuration', async () => {
      const result = await service.getPublicConfig();

      expect(result).toEqual({
        publishableKey: 'pk_test_123',
        testMode: true,
        supportedCurrencies: ['usd', 'eur', 'gbp'],
        supportedPaymentMethods: ['card', 'us_bank_account'],
      });
    });
  });
});