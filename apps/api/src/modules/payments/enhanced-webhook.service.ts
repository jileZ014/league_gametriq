import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service';
import { SubscriptionService } from './subscription.service';
import { StripeConnectService } from './stripe-connect.service';
import { PaymentBusinessService } from './payment-business.service';
import { StripeService } from './stripe.service';
import { WebhookEvent } from './entities/webhook-event.entity';
import { RegistrationOrder } from './entities/registration-order.entity';

@Injectable()
export class EnhancedWebhookService {
  private readonly logger = new Logger(EnhancedWebhookService.name);

  constructor(
    @InjectRepository(WebhookEvent)
    private webhookEventRepository: Repository<WebhookEvent>,
    @InjectRepository(RegistrationOrder)
    private orderRepository: Repository<RegistrationOrder>,
    private paymentsService: PaymentsService,
    private subscriptionService: SubscriptionService,
    private stripeConnectService: StripeConnectService,
    private paymentBusinessService: PaymentBusinessService,
    private stripeService: StripeService,
    private eventEmitter: EventEmitter2,
    private dataSource: DataSource,
  ) {}

  /**
   * Main webhook handler with idempotency and comprehensive event processing
   */
  async handleWebhook(signature: string, rawBody: Buffer): Promise<{ received: true }> {
    if (!signature || !rawBody) {
      throw new BadRequestException('Invalid webhook request');
    }

    let event: Stripe.Event;
    try {
      event = await this.stripeService.constructWebhookEvent(signature, rawBody);
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Check for duplicate event (idempotency)
    const existingEvent = await this.webhookEventRepository.findOne({
      where: { stripeEventId: event.id },
    });

    if (existingEvent) {
      this.logger.log(`Duplicate webhook event ignored: ${event.id}`);
      return { received: true };
    }

    // Save webhook event for audit and idempotency
    const webhookEvent = await this.webhookEventRepository.save({
      stripeEventId: event.id,
      eventType: event.type,
      processed: false,
      data: event.data,
      metadata: {
        created: event.created,
        apiVersion: event.api_version,
        request: event.request,
      },
    });

    try {
      // Process event in transaction
      await this.dataSource.transaction(async manager => {
        await this.processWebhookEvent(event, manager);
      });

      // Mark as processed
      webhookEvent.processed = true;
      webhookEvent.processedAt = new Date();
      await this.webhookEventRepository.save(webhookEvent);

      this.logger.log(`Webhook event processed successfully: ${event.type} (${event.id})`);
    } catch (error) {
      this.logger.error(`Failed to process webhook event ${event.id}:`, error);
      
      // Mark as failed
      webhookEvent.processed = false;
      webhookEvent.failureReason = error.message;
      webhookEvent.failureCount = (webhookEvent.failureCount || 0) + 1;
      await this.webhookEventRepository.save(webhookEvent);

      // Emit failure event for monitoring
      this.eventEmitter.emit('webhook.processing.failed', {
        event,
        error: error.message,
        failureCount: webhookEvent.failureCount,
      });

      throw error;
    }

    return { received: true };
  }

  /**
   * Process different webhook event types
   */
  private async processWebhookEvent(event: Stripe.Event, manager?: any): Promise<void> {
    switch (event.type) {
      // Payment Intent Events
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.requires_action':
        await this.handlePaymentIntentRequiresAction(event.data.object as Stripe.PaymentIntent);
        break;

      // Charge Events
      case 'charge.succeeded':
        await this.handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;

      case 'charge.failed':
        await this.handleChargeFailed(event.data.object as Stripe.Charge);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        await this.handleChargeDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      case 'charge.dispute.updated':
        await this.handleChargeDisputeUpdated(event.data.object as Stripe.Dispute);
        break;

      case 'charge.dispute.closed':
        await this.handleChargeDisputeClosed(event.data.object as Stripe.Dispute);
        break;

      // Payment Method Events
      case 'payment_method.attached':
        await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'payment_method.detached':
        await this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
        break;

      // Customer Events
      case 'customer.created':
        await this.handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      case 'customer.updated':
        await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      case 'customer.deleted':
        await this.handleCustomerDeleted(event.data.object as Stripe.Customer);
        break;

      // Subscription Events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.subscriptionService.handleSubscriptionWebhook(event);
        break;

      case 'customer.subscription.deleted':
        await this.subscriptionService.handleSubscriptionWebhook(event);
        break;

      case 'customer.subscription.trial_will_end':
        await this.handleSubscriptionTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      // Invoice Events
      case 'invoice.created':
      case 'invoice.updated':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        await this.subscriptionService.handleSubscriptionWebhook(event);
        break;

      case 'invoice.upcoming':
        await this.handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
        break;

      // Connect Events
      case 'account.updated':
      case 'account.application.deauthorized':
      case 'transfer.created':
      case 'transfer.paid':
      case 'transfer.failed':
        await this.stripeConnectService.handleConnectWebhook(event);
        break;

      // Payout Events
      case 'payout.created':
        await this.handlePayoutCreated(event.data.object as Stripe.Payout);
        break;

      case 'payout.paid':
        await this.handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      case 'payout.failed':
        await this.handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      // Fraud and Risk Events
      case 'radar.early_fraud_warning.created':
        await this.handleEarlyFraudWarning(event.data.object as Stripe.Radar.EarlyFraudWarning);
        break;

      case 'review.opened':
        await this.handleReviewOpened(event.data.object as Stripe.Review);
        break;

      case 'review.closed':
        await this.handleReviewClosed(event.data.object as Stripe.Review);
        break;

      // Setup Intent Events (for saving payment methods)
      case 'setup_intent.succeeded':
        await this.handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;

      case 'setup_intent.setup_failed':
        await this.handleSetupIntentFailed(event.data.object as Stripe.SetupIntent);
        break;

      default:
        this.logger.warn(`Unhandled webhook event type: ${event.type}`);
    }

    // Emit generic webhook event for monitoring and analytics
    this.eventEmitter.emit('webhook.event.processed', {
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date(),
    });
  }

  /**
   * Handle successful payment intent - complete order
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Update order status if this is an order payment
    if (paymentIntent.metadata?.orderType) {
      const order = await this.orderRepository.findOne({
        where: { paymentIntentId: paymentIntent.id },
        relations: ['items', 'discounts'],
      });

      if (order) {
        order.status = 'paid';
        await this.orderRepository.save(order);

        // Emit order completion event
        this.eventEmitter.emit('payment.order.completed', {
          order,
          paymentIntent,
        });

        // Handle specific order types
        switch (order.orderType) {
          case 'team_registration':
            await this.handleTeamRegistrationComplete(order, paymentIntent);
            break;
          
          case 'tournament_entry':
            await this.handleTournamentEntryComplete(order, paymentIntent);
            break;
          
          case 'referee_certification':
            await this.handleRefereeCertificationComplete(order, paymentIntent);
            break;
        }
      }
    }

    // Call original payment service handler
    await this.paymentsService.handleWebhook('payment_intent.succeeded', Buffer.from(JSON.stringify({ data: { object: paymentIntent } })));
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { paymentIntentId: paymentIntent.id },
    });

    if (order) {
      // Don't change order status - allow retry
      this.eventEmitter.emit('payment.order.failed', {
        order,
        paymentIntent,
        reason: paymentIntent.last_payment_error?.message,
      });
    }

    await this.paymentsService.handleWebhook('payment_intent.payment_failed', Buffer.from(JSON.stringify({ data: { object: paymentIntent } })));
  }

  /**
   * Handle payment intent requiring action (3D Secure, etc.)
   */
  private async handlePaymentIntentRequiresAction(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.eventEmitter.emit('payment.requires_action', {
      paymentIntent,
      nextAction: paymentIntent.next_action,
    });
  }

  /**
   * Handle successful charge with additional business logic
   */
  private async handleChargeSucceeded(charge: Stripe.Charge): Promise<void> {
    // Additional fraud checks for high-value transactions
    if (charge.amount > 50000) { // $500+
      this.eventEmitter.emit('payment.high_value.succeeded', {
        charge,
        amount: charge.amount / 100,
      });
    }

    // Check for first-time customer
    if (charge.customer) {
      const customer = await this.stripeService['stripe'].customers.retrieve(charge.customer as string);
      if (customer && !customer.deleted) {
        const charges = await this.stripeService['stripe'].charges.list({
          customer: customer.id,
          limit: 2,
        });

        if (charges.data.length === 1) {
          this.eventEmitter.emit('payment.first_time_customer', {
            charge,
            customer,
          });
        }
      }
    }
  }

  /**
   * Handle dispute creation with immediate notifications
   */
  private async handleChargeDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    // High priority notification for disputes
    this.eventEmitter.emit('payment.dispute.created', {
      dispute,
      severity: 'high',
      requiresAction: true,
    });

    await this.paymentsService.handleWebhook('charge.dispute.created', Buffer.from(JSON.stringify({ data: { object: dispute } })));
  }

