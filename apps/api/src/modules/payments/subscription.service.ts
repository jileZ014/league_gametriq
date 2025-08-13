import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from './stripe.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';

// Entity interfaces for subscriptions
interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  priceId: string;
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing';
  planType: 'monthly' | 'yearly' | 'seasonal';
  planName: string;
  amount: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionItem {
  id: string;
  subscriptionId: string;
  priceId: string;
  quantity: number;
  metadata: Record<string, any>;
}

interface Invoice {
  id: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  dueDate: Date;
  paidAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionItem)
    private subscriptionItemRepository: Repository<SubscriptionItem>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    private stripeService: StripeService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create subscription plans for league memberships
   */
  async createSubscriptionPlans(): Promise<void> {
    const plans = [
      {
        id: 'league_monthly',
        name: 'Monthly League Membership',
        amount: 2999, // $29.99
        interval: 'month' as const,
        features: ['Unlimited team registrations', 'Basic stats tracking', 'Email support'],
      },
      {
        id: 'league_yearly',
        name: 'Yearly League Membership',
        amount: 29999, // $299.99 (17% discount)
        interval: 'year' as const,
        features: ['Unlimited team registrations', 'Advanced stats tracking', 'Priority support', 'Custom branding'],
      },
      {
        id: 'league_seasonal',
        name: 'Seasonal League Membership',
        amount: 9999, // $99.99
        interval: 'month' as const,
        intervalCount: 6, // 6 months
        features: ['Unlimited team registrations', 'Basic stats tracking', 'Email support'],
      },
    ];

    try {
      for (const plan of plans) {
        // Create product
        const product = await this.stripeService['stripe'].products.create({
          id: plan.id,
          name: plan.name,
          description: `Legacy Youth Sports - ${plan.name}`,
          metadata: {
            features: JSON.stringify(plan.features),
            planType: plan.interval === 'year' ? 'yearly' : plan.intervalCount ? 'seasonal' : 'monthly',
          },
        });

        // Create price
        await this.stripeService['stripe'].prices.create({
          id: `price_${plan.id}`,
          product: product.id,
          unit_amount: plan.amount,
          currency: 'usd',
          recurring: {
            interval: plan.interval,
            interval_count: (plan as any).intervalCount || 1,
          },
          metadata: {
            planType: plan.interval === 'year' ? 'yearly' : (plan as any).intervalCount ? 'seasonal' : 'monthly',
          },
        });

        this.logger.log(`Created subscription plan: ${plan.name}`);
      }
    } catch (error) {
      if (error.code !== 'resource_already_exists') {
        this.logger.error('Failed to create subscription plans:', error);
        throw error;
      }
    }
  }

  /**
   * Create subscription for a user
   */
  async createSubscription(params: {
    userId: string;
    priceId: string;
    paymentMethodId?: string;
    trialPeriodDays?: number;
    metadata?: Record<string, any>;
    idempotencyKey: string;
  }): Promise<Subscription> {
    const { userId, priceId, paymentMethodId, trialPeriodDays, metadata, idempotencyKey } = params;

    // Check for existing active subscription
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { userId, status: 'active' },
    });

    if (existingSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    try {
      // Get or create customer
      const customer = await this.stripeService.getOrCreateCustomer(userId);

      // Attach payment method if provided
      if (paymentMethodId) {
        await this.stripeService.attachPaymentMethod(paymentMethodId, customer.id);
        await this.stripeService.updateCustomer(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Create subscription
      const subscription = await this.stripeService['stripe'].subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        trial_period_days: trialPeriodDays,
        metadata: {
          ...metadata,
          userId,
          environment: this.stripeService.isTestMode() ? 'test' : 'live',
        },
      }, {
        idempotencyKey,
      });

      // Get price details
      const price = await this.stripeService['stripe'].prices.retrieve(priceId);

      // Save subscription record
      const subscriptionRecord = await this.subscriptionRepository.save({
        userId,
        stripeSubscriptionId: subscription.id,
        priceId,
        status: this.mapSubscriptionStatus(subscription.status),
        planType: this.getPlanType(price),
        planName: price.nickname || `${price.recurring?.interval} plan`,
        amount: price.unit_amount / 100,
        currency: price.currency,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
        metadata: {
          ...metadata,
          stripeSubscription: subscription,
        },
      });

      this.logger.log(`Subscription created: ${subscription.id} for user ${userId}`);

      // Emit event
      this.eventEmitter.emit('subscription.created', {
        subscription: subscriptionRecord,
        stripeSubscription: subscription,
      });

      return subscriptionRecord;
    } catch (error) {
      this.logger.error(`Failed to create subscription for user ${userId}:`, error);
      throw new BadRequestException(`Subscription creation failed: ${error.message}`);
    }
  }

  /**
   * Update subscription (change plan, quantity, etc.)
   */
  async updateSubscription(params: {
    subscriptionId: string;
    userId: string;
    newPriceId?: string;
    quantity?: number;
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
    metadata?: Record<string, any>;
  }): Promise<Subscription> {
    const { subscriptionId, userId, newPriceId, quantity, prorationBehavior = 'create_prorations', metadata } = params;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    try {
      const stripeSubscription = await this.stripeService['stripe'].subscriptions.retrieve(subscriptionId);

      if (newPriceId) {
        // Update subscription item with new price
        await this.stripeService['stripe'].subscriptions.update(subscriptionId, {
          items: [{
            id: stripeSubscription.items.data[0].id,
            price: newPriceId,
            quantity: quantity || 1,
          }],
          proration_behavior: prorationBehavior,
          metadata: {
            ...stripeSubscription.metadata,
            ...metadata,
          },
        });

        // Update local record
        const newPrice = await this.stripeService['stripe'].prices.retrieve(newPriceId);
        subscription.priceId = newPriceId;
        subscription.planType = this.getPlanType(newPrice);
        subscription.planName = newPrice.nickname || `${newPrice.recurring?.interval} plan`;
        subscription.amount = newPrice.unit_amount / 100;
        subscription.currency = newPrice.currency;
      }

      if (metadata) {
        subscription.metadata = { ...subscription.metadata, ...metadata };
      }

      await this.subscriptionRepository.save(subscription);

      this.logger.log(`Subscription updated: ${subscriptionId}`);

      // Emit event
      this.eventEmitter.emit('subscription.updated', {
        subscription,
        changes: { newPriceId, quantity, metadata },
      });

      return subscription;
    } catch (error) {
      this.logger.error(`Failed to update subscription ${subscriptionId}:`, error);
      throw new BadRequestException(`Subscription update failed: ${error.message}`);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(params: {
    subscriptionId: string;
    userId: string;
    cancelAtPeriodEnd?: boolean;
    reason?: string;
  }): Promise<Subscription> {
    const { subscriptionId, userId, cancelAtPeriodEnd = true, reason } = params;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    try {
      let stripeSubscription: Stripe.Subscription;

      if (cancelAtPeriodEnd) {
        // Schedule cancellation at period end
        stripeSubscription = await this.stripeService['stripe'].subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            ...subscription.metadata,
            cancellation_reason: reason || 'user_requested',
            canceled_at: new Date().toISOString(),
          },
        });
      } else {
        // Cancel immediately
        stripeSubscription = await this.stripeService['stripe'].subscriptions.cancel(subscriptionId, {
          invoice_now: true,
          prorate: true,
        });
      }

      // Update local record
      subscription.status = this.mapSubscriptionStatus(stripeSubscription.status);
      subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
      subscription.metadata = {
        ...subscription.metadata,
        cancellation_reason: reason || 'user_requested',
        canceled_at: new Date().toISOString(),
      };

      await this.subscriptionRepository.save(subscription);

      this.logger.log(`Subscription ${cancelAtPeriodEnd ? 'scheduled for cancellation' : 'canceled'}: ${subscriptionId}`);

      // Emit event
      this.eventEmitter.emit('subscription.canceled', {
        subscription,
        immediate: !cancelAtPeriodEnd,
        reason,
      });

      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription ${subscriptionId}:`, error);
      throw new BadRequestException(`Subscription cancellation failed: ${error.message}`);
    }
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== 'canceled' && !subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not canceled');
    }

    try {
      // Reactivate subscription
      const stripeSubscription = await this.stripeService['stripe'].subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        metadata: {
          ...subscription.metadata,
          reactivated_at: new Date().toISOString(),
        },
      });

      // Update local record
      subscription.status = this.mapSubscriptionStatus(stripeSubscription.status);
      subscription.cancelAtPeriodEnd = false;
      subscription.metadata = {
        ...subscription.metadata,
        reactivated_at: new Date().toISOString(),
      };

      await this.subscriptionRepository.save(subscription);

      this.logger.log(`Subscription reactivated: ${subscriptionId}`);

      // Emit event
      this.eventEmitter.emit('subscription.reactivated', { subscription });

      return subscription;
    } catch (error) {
      this.logger.error(`Failed to reactivate subscription ${subscriptionId}:`, error);
      throw new BadRequestException(`Subscription reactivation failed: ${error.message}`);
    }
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get subscription invoices
   */
  async getSubscriptionInvoices(subscriptionId: string, limit = 50): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { subscriptionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Apply discount to subscription
   */
  async applyDiscount(params: {
    subscriptionId: string;
    userId: string;
    couponId: string;
  }): Promise<Subscription> {
    const { subscriptionId, userId, couponId } = params;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    try {
      await this.stripeService['stripe'].subscriptions.update(subscriptionId, {
        coupon: couponId,
      });

      this.logger.log(`Discount applied to subscription: ${subscriptionId}`);

      // Emit event
      this.eventEmitter.emit('subscription.discount.applied', {
        subscription,
        couponId,
      });

      return subscription;
    } catch (error) {
      this.logger.error(`Failed to apply discount to subscription ${subscriptionId}:`, error);
      throw new BadRequestException(`Discount application failed: ${error.message}`);
    }
  }

  /**
   * Handle subscription webhook events
   */
  async handleSubscriptionWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.created':
      case 'invoice.updated':
        await this.handleInvoiceUpdated(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        this.logger.warn(`Unhandled subscription webhook event: ${event.type}`);
    }
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      subscription.status = this.mapSubscriptionStatus(stripeSubscription.status);
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
      subscription.trialEnd = stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : undefined;

      await this.subscriptionRepository.save(subscription);

      this.eventEmitter.emit('subscription.updated', {
        subscription,
        stripeSubscription,
      });
    }
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      subscription.status = 'canceled';
      await this.subscriptionRepository.save(subscription);

      this.eventEmitter.emit('subscription.deleted', {
        subscription,
        stripeSubscription,
      });
    }
  }

  private async handleInvoiceUpdated(stripeInvoice: Stripe.Invoice): Promise<void> {
    if (!stripeInvoice.subscription) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeInvoice.subscription as string },
    });

    if (subscription) {
      let invoice = await this.invoiceRepository.findOne({
        where: { stripeInvoiceId: stripeInvoice.id },
      });

      if (!invoice) {
        invoice = this.invoiceRepository.create({
          subscriptionId: subscription.id,
          stripeInvoiceId: stripeInvoice.id,
          amount: stripeInvoice.amount_due / 100,
          currency: stripeInvoice.currency,
          status: stripeInvoice.status,
          dueDate: new Date(stripeInvoice.due_date * 1000),
          paidAt: stripeInvoice.status_transitions?.paid_at ? new Date(stripeInvoice.status_transitions.paid_at * 1000) : undefined,
          metadata: { stripeInvoice },
        });
      } else {
        invoice.status = stripeInvoice.status;
        invoice.paidAt = stripeInvoice.status_transitions?.paid_at ? new Date(stripeInvoice.status_transitions.paid_at * 1000) : undefined;
      }

      await this.invoiceRepository.save(invoice);
    }
  }

  private async handleInvoicePaymentSucceeded(stripeInvoice: Stripe.Invoice): Promise<void> {
    await this.handleInvoiceUpdated(stripeInvoice);

    if (stripeInvoice.subscription) {
      const subscription = await this.subscriptionRepository.findOne({
        where: { stripeSubscriptionId: stripeInvoice.subscription as string },
      });

      if (subscription) {
        this.eventEmitter.emit('subscription.payment.succeeded', {
          subscription,
          stripeInvoice,
        });
      }
    }
  }

  private async handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
    await this.handleInvoiceUpdated(stripeInvoice);

    if (stripeInvoice.subscription) {
      const subscription = await this.subscriptionRepository.findOne({
        where: { stripeSubscriptionId: stripeInvoice.subscription as string },
      });

      if (subscription) {
        this.eventEmitter.emit('subscription.payment.failed', {
          subscription,
          stripeInvoice,
        });
      }
    }
  }

  private mapSubscriptionStatus(status: Stripe.Subscription.Status): Subscription['status'] {
    const statusMap: Record<Stripe.Subscription.Status, Subscription['status']> = {
      active: 'active',
      past_due: 'past_due',
      unpaid: 'unpaid',
      canceled: 'canceled',
      incomplete: 'incomplete',
      incomplete_expired: 'incomplete_expired',
      trialing: 'trialing',
      paused: 'active', // Map paused to active for simplicity
    };

    return statusMap[status] || 'incomplete';
  }

  private getPlanType(price: Stripe.Price): 'monthly' | 'yearly' | 'seasonal' {
    if (price.recurring?.interval === 'year') {
      return 'yearly';
    } else if (price.recurring?.interval === 'month' && price.recurring?.interval_count === 6) {
      return 'seasonal';
    }
    return 'monthly';
  }
}