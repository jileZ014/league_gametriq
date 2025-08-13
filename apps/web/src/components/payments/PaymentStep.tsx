'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CreditCard, 
  Lock, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Building2,
  Smartphone
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements,
  AddressElement 
} from '@stripe/react-stripe-js'
import { 
  getStripe, 
  getElementsOptions, 
  formatCurrency, 
  getErrorMessage, 
  isTestMode,
  SUPPORTED_PAYMENT_METHODS 
} from '@/lib/stripe/stripe-client'
import { 
  paymentAPI, 
  type CreateOrderRequest, 
  type OrderResponse,
  type PaymentIntentResponse 
} from '@/lib/stripe/payment-api'
import { toast } from 'sonner'

interface PaymentStepProps {
  // Order details
  leagueId: string
  division: string
  teamNames: string[]
  discountCode?: string
  metadata?: Record<string, any>
  
  // Callbacks
  onSuccess: (paymentIntentId: string, orderId: string) => void
  onError?: (error: string) => void
  
  // UI customization
  showSummary?: boolean
  allowSavePayment?: boolean
}

interface OrderSummaryProps {
  order: OrderResponse
  loading?: boolean
}

/**
 * Order summary component showing fee breakdown
 */
function OrderSummary({ order, loading }: OrderSummaryProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Order items */}
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.description}</span>
              <span>{formatCurrency(item.amount * item.quantity)}</span>
            </div>
          ))}
          
          {/* Subtotal */}
          <div className="flex justify-between text-sm border-t pt-2">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          
          {/* Discounts */}
          {order.discounts.map((discount) => (
            <div key={discount.id} className="flex justify-between text-sm text-green-600">
              <span>{discount.description}</span>
              <span>-{formatCurrency(discount.amount)}</span>
            </div>
          ))}
          
          {/* Total */}
          <div className="flex justify-between font-semibold text-lg border-t pt-2">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
        
        {loading && (
          <div className="mt-4 flex items-center space-x-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing payment...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Payment form component using Stripe Elements
 */
function PaymentForm({ 
  order, 
  onSuccess, 
  onError, 
  allowSavePayment 
}: {
  order: OrderResponse
  onSuccess: (paymentIntentId: string, orderId: string) => void
  onError?: (error: string) => void
  allowSavePayment?: boolean
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null)
  const [savePayment, setSavePayment] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create payment intent when order is available
  useEffect(() => {
    if (order && !paymentIntent) {
      createPaymentIntent()
    }
  }, [order])

  const createPaymentIntent = async () => {
    try {
      const intent = await paymentAPI.createPaymentIntent({
        orderId: order.id,
        amount: order.total,
        currency: order.currency,
        description: `Registration payment for ${order.items.length} team(s)`,
        metadata: {
          orderType: 'team_registration',
          numberOfTeams: order.items.length,
        },
        savePaymentMethod: savePayment,
      })
      
      setPaymentIntent(intent)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create payment intent'
      setError(message)
      onError?.(message)
      toast.error('Payment setup failed', { description: message })
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !paymentIntent) {
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent: confirmedIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/registration/success`,
          save_payment_method: savePayment,
        },
        redirect: 'if_required',
      })

      if (stripeError) {
        throw new Error(getErrorMessage(stripeError))
      }

      if (confirmedIntent && confirmedIntent.status === 'succeeded') {
        toast.success('Payment successful!')
        onSuccess(confirmedIntent.id, order.id)
      } else if (confirmedIntent && confirmedIntent.status === 'requires_action') {
        // 3D Secure or other action required
        toast.info('Please complete the payment verification')
      } else {
        throw new Error('Payment was not completed successfully')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      setError(message)
      onError?.(message)
      toast.error('Payment failed', { description: message })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Payment Information</span>
        </CardTitle>
        <CardDescription>
          Complete your registration payment securely with Stripe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Security Badge */}
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Secure payment powered by Stripe</span>
            <Shield className="h-4 w-4" />
          </div>

          {/* Payment Element */}
          {paymentIntent && (
            <div className="space-y-4">
              <PaymentElement 
                id="payment-element"
                options={{
                  layout: 'tabs',
                  paymentMethodOrder: ['card', 'us_bank_account'],
                  fields: {
                    billingDetails: {
                      address: {
                        country: 'never',
                      },
                    },
                  },
                }}
              />
              
              {/* Save payment method option */}
              {allowSavePayment && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="save-payment"
                    checked={savePayment}
                    onChange={(e) => setSavePayment(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="save-payment" className="text-sm">
                    Save payment method for future registrations
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Payment Methods Info */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Accepted Payment Methods</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SUPPORTED_PAYMENT_METHODS).map(([key, method]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {method.displayName}
                </Badge>
              ))}
            </div>
          </div>

          {/* Terms */}
          <div className="text-xs text-center text-muted-foreground">
            By completing this payment, you agree to our{' '}
            <a href="/terms" className="underline hover:text-foreground" target="_blank">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/refund-policy" className="underline hover:text-foreground" target="_blank">
              Refund Policy
            </a>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!stripe || !elements || processing || !paymentIntent}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Pay {formatCurrency(order.total)}
              </>
            )}
          </Button>

          {/* Test Mode Notice */}
          {isTestMode() && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Test Mode:</strong> Use card number 4242 4242 4242 4242 with any future expiry date and any 3-digit CVC.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Main PaymentStep component with order creation and Stripe Elements
 */
export function PaymentStep(props: PaymentStepProps) {
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stripePromise] = useState(() => getStripe())

  // Create order on component mount
  useEffect(() => {
    createOrder()
  }, [props.leagueId, props.division, props.teamNames, props.discountCode])

  const createOrder = async () => {
    try {
      setLoading(true)
      setError(null)

      const orderData: CreateOrderRequest = {
        leagueId: props.leagueId,
        division: props.division,
        numberOfTeams: props.teamNames.length,
        teamNames: props.teamNames,
        discountCode: props.discountCode,
        metadata: props.metadata,
      }

      const newOrder = await paymentAPI.createRegistrationOrder(orderData)
      setOrder(newOrder)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order'
      setError(message)
      props.onError?.(message)
      toast.error('Order creation failed', { description: message })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Calculating fees...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !order) {
    return (
      <Card>
        <CardContent className="py-12">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Failed to load payment information'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={createOrder} 
            className="mt-4 w-full"
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Order Summary */}
      {props.showSummary !== false && (
        <OrderSummary order={order} />
      )}

      {/* Stripe Elements Provider */}
      <Elements 
        stripe={stripePromise} 
        options={getElementsOptions(undefined, 'stripe')}
      >
        <PaymentForm
          order={order}
          onSuccess={props.onSuccess}
          onError={props.onError}
          allowSavePayment={props.allowSavePayment}
        />
      </Elements>
    </motion.div>
  )
}

export default PaymentStep