  /**
   * Handle dispute updates
   */
  private async handleChargeDisputeUpdated(dispute: Stripe.Dispute): Promise<void> {
    this.eventEmitter.emit('payment.dispute.updated', {
      dispute,
      status: dispute.status,
    });
  }

  /**
   * Handle dispute closure
   */
  private async handleChargeDisputeClosed(dispute: Stripe.Dispute): Promise<void> {
    this.eventEmitter.emit('payment.dispute.closed', {
      dispute,
      outcome: dispute.status,
    });
  }

  /**
   * Handle early fraud warning
   */
  private async handleEarlyFraudWarning(warning: Stripe.Radar.EarlyFraudWarning): Promise<void> {
    this.eventEmitter.emit('payment.fraud.warning', {
      warning,
      severity: 'critical',
      requiresImmediateAction: true,
    });
  }

  /**
   * Handle team registration completion
   */
  private async handleTeamRegistrationComplete(order: RegistrationOrder, paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Create team records, assign to league, send confirmation emails
    this.eventEmitter.emit('registration.team.completed', {
      order,
      paymentIntent,
      teams: order.metadata.teamNames || [],
      league: order.leagueId,
      division: order.metadata.division,
    });
  }

  /**
   * Handle tournament entry completion
   */
  private async handleTournamentEntryComplete(order: RegistrationOrder, paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.eventEmitter.emit('tournament.entry.completed', {
      order,
      paymentIntent,
      tournament: order.metadata.tournamentId,
      team: order.metadata.teamId,
    });
  }

