import Stripe from 'stripe';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';

// Stripe configuration for basketball league application
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Validate required environment variables
if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

if (!STRIPE_PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is required');
}

/**
 * Server-side Stripe instance for API operations
 */
export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  appInfo: {
    name: 'Basketball League Management Platform',
    version: '1.0.0',
    url: 'https://gametriq.com',
  },
  timeout: 10000, // 10 second timeout for payment operations
  maxNetworkRetries: 3,
});

/**
 * Client-side Stripe instance (singleton pattern)
 */
let stripePromise: Promise<any> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY, {
      apiVersion: '2023-10-16',
    });
  }
  return stripePromise;
};

/**
 * Stripe configuration constants for basketball league operations
 */
export const STRIPE_CONFIG = {
  // Currency
  CURRENCY: 'usd',
  
  // Payment descriptions
  REGISTRATION_PAYMENT_DESCRIPTION: 'Basketball League Registration',
  TOURNAMENT_PAYMENT_DESCRIPTION: 'Tournament Entry Fee',
  REFEREE_PAYMENT_DESCRIPTION: 'Referee Services',
  EQUIPMENT_PAYMENT_DESCRIPTION: 'Equipment and Merchandise',
  
  // Fee structure (in dollars)
  REGISTRATION_BASE_FEE: 150.00,
  TOURNAMENT_ENTRY_FEE: 75.00,
  LATE_REGISTRATION_FEE: 25.00,
  UNIFORM_FEE: 45.00,
  
  // Discounts (percentage as decimal)
  EARLY_BIRD_DISCOUNT: 0.15, // 15%
  MULTI_TEAM_DISCOUNT: 0.10, // 10%
  RETURNING_PLAYER_DISCOUNT: 0.05, // 5%
  
  // Refund policy (in days)
  FULL_REFUND_PERIOD: 7,
  PARTIAL_REFUND_PERIOD: 30,
  NO_REFUND_PERIOD: 3, // 3 days before season starts
  
  // Payment limits
  MIN_PAYMENT_AMOUNT: 10.00, // $10 minimum
  MAX_PAYMENT_AMOUNT: 2000.00, // $2000 maximum per transaction
  
  // Platform fees for Stripe Connect
  PLATFORM_FEE_PERCENTAGE: 0.05, // 5% platform fee
  REFEREE_PAYOUT_PERCENTAGE: 0.95, // 95% to referee
  
  // Processing delays
  BANK_TRANSFER_DELAY_DAYS: 3,
  CARD_PROCESSING_DELAY_MINUTES: 15,
  
  // Webhook endpoints
  WEBHOOK_ENDPOINTS: {
    payment_intent: '/api/webhooks/stripe/payment-intent',
    payment_method: '/api/webhooks/stripe/payment-method',
    subscription: '/api/webhooks/stripe/subscription',
    invoice: '/api/webhooks/stripe/invoice',
    customer: '/api/webhooks/stripe/customer',
    connect: '/api/webhooks/stripe/connect',
  },
} as const;

/**
 * Payment intent creation with basketball-specific metadata
 */
