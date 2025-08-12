import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { getStripeWebhookSecret } from '../config/secrets';

interface WebhookEvent {
  id: string;
  stripeEventId: string;
  type: string;
  data: any;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  retryCount: number;
  createdAt: Date;
}

interface WebhookProcessingResult {
  success: boolean;
  message?: string;
  shouldRetry?: boolean;
}

@Injectable()
export class StripeWebhookHandler {
  private readonly logger = new Logger(StripeWebhookHandler.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 5000; // 5 seconds
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    @InjectRepository(WebhookEvent)
    private webhookEventRepository: Repository<WebhookEvent>,
    private configService: ConfigService,
  ) {
    // Initialize Stripe with proper secret retrieval
    const isTestMode = this.configService.get('STRIPE_TEST_MODE', 'true') === 'true';
    this.webhookSecret = getStripeWebhookSecret(isTestMode);
    
    // Initialize Stripe client for webhook event reconstruction
    const apiKey = isTestMode 
      ? this.configService.get('STRIPE_TEST_SECRET_KEY')
      : this.configService.get('STRIPE_LIVE_SECRET_KEY');
      
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  /**
   * Verify webhook signature and process the event
   * @param signature - Stripe signature header
   * @param rawBody - Raw request body as Buffer
   * @returns Processing result
   * @throws UnauthorizedException if signature verification fails
   */
  async verifyAndProcessWebhook(
    signature: string,
    rawBody: Buffer,
  ): Promise<WebhookProcessingResult> {
    if (!signature) {
      this.logger.error('Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;
    
    try {
      // Verify webhook signature - fail closed on any error
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
      
      this.logger.log(`Webhook signature verified for event: ${event.type} (${event.id})`);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      
      // Log additional details for debugging (but not the actual signature)
      this.logger.error('Verification error details:', {
        errorType: err.constructor.name,
        errorCode: err.code,
        hasSignature: !!signature,
        bodyLength: rawBody?.length || 0,
      });
      
      // Always fail closed - reject invalid signatures
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process the verified event
    return this.processWebhookEvent(event);
  }

  async processWebhookEvent(event: Stripe.Event): Promise<WebhookProcessingResult> {
    this.logger.log(`Processing webhook event: ${event.type} (${event.id})`);

    // Check if event already processed
    const existingEvent = await this.webhookEventRepository.findOne({
      where: { stripeEventId: event.id },
    });

    if (existingEvent?.processed) {
      this.logger.log(`Event ${event.id} already processed`);
      return { success: true, message: 'Event already processed' };
    }

    // Save or update webhook event
    const webhookEvent = await this.webhookEventRepository.save({
      id: existingEvent?.id,
      stripeEventId: event.id,
      type: event.type,
      data: event.data,
      processed: false,
      retryCount: existingEvent?.retryCount || 0,
    });

    try {
      const result = await this.handleEvent(event);
      
      // Mark as processed
      webhookEvent.processed = true;
      webhookEvent.processedAt = new Date();
      await this.webhookEventRepository.save(webhookEvent);

      return result;
    } catch (error) {
      this.logger.error(`Failed to process event ${event.id}:`, error);
      
      // Update retry count and error
      webhookEvent.retryCount += 1;
      webhookEvent.error = error.message;
      await this.webhookEventRepository.save(webhookEvent);

      // Check if should retry
      if (webhookEvent.retryCount < this.maxRetries) {
        this.scheduleRetry(webhookEvent);
        return { 
          success: false, 
          message: error.message, 
          shouldRetry: true 
        };
      }

      return { 
        success: false, 
        message: `Max retries exceeded: ${error.message}` 
      };
    }
  }

  private async handleEvent(event: Stripe.Event): Promise<WebhookProcessingResult> {
    switch (event.type) {
      // Payment Intent Events
      case 'payment_intent.created':
        return this.handlePaymentIntentCreated(event.data.object as Stripe.PaymentIntent);
      
      case 'payment_intent.succeeded':
        return this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      
      case 'payment_intent.payment_failed':
        return this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      
      case 'payment_intent.canceled':
        return this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);

      // Charge Events
      case 'charge.succeeded':
        return this.handleChargeSucceeded(event.data.object as Stripe.Charge);
      
      case 'charge.failed':
        return this.handleChargeFailed(event.data.object as Stripe.Charge);
      
      case 'charge.refunded':
        return this.handleChargeRefunded(event.data.object as Stripe.Charge);
      
      case 'charge.dispute.created':
        return this.handleDisputeCreated(event.data.object as Stripe.Dispute);
      
      case 'charge.dispute.updated':
        return this.handleDisputeUpdated(event.data.object as Stripe.Dispute);

      // Customer Events
      case 'customer.created':
        return this.handleCustomerCreated(event.data.object as Stripe.Customer);
      
      case 'customer.updated':
        return this.handleCustomerUpdated(event.data.object as Stripe.Customer);
      
      case 'customer.deleted':
        return this.handleCustomerDeleted(event.data.object as Stripe.Customer);

      // Payment Method Events
      case 'payment_method.attached':
        return this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
      
      case 'payment_method.detached':
        return this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);

      // Checkout Session Events
      case 'checkout.session.completed':
        return this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      
      case 'checkout.session.expired':
        return this.handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);

      // Invoice Events
      case 'invoice.payment_succeeded':
        return this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      
      case 'invoice.payment_failed':
        return this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);

      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
        return { success: true, message: `Event type ${event.type} not handled` };
    }
  }

