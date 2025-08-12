'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CreditCard, 
  Lock, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Note: In a real implementation, you would import Stripe components:
// import { loadStripe } from '@stripe/stripe-js'
// import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

interface PaymentStepProps {
  amount: number
  onSuccess: (paymentIntentId: string) => void
  teamName?: string
  playerName?: string
}

// Mock Stripe card element component
function MockCardElement({ onChange, error }: { onChange: (complete: boolean) => void, error?: string }) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [zip, setZip] = useState('')

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s+/g, '')
    const match = cleaned.match(/.{1,4}/g)
    return match ? match.join(' ') : cleaned
  }

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
    }
    return cleaned
  }

  const isComplete = () => {
    const cardClean = cardNumber.replace(/\s+/g, '')
    const expiryClean = expiry.replace(/\D/g, '')
    return cardClean.length === 16 && expiryClean.length === 4 && cvc.length === 3 && zip.length === 5
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, '')
    if (/^\d*$/.test(value) && value.length <= 16) {
      setCardNumber(formatCardNumber(value))
      onChange(isComplete())
    }
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 4) {
      setExpiry(formatExpiry(value))
      onChange(isComplete())
    }
  }

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d*$/.test(value) && value.length <= 3) {
      setCvc(value)
      onChange(isComplete())
    }
  }

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d*$/.test(value) && value.length <= 5) {
      setZip(value)
      onChange(isComplete())
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number</Label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="cardNumber"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={handleCardNumberChange}
            className={cn("pl-10", error && "border-destructive")}
            maxLength={19}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry">Expiry</Label>
          <Input
            id="expiry"
            placeholder="MM/YY"
            value={expiry}
            onChange={handleExpiryChange}
            className={error ? "border-destructive" : ""}
            maxLength={5}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvc">CVC</Label>
          <Input
            id="cvc"
            placeholder="123"
            type="password"
            value={cvc}
            onChange={handleCvcChange}
            className={error ? "border-destructive" : ""}
            maxLength={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">ZIP</Label>
          <Input
            id="zip"
            placeholder="12345"
            value={zip}
            onChange={handleZipChange}
            className={error ? "border-destructive" : ""}
            maxLength={5}
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center">
          <AlertCircle className="h-3 w-3 mr-1" />
          {error}
        </p>
      )}
    </div>
  )
}

export function PaymentStep({ amount, onSuccess, teamName, playerName }: PaymentStepProps) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach'>('card')
  
  // Bank account fields for ACH
  const [accountNumber, setAccountNumber] = useState('')
  const [routingNumber, setRoutingNumber] = useState('')
  const [accountName, setAccountName] = useState('')

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if ((paymentMethod === 'card' && !cardComplete) || 
        (paymentMethod === 'ach' && (!accountNumber || !routingNumber || !accountName))) {
      setError('Please complete all payment fields')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In a real app, you would:
      // 1. Create a payment intent on your server
      // 2. Confirm the payment with Stripe
      // 3. Handle the response
      
      // Mock successful payment
      const mockPaymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      onSuccess(mockPaymentIntentId)
    } catch (err) {
      setError('Payment failed. Please try again.')
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
          Complete your registration payment securely
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePayment} className="space-y-6">
          {/* Security Badge */}
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Secure payment powered by Stripe</span>
            <Shield className="h-4 w-4" />
          </div>

          {/* Payment Amount */}
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Amount to pay</p>
            <p className="text-3xl font-bold text-gray-900">${amount}</p>
            {(teamName || playerName) && (
              <p className="text-sm text-muted-foreground mt-1">
                for {teamName || playerName}
              </p>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('card')}
                className="justify-start"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Credit/Debit Card
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'ach' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('ach')}
                className="justify-start"
              >
                <Shield className="h-4 w-4 mr-2" />
                Bank Account (ACH)
              </Button>
            </div>
          </div>

          {/* Payment Fields */}
          {paymentMethod === 'card' ? (
            <MockCardElement 
              onChange={setCardComplete}
              error={error || undefined}
            />
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ACH payments typically process within 3-5 business days and may have lower fees.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Holder Name</Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number</Label>
                  <Input
                    id="routingNumber"
                    value={routingNumber}
                    onChange={(e) => {
                      const value = e.target.value
                      if (/^\d*$/.test(value) && value.length <= 9) {
                        setRoutingNumber(value)
                      }
                    }}
                    placeholder="123456789"
                    maxLength={9}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    type="password"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="••••••••••"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Accepted Cards */}
          {paymentMethod === 'card' && (
            <div className="flex items-center justify-center space-x-4">
              <Badge variant="outline">Visa</Badge>
              <Badge variant="outline">Mastercard</Badge>
              <Badge variant="outline">Amex</Badge>
              <Badge variant="outline">Discover</Badge>
            </div>
          )}

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
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Pay ${amount}
              </>
            )}
          </Button>

          {/* Test Mode Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Test Mode:</strong> Use card number 4242 4242 4242 4242 with any future expiry date and any 3-digit CVC.
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  )
}