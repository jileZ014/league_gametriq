import { Injectable, BadRequestException, NotFoundException, Logger, UnauthorizedException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantAwareRepository } from '../../middleware/tenant_guard';
import Stripe from 'stripe';
import { Payment } from './entities/payment.entity';
import { PaymentLedger } from './entities/payment-ledger.entity';

interface TenantRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    roles?: string[];
    isSuperAdmin?: boolean;
  };
  tenantId?: string;
}

/**
 * Tenant-aware payments service that ensures complete isolation between organizations
 */
@Injectable()
export class TenantAwarePaymentsService {
  private readonly logger = new Logger(TenantAwarePaymentsService.name);
  private readonly testMode: boolean;
  private paymentRepo: TenantAwareRepository<Payment>;
  private ledgerRepo: TenantAwareRepository<PaymentLedger>;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentLedger)
    private ledgerRepository: Repository<PaymentLedger>,
    private stripeService: StripeService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private dataSource: DataSource,
    @Inject(REQUEST) private request: TenantRequest,
  ) {
    this.testMode = this.configService.get('STRIPE_TEST_MODE', 'true') === 'true';
    
    // Initialize tenant-aware repositories
    this.paymentRepo = new TenantAwareRepository(paymentRepository, 'organizationId');
    this.ledgerRepo = new TenantAwareRepository(ledgerRepository, 'organizationId');
  }

  /**
   * Get current tenant ID from request context
   */
  private getTenantId(): string {
    const tenantId = this.request.tenantId || this.request.user?.organizationId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }
    return tenantId;
  }

  /**
   * Create a payment intent with tenant isolation
   */
  async createPaymentIntent(params: {
    orderId: string;
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, any>;
    paymentMethodId?: string;
    userId: string;
    idempotencyKey: string;
  }) {
    const tenantId = this.getTenantId();
    const { orderId, amount, currency, description, metadata, paymentMethodId, userId, idempotencyKey } = params;

    // Validate user belongs to tenant
    if (this.request.user?.id !== userId && !this.request.user?.isSuperAdmin) {
      throw new UnauthorizedException('Cannot create payment for another user');
    }

    // Validate amount
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Check for existing payment with same idempotency key within tenant
    const existingPayment = await this.paymentRepo.findOne({
      where: { 
        orderId,
        userId,
        status: 'pending',
      },
    }, tenantId);

    if (existingPayment) {
      const intent = await this.stripeService.retrievePaymentIntent(existingPayment.paymentIntentId);
      return this.formatPaymentIntentResponse(intent);
    }

    // Create payment intent in Stripe with tenant metadata
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      description,
      metadata: {
        ...metadata,
        orderId,
        userId,
        organizationId: tenantId, // Include tenant ID in Stripe metadata
        environment: this.testMode ? 'test' : 'live',
      },
      payment_method: paymentMethodId,
      confirm: false,
      capture_method: 'automatic',
      automatic_payment_methods: {
        enabled: true,
      },
    }, idempotencyKey);

    // Save payment record with tenant ID
    const payment = await this.paymentRepo.create({
      userId,
      orderId,
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
      status: 'pending',
      metadata: {
        ...metadata,
        stripeCustomerId: paymentIntent.customer,
      },
    }, tenantId);

    // Create ledger entry
    await this.createLedgerEntry({
      paymentId: payment.id,
      type: 'charge',
      amount,
      currency,
      description: `Payment intent created for order ${orderId}`,
      metadata: { paymentIntentId: paymentIntent.id },
    }, tenantId);

    // Audit log with tenant context
    await this.createAuditLog({
      paymentId: payment.id,
      userId,
      action: 'payment_intent_created',
      details: {
        orderId,
        amount,
        currency,
        paymentIntentId: paymentIntent.id,
        organizationId: tenantId,
      },
    });

    // Emit event with tenant context
    this.eventEmitter.emit('payment.intent.created', {
      payment,
      paymentIntent,
      tenantId,
    });

    return this.formatPaymentIntentResponse(paymentIntent);
  }

  /**
   * Get payment intent with tenant validation
   */
  async getPaymentIntent(intentId: string, userId: string) {
    const tenantId = this.getTenantId();
    
    const payment = await this.paymentRepo.findOne({
      where: { paymentIntentId: intentId, userId },
    }, tenantId);

    if (!payment) {
      throw new NotFoundException('Payment intent not found');
    }

    const paymentIntent = await this.stripeService.retrievePaymentIntent(intentId);
    
    // Verify tenant ownership in Stripe metadata
    if (paymentIntent.metadata.organizationId !== tenantId && !this.request.user?.isSuperAdmin) {
      this.logger.warn(`Cross-tenant access attempt for payment intent ${intentId}`);
      throw new NotFoundException('Payment intent not found');
    }

    return this.formatPaymentIntentResponse(paymentIntent);
  }

  /**
   * Process refund with tenant validation
   */
  async processRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
    description?: string;
    metadata?: Record<string, any>;
    userId: string;
    idempotencyKey: string;
  }) {
    const tenantId = this.getTenantId();
    const { paymentIntentId, amount, reason, description, metadata, userId, idempotencyKey } = params;

    // Find payment record with tenant validation
    const payment = await this.paymentRepo.findOne({
      where: { paymentIntentId },
    }, tenantId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'succeeded') {
      throw new BadRequestException('Can only refund succeeded payments');
    }

    // Calculate refund amount
    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    // Create refund in Stripe
    const refund = await this.stripeService.createRefund({
      payment_intent: paymentIntentId,
      amount: Math.round(refundAmount * 100),
      reason: reason as Stripe.RefundCreateParams.Reason,
      metadata: {
        ...metadata,
        userId,
        organizationId: tenantId,
        description,
      },
    }, idempotencyKey);

    // Update payment status if fully refunded
    if (refundAmount === payment.amount) {
      await this.paymentRepo.update(payment.id, { status: 'refunded' }, tenantId);
    }

    // Create ledger entry
    await this.createLedgerEntry({
      paymentId: payment.id,
      type: 'refund',
      amount: -refundAmount,
      currency: payment.currency,
      description: description || `Refund for payment ${paymentIntentId}`,
      metadata: {
        refundId: refund.id,
        reason,
      },
    }, tenantId);

    // Audit log
    await this.createAuditLog({
      paymentId: payment.id,
      userId,
      action: 'payment_refunded',
      details: {
        refundId: refund.id,
        amount: refundAmount,
        reason,
        description,
        organizationId: tenantId,
      },
    });

    // Emit event
    this.eventEmitter.emit('payment.refunded', {
      payment,
      refund,
      tenantId,
    });

    return {
      id: refund.id,
      paymentIntentId,
      amount: refundAmount,
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
      created: new Date(refund.created * 1000),
    };
  }

  /**
   * Get user payment history with tenant filtering
   */
  async getUserPaymentHistory(userId: string, limit: number, offset: number) {
    const tenantId = this.getTenantId();
    
    // Validate user access
    if (this.request.user?.id !== userId && !this.request.user?.isSuperAdmin) {
      throw new UnauthorizedException('Cannot access another user\'s payment history');
    }

    const payments = await this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    }, tenantId);

    const total = await this.paymentRepo.count({ where: { userId } }, tenantId);

    return {
      payments: payments.map(p => ({
        id: p.id,
        orderId: p.orderId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Handle webhook with tenant validation
   */
  async handleWebhook(signature: string, rawBody: Buffer) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      const event = await this.stripeService.constructWebhookEvent(signature, rawBody);
      
      this.logger.log(`Processing webhook event: ${event.type} (${event.id})`);

      // Extract tenant ID from event metadata
      const eventObject = event.data.object as any;
      const tenantId = eventObject.metadata?.organizationId;

      if (!tenantId) {
        this.logger.warn(`Webhook event ${event.id} missing organization ID`);
        return { received: true };
      }

      // Set tenant context for processing
      this.request.tenantId = tenantId;

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, tenantId);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent, tenantId);
          break;
        
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge, tenantId);
          break;
        
        default:
          this.logger.warn(`Unhandled webhook event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      if (error.message?.includes('signature')) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
      throw new BadRequestException('Webhook processing failed');
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent, tenantId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { paymentIntentId: paymentIntent.id },
    }, tenantId);

    if (!payment) {
      this.logger.warn(`Payment not found for intent: ${paymentIntent.id} in tenant: ${tenantId}`);
      return;
    }

    await this.dataSource.transaction(async manager => {
      // Update payment status
      await this.paymentRepo.update(payment.id, { status: 'succeeded' }, tenantId);

      // Create ledger entry
      await this.createLedgerEntry({
        paymentId: payment.id,
        type: 'charge',
        amount: payment.amount,
        currency: payment.currency,
        description: 'Payment succeeded',
        metadata: {
          chargeId: paymentIntent.latest_charge,
        },
      }, tenantId);
    });

    // Emit event
    this.eventEmitter.emit('payment.succeeded', {
      payment,
      paymentIntent,
      tenantId,
    });
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, tenantId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { paymentIntentId: paymentIntent.id },
    }, tenantId);

    if (!payment) {
      return;
    }

    await this.paymentRepo.update(payment.id, { status: 'failed' }, tenantId);

    await this.createAuditLog({
      paymentId: payment.id,
      userId: payment.userId,
      action: 'payment_failed',
      details: {
        paymentIntentId: paymentIntent.id,
        lastError: paymentIntent.last_payment_error,
        organizationId: tenantId,
      },
    });

    this.eventEmitter.emit('payment.failed', {
      payment,
      paymentIntent,
      tenantId,
    });
  }

  private async handleChargeRefunded(charge: Stripe.Charge, tenantId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { paymentIntentId: charge.payment_intent as string },
    }, tenantId);

    if (!payment) {
      return;
    }

    if (charge.amount_refunded === charge.amount) {
      await this.paymentRepo.update(payment.id, { status: 'refunded' }, tenantId);
    }
  }

  private async createLedgerEntry(data: Partial<PaymentLedger>, tenantId: string) {
    return this.ledgerRepo.create(data, tenantId);
  }

  private async createAuditLog(data: any) {
    const tenantId = this.getTenantId();
    
    // Log to security audit if cross-tenant attempt detected
    if (data.details?.organizationId && data.details.organizationId !== tenantId && !this.request.user?.isSuperAdmin) {
      await this.dataSource.query(
        `INSERT INTO security_audit_log 
         (event_type, user_id, user_organization_id, attempted_organization_id, resource_type, resource_id, ip_address, user_agent, request_path, request_method, details) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          'cross_tenant_access_denied',
          this.request.user?.id,
          tenantId,
          data.details.organizationId,
          'payment',
          data.paymentId,
          this.request.ip,
          this.request.headers['user-agent'],
          this.request.path,
          this.request.method,
          data.details,
        ],
      );
    }

    // Regular audit log
    await this.dataSource.query(
      `INSERT INTO audit_logs (organization_id, entity_type, entity_id, action, changes, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, 'payment', data.paymentId, data.action, data.details, data.userId],
    );
  }

  private formatPaymentIntentResponse(paymentIntent: Stripe.PaymentIntent) {
    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    };
  }
}