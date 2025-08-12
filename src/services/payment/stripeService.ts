// Stripe Payment Service
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

export interface CreatePaymentIntentParams {
  orderId: string;
  amountCents: number;
  currency?: string;
}

export interface ConfirmPaymentParams {
  paymentIntentClientSecret: string;
  paymentMethodId: string;
}

export const paymentService = {
  createPaymentIntent: async (params: CreatePaymentIntentParams) => {
    const response = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  },

  confirmPayment: async (params: ConfirmPaymentParams) => {
    const stripe = await getStripe();
    if (!stripe) throw new Error('Stripe not loaded');

    return stripe.confirmCardPayment(params.paymentIntentClientSecret, {
      payment_method: params.paymentMethodId,
    });
  },

  createRefund: async (paymentIntentId: string, amountCents?: number) => {
    const response = await fetch('/api/payments/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId, amountCents }),
    });
    return response.json();
  },
};