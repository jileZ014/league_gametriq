import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { StripeService } from '../../../src/modules/payments/stripe.service';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
import { StripeWebhookHandler } from '../../../src/webhooks/stripe_live';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import * as crypto from 'crypto';

// Mock Stripe
jest.mock('stripe');

describe('Webhook Security', () => {
  let stripeService: StripeService;
  let paymentsService: PaymentsService;
  let webhookHandler: StripeWebhookHandler;
  let stripe: any;
  
  const testWebhookSecret = 'whsec_test_secret123456789';
  const testApiKey = 'sk_test_123456789';
  
  beforeEach(async () => {
    // Mock environment variables
    process.env.STRIPE_TEST_MODE = 'true';
    process.env.STRIPE_TEST_SECRET_KEY = testApiKey;
    process.env.STRIPE_TEST_WEBHOOK_SECRET = testWebhookSecret;
    process.env.DATABASE_PASSWORD = 'test-db-password';
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-32-chars';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        PaymentsService,
        StripeWebhookHandler,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: any = {
                STRIPE_TEST_MODE: 'true',
                STRIPE_TEST_SECRET_KEY: testApiKey,
                STRIPE_TEST_WEBHOOK_SECRET: testWebhookSecret,
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: 'StripeCustomerRepository',
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: 'PaymentRepository',
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: 'PaymentLedgerRepository',
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: 'PaymentAuditRepository',
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: 'WebhookEventRepository',
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: 'DataSource',
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: 'EventEmitter2',
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    stripeService = module.get<StripeService>(StripeService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    webhookHandler = module.get<StripeWebhookHandler>(StripeWebhookHandler);
    
    // Setup Stripe mock
    stripe = (Stripe as any).mock.instances[0];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('StripeService.constructWebhookEvent', () => {
    const validEvent: Stripe.Event = {
      id: 'evt_test123',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      data: {
        object: {
          id: 'pi_test123',
          object: 'payment_intent',
          amount: 1000,
          currency: 'usd',
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: 'payment_intent.succeeded',
    };

    it('should successfully verify valid webhook signature', async () => {
      const rawBody = Buffer.from(JSON.stringify(validEvent));
      const validSignature = 'valid-signature';
      
      stripe.webhooks = {
        constructEvent: jest.fn().mockReturnValue(validEvent),
      };

      const result = await stripeService.constructWebhookEvent(validSignature, rawBody);
      
      expect(result).toEqual(validEvent);
      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        rawBody,
        validSignature,
        testWebhookSecret
      );
    });

    it('should throw error for missing signature', async () => {
      const rawBody = Buffer.from(JSON.stringify(validEvent));
      
      await expect(
        stripeService.constructWebhookEvent('', rawBody)
      ).rejects.toThrow('Missing webhook signature');
    });

    it('should throw error for empty body', async () => {
      const emptyBody = Buffer.from('');
      const signature = 'some-signature';
      
      await expect(
        stripeService.constructWebhookEvent(signature, emptyBody)
      ).rejects.toThrow('Empty webhook body');
    });

    it('should throw error for invalid signature', async () => {
      const rawBody = Buffer.from(JSON.stringify(validEvent));
      const invalidSignature = 'invalid-signature';
      
      stripe.webhooks = {
        constructEvent: jest.fn().mockImplementation(() => {
          throw new Error('Webhook signature verification failed');
        }),
      };

      await expect(
        stripeService.constructWebhookEvent(invalidSignature, rawBody)
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('should throw error for malformed event', async () => {
      const rawBody = Buffer.from(JSON.stringify(validEvent));
      const signature = 'valid-signature';
      
      stripe.webhooks = {
        constructEvent: jest.fn().mockReturnValue({
          // Missing required fields
          data: {},
        }),
      };

      await expect(
        stripeService.constructWebhookEvent(signature, rawBody)
      ).rejects.toThrow('Invalid webhook event structure');
    });
  });

  describe('PaymentsService.handleWebhook', () => {
    const validEvent: Stripe.Event = {
      id: 'evt_test123',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      data: {
        object: {
          id: 'pi_test123',
          object: 'payment_intent',
          amount: 1000,
          currency: 'usd',
          metadata: {
            orderId: 'order123',
            userId: 'user123',
          },
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: 'payment_intent.succeeded',
    };

    it('should handle valid webhook with correct signature', async () => {
      const rawBody = Buffer.from(JSON.stringify(validEvent));
      const signature = 'valid-signature';
      
      jest.spyOn(stripeService, 'constructWebhookEvent').mockResolvedValue(validEvent);
      jest.spyOn(paymentsService as any, 'handlePaymentSucceeded').mockResolvedValue(undefined);

      const result = await paymentsService.handleWebhook(signature, rawBody);
      
      expect(result).toEqual({ received: true });
      expect(stripeService.constructWebhookEvent).toHaveBeenCalledWith(signature, rawBody);
    });

    it('should throw BadRequestException for missing signature', async () => {
      const rawBody = Buffer.from(JSON.stringify(validEvent));
      
      await expect(
        paymentsService.handleWebhook('', rawBody)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty body', async () => {
      const emptyBody = Buffer.from('');
      const signature = 'some-signature';
      
      await expect(
        paymentsService.handleWebhook(signature, emptyBody)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException for invalid signature', async () => {
      const rawBody = Buffer.from(JSON.stringify(validEvent));
      const invalidSignature = 'invalid-signature';
      
      jest.spyOn(stripeService, 'constructWebhookEvent').mockRejectedValue(
        new Error('Invalid webhook signature')
      );

      await expect(
        paymentsService.handleWebhook(invalidSignature, rawBody)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle different event types correctly', async () => {
      const eventTypes = [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'charge.refunded',
        'charge.dispute.created',
      ];

      for (const eventType of eventTypes) {
        const event = { ...validEvent, type: eventType };
        const rawBody = Buffer.from(JSON.stringify(event));
        const signature = 'valid-signature';
        
        jest.spyOn(stripeService, 'constructWebhookEvent').mockResolvedValue(event);
        
        // Mock all handler methods
        jest.spyOn(paymentsService as any, 'handlePaymentSucceeded').mockResolvedValue(undefined);
        jest.spyOn(paymentsService as any, 'handlePaymentFailed').mockResolvedValue(undefined);
        jest.spyOn(paymentsService as any, 'handleChargeRefunded').mockResolvedValue(undefined);
        jest.spyOn(paymentsService as any, 'handleDisputeCreated').mockResolvedValue(undefined);

        const result = await paymentsService.handleWebhook(signature, rawBody);
        
        expect(result).toEqual({ received: true });
      }
    });

    it('should handle unknown event types gracefully', async () => {
      const unknownEvent = { ...validEvent, type: 'unknown.event.type' };
      const rawBody = Buffer.from(JSON.stringify(unknownEvent));
      const signature = 'valid-signature';
      
      jest.spyOn(stripeService, 'constructWebhookEvent').mockResolvedValue(unknownEvent);

      const result = await paymentsService.handleWebhook(signature, rawBody);
      
      expect(result).toEqual({ received: true });
    });
  });

  describe('StripeWebhookHandler.verifyAndProcessWebhook', () => {
    const validEvent: Stripe.Event = {
      id: 'evt_test123',
      object: 'event',
      api_version: '2023-10-16',
      created: 1234567890,
      data: {
        object: {
          id: 'pi_test123',
          object: 'payment_intent',
          amount: 1000,
          currency: 'usd',
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: 'payment_intent.succeeded',
    };

    beforeEach(() => {
      // Mock the stripe property on webhookHandler
      (webhookHandler as any).stripe = {
        webhooks: {
          constructEvent: jest.fn(),
        },
      };
    });

    it('should verify and process valid webhook', async () => {
      const rawBody = Buffer.from(JSON.stringify(validEvent));
      const signature = 'valid-signature';
      
      (webhookHandler as any).stripe.webhooks.constructEvent.mockReturnValue(validEvent);
      jest.spyOn(webhookHandler, 'processWebhookEvent').mockResolvedValue({
        success: true,
      });

      const result = await webhookHandler.verifyAndProcessWebhook(signature, rawBody);
      
      expect(result).toEqual({ success: true });
      expect((webhookHandler as any).stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        rawBody,
        signature,
        testWebhookSecret
      );
    });

    it('should throw BadRequestException for missing signature', async () => {
      const rawBody = Buffer.from(JSON.stringify(validEvent));
      
      await expect(
        webhookHandler.verifyAndProcessWebhook('', rawBody)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException for invalid signature', async () => {
      const rawBody = Buffer.from(JSON.stringify(validEvent));
      const invalidSignature = 'invalid-signature';
      
      (webhookHandler as any).stripe.webhooks.constructEvent.mockImplementation(() => {
        const error = new Error('Webhook signature verification failed');
        (error as any).type = 'StripeSignatureVerificationError';
        throw error;
      });

      await expect(
        webhookHandler.verifyAndProcessWebhook(invalidSignature, rawBody)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should fail closed on any signature verification error', async () => {
      const rawBody = Buffer.from(JSON.stringify(validEvent));
      const signature = 'some-signature';
      
      const testCases = [
        new Error('Webhook signature verification failed'),
        new Error('Invalid header format'),
        new Error('No signatures found matching the expected signature'),
        new Error('Timestamp outside the tolerance zone'),
      ];

      for (const testError of testCases) {
        (webhookHandler as any).stripe.webhooks.constructEvent.mockImplementation(() => {
          throw testError;
        });

        await expect(
          webhookHandler.verifyAndProcessWebhook(signature, rawBody)
        ).rejects.toThrow(UnauthorizedException);
      }
    });
  });

  describe('Webhook Replay Attack Prevention', () => {
    it('should reject events that have already been processed', async () => {
      const event: Stripe.Event = {
        id: 'evt_duplicate123',
        object: 'event',
        api_version: '2023-10-16',
        created: 1234567890,
        data: { object: {} },
        livemode: false,
        pending_webhooks: 1,
        request: null,
        type: 'payment_intent.succeeded',
      };

      const webhookEventRepo = (webhookHandler as any).webhookEventRepository;
      
      // Mock that event already exists and is processed
      webhookEventRepo.findOne.mockResolvedValue({
        id: '123',
        stripeEventId: event.id,
        processed: true,
        processedAt: new Date(),
      });

      const result = await webhookHandler.processWebhookEvent(event);
      
      expect(result).toEqual({
        success: true,
        message: 'Event already processed',
      });
    });
  });

  describe('Signature Generation Test', () => {
    it('should demonstrate proper Stripe signature format', () => {
      // This test demonstrates how Stripe generates signatures
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'whsec_test123';
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Stripe signature format: t=timestamp,v1=signature
      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');
      
      const stripeSignature = `t=${timestamp},v1=${expectedSignature}`;
      
      expect(stripeSignature).toMatch(/^t=\d+,v1=[a-f0-9]+$/);
    });
  });
});