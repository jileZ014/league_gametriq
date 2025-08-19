import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// Initialize Stripe with API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Define webhook event types we handle
type WebhookEventType = 
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'charge.dispute.created'
  | 'charge.refunded'

interface WebhookPayload {
  eventId: string
  eventType: WebhookEventType
  data: any
  timestamp: number
}

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Helper function for rate limiting
function isRateLimited(eventId: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(eventId)
  
  if (limit && limit.resetTime > now) {
    if (limit.count >= 5) { // Max 5 attempts per event
      return true
    }
    limit.count++
  } else {
    rateLimitMap.set(eventId, { count: 1, resetTime: now + 60000 }) // 1 minute window
  }
  
  // Clean old entries
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key)
      }
    }
  }
  
  return false
}

// Helper function to verify webhook signature
async function verifyWebhookSignature(
  payload: string,
  signature: string | null
): Promise<Stripe.Event | null> {
  if (!signature) {
    return null
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return null
  }
}

// Process payment intent succeeded
async function handlePaymentIntentSucceeded(
  supabase: any,
  paymentIntent: Stripe.PaymentIntent
) {
  const { metadata } = paymentIntent
  
  if (!metadata?.userId || !metadata?.type) {
    throw new Error('Missing required metadata in payment intent')
  }

  // Update registration or tournament entry based on type
  if (metadata.type === 'registration') {
    await supabase
      .from('registrations')
      .update({
        payment_status: 'paid',
        payment_intent_id: paymentIntent.id,
        paid_at: new Date().toISOString(),
        amount_paid: paymentIntent.amount / 100,
      })
      .eq('user_id', metadata.userId)
      .eq('id', metadata.registrationId)
  } else if (metadata.type === 'tournament') {
    await supabase
      .from('tournament_entries')
      .update({
        payment_status: 'paid',
        payment_intent_id: paymentIntent.id,
        paid_at: new Date().toISOString(),
        entry_fee_paid: paymentIntent.amount / 100,
      })
      .eq('team_id', metadata.teamId)
      .eq('tournament_id', metadata.tournamentId)
  }

  // Send confirmation email (would integrate with email service)
  console.log(`Payment successful for ${metadata.type}:`, paymentIntent.id)
}

// Process payment failure
async function handlePaymentFailed(
  supabase: any,
  paymentIntent: Stripe.PaymentIntent
) {
  const { metadata } = paymentIntent
  
  if (!metadata?.userId) {
    return
  }

  // Update payment status to failed
  if (metadata.type === 'registration') {
    await supabase
      .from('registrations')
      .update({
        payment_status: 'failed',
        payment_error: paymentIntent.last_payment_error?.message,
      })
      .eq('user_id', metadata.userId)
      .eq('id', metadata.registrationId)
  }

  // Log failure for monitoring
  await supabase
    .from('payment_failures')
    .insert({
      user_id: metadata.userId,
      payment_intent_id: paymentIntent.id,
      error_message: paymentIntent.last_payment_error?.message,
      error_code: paymentIntent.last_payment_error?.code,
      amount: paymentIntent.amount / 100,
      created_at: new Date().toISOString(),
    })
}

// Process subscription events
async function handleSubscriptionEvent(
  supabase: any,
  subscription: Stripe.Subscription,
  eventType: string
) {
  const customerId = subscription.customer as string
  
  // Get user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!user) {
    throw new Error(`User not found for customer: ${customerId}`)
  }

  const subscriptionData = {
    user_id: user.id,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    canceled_at: subscription.canceled_at 
      ? new Date(subscription.canceled_at * 1000).toISOString() 
      : null,
  }

  if (eventType === 'customer.subscription.created') {
    await supabase
      .from('subscriptions')
      .insert(subscriptionData)
  } else {
    await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('stripe_subscription_id', subscription.id)
  }
}

// Process refund events
async function handleRefund(
  supabase: any,
  charge: Stripe.Charge
) {
  const paymentIntentId = charge.payment_intent as string
  const refundAmount = charge.amount_refunded / 100

  // Update registration or tournament entry
  await supabase
    .from('refunds')
    .insert({
      payment_intent_id: paymentIntentId,
      charge_id: charge.id,
      amount: refundAmount,
      reason: charge.refunds?.data[0]?.reason || 'requested_by_customer',
      status: 'completed',
      created_at: new Date().toISOString(),
    })

  // Update original payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('payment_intent_id', paymentIntentId)
    .single()

  if (payment) {
    await supabase
      .from('payments')
      .update({
        refunded_amount: refundAmount,
        status: charge.amount === charge.amount_refunded ? 'fully_refunded' : 'partially_refunded',
      })
      .eq('payment_intent_id', paymentIntentId)
  }
}

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    // Verify webhook signature
    const event = await verifyWebhookSignature(body, signature)
    if (!event) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Check for duplicate events (idempotency)
    if (isRateLimited(event.id)) {
      console.log(`Duplicate webhook event: ${event.id}`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Initialize Supabase client
    const supabase = createClient()

    // Log webhook event
    await supabase
      .from('webhook_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
        payload: event.data.object,
        processed_at: new Date().toISOString(),
      })

    // Process different event types
    switch (event.type as WebhookEventType) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(
          supabase,
          event.data.object as Stripe.PaymentIntent
        )
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(
          supabase,
          event.data.object as Stripe.PaymentIntent
        )
        break

      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        if (session.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            session.payment_intent as string
          )
          await handlePaymentIntentSucceeded(supabase, paymentIntent)
        }
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(
          supabase,
          event.data.object as Stripe.Subscription,
          event.type
        )
        break

      case 'charge.refunded':
        await handleRefund(
          supabase,
          event.data.object as Stripe.Charge
        )
        break

      case 'charge.dispute.created':
        const dispute = event.data.object as Stripe.Dispute
        await supabase
          .from('disputes')
          .insert({
            dispute_id: dispute.id,
            charge_id: dispute.charge as string,
            amount: dispute.amount / 100,
            reason: dispute.reason,
            status: dispute.status,
            created_at: new Date().toISOString(),
          })
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
