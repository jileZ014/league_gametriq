'use client'

import { useState } from 'react'
import { Button } from '@/components/simple-ui'
import { Input } from '@/components/simple-ui'
import { Label } from '@/components/simple-ui'
import { Alert, AlertDescription } from '@/components/simple-ui'
import { 
  Tag, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Percent,
  DollarSign
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DiscountCodeProps {
  onApply: (code: string, amount: number) => void
  registrationFee: number
}

// Mock discount codes - in a real app, these would be validated server-side
const validCodes = {
  'EARLYBIRD': { type: 'percentage', value: 15, description: 'Early Bird - 15% off' },
  'TEAM10': { type: 'fixed', value: 10, description: 'Team Discount - $10 off' },
  'SIBLING25': { type: 'fixed', value: 25, description: 'Sibling Discount - $25 off' },
  'NEWPLAYER': { type: 'percentage', value: 20, description: 'New Player - 20% off' },
  'VOLUNTEER50': { type: 'fixed', value: 50, description: 'Volunteer Discount - $50 off' },
}

export function DiscountCode({ onApply, registrationFee }: DiscountCodeProps) {
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const calculateDiscount = (discountInfo: typeof validCodes[keyof typeof validCodes]) => {
    if (discountInfo.type === 'percentage') {
      return Math.round((registrationFee * discountInfo.value) / 100)
    }
    return Math.min(discountInfo.value, registrationFee)
  }

  const handleApplyCode = async () => {
    if (!code.trim()) {
      setError('Please enter a discount code')
      return
    }

    setChecking(true)
    setError(null)
    setSuccess(null)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    const upperCode = code.toUpperCase().trim()
    const discountInfo = validCodes[upperCode as keyof typeof validCodes]

    if (discountInfo) {
      const discountAmount = calculateDiscount(discountInfo)
      setSuccess(`${discountInfo.description} applied!`)
      onApply(upperCode, discountAmount)
      
      // Collapse the discount code section after successful application
      setTimeout(() => {
        setExpanded(false)
      }, 2000)
    } else {
      setError('Invalid discount code. Please check and try again.')
    }

    setChecking(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleApplyCode()
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between text-sm font-medium transition-colors",
          expanded ? "bg-gray-50" : "bg-white hover:bg-gray-50"
        )}
      >
        <div className="flex items-center space-x-2">
          <Tag className="h-4 w-4 text-basketball-orange-500" />
          <span>Have a discount code?</span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t"
          >
            <div className="p-4 space-y-4 bg-gray-50">
              <div className="space-y-2">
                <Label htmlFor="discount-code" className="text-sm">
                  Enter discount code
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id="discount-code"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase())
                      setError(null)
                      setSuccess(null)
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter code"
                    className="flex-1"
                    disabled={checking}
                  />
                  <Button
                    type="button"
                    onClick={handleApplyCode}
                    disabled={checking || !code.trim()}
                    size="sm"
                  >
                    {checking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              </div>

              {/* Error/Success Messages */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Alert variant="destructive" className="py-2">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {error}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Alert className="py-2 border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm text-green-800">
                        {success}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Available Discounts Hint */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Available discounts:</p>
                <ul className="space-y-0.5 ml-4">
                  <li>• Early bird registration</li>
                  <li>• Multi-player families</li>
                  <li>• Returning teams</li>
                  <li>• Volunteer coaches</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}