export interface CreatePaymentIntentParams {
  amount: number; // in dollars
  currency?: string;
  paymentDescription: string;
  customerEmail?: string;
  leagueId?: string;
  teamId?: string;
  playerId?: string;
  tournamentId?: string;
  seasonId?: string;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent({
  amount,
  currency = STRIPE_CONFIG.CURRENCY,
  paymentDescription,
  customerEmail,
  leagueId,
  teamId,
  playerId,
  tournamentId,
  seasonId,
  metadata = {},
}: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
  try {
    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);
    
    // Validate amount
    if (amountInCents < STRIPE_CONFIG.MIN_PAYMENT_AMOUNT * 100) {
      throw new Error(`Payment amount must be at least $${STRIPE_CONFIG.MIN_PAYMENT_AMOUNT}`);
    }
    
    if (amountInCents > STRIPE_CONFIG.MAX_PAYMENT_AMOUNT * 100) {
      throw new Error(`Payment amount cannot exceed $${STRIPE_CONFIG.MAX_PAYMENT_AMOUNT}`);
    }

    // Basketball-specific metadata
    const basketballMetadata = {
      ...metadata,
      ...(leagueId && { league_id: leagueId }),
      ...(teamId && { team_id: teamId }),
      ...(playerId && { player_id: playerId }),
      ...(tournamentId && { tournament_id: tournamentId }),
      ...(seasonId && { season_id: seasonId }),
      created_by: 'basketball-league-platform',
      platform: 'gametriq',
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      description: paymentDescription,
      receipt_email: customerEmail,
      metadata: basketballMetadata,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Keep users on our platform
      },
      statement_descriptor: 'GAMETRIQ LEAGUE',
      statement_descriptor_suffix: 'BASKETBALL',
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create Stripe customer for basketball league participants
 */
export interface CreateCustomerParams {
  email: string;
  name?: string;
  phone?: string;
  playerAge?: number;
  parentEmail?: string; // For COPPA compliance
  leagueId?: string;
  teamId?: string;
}

export async function createCustomer({
  email,
  name,
  phone,
  playerAge,
  parentEmail,
  leagueId,
  teamId,
}: CreateCustomerParams): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata: {
        ...(playerAge && { player_age: playerAge.toString() }),
        ...(parentEmail && { parent_email: parentEmail }),
        ...(leagueId && { league_id: leagueId }),
        ...(teamId && { team_id: teamId }),
        platform: 'gametriq',
        type: 'basketball_participant',
      },
    });

    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create subscription for league memberships
 */
export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  leagueId: string;
  seasonId: string;
  trialPeriodDays?: number;
}

export async function createSubscription({
  customerId,
  priceId,
  leagueId,
  seasonId,
  trialPeriodDays,
}: CreateSubscriptionParams): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialPeriodDays,
      metadata: {
        league_id: leagueId,
        season_id: seasonId,
        platform: 'gametriq',
        type: 'league_membership',
      },
    });

    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process refund with basketball league business rules
 */
export interface ProcessRefundParams {
  paymentIntentId: string;
  amount?: number; // in dollars, if partial refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  refundReason: string;
}

