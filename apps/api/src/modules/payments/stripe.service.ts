import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getStripeSecret, getStripeWebhookSecret } from '../../config/secrets';

interface StripeCustomer {
  id: string;
  userId: string;
  customerId: string;
  email: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private readonly webhookSecret: string;
  private readonly testMode: boolean;

  constructor(
    private configService: ConfigService,
    @InjectRepository(StripeCustomer)
    private customerRepository: Repository<StripeCustomer>,
  ) {
    this.testMode = this.configService.get('STRIPE_TEST_MODE', 'true') === 'true';
    
    try {
      // Use secure secret retrieval
      const apiKey = getStripeSecret(this.testMode);
      
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
        typescript: true,
        telemetry: false,
      });

      // Get webhook secret securely
      this.webhookSecret = getStripeWebhookSecret(this.testMode);
      
      this.logger.log(`Stripe service initialized in ${this.testMode ? 'TEST' : 'LIVE'} mode`);
    } catch (error) {
      this.logger.error('Failed to initialize Stripe service:', error.message);
      throw error;
    }
  }

  async createPaymentIntent(
    params: Stripe.PaymentIntentCreateParams,
    idempotencyKey?: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const options: Stripe.RequestOptions = {};
      if (idempotencyKey) {
        options.idempotencyKey = idempotencyKey;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(params, options);
      
      this.logger.log(`Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to create payment intent:', error);
      throw this.handleStripeError(error);
    }
  }

  async retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(id);
    } catch (error) {
      this.logger.error(`Failed to retrieve payment intent ${id}:`, error);
      throw this.handleStripeError(error);
    }
  }

  async confirmPaymentIntent(
    id: string,
    params?: Stripe.PaymentIntentConfirmParams,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(id, params);
      
      this.logger.log(`Payment intent confirmed: ${id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to confirm payment intent ${id}:`, error);
      throw this.handleStripeError(error);
    }
  }

  async cancelPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(id);
      
      this.logger.log(`Payment intent canceled: ${id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to cancel payment intent ${id}:`, error);
      throw this.handleStripeError(error);
    }
  }

  async createRefund(
    params: Stripe.RefundCreateParams,
    idempotencyKey?: string,
  ): Promise<Stripe.Refund> {
    try {
      const options: Stripe.RequestOptions = {};
      if (idempotencyKey) {
        options.idempotencyKey = idempotencyKey;
      }

      const refund = await this.stripe.refunds.create(params, options);
      
      this.logger.log(`Refund created: ${refund.id}`);
      return refund;
    } catch (error) {
      this.logger.error('Failed to create refund:', error);
      throw this.handleStripeError(error);
    }
  }

  async getOrCreateCustomer(userId: string, email?: string): Promise<Stripe.Customer> {
    // Check if customer already exists
    const existingCustomer = await this.customerRepository.findOne({
      where: { userId },
    });

    if (existingCustomer) {
      try {
        return await this.stripe.customers.retrieve(existingCustomer.customerId) as Stripe.Customer;
      } catch (error) {
        // Customer might have been deleted in Stripe
        this.logger.warn(`Customer ${existingCustomer.customerId} not found in Stripe`);
      }
    }

    // Create new customer
    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          userId,
          environment: this.testMode ? 'test' : 'live',
        },
      });

      // Save customer mapping
      await this.customerRepository.save({
        userId,
        customerId: customer.id,
        email: customer.email,
        metadata: customer.metadata,
      });

      this.logger.log(`Customer created: ${customer.id} for user ${userId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to create customer for user ${userId}:`, error);
      throw this.handleStripeError(error);
    }
  }

  async updateCustomer(
    id: string,
    params: Stripe.CustomerUpdateParams,
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(id, params);
      
      this.logger.log(`Customer updated: ${id}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to update customer ${id}:`, error);
      throw this.handleStripeError(error);
    }
  }

  async listPaymentMethods(customerId: string): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
    try {
      return await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
    } catch (error) {
      this.logger.error(`Failed to list payment methods for customer ${customerId}:`, error);
      throw this.handleStripeError(error);
    }
  }

  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      
      this.logger.log(`Payment method ${paymentMethodId} attached to customer ${customerId}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error(`Failed to attach payment method ${paymentMethodId}:`, error);
      throw this.handleStripeError(error);
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      
      this.logger.log(`Payment method detached: ${paymentMethodId}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error(`Failed to detach payment method ${paymentMethodId}:`, error);
      throw this.handleStripeError(error);
    }
  }

  async constructWebhookEvent(signature: string, rawBody: Buffer): Promise<Stripe.Event> {
    if (!signature) {
      throw new Error('Missing webhook signature');
    }

    if (!rawBody || rawBody.length === 0) {
      throw new Error('Empty webhook body');
    }

    try {
      // Use the securely loaded webhook secret
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
      
      // Additional validation
      if (!event.id || !event.type) {
        throw new Error('Invalid webhook event structure');
      }
      
      return event;
    } catch (error) {
      // Log error details without exposing sensitive information
      this.logger.error('Webhook event construction failed:', {
        errorType: error.constructor.name,
        errorMessage: error.message,
        hasSignature: !!signature,
        bodyLength: rawBody?.length || 0,
      });
      
      // Re-throw with a generic message to avoid leaking information
      if (error.message.includes('signature')) {
        throw new Error('Invalid webhook signature');
      }
      
      throw new Error('Failed to process webhook event');
    }
  }

  async createCheckoutSession(
    params: Stripe.Checkout.SessionCreateParams,
  ): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.create(params);
      
      this.logger.log(`Checkout session created: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error('Failed to create checkout session:', error);
      throw this.handleStripeError(error);
    }
  }

  async retrieveCheckoutSession(id: string): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(id);
    } catch (error) {
      this.logger.error(`Failed to retrieve checkout session ${id}:`, error);
      throw this.handleStripeError(error);
    }
  }

  async createPaymentLink(
    params: Stripe.PaymentLinkCreateParams,
  ): Promise<Stripe.PaymentLink> {
    try {
      const paymentLink = await this.stripe.paymentLinks.create(params);
      
      this.logger.log(`Payment link created: ${paymentLink.id}`);
      return paymentLink;
    } catch (error) {
      this.logger.error('Failed to create payment link:', error);
      throw this.handleStripeError(error);
    }
  }

  private handleStripeError(error: any): Error {
    if (error instanceof Stripe.errors.StripeError) {
      switch (error.type) {
        case 'StripeCardError':
          return new Error(`Card error: ${error.message}`);
        case 'StripeRateLimitError':
          return new Error('Too many requests to Stripe API');
        case 'StripeInvalidRequestError':
          return new Error(`Invalid request: ${error.message}`);
        case 'StripeAPIError':
          return new Error('Stripe API error');
        case 'StripeConnectionError':
          return new Error('Failed to connect to Stripe');
        case 'StripeAuthenticationError':
          return new Error('Stripe authentication failed');
        default:
          return new Error(error.message || 'Unknown Stripe error');
      }
    }
    
    return error;
  }

  // Utility methods for common operations
  async validateWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): boolean {
    if (!this.webhookSecret) {
      return false;
    }

    try {
      this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
      return true;
    } catch {
      return false;
    }
  }

  async createPrice(
    params: Stripe.PriceCreateParams,
  ): Promise<Stripe.Price> {
    try {
      const price = await this.stripe.prices.create(params);
      
      this.logger.log(`Price created: ${price.id}`);
      return price;
    } catch (error) {
      this.logger.error('Failed to create price:', error);
      throw this.handleStripeError(error);
    }
  }

  async createProduct(
    params: Stripe.ProductCreateParams,
  ): Promise<Stripe.Product> {
    try {
      const product = await this.stripe.products.create(params);
      
      this.logger.log(`Product created: ${product.id}`);
      return product;
    } catch (error) {
      this.logger.error('Failed to create product:', error);
      throw this.handleStripeError(error);
    }
  }

  // Helper method to format amounts for Stripe (converts dollars to cents)
  formatAmount(amount: number): number {
    return Math.round(amount * 100);
  }

  // Helper method to parse amounts from Stripe (converts cents to dollars)
  parseAmount(amount: number): number {
    return amount / 100;
  }

  getPublishableKey(): string {
    const key = this.testMode
      ? this.configService.get('STRIPE_TEST_PUBLISHABLE_KEY')
      : this.configService.get('STRIPE_LIVE_PUBLISHABLE_KEY');
      
    if (!key) {
      throw new Error(`Stripe publishable key not configured for ${this.testMode ? 'test' : 'live'} mode`);
    }
    
    // Validate publishable key format
    const expectedPrefix = this.testMode ? 'pk_test_' : 'pk_live_';
    if (!key.startsWith(expectedPrefix)) {
      throw new Error(`Invalid Stripe publishable key format`);
    }
    
    return key;
  }

  isTestMode(): boolean {
    return this.testMode;
  }
}