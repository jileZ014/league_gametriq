'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  Lock, 
  AlertCircle,
  Loader2,
  Shield,
  CheckCircle2,
  Gift,
  Tag
} from 'lucide-react'
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
  isTestMode 
} from '@/lib/stripe/stripe-client'
import { 
  paymentAPI, 
  type PaymentIntentResponse 
} from '@/lib/stripe/payment-api'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CheckoutFormProps {
  // Payment details
  amount: number
  currency?: string
  description: string
  
  // Order information
  orderId?: string
  items: Array<{
    name: string
    description?: string
    amount: number
    quantity: number
  }>
  
  // Discount handling
  allowDiscountCodes?: boolean
  
  // Callbacks
  onSuccess: (paymentIntentId: string) => void
  onError?: (error: string) => void
  
  // UI options
  showBillingAddress?: boolean
  allowSavePayment?: boolean
  
  // Metadata
  metadata?: Record<string, any>
}

interface DiscountSectionProps {
  onApplyDiscount: (code: string) => Promise<boolean>
  appliedDiscount?: {
    code: string
    amount: number
    description: string
  }
  loading?: boolean
}

/**
 * Discount code section component
 */
function DiscountSection({ onApplyDiscount, appliedDiscount, loading }: DiscountSectionProps) {
  const [discountCode, setDiscountCode] = useState('')
  const [applying, setApplying] = useState(false)

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return
    
    setApplying(true)
    try {
      const success = await onApplyDiscount(discountCode)
      if (success) {
        setDiscountCode('')
        toast.success('Discount code applied successfully!')
      } else {
        toast.error('Invalid or expired discount code')
      }
    } catch (error) {
      toast.error('Failed to apply discount code')
    } finally {
      setApplying(false)
    }
  }

  if (appliedDiscount) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center space-x-2">
          <Gift className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Discount Applied: {appliedDiscount.code}
            </p>
            <p className="text-xs text-green-600">{appliedDiscount.description}</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          -{formatCurrency(appliedDiscount.amount)}
        </Badge>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="discount-code" className="text-sm font-medium">
        Discount Code (Optional)
      </Label>
      <div className="flex space-x-2">
        <div className="flex-1">
          <Input
            id="discount-code"
            placeholder="Enter discount code"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            disabled={loading || applying}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleApplyDiscount}
          disabled={!discountCode.trim() || loading || applying}
        >
          {applying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Tag className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

/**
 * Order summary component
 */
function OrderSummary({ 
  items, 
  subtotal, 
  discount, 
  total, 
  currency = 'USD' 
}: {
  items: CheckoutFormProps['items']
  subtotal: number
  discount?: { amount: number; description: string }
  total: number
  currency?: string
}) {
  return (
    <div className="space-y-3">
      {/* Items */}
      {items.map((item, index) => (
        <div key={index} className="flex justify-between text-sm">
          <div>
            <p className="font-medium">{item.name}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground">{item.description}</p>
            )}
          </div>
          <div className="text-right">
            <p>{formatCurrency(item.amount * item.quantity)}</p>
            {item.quantity > 1 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(item.amount)} × {item.quantity}
              </p>
            )}
          </div>
        </div>
      ))}
      
      <Separator />
      
      {/* Subtotal */}
      <div className="flex justify-between text-sm">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      
      {/* Discount */}
      {discount && discount.amount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>{discount.description}</span>
          <span>-{formatCurrency(discount.amount)}</span>
        </div>
      )}
      
      <Separator />
      
      {/* Total */}
      <div className="flex justify-between font-semibold text-lg">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

/**
 * Payment form component
 */
