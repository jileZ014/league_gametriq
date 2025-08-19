'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/simple-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/simple-ui'
import { Badge } from '@/components/simple-ui'
import { Input } from '@/components/simple-ui'
import { Label } from '@/components/simple-ui'
import { Checkbox } from '@/components/simple-ui'
import { ParentalConsent } from '@/components/parental-consent'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/simple-ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/simple-ui'
import { 
  Shield, 
  Calendar, 
  Users, 
  AlertTriangle,
  Check,
  ArrowRight,
  ArrowLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgeGateProps {
  onVerify: (isOver13: boolean, hasParentalConsent: boolean) => void
  onClose: () => void
}

type Step = 'initial' | 'under13' | 'parental-consent' | 'verification-complete'

export function AgeGate({ onVerify, onClose }: AgeGateProps) {
  const [step, setStep] = useState<Step>('initial')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentName, setParentName] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showParentalConsent, setShowParentalConsent] = useState(false)

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentDay = new Date().getDate()

  const calculateAge = () => {
    if (!birthMonth || !birthDay || !birthYear) return null
    
    const birth = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay))
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const handleAgeSubmit = () => {
    const age = calculateAge()
    
    if (age === null) return
    
    if (age >= 13) {
      onVerify(true, false)
    } else {
      setStep('under13')
    }
  }

  const handleParentalConsentRequest = () => {
    setShowParentalConsent(true)
  }

  const handleParentalConsentComplete = (approved: boolean) => {
    setShowParentalConsent(false)
    if (approved) {
      setStep('verification-complete')
      // In a real implementation, this would be handled by the backend
      setTimeout(() => {
        onVerify(false, true)
      }, 2000)
    }
  }

  const isAgeFormValid = birthMonth && birthDay && birthYear
  const isParentFormValid = parentEmail && parentName && agreedToTerms

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md" aria-labelledby="age-gate-title">
          <DialogHeader>
            <DialogTitle id="age-gate-title" className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-basketball-orange-500" />
              <span>Age Verification Required</span>
            </DialogTitle>
            <DialogDescription>
              To comply with COPPA regulations and ensure child safety, we need to verify your age.
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {step === 'initial' && (
              <motion.div
                key="initial"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Enter Your Date of Birth</span>
                    </CardTitle>
                    <CardDescription>
                      This information is used only for age verification and is not stored.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="birth-month">Month</Label>
                        <Select value={birthMonth} onValueChange={setBirthMonth}>
                          <SelectTrigger id="birth-month">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birth-day">Day</Label>
                        <Select value={birthDay} onValueChange={setBirthDay}>
                          <SelectTrigger id="birth-day">
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birth-year">Year</Label>
                        <Select value={birthYear} onValueChange={setBirthYear}>
                          <SelectTrigger id="birth-year">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 100 }, (_, i) => (
                              <SelectItem key={currentYear - i} value={(currentYear - i).toString()}>
                                {currentYear - i}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                      <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">Privacy Protected</p>
                        <p>Your date of birth is used only for age verification and is not stored or shared.</p>
                      </div>
                    </div>

                    <Button 
                      onClick={handleAgeSubmit}
                      disabled={!isAgeFormValid}
                      className="w-full"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 'under13' && (
              <motion.div
                key="under13"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Parental Permission Required</span>
                    </CardTitle>
                    <CardDescription>
                      Since you're under 13, we need a parent or guardian to give permission before you can use GameTriq.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div className="text-sm text-amber-700">
                        <p className="font-medium mb-1">COPPA Compliance</p>
                        <p>The Children's Online Privacy Protection Act (COPPA) requires parental consent for users under 13.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="parent-name">Parent/Guardian Full Name</Label>
                        <Input
                          id="parent-name"
                          value={parentName}
                          onChange={(e) => setParentName(e.target.value)}
                          placeholder="Enter parent or guardian's full name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="parent-email">Parent/Guardian Email</Label>
                        <Input
                          id="parent-email"
                          type="email"
                          value={parentEmail}
                          onChange={(e) => setParentEmail(e.target.value)}
                          placeholder="Enter parent or guardian's email"
                        />
                        <p className="text-xs text-muted-foreground">
                          We'll send a consent form to this email address.
                        </p>
                      </div>

                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="terms-agreement"
                          checked={agreedToTerms}
                          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                        />
                        <Label htmlFor="terms-agreement" className="text-sm leading-relaxed">
                          I understand that parental consent is required and agree to the{' '}
                          <a href="/terms" className="text-basketball-orange-500 hover:underline" target="_blank">
                            Terms of Service
                          </a>{' '}
                          and{' '}
                          <a href="/privacy" className="text-basketball-orange-500 hover:underline" target="_blank">
                            Privacy Policy
                          </a>.
                        </Label>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Button 
                        variant="outline" 
                        onClick={() => setStep('initial')}
                        className="flex-1"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button 
                        onClick={handleParentalConsentRequest}
                        disabled={!isParentFormValid}
                        className="flex-1"
                      >
                        Request Consent
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 'verification-complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardContent className="pt-6 text-center space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="h-8 w-8 text-green-600" />
                      </div>
                    </motion.div>
                    
                    <div>
                      <h3 className="text-lg font-semibold">Verification Complete!</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Parental consent has been granted. Welcome to GameTriq!
                      </p>
                    </div>

                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <Shield className="h-3 w-3 mr-1" />
                      COPPA Compliant
                    </Badge>

                    <div className="text-xs text-muted-foreground">
                      Redirecting you to the application...
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Parental Consent Flow */}
      {showParentalConsent && (
        <ParentalConsent
          parentName={parentName}
          parentEmail={parentEmail}
          onComplete={handleParentalConsentComplete}
          onClose={() => setShowParentalConsent(false)}
        />
      )}
    </>
  )
}

export default AgeGate