export async function processRefund({
  paymentIntentId,
  amount,
  reason = 'requested_by_customer',
  refundReason,
}: ProcessRefundParams): Promise<Stripe.Refund> {
  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason,
      metadata: {
        refund_reason: refundReason,
        platform: 'gametriq',
        processed_by: 'automatic_system',
      },
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundParams);
    return refund;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw new Error(`Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stripe Elements configuration optimized for basketball registrations
 */
export const getElementsOptions = (
  clientSecret?: string,
  theme: 'stripe' | 'flat' | 'night' = 'stripe'
): StripeElementsOptions => ({
  clientSecret,
  appearance: {
    theme,
    variables: {
      colorPrimary: '#ff9800', // Basketball orange
      colorBackground: '#ffffff',
      colorText: '#1a1a1a',
      colorDanger: '#f44336',
      colorSuccess: '#4caf50',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
      fontSizeBase: '16px',
      fontWeightNormal: '400',
      fontWeightBold: '600',
    },
    rules: {
      '.Tab': {
        border: '1px solid #e0e0e0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '12px 16px',
      },
      '.Tab:hover': {
        color: '#ff9800',
        borderColor: '#ff9800',
      },
      '.Tab--selected': {
        borderColor: '#ff9800',
        backgroundColor: '#fff3e0',
        color: '#ff9800',
      },
      '.Input': {
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '16px',
        boxShadow: 'none',
      },
      '.Input:focus': {
        borderColor: '#ff9800',
        boxShadow: '0 0 0 2px rgba(255, 152, 0, 0.2)',
        outline: 'none',
      },
      '.Input::placeholder': {
        color: '#9ca3af',
      },
      '.Label': {
        fontWeight: '500',
        fontSize: '14px',
        color: '#374151',
        marginBottom: '8px',
      },
      '.Error': {
        color: '#f44336',
        fontSize: '14px',
        marginTop: '4px',
      },
    },
  },
  fonts: [
    {
      cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
    },
  ],
});

/**
 * Webhook signature verification
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Utility functions for amount formatting and conversion
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const fromStripeAmount = (amount: number): number => amount / 100;
export const toStripeAmount = (amount: number): number => Math.round(amount * 100);

/**
 * Calculate total registration cost with discounts
 */
export interface CalculateRegistrationCostParams {
  baseFee: number;
  isEarlyBird: boolean;
  isMultiTeam: boolean;
  isReturningPlayer: boolean;
  includeUniform: boolean;
  isLateRegistration: boolean;
}

export function calculateRegistrationCost({
  baseFee,
  isEarlyBird,
  isMultiTeam,
  isReturningPlayer,
  includeUniform,
  isLateRegistration,
}: CalculateRegistrationCostParams): {
  subtotal: number;
  discounts: number;
  fees: number;
  total: number;
  breakdown: Array<{ description: string; amount: number }>;
} {
  const breakdown: Array<{ description: string; amount: number }> = [];
  let subtotal = baseFee;
  let discounts = 0;
  let fees = 0;

  // Base registration fee
  breakdown.push({ description: 'Registration Fee', amount: baseFee });

  // Add uniform fee if needed
  if (includeUniform) {
    subtotal += STRIPE_CONFIG.UNIFORM_FEE;
    breakdown.push({ description: 'Uniform Fee', amount: STRIPE_CONFIG.UNIFORM_FEE });
  }

  // Apply discounts
  if (isEarlyBird) {
    const discount = subtotal * STRIPE_CONFIG.EARLY_BIRD_DISCOUNT;
    discounts += discount;
    breakdown.push({ description: 'Early Bird Discount', amount: -discount });
  }

  if (isMultiTeam) {
    const discount = subtotal * STRIPE_CONFIG.MULTI_TEAM_DISCOUNT;
    discounts += discount;
    breakdown.push({ description: 'Multi-Team Discount', amount: -discount });
  }

  if (isReturningPlayer) {
    const discount = subtotal * STRIPE_CONFIG.RETURNING_PLAYER_DISCOUNT;
    discounts += discount;
    breakdown.push({ description: 'Returning Player Discount', amount: -discount });
  }

  // Add late registration fee
  if (isLateRegistration) {
    fees += STRIPE_CONFIG.LATE_REGISTRATION_FEE;
    breakdown.push({ description: 'Late Registration Fee', amount: STRIPE_CONFIG.LATE_REGISTRATION_FEE });
  }

  const total = subtotal - discounts + fees;

  return {
    subtotal,
    discounts,
    fees,
    total,
    breakdown,
  };
}

/**
 * Error handling utilities
 */
export class StripeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public type?: string,
    public param?: string
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

export const getErrorMessage = (error: any): string => {
  if (error?.type === 'card_error') {
    switch (error.code) {
      case 'card_declined':
        return 'Your card was declined. Please try a different payment method or contact your bank.';
      case 'insufficient_funds':
        return 'Your card has insufficient funds. Please try a different payment method.';
      case 'incorrect_cvc':
        return 'Your card security code is incorrect. Please check and try again.';
      case 'expired_card':
        return 'Your card has expired. Please try a different payment method.';
      case 'processing_error':
        return 'An error occurred processing your card. Please try again in a moment.';
      case 'incorrect_number':
        return 'Your card number is incorrect. Please check and try again.';
      case 'invalid_expiry_month':
      case 'invalid_expiry_year':
        return 'Your card expiration date is invalid. Please check and try again.';
      default:
        return 'Your card was declined. Please try a different payment method.';
    }
  }

  if (error?.type === 'validation_error') {
    return 'Please check your payment information and try again.';
  }

  if (error?.type === 'api_error') {
    return 'A payment processing error occurred. Please try again or contact support.';
  }

  if (error?.type === 'rate_limit_error') {
    return 'Too many requests. Please wait a moment and try again.';
  }

  return error?.message || 'An unexpected error occurred. Please try again or contact support.';
};

/**
 * Test card numbers for development
 */
export const TEST_CARDS = {
  VISA_SUCCESS: '4242424242424242',
  VISA_DECLINED: '4000000000000002',
  VISA_INSUFFICIENT_FUNDS: '4000000000009995',
  VISA_CVC_FAIL: '4000000000000127',
  VISA_EXPIRED: '4000000000000069',
  MASTERCARD_SUCCESS: '5555555555554444',
  AMEX_SUCCESS: '378282246310005',
  DISCOVER_SUCCESS: '6011111111111117',
} as const;

export const isTestMode = (): boolean => {
  return STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_') || false;
};

export default stripe;