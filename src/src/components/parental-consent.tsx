'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/simple-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/simple-ui'
import { Badge } from '@/components/simple-ui'
import { Checkbox } from '@/components/simple-ui'
import { Input } from '@/components/simple-ui'
import { Label } from '@/components/simple-ui'
import { Textarea } from '@/components/simple-ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/simple-ui'
import { 
  Shield, 
  Mail, 
  FileText, 
  AlertCircle,
  Check,
  ArrowRight,
  Clock,
  Users,
  Lock,
  Eye,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ParentalConsentProps {
  parentName: string
  parentEmail: string
  onComplete: (approved: boolean) => void
  onClose: () => void
}

type ConsentStep = 'information' | 'review-policy' | 'consent-form' | 'verification' | 'complete'

const privacyHighlights = [
  {
    icon: Eye,
    title: 'What We Collect',
    description: 'Only necessary information like name, team assignment, and game statistics'
  },
  {
    icon: Lock,
    title: 'How We Protect Data',
    description: 'Industry-standard encryption and secure storage with limited access'
  },
  {
    icon: Users,
    title: 'Who Can See Information',
    description: 'Only coaches, team parents, and league administrators as needed'
  },
  {
    icon: Shield,
    title: 'Your Rights',
    description: 'Request data deletion, updates, or account closure at any time'
  }
]

export function ParentalConsent({ parentName, parentEmail, onComplete, onClose }: ParentalConsentProps) {
  const [step, setStep] = useState<ConsentStep>('information')
  const [consentGiven, setConsentGiven] = useState(false)
  const [readPrivacyPolicy, setReadPrivacyPolicy] = useState(false)
  const [readTerms, setReadTerms] = useState(false)
  const [understandRights, setUnderstandRights] = useState(false)
  const [allowCommunication, setAllowCommunication] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isConsentFormValid = consentGiven && readPrivacyPolicy && readTerms && understandRights

  const handleSendVerificationEmail = async () => {
    setIsSubmitting(true)
    
    // Simulate sending verification email
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setStep('verification')
  }

  const handleVerifyConsent = async () => {
    if (verificationCode.toLowerCase() === 'verify') {
      setStep('complete')
      // Simulate processing time
      setTimeout(() => {
        onComplete(true)
      }, 1500)
    } else {
      // Handle invalid code
      alert('Invalid verification code. Please check your email.')
    }
  }

  const handleDownloadPolicy = () => {
    // In a real implementation, this would download a PDF
    const policyContent = `
GameTriq Children's Privacy Policy

Last Updated: ${new Date().toLocaleDateString()}

This policy explains how we collect, use, and protect your child&apos;s information in compliance with COPPA.

INFORMATION WE COLLECT:
- Child's name and age
- Team and league assignment
- Game statistics and performance data
- Parent/guardian contact information

HOW WE USE THIS INFORMATION:
- To enable participation in basketball leagues
- To track game statistics and team performance
- To communicate important league information
- To ensure child safety during activities

DATA PROTECTION:
- All data is encrypted and stored securely
- Access is limited to authorized personnel only
- We never sell or share personal information
- Regular security audits and updates

YOUR RIGHTS:
- Request to see your child&apos;s information
- Request corrections or updates
- Request deletion of your child&apos;s account
- Withdraw consent at any time

CONTACT US:
Email: privacy@gametriq.com
Phone: (555) 123-4567
    `
    
    const blob = new Blob([policyContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gametriq-childrens-privacy-policy.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="consent-title">
        <DialogHeader>
          <DialogTitle id="consent-title" className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-basketball-orange-500" />
            <span>Parental Consent Form</span>
          </DialogTitle>
          <DialogDescription>
            COPPA-compliant consent process for users under 13 years of age
          </DialogDescription>
        </DialogHeader>

        {step === 'information' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>About GameTriq for Young Players</span>
                </CardTitle>
                <CardDescription>
                  Understanding how we protect your child&apos;s privacy and safety
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    GameTriq is designed to provide a safe, fun, and educational basketball experience for young players. 
                    We take children&apos;s privacy very seriously and comply with all COPPA requirements.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {privacyHighlights.map((highlight) => (
                      <div key={highlight.title} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <highlight.icon className="h-5 w-5 text-basketball-orange-500 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium">{highlight.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{highlight.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Your Control</p>
                      <p>You maintain complete control over your child&apos;s information and can revoke consent at any time.</p>
                    </div>
                  </div>
                </div>

                <Button onClick={() => setStep('review-policy')} className="w-full">
                  Continue to Privacy Review
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'review-policy' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Privacy Policy & Terms Review</span>
                </CardTitle>
                <CardDescription>
                  Please review our policies that govern how we handle your child&apos;s information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-2">Children's Privacy Policy Summary</h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• We collect only necessary information for basketball participation</li>
                      <li>• Data is encrypted and stored securely with limited access</li>
                      <li>• Information is shared only with coaches and authorized league personnel</li>
                      <li>• You can request data deletion or account closure at any time</li>
                      <li>• We never use children&apos;s data for marketing or advertising</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={handleDownloadPolicy}
                      className="flex items-center space-x-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Full Policy</span>
                    </Button>
                    <Badge variant="secondary">
                      <Shield className="h-3 w-3 mr-1" />
                      COPPA Compliant
                    </Badge>
                  </div>
                </div>

                <Button onClick={() => setStep('consent-form')} className="w-full">
                  Proceed to Consent Form
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'consent-form' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Parental Consent Agreement</span>
                </CardTitle>
                <CardDescription>
                  Please read and agree to each item below to provide consent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <h4 className="font-medium text-amber-800 mb-2">Parent/Guardian Information</h4>
                    <div className="text-sm text-amber-700 space-y-1">
                      <p><strong>Name:</strong> {parentName}</p>
                      <p><strong>Email:</strong> {parentEmail}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="consent-given"
                        checked={consentGiven}
                        onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                      />
                      <Label htmlFor="consent-given" className="text-sm leading-relaxed">
                        <strong>I give my consent</strong> for my child to create an account and use GameTriq's basketball league management services.
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="privacy-read"
                        checked={readPrivacyPolicy}
                        onCheckedChange={(checked) => setReadPrivacyPolicy(checked as boolean)}
                      />
                      <Label htmlFor="privacy-read" className="text-sm leading-relaxed">
                        I have read and understand the{' '}
                        <a href="/privacy" className="text-basketball-orange-500 hover:underline" target="_blank">
                          Children's Privacy Policy
                        </a>.
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="terms-read"
                        checked={readTerms}
                        onCheckedChange={(checked) => setReadTerms(checked as boolean)}
                      />
                      <Label htmlFor="terms-read" className="text-sm leading-relaxed">
                        I have read and agree to the{' '}
                        <a href="/terms" className="text-basketball-orange-500 hover:underline" target="_blank">
                          Terms of Service
                        </a>.
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="understand-rights"
                        checked={understandRights}
                        onCheckedChange={(checked) => setUnderstandRights(checked as boolean)}
                      />
                      <Label htmlFor="understand-rights" className="text-sm leading-relaxed">
                        I understand my rights to review, modify, or delete my child&apos;s information at any time.
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="allow-communication"
                        checked={allowCommunication}
                        onCheckedChange={(checked) => setAllowCommunication(checked as boolean)}
                      />
                      <Label htmlFor="allow-communication" className="text-sm leading-relaxed">
                        <strong>Optional:</strong> I allow GameTriq to send me updates about my child&apos;s basketball activities via email.
                      </Label>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSendVerificationEmail}
                  disabled={!isConsentFormValid || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Sending Verification Email...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Verification Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'verification' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Email Verification</span>
                </CardTitle>
                <CardDescription>
                  Check your email and enter the verification code to complete the consent process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">
                      We've sent a verification email to:
                    </p>
                    <p className="font-medium">{parentEmail}</p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
                    <p className="font-medium mb-1">Demo Mode</p>
                    <p>For this demo, enter "verify" as the verification code.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <Input
                      id="verification-code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter the code from your email"
                      className="text-center"
                    />
                  </div>

                  <Button 
                    onClick={handleVerifyConsent}
                    disabled={!verificationCode.trim()}
                    className="w-full"
                  >
                    Verify & Complete Consent
                    <Check className="ml-2 h-4 w-4" />
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={handleSendVerificationEmail}
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    Resend Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="pt-6 text-center space-y-6">
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
                  <h3 className="text-lg font-semibold">Consent Successfully Granted!</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Thank you for completing the parental consent process. Your child can now safely use GameTriq.
                  </p>
                </div>

                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <Shield className="h-3 w-3 mr-1" />
                    COPPA Compliant
                  </Badge>
                  
                  <div className="text-xs text-muted-foreground">
                    Consent granted on {new Date().toLocaleDateString()}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium mb-1">What happens next:</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Your child can now create their player profile</li>
                    <li>• You&apos;ll receive a confirmation email with account details</li>
                    <li>• You can manage consent settings anytime in your parent dashboard</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ParentalConsent