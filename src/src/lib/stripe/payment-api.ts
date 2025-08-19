import { z } from 'zod';

// API endpoint base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Request/Response schemas
const CreatePaymentIntentSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('usd'),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  paymentMethodId: z.string().optional(),
  savePaymentMethod: z.boolean().optional(),
});

const PaymentIntentResponseSchema = z.object({
  id: z.string(),
  clientSecret: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  metadata: z.record(z.any()),
});

const CreateOrderSchema = z.object({
  leagueId: z.string(),
  division: z.string(),
  numberOfTeams: z.number().int().positive(),
  teamNames: z.array(z.string()),
  discountCode: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const OrderResponseSchema = z.object({
  id: z.string(),
  subtotal: z.number(),
  totalDiscount: z.number(),
  total: z.number(),
  currency: z.string(),
  status: z.string(),
  items: z.array(z.object({
    id: z.string(),
    type: z.string(),
    description: z.string(),
    amount: z.number(),
    quantity: z.number(),
  })),
  discounts: z.array(z.object({
    id: z.string(),
    type: z.string(),
    description: z.string(),
    amount: z.number(),
  })),
});

export type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentSchema>;
export type PaymentIntentResponse = z.infer<typeof PaymentIntentResponseSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;
export type OrderResponse = z.infer<typeof OrderResponseSchema>;

/**
 * Payment API client for frontend
 */
export class PaymentAPI {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create registration order with fee calculation
   */
  async createRegistrationOrder(data: CreateOrderRequest): Promise<OrderResponse> {
    const validatedData = CreateOrderSchema.parse(data);
    
    return this.request<OrderResponse>('/payments/orders/registration', {
      method: 'POST',
      body: JSON.stringify(validatedData),
    });
  }

  /**
   * Create payment intent for order
   */
  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<PaymentIntentResponse> {
    const validatedData = CreatePaymentIntentSchema.parse(data);
    
    return this.request<PaymentIntentResponse>('/payments/intents', {
      method: 'POST',
      body: JSON.stringify({
        ...validatedData,
        idempotencyKey: `${validatedData.orderId}_${Date.now()}`,
      }),
    });
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ): Promise<PaymentIntentResponse> {
    return this.request<PaymentIntentResponse>(`/payments/intents/${paymentIntentId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethodId }),
    });
  }

  /**
   * Get payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    return this.request<PaymentIntentResponse>(`/payments/intents/${paymentIntentId}`);
  }

  /**
   * Create tournament entry payment
   */
  async createTournamentPayment(data: {
    tournamentId: string;
    teamId: string;
    entryFee: number;
    currency?: string;
    paymentMethodId?: string;
  }): Promise<{ paymentIntent: PaymentIntentResponse; order: OrderResponse }> {
    return this.request(`/payments/tournament`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        idempotencyKey: `tournament_${data.tournamentId}_${data.teamId}_${Date.now()}`,
      }),
    });
  }

  /**
   * Get user payment history
   */
  async getPaymentHistory(params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    payments: Array<{
      id: string;
      orderId: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    return this.request(`/payments/history?${searchParams}`);
  }

  /**
   * Get user payment methods
   */
  async getPaymentMethods(): Promise<Array<{
    id: string;
    type: string;
    card?: {
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    };
    isDefault: boolean;
  }>> {
    return this.request('/payments/payment-methods');
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    return this.request('/payments/payment-methods/default', {
      method: 'POST',
      body: JSON.stringify({ paymentMethodId }),
    });
  }

  /**
   * Create subscription
   */
  async createSubscription(data: {
    priceId: string;
    paymentMethodId?: string;
    trialPeriodDays?: number;
    metadata?: Record<string, any>;
  }): Promise<{
    id: string;
    status: string;
    clientSecret?: string;
  }> {
    return this.request('/payments/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        idempotencyKey: `subscription_${Date.now()}`,
      }),
    });
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string,
    data: {
      newPriceId?: string;
      quantity?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<{
    id: string;
    status: string;
    planType: string;
    amount: number;
  }> {
    return this.request(`/payments/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    data: {
      cancelAtPeriodEnd?: boolean;
      reason?: string;
    } = {},
  ): Promise<{
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
  }> {
    return this.request(`/payments/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get user subscriptions
   */
  async getSubscriptions(): Promise<Array<{
    id: string;
    status: string;
    planType: string;
    planName: string;
    amount: number;
    currency: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  }>> {
    return this.request('/payments/subscriptions');
  }

  /**
   * Apply discount code
   */
  async applyDiscountCode(subscriptionId: string, couponId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    return this.request(`/payments/subscriptions/${subscriptionId}/discount`, {
      method: 'POST',
      body: JSON.stringify({ couponId }),
    });
  }

  /**
   * Process refund
   */
  async processRefund(data: {
    orderId: string;
    amount?: number;
    reason: string;
  }): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    reason: string;
  }> {
    return this.request('/payments/refunds', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        idempotencyKey: `refund_${data.orderId}_${Date.now()}`,
      }),
    });
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<OrderResponse> {
    return this.request(`/payments/orders/${orderId}`);
  }

  /**
   * Get user orders
   */
  async getOrders(params: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}): Promise<{
    orders: OrderResponse[];
    total: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());
    if (params.status) searchParams.append('status', params.status);

    return this.request(`/payments/orders?${searchParams}`);
  }

  /**
   * Calculate registration fees
   */
  async calculateRegistrationFees(data: {
    leagueId: string;
    division: string;
    numberOfTeams: number;
    discountCode?: string;
  }): Promise<{
    baseAmount: number;
    discounts: Array<{ type: string; description: string; amount: number }>;
    fees: Array<{ type: string; description: string; amount: number }>;
    subtotal: number;
    totalDiscount: number;
    totalFees: number;
    total: number;
    currency: string;
  }> {
    const searchParams = new URLSearchParams({
      leagueId: data.leagueId,
      division: data.division,
      numberOfTeams: data.numberOfTeams.toString(),
    });
    if (data.discountCode) {
      searchParams.append('discountCode', data.discountCode);
    }

    return this.request(`/payments/calculate-fees?${searchParams}`);
  }

  /**
   * Validate discount code
   */
  async validateDiscountCode(code: string, orderAmount: number, orderType: string): Promise<{
    valid: boolean;
    discount?: {
      type: 'percentage' | 'fixed_amount';
      value: number;
      amount: number;
    };
    message?: string;
  }> {
    return this.request('/payments/discount-codes/validate', {
      method: 'POST',
      body: JSON.stringify({ code, orderAmount, orderType }),
    });
  }

  /**
   * Get Stripe public configuration
   */
  async getStripeConfig(): Promise<{
    publishableKey: string;
    testMode: boolean;
    supportedCurrencies: string[];
    supportedPaymentMethods: string[];
  }> {
    return this.request('/payments/config');
  }

  /**
   * Create Connect account (for referees)
   */
  async createConnectAccount(data: {
    accountType: 'referee' | 'league' | 'venue';
    email: string;
    businessProfile?: {
      name?: string;
      url?: string;
      supportPhone?: string;
      supportEmail?: string;
    };
    individual?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      dateOfBirth?: {
        day: number;
        month: number;
        year: number;
      };
      address?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
    };
  }): Promise<{
    accountId: string;
    onboardingUrl: string;
  }> {
    return this.request('/payments/connect/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get Connect account status
   */
  async getConnectAccountStatus(accountId: string): Promise<{
    status: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requiresAction: boolean;
    nextActionUrl?: string;
  }> {
    return this.request(`/payments/connect/accounts/${accountId}/status`);
  }

  /**
   * Get Connect account transfers (for referees)
   */
  async getConnectTransfers(params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    transfers: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      description: string;
      createdAt: string;
    }>;
    total: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    return this.request(`/payments/connect/transfers?${searchParams}`);
  }
}

// Singleton instance
export const paymentAPI = new PaymentAPI();