import { Injectable, BadRequestException, NotFoundException, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { StripeWebhookHandler } from '../../webhooks/stripe_live';
import { RegistrationService } from '../users/registration.service';
import { hashIpAddress } from '../../utils/ip_hash';

// Entities
interface Payment {
  id: string;
  userId: string;
  orderId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface PaymentLedger {
  id: string;
  paymentId: string;
  type: 'charge' | 'refund' | 'dispute' | 'adjustment';
  amount: number;
  currency: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

interface PaymentAudit {
  id: string;
  paymentId: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly testMode: boolean;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentLedger)
    private ledgerRepository: Repository<PaymentLedger>,
    @InjectRepository(PaymentAudit)
    private auditRepository: Repository<PaymentAudit>,
    private stripeService: StripeService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private dataSource: DataSource,
    private registrationService: RegistrationService,
  ) {
    this.testMode = this.configService.get('STRIPE_TEST_MODE', 'true') === 'true';
  }

  async createPaymentIntent(params: {
    orderId: string;
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, any>;
    paymentMethodId?: string;
    userId: string;
    idempotencyKey: string;
    ipAddress?: string;
  }) {
    const { orderId, amount, currency, description, metadata, paymentMethodId, userId, idempotencyKey, ipAddress } = params;

    // Validate amount
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // COPPA Compliance: Check parental consent for minors
    const hasConsent = await this.registrationService.hasValidPaymentConsent(userId);
    if (!hasConsent) {
      throw new ForbiddenException('Parental consent required for payment processing');
    }

    // Check for existing payment with same idempotency key
    const existingPayment = await this.paymentRepository.findOne({
      where: { 
        orderId,
        userId,
        status: 'pending',
      },
    });

    if (existingPayment) {
      // Return existing payment intent if found
      const intent = await this.stripeService.retrievePaymentIntent(existingPayment.paymentIntentId);
      return this.formatPaymentIntentResponse(intent);
    }

    // Create payment intent in Stripe
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      description,
      metadata: {
        ...metadata,
        orderId,
        userId,
        environment: this.testMode ? 'test' : 'live',
      },
      payment_method: paymentMethodId,
      confirm: false,
      capture_method: 'automatic',
      automatic_payment_methods: {
        enabled: true,
      },
    }, idempotencyKey);

    // Save payment record
    const payment = await this.paymentRepository.save({
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
    });

    // Create ledger entry
    await this.createLedgerEntry({
      paymentId: payment.id,
      type: 'charge',
      amount,
      currency,
      description: `Payment intent created for order ${orderId}`,
      metadata: { paymentIntentId: paymentIntent.id },
    });

    // Audit log with IP hash
    await this.createAuditLog({
      paymentId: payment.id,
      userId,
      action: 'payment_intent_created',
      details: {
        orderId,
        amount,
        currency,
        paymentIntentId: paymentIntent.id,
      },
      ipAddress: ipAddress ? hashIpAddress(ipAddress) : undefined,
    });

    // Emit event
    this.eventEmitter.emit('payment.intent.created', {
      payment,
      paymentIntent,
    });

    return this.formatPaymentIntentResponse(paymentIntent);
  }

  async confirmPaymentIntent(intentId: string, userId: string, paymentMethodId?: string) {
    // Find payment record
    const payment = await this.paymentRepository.findOne({
      where: { paymentIntentId: intentId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment intent not found');
    }

    if (payment.status !== 'pending') {
      throw new BadRequestException(`Payment is already ${payment.status}`);
    }

    // Confirm payment intent in Stripe
    const paymentIntent = await this.stripeService.confirmPaymentIntent(intentId, {
      payment_method: paymentMethodId,
    });

    // Update payment status
    payment.status = this.mapStripeStatus(paymentIntent.status);
    await this.paymentRepository.save(payment);

    // Audit log
    await this.createAuditLog({
      paymentId: payment.id,
      userId,
      action: 'payment_intent_confirmed',
      details: {
        paymentIntentId: intentId,
        status: paymentIntent.status,
      },
    });

    return this.formatPaymentIntentResponse(paymentIntent);
  }

  async getPaymentIntent(intentId: string, userId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { paymentIntentId: intentId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment intent not found');
    }

    const paymentIntent = await this.stripeService.retrievePaymentIntent(intentId);
    return this.formatPaymentIntentResponse(paymentIntent);
  }

  async processRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
    description?: string;
    metadata?: Record<string, any>;
    userId: string;
    idempotencyKey: string;
  }) {
    const { paymentIntentId, amount, reason, description, metadata, userId, idempotencyKey } = params;

    // Find payment record
    const payment = await this.paymentRepository.findOne({
      where: { paymentIntentId },
    });

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
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: reason as Stripe.RefundCreateParams.Reason,
      metadata: {
        ...metadata,
        userId,
        description,
      },
    }, idempotencyKey);

    // Update payment status if fully refunded
    if (refundAmount === payment.amount) {
      payment.status = 'refunded';
      await this.paymentRepository.save(payment);
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
    });

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
      },
    });

    // Emit event
    this.eventEmitter.emit('payment.refunded', {
      payment,
      refund,
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

  async handleWebhook(signature: string, rawBody: Buffer) {
    if (!signature) {
      this.logger.error('Missing stripe-signature header in webhook request');
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!rawBody || rawBody.length === 0) {
      this.logger.error('Empty webhook body received');
      throw new BadRequestException('Empty webhook body');
    }

    try {
      // Verify and construct the webhook event
      const event = await this.stripeService.constructWebhookEvent(signature, rawBody);
      
      this.logger.log(`Webhook signature verified. Processing event: ${event.type} (${event.id})`);

      // Process based on event type
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;
        
        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
          break;
        
        default:
          this.logger.warn(`Unhandled webhook event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      // Check if it's a signature verification error
      if (error.message?.includes('signature') || error.type === 'StripeSignatureVerificationError') {
        this.logger.error('Webhook signature verification failed:', {
          error: error.message,
          signaturePresent: !!signature,
          bodyLength: rawBody?.length || 0,
        });
        throw new UnauthorizedException('Invalid webhook signature');
      }
      
      this.logger.error('Webhook processing error:', error);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.paymentRepository.findOne({
      where: { paymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for intent: ${paymentIntent.id}`);
      return;
    }

    // Use transaction to ensure consistency
    await this.dataSource.transaction(async manager => {
      // Update payment status
      payment.status = 'succeeded';
      await manager.save(payment);

      // Create ledger entry
      await manager.save(PaymentLedger, {
        paymentId: payment.id,
        type: 'charge',
        amount: payment.amount,
        currency: payment.currency,
        description: 'Payment succeeded',
        metadata: {
          chargeId: paymentIntent.latest_charge,
        },
      });

      // Audit log
      await manager.save(PaymentAudit, {
        paymentId: payment.id,
        userId: payment.userId,
        action: 'payment_succeeded',
        details: {
          paymentIntentId: paymentIntent.id,
          chargeId: paymentIntent.latest_charge,
        },
      });
    });

    // Emit event
    this.eventEmitter.emit('payment.succeeded', {
      payment,
      paymentIntent,
    });
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.paymentRepository.findOne({
      where: { paymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      return;
    }

    payment.status = 'failed';
    await this.paymentRepository.save(payment);

    // Audit log
    await this.createAuditLog({
      paymentId: payment.id,
      userId: payment.userId,
      action: 'payment_failed',
      details: {
        paymentIntentId: paymentIntent.id,
        lastError: paymentIntent.last_payment_error,
      },
    });

    // Emit event
    this.eventEmitter.emit('payment.failed', {
      payment,
      paymentIntent,
    });
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    const payment = await this.paymentRepository.findOne({
      where: { paymentIntentId: charge.payment_intent as string },
    });

    if (!payment) {
      return;
    }

    // Check if fully refunded
    if (charge.amount_refunded === charge.amount) {
      payment.status = 'refunded';
      await this.paymentRepository.save(payment);
    }

    // Ledger entry is created by processRefund method
    // This webhook serves as confirmation
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute) {
    const payment = await this.paymentRepository.findOne({
      where: { paymentIntentId: dispute.payment_intent as string },
    });

    if (!payment) {
      return;
    }

    // Create ledger entry for dispute
    await this.createLedgerEntry({
      paymentId: payment.id,
      type: 'dispute',
      amount: -dispute.amount / 100, // Convert from cents
      currency: dispute.currency,
      description: `Dispute created: ${dispute.reason}`,
      metadata: {
        disputeId: dispute.id,
        reason: dispute.reason,
      },
    });

    // Emit event
    this.eventEmitter.emit('payment.dispute.created', {
      payment,
      dispute,
    });
  }

  async getUserPaymentHistory(userId: string, limit: number, offset: number) {
    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

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

  async getUserPaymentMethods(userId: string) {
    const customer = await this.stripeService.getOrCreateCustomer(userId);
    const paymentMethods = await this.stripeService.listPaymentMethods(customer.id);
    
    return paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      } : null,
      isDefault: customer.invoice_settings?.default_payment_method === pm.id,
    }));
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    const customer = await this.stripeService.getOrCreateCustomer(userId);
    await this.stripeService.updateCustomer(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    await this.createAuditLog({
      paymentId: null,
      userId,
      action: 'default_payment_method_updated',
      details: { paymentMethodId },
    });

    return { success: true };
  }

  async getPublicConfig() {
    return {
      publishableKey: this.configService.get('STRIPE_PUBLISHABLE_KEY'),
      testMode: this.testMode,
      supportedCurrencies: ['usd', 'eur', 'gbp'],
      supportedPaymentMethods: ['card', 'us_bank_account'],
    };
  }

  private async createLedgerEntry(data: Partial<PaymentLedger>) {
    return this.ledgerRepository.save(data);
  }

  private async createAuditLog(data: Partial<PaymentAudit>) {
    return this.auditRepository.save(data);
  }

  private formatPaymentIntentResponse(paymentIntent: Stripe.PaymentIntent) {
    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    };
  }

  private mapStripeStatus(status: Stripe.PaymentIntent.Status): Payment['status'] {
    const statusMap: Record<Stripe.PaymentIntent.Status, Payment['status']> = {
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      processing: 'processing',
      requires_capture: 'processing',
      canceled: 'canceled',
      succeeded: 'succeeded',
    };

    return statusMap[status] || 'failed';
  }
}