  // Payment Intent Handlers
  private async handlePaymentIntentCreated(paymentIntent: Stripe.PaymentIntent): Promise<WebhookProcessingResult> {
    this.logger.log(`Payment intent created: ${paymentIntent.id}`);
    
    // Emit event for other services to handle
    this.emitEvent('stripe.payment_intent.created', paymentIntent);
    
    return { success: true };
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<WebhookProcessingResult> {
    this.logger.log(`Payment intent succeeded: ${paymentIntent.id}`);
    
    // Extract metadata
    const { orderId, userId } = paymentIntent.metadata;
    
    if (!orderId || !userId) {
      this.logger.warn(`Missing metadata for payment intent ${paymentIntent.id}`);
    }

    // Emit event with enriched data
    this.emitEvent('stripe.payment_intent.succeeded', {
      paymentIntent,
      orderId,
      userId,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    });
    
    return { success: true };
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<WebhookProcessingResult> {
    this.logger.log(`Payment intent failed: ${paymentIntent.id}`);
    
    const { orderId, userId } = paymentIntent.metadata;
    
    // Emit event with failure details
    this.emitEvent('stripe.payment_intent.failed', {
      paymentIntent,
      orderId,
      userId,
      error: paymentIntent.last_payment_error,
    });
    
    return { success: true };
  }

  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<WebhookProcessingResult> {
    this.logger.log(`Payment intent canceled: ${paymentIntent.id}`);
    
    const { orderId, userId } = paymentIntent.metadata;
    
    this.emitEvent('stripe.payment_intent.canceled', {
      paymentIntent,
      orderId,
      userId,
    });
    
    return { success: true };
  }

  // Charge Handlers
  private async handleChargeSucceeded(charge: Stripe.Charge): Promise<WebhookProcessingResult> {
    this.logger.log(`Charge succeeded: ${charge.id}`);
    
    this.emitEvent('stripe.charge.succeeded', charge);
    
    return { success: true };
  }

  private async handleChargeFailed(charge: Stripe.Charge): Promise<WebhookProcessingResult> {
    this.logger.log(`Charge failed: ${charge.id}`);
    
    this.emitEvent('stripe.charge.failed', {
      charge,
      failureCode: charge.failure_code,
      failureMessage: charge.failure_message,
    });
    
    return { success: true };
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<WebhookProcessingResult> {
    this.logger.log(`Charge refunded: ${charge.id}`);
    
    const refundAmount = charge.amount_refunded / 100;
    const isFullRefund = charge.amount_refunded === charge.amount;
    
    this.emitEvent('stripe.charge.refunded', {
      charge,
      refundAmount,
      isFullRefund,
      paymentIntentId: charge.payment_intent,
    });
    
    return { success: true };
  }

  // Dispute Handlers
  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<WebhookProcessingResult> {
    this.logger.warn(`Dispute created: ${dispute.id} for charge ${dispute.charge}`);
    
    this.emitEvent('stripe.dispute.created', {
      dispute,
      amount: dispute.amount / 100,
      reason: dispute.reason,
      paymentIntentId: dispute.payment_intent,
    });
    
    // Send alert to administrators
    this.sendDisputeAlert(dispute);
    
    return { success: true };
  }

  private async handleDisputeUpdated(dispute: Stripe.Dispute): Promise<WebhookProcessingResult> {
    this.logger.log(`Dispute updated: ${dispute.id}`);
    
    this.emitEvent('stripe.dispute.updated', {
      dispute,
      status: dispute.status,
    });
    
    return { success: true };
  }

  // Customer Handlers
  private async handleCustomerCreated(customer: Stripe.Customer): Promise<WebhookProcessingResult> {
    this.logger.log(`Customer created: ${customer.id}`);
    
    this.emitEvent('stripe.customer.created', customer);
    
    return { success: true };
  }

  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<WebhookProcessingResult> {
    this.logger.log(`Customer updated: ${customer.id}`);
    
    this.emitEvent('stripe.customer.updated', customer);
    
    return { success: true };
  }

  private async handleCustomerDeleted(customer: Stripe.Customer): Promise<WebhookProcessingResult> {
    this.logger.log(`Customer deleted: ${customer.id}`);
    
    this.emitEvent('stripe.customer.deleted', {
      customerId: customer.id,
      userId: customer.metadata?.userId,
    });
    
    return { success: true };
  }

  // Payment Method Handlers
  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<WebhookProcessingResult> {
    this.logger.log(`Payment method attached: ${paymentMethod.id}`);
    
    this.emitEvent('stripe.payment_method.attached', paymentMethod);
    
    return { success: true };
  }

  private async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<WebhookProcessingResult> {
    this.logger.log(`Payment method detached: ${paymentMethod.id}`);
    
    this.emitEvent('stripe.payment_method.detached', paymentMethod);
    
    return { success: true };
  }

  // Checkout Session Handlers
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<WebhookProcessingResult> {
    this.logger.log(`Checkout session completed: ${session.id}`);
    
    this.emitEvent('stripe.checkout.session.completed', {
      session,
      paymentIntentId: session.payment_intent,
      customerId: session.customer,
      metadata: session.metadata,
    });
    
    return { success: true };
  }

  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<WebhookProcessingResult> {
    this.logger.log(`Checkout session expired: ${session.id}`);
    
    this.emitEvent('stripe.checkout.session.expired', session);
    
    return { success: true };
  }

  // Invoice Handlers
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<WebhookProcessingResult> {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);
    
    this.emitEvent('stripe.invoice.payment_succeeded', invoice);
    
    return { success: true };
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<WebhookProcessingResult> {
    this.logger.log(`Invoice payment failed: ${invoice.id}`);
    
    this.emitEvent('stripe.invoice.payment_failed', invoice);
    
    return { success: true };
  }

  // Helper Methods
  private emitEvent(eventName: string, data: any): void {
    // This would emit to your event bus/queue
    // Implementation depends on your event system
    this.logger.log(`Emitting event: ${eventName}`);
  }

  private async sendDisputeAlert(dispute: Stripe.Dispute): Promise<void> {
    // Send notification to administrators about the dispute
    this.logger.warn(`ALERT: New dispute ${dispute.id} for amount ${dispute.amount / 100} ${dispute.currency}`);
    
    // Implementation would send email/SMS/Slack notification
  }

  private scheduleRetry(webhookEvent: WebhookEvent): void {
    setTimeout(async () => {
      this.logger.log(`Retrying webhook event ${webhookEvent.stripeEventId} (attempt ${webhookEvent.retryCount + 1})`);
      
      try {
        // Reconstruct Stripe event from stored data
        // Note: Retried events bypass signature verification as they're already verified
        const event: Stripe.Event = {
          id: webhookEvent.stripeEventId,
          type: webhookEvent.type,
          data: webhookEvent.data,
          object: 'event',
          api_version: '2023-10-16',
          created: Math.floor(webhookEvent.createdAt.getTime() / 1000),
          livemode: !this.configService.get('STRIPE_TEST_MODE', true),
          pending_webhooks: 0,
          request: null,
        };
        
        await this.processWebhookEvent(event);
      } catch (error) {
        this.logger.error(`Retry failed for event ${webhookEvent.stripeEventId}:`, error);
      }
    }, this.retryDelay * webhookEvent.retryCount);
  }

  // Cleanup old processed events
  @OnEvent('cron.daily')
  async cleanupOldEvents(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.webhookEventRepository
      .createQueryBuilder()
      .delete()
      .where('processed = :processed', { processed: true })
      .andWhere('processedAt < :date', { date: thirtyDaysAgo })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old webhook events`);
  }
}

// Export for module registration
export default StripeWebhookHandler;