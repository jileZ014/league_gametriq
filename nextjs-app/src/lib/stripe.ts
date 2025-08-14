import { loadStripe, Stripe } from '@stripe/stripe-js'
import { Stripe as StripeServerSide } from 'stripe'

// Client-side Stripe
let stripePromise: Promise<Stripe | null>
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

// Server-side Stripe (for API routes)
export const stripe = new StripeServerSide(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

// Common basketball league pricing
export const BASKETBALL_PRICING = {
  PLAYER_REGISTRATION: {
    amount: 12500, // $125.00 in cents
    currency: 'usd',
    description: 'Player Registration Fee'
  },
  TEAM_REGISTRATION: {
    amount: 35000, // $350.00 in cents
    currency: 'usd',
    description: 'Team Registration Fee'
  },
  TOURNAMENT_ENTRY: {
    amount: 15000, // $150.00 in cents
    currency: 'usd',
    description: 'Tournament Entry Fee'
  },
  REFEREE_FEE: {
    amount: 7500, // $75.00 in cents
    currency: 'usd',
    description: 'Referee Fee per Game'
  }
} as const

export type BasketballPricing = keyof typeof BASKETBALL_PRICING

// Utility function to format currency
export const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100)
}

// Create payment intent for basketball registrations
export const createPaymentIntent = async (
  amount: number,
  currency = 'usd',
  metadata: Record<string, string> = {}
) => {
  return await stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      sport: 'basketball',
      platform: 'gametriq',
      ...metadata,
    },
  })
}