  /**
   * Handle referee certification completion
   */
  private async handleRefereeCertificationComplete(order: RegistrationOrder, paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.eventEmitter.emit('referee.certification.completed', {
      order,
      paymentIntent,
      userId: order.userId,
    });
  }

  /**
   * Handle subscription trial ending soon
   */
  private async handleSubscriptionTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    this.eventEmitter.emit('subscription.trial.ending', {
      subscription,
      trialEndDate: new Date(subscription.trial_end * 1000),
      daysRemaining: Math.ceil((subscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
    });
  }

  /**
   * Handle upcoming invoice
   */
  private async handleInvoiceUpcoming(invoice: Stripe.Invoice): Promise<void> {
    this.eventEmitter.emit('subscription.invoice.upcoming', {
      invoice,
      dueDate: new Date(invoice.due_date * 1000),
      amount: invoice.amount_due / 100,
    });
  }

  /**
   * Handle payout events for Connect accounts
   */
  private async handlePayoutCreated(payout: Stripe.Payout): Promise<void> {
    this.eventEmitter.emit('payout.created', { payout });
  }

  private async handlePayoutPaid(payout: Stripe.Payout): Promise<void> {
    this.eventEmitter.emit('payout.paid', { payout });
  }

  private async handlePayoutFailed(payout: Stripe.Payout): Promise<void> {
    this.eventEmitter.emit('payout.failed', {
      payout,
      reason: payout.failure_message,
    });
  }

  /**
   * Handle payment method events
   */
  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    this.eventEmitter.emit('payment_method.attached', { paymentMethod });
  }

  private async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    this.eventEmitter.emit('payment_method.detached', { paymentMethod });
  }

  /**
   * Handle customer events
   */
  private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    this.eventEmitter.emit('customer.created', { customer });
  }

  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    this.eventEmitter.emit('customer.updated', { customer });
  }

  private async handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
    this.eventEmitter.emit('customer.deleted', { customer });
  }

  /**
   * Handle setup intent events
   */
  private async handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent): Promise<void> {
    this.eventEmitter.emit('setup_intent.succeeded', { setupIntent });
  }

  private async handleSetupIntentFailed(setupIntent: Stripe.SetupIntent): Promise<void> {
    this.eventEmitter.emit('setup_intent.failed', {
      setupIntent,
      reason: setupIntent.last_setup_error?.message,
    });
  }

  /**
   * Handle review events for manual review
   */
  private async handleReviewOpened(review: Stripe.Review): Promise<void> {
    this.eventEmitter.emit('payment.review.opened', {
      review,
      severity: 'high',
      requiresAction: true,
    });
  }

  private async handleReviewClosed(review: Stripe.Review): Promise<void> {
    this.eventEmitter.emit('payment.review.closed', {
      review,
      outcome: review.reason,
    });
  }

  /**
   * Handle charge failures with enhanced logging
   */
  private async handleChargeFailed(charge: Stripe.Charge): Promise<void> {
    this.eventEmitter.emit('payment.charge.failed', {
      charge,
      reason: charge.failure_message,
      code: charge.failure_code,
    });
  }

  /**
   * Get webhook event processing statistics
   */
  async getWebhookStats(startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    processedEvents: number;
    failedEvents: number;
    eventTypes: Record<string, number>;
    averageProcessingTime: number;
  }> {
    const events = await this.webhookEventRepository.find({
      where: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      } as any,
    });

    const totalEvents = events.length;
    const processedEvents = events.filter(e => e.processed).length;
    const failedEvents = events.filter(e => !e.processed && e.failureReason).length;

    const eventTypes = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});

    const processedEventsWithTime = events.filter(e => e.processed && e.processedAt);
    const averageProcessingTime = processedEventsWithTime.length > 0
      ? processedEventsWithTime.reduce((sum, event) => {
          return sum + (event.processedAt.getTime() - event.createdAt.getTime());
        }, 0) / processedEventsWithTime.length
      : 0;

    return {
      totalEvents,
      processedEvents,
      failedEvents,
      eventTypes,
      averageProcessingTime: Math.round(averageProcessingTime),
    };
  }
}