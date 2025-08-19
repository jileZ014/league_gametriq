import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';

// Singleton pattern for Stripe instance
let stripePromise: Promise<Stripe | null>;

/**
 * Get Stripe instance with proper configuration
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      throw new Error('Stripe publishable key not configured');
    }

    stripePromise = loadStripe(publishableKey, {
      // Enhanced configuration for basketball league use case
      apiVersion: '2023-10-16',
      stripeAccount: undefined, // Will be set for Connect accounts
    });
  }
  
  return stripePromise;
};

/**
 * Stripe Elements configuration optimized for basketball registrations
 */
export const getElementsOptions = (
  clientSecret?: string,
  theme?: 'stripe' | 'flat' | 'night',
): StripeElementsOptions => {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: theme || 'stripe',
      variables: {
        colorPrimary: '#0066cc', // Basketball blue
        colorBackground: '#ffffff',
        colorText: '#1a1a1a',
        colorDanger: '#dc2626',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Tab': {
          border: '1px solid #e5e7eb',
          boxShadow: 'none',
        },
        '.Tab:hover': {
          color: '#0066cc',
        },
        '.Tab--selected': {
          borderColor: '#0066cc',
          backgroundColor: '#f0f9ff',
        },
        '.Input': {
          border: '1px solid #d1d5db',
          boxShadow: 'none',
        },
        '.Input:focus': {
          borderColor: '#0066cc',
          boxShadow: '0 0 0 1px #0066cc',
        },
      },
    },
    fonts: [
      {
        cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
      },
    ],
  };

  return options;
};

/**
 * Payment method types supported by the platform
 */
export const SUPPORTED_PAYMENT_METHODS = {
  card: {
    displayName: 'Credit/Debit Card',
    icon: 'credit-card',
    fees: 'Standard processing fees apply',
  },
  us_bank_account: {
    displayName: 'US Bank Account (ACH)',
    icon: 'bank',
    fees: 'Lower fees, 3-5 business days',
  },
  apple_pay: {
    displayName: 'Apple Pay',
    icon: 'smartphone',
    fees: 'Standard processing fees apply',
  },
  google_pay: {
    displayName: 'Google Pay',
    icon: 'smartphone',
    fees: 'Standard processing fees apply',
  },
} as const;

/**
 * Basketball-specific Stripe configuration
 */
export const STRIPE_CONFIG = {
  // Payment intent configurations
  AUTOMATIC_PAYMENT_METHODS: {
    enabled: true,
    allow_redirects: 'never', // Keep users on our platform
  },
  
  // Business-specific settings
  REGISTRATION_PAYMENT_DESCRIPTION: 'Basketball League Registration',
  TOURNAMENT_PAYMENT_DESCRIPTION: 'Tournament Entry Fee',
  SUBSCRIPTION_PAYMENT_DESCRIPTION: 'League Membership',
  
  // Fee structure
  LATE_REGISTRATION_FEE: 25.00,
  MULTI_TEAM_DISCOUNT: 0.10, // 10%
  EARLY_BIRD_DISCOUNT: 0.15, // 15%
  
  // Refund policy (in days)
  FULL_REFUND_PERIOD: 7,
  PARTIAL_REFUND_PERIOD: 30,
  
  // Connect settings
  REFEREE_ACCOUNT_TYPE: 'express',
  PLATFORM_FEE_PERCENTAGE: 0.05, // 5% platform fee
} as const;

/**
 * Utility function to format currency amounts
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Convert Stripe amount (cents) to dollars
 */
export const fromStripeAmount = (amount: number): number => {
  return amount / 100;
};

/**
 * Convert dollars to Stripe amount (cents)
 */
export const toStripeAmount = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Validate payment amount for business rules
 */
export const validatePaymentAmount = (amount: number, type: 'registration' | 'tournament' | 'subscription'): {
  valid: boolean;
  message?: string;
} => {
  const MIN_AMOUNTS = {
    registration: 50, // $50 minimum registration
    tournament: 25, // $25 minimum tournament fee
    subscription: 10, // $10 minimum subscription
  };

  const MAX_AMOUNTS = {
    registration: 1000, // $1000 maximum registration
    tournament: 500, // $500 maximum tournament fee
    subscription: 500, // $500 maximum subscription
  };

  if (amount < MIN_AMOUNTS[type]) {
    return {
      valid: false,
      message: `Minimum ${type} amount is ${formatCurrency(MIN_AMOUNTS[type])}`,
    };
  }

  if (amount > MAX_AMOUNTS[type]) {
    return {
      valid: false,
      message: `Maximum ${type} amount is ${formatCurrency(MAX_AMOUNTS[type])}`,
    };
  }

  return { valid: true };
};

/**
 * Get payment method icon class for UI
 */
export const getPaymentMethodIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    card: 'credit-card',
    us_bank_account: 'building-2',
    apple_pay: 'smartphone',
    google_pay: 'smartphone',
    link: 'link',
    klarna: 'k',
    afterpay_clearpay: 'clock',
  };

  return iconMap[type] || 'credit-card';
};

/**
 * Determine if payment method supports instant processing
 */
export const isInstantPaymentMethod = (type: string): boolean => {
  const instantMethods = ['card', 'apple_pay', 'google_pay', 'link'];
  return instantMethods.includes(type);
};

/**
 * Get expected processing time for payment method
 */
export const getProcessingTime = (type: string): string => {
  const processingTimes: Record<string, string> = {
    card: 'Instant',
    apple_pay: 'Instant',
    google_pay: 'Instant',
    link: 'Instant',
    us_bank_account: '3-5 business days',
    klarna: '1-2 business days',
    afterpay_clearpay: 'Instant',
  };

  return processingTimes[type] || 'Varies';
};

/**
 * Error handling utilities
 */
export class StripeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public type?: string,
    public param?: string,
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

/**
 * Convert Stripe error to user-friendly message
 */
export const getErrorMessage = (error: any): string => {
  if (error?.type === 'card_error') {
    switch (error.code) {
      case 'card_declined':
        return 'Your card was declined. Please try a different payment method.';
      case 'insufficient_funds':
        return 'Your card has insufficient funds. Please try a different payment method.';
      case 'incorrect_cvc':
        return 'Your card security code is incorrect. Please check and try again.';
      case 'expired_card':
        return 'Your card has expired. Please try a different payment method.';
      case 'processing_error':
        return 'An error occurred processing your card. Please try again.';
      default:
        return error.message || 'Your card was declined. Please try a different payment method.';
    }
  }

  if (error?.type === 'validation_error') {
    return error.message || 'Please check your payment information and try again.';
  }

  if (error?.type === 'api_error') {
    return 'A payment processing error occurred. Please try again.';
  }

  return error?.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Test mode utilities
 */
export const TEST_CARDS = {
  VISA: '4242424242424242',
  VISA_DEBIT: '4000056655665556',
  MASTERCARD: '5555555555554444',
  AMEX: '378282246310005',
  DISCOVER: '6011111111111117',
  DECLINED: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  CVC_CHECK_FAIL: '4000000000000127',
  EXPIRED: '4000000000000069',
} as const;

export const isTestMode = (): boolean => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return publishableKey?.startsWith('pk_test_') || false;
};