function PaymentForm({ 
  paymentIntent, 
  onSuccess, 
  onError, 
  showBillingAddress, 
  allowSavePayment 
}: {
  paymentIntent: PaymentIntentResponse
  onSuccess: (paymentIntentId: string) => void
  onError?: (error: string) => void
  showBillingAddress?: boolean
  allowSavePayment?: boolean
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [savePayment, setSavePayment] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)

    try {
      const { error, paymentIntent: confirmedIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
          save_payment_method: savePayment,
        },
        redirect: 'if_required',
      })

      if (error) {
        throw new Error(getErrorMessage(error))
      }

      if (confirmedIntent && confirmedIntent.status === 'succeeded') {
        onSuccess(confirmedIntent.id)
        toast.success('Payment completed successfully!')
      } else if (confirmedIntent && confirmedIntent.status === 'requires_action') {
        toast.info('Please complete additional verification')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      onError?.(message)
      toast.error('Payment failed', { description: message })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element */}
      <div className="space-y-4">
        <PaymentElement 
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'us_bank_account', 'link'],
          }}
        />
        
        {/* Billing Address */}
        {showBillingAddress && (
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Billing Address
            </Label>
            <AddressElement 
              options={{
                mode: 'billing',
              }}
            />
          </div>
        )}
        
        {/* Save payment method */}
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
              Save payment method for future use
            </label>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || processing}
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Pay {formatCurrency(paymentIntent.amount)}
          </>
        )}
      </Button>
    </form>
  )
}

/**
 * Main CheckoutForm component
 */
export function CheckoutForm(props: CheckoutFormProps) {
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string
    amount: number
    description: string
  } | undefined>()
  const [stripePromise] = useState(() => getStripe())

  // Calculate totals
  const subtotal = props.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0)
  const discountAmount = appliedDiscount?.amount || 0
  const total = Math.max(0, subtotal - discountAmount)

  // Create payment intent
  useEffect(() => {
    createPaymentIntent()
  }, [total])

  const createPaymentIntent = async () => {
    try {
      setLoading(true)
      setError(null)

      const intent = await paymentAPI.createPaymentIntent({
        orderId: props.orderId || `checkout_${Date.now()}`,
        amount: total,
        currency: props.currency || 'usd',
        description: props.description,
        metadata: {
          ...props.metadata,
          items: JSON.stringify(props.items),
          discountCode: appliedDiscount?.code,
        },
        savePaymentMethod: false,
      })
      
      setPaymentIntent(intent)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize payment'
      setError(message)
      props.onError?.(message)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyDiscount = async (code: string): Promise<boolean> => {
    try {
      const result = await paymentAPI.validateDiscountCode(code, subtotal, 'general')
      
      if (result.valid && result.discount) {
        setAppliedDiscount({
          code,
          amount: result.discount.amount,
          description: `Discount: ${code}`,
        })
        return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Setting up payment...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !paymentIntent) {
    return (
      <Card>
        <CardContent className="py-12">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Failed to initialize payment'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={createPaymentIntent} 
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderSummary
            items={props.items}
            subtotal={subtotal}
            discount={appliedDiscount}
            total={total}
            currency={props.currency}
          />
          
          {/* Discount Code Section */}
          {props.allowDiscountCodes && (
            <div className="mt-6">
              <DiscountSection
                onApplyDiscount={handleApplyDiscount}
                appliedDiscount={appliedDiscount}
                loading={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Payment Details</span>
          </CardTitle>
          <CardDescription>
            Enter your payment information to complete the purchase
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Security indicator */}
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mb-6">
            <Shield className="h-4 w-4" />
            <span>Secure payment with SSL encryption</span>
          </div>

          <Elements 
            stripe={stripePromise} 
            options={getElementsOptions(paymentIntent.clientSecret)}
          >
            <PaymentForm
              paymentIntent={paymentIntent}
              onSuccess={props.onSuccess}
              onError={props.onError}
              showBillingAddress={props.showBillingAddress}
              allowSavePayment={props.allowSavePayment}
            />
          </Elements>

          {/* Test mode notice */}
          {isTestMode() && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Test Mode:</strong> Use test card 4242 4242 4242 4242
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CheckoutForm