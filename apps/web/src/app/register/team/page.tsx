'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { WaiverStep } from '@/components/registration/WaiverStep'
import { PaymentStep } from '@/components/registration/PaymentStep'
import { DiscountCode } from '@/components/registration/DiscountCode'
import { useRegistration } from '@/hooks/useRegistration'
import {
  Basketball,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Shield,
  CreditCard,
  Tag,
  Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'

const teamRegistrationSchema = z.object({
  teamName: z.string().min(3, 'Team name must be at least 3 characters'),
  leagueId: z.string().min(1, 'Please select a league'),
  divisionId: z.string().min(1, 'Please select a division'),
  coachName: z.string().min(2, 'Coach name is required'),
  coachEmail: z.string().email('Valid email required'),
  coachPhone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone format: 123-456-7890'),
  assistantCoachName: z.string().optional(),
  assistantCoachEmail: z.string().email('Valid email required').optional().or(z.literal('')),
  teamColors: z.object({
    primary: z.string().min(1, 'Primary color is required'),
    secondary: z.string().optional()
  }),
  practicePreferences: z.string().optional(),
  specialRequests: z.string().optional()
})

type TeamRegistrationForm = z.infer<typeof teamRegistrationSchema>

type RegistrationStep = 'team-info' | 'league-selection' | 'coach-info' | 'waiver' | 'payment' | 'success'

const steps: { id: RegistrationStep; title: string; description: string }[] = [
  { id: 'team-info', title: 'Team Information', description: 'Basic team details' },
  { id: 'league-selection', title: 'League & Division', description: 'Choose your competition' },
  { id: 'coach-info', title: 'Coaching Staff', description: 'Coach contact information' },
  { id: 'waiver', title: 'Waiver & Terms', description: 'Review and sign waivers' },
  { id: 'payment', title: 'Payment', description: 'Complete registration payment' },
  { id: 'success', title: 'Confirmation', description: 'Registration complete' }
]

// Mock data - replace with API calls
const leagues = [
  { id: '1', name: 'Youth Basketball League (Ages 8-12)', fee: 350 },
  { id: '2', name: 'Teen Basketball League (Ages 13-17)', fee: 450 },
  { id: '3', name: 'Adult Recreation League (18+)', fee: 550 }
]

const divisions = {
  '1': [
    { id: '1-1', name: '3rd-4th Grade', minAge: 8, maxAge: 10 },
    { id: '1-2', name: '5th-6th Grade', minAge: 10, maxAge: 12 }
  ],
  '2': [
    { id: '2-1', name: 'Junior Varsity (13-15)', minAge: 13, maxAge: 15 },
    { id: '2-2', name: 'Varsity (16-17)', minAge: 16, maxAge: 17 }
  ],
  '3': [
    { id: '3-1', name: 'Recreational Division', minAge: 18, maxAge: 99 },
    { id: '3-2', name: 'Competitive Division', minAge: 18, maxAge: 99 }
  ]
}

export default function TeamRegistrationPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('team-info')
  const [selectedLeague, setSelectedLeague] = useState<string>('')
  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null)
  const [waiverSigned, setWaiverSigned] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm<TeamRegistrationForm>({
    resolver: zodResolver(teamRegistrationSchema),
    mode: 'onBlur'
  })

  const { createTeamRegistration, loading } = useRegistration()

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const selectedLeagueData = leagues.find(l => l.id === selectedLeague)
  const registrationFee = selectedLeagueData?.fee || 0
  const discountAmount = discount ? discount.amount : 0
  const totalAmount = registrationFee - discountAmount

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/)
    if (!match) return value
    
    const parts = [match[1], match[2], match[3]].filter(Boolean)
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0]
    if (parts.length === 2) return `${parts[0]}-${parts[1]}`
    return `${parts[0]}-${parts[1]}-${parts[2]}`
  }

  const handlePhoneChange = (field: 'coachPhone') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setValue(field, formatted)
  }

  const handleStepNext = async () => {
    let fieldsToValidate: (keyof TeamRegistrationForm)[] = []
    
    switch (currentStep) {
      case 'team-info':
        fieldsToValidate = ['teamName', 'teamColors']
        break
      case 'league-selection':
        fieldsToValidate = ['leagueId', 'divisionId']
        break
      case 'coach-info':
        fieldsToValidate = ['coachName', 'coachEmail', 'coachPhone']
        break
    }

    const isValid = await trigger(fieldsToValidate)
    if (!isValid) return

    if (currentStep === 'waiver' && !waiverSigned) {
      toast.error('Please review and sign the waiver to continue')
      return
    }

    if (currentStep === 'payment' && !paymentComplete) {
      toast.error('Please complete payment to continue')
      return
    }

    const stepIndex = steps.findIndex(s => s.id === currentStep)
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id)
    }
  }

  const handleStepBack = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep)
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id)
    }
  }

  const handleWaiverSign = (signature: string) => {
    setWaiverSigned(true)
    toast.success('Waiver signed successfully')
  }

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setPaymentComplete(true)
    
    const formData = watch()
    try {
      await createTeamRegistration({
        ...formData,
        paymentIntentId,
        discount: discount?.code,
        waiverSignedAt: new Date().toISOString()
      })
      
      setCurrentStep('success')
    } catch (error) {
      toast.error('Registration failed. Please contact support.')
    }
  }

  const handleDiscountApply = (code: string, amount: number) => {
    setDiscount({ code, amount })
    toast.success(`Discount applied: $${amount} off`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-basketball-orange-50 via-white to-basketball-green-50 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Basketball className="h-10 w-10 text-basketball-orange-500" />
            <span className="text-2xl font-bold text-basketball-orange-500">GameTriq</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Team Registration</h1>
          <p className="text-gray-600 mt-2">Register your team for the upcoming season</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div 
              className="bg-basketball-orange-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center",
                  index <= currentStepIndex ? "text-basketball-orange-600" : "text-gray-400"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-colors",
                    index < currentStepIndex 
                      ? "bg-basketball-orange-600 text-white"
                      : index === currentStepIndex
                      ? "bg-basketball-orange-100 text-basketball-orange-600 border-2 border-basketball-orange-600"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span className="text-xs font-medium hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Steps */}
        <form onSubmit={handleSubmit(() => {})}>
          {currentStep === 'team-info' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Team Information</span>
                  </CardTitle>
                  <CardDescription>
                    Tell us about your team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="teamName" variant="required">Team Name</Label>
                    <Input
                      id="teamName"
                      {...register('teamName')}
                      placeholder="Enter your team name"
                      error={!!errors.teamName}
                    />
                    {errors.teamName && (
                      <p className="text-xs text-destructive">{errors.teamName.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor" variant="required">Primary Color</Label>
                      <Select
                        value={watch('teamColors.primary')}
                        onValueChange={(value) => setValue('teamColors.primary', value)}
                      >
                        <SelectTrigger id="primaryColor" error={!!errors.teamColors?.primary}>
                          <SelectValue placeholder="Select primary color" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="red">Red</SelectItem>
                          <SelectItem value="blue">Blue</SelectItem>
                          <SelectItem value="green">Green</SelectItem>
                          <SelectItem value="orange">Orange</SelectItem>
                          <SelectItem value="purple">Purple</SelectItem>
                          <SelectItem value="black">Black</SelectItem>
                          <SelectItem value="white">White</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.teamColors?.primary && (
                        <p className="text-xs text-destructive">{errors.teamColors.primary.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">Secondary Color</Label>
                      <Select
                        value={watch('teamColors.secondary')}
                        onValueChange={(value) => setValue('teamColors.secondary', value)}
                      >
                        <SelectTrigger id="secondaryColor">
                          <SelectValue placeholder="Select secondary color" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="red">Red</SelectItem>
                          <SelectItem value="blue">Blue</SelectItem>
                          <SelectItem value="green">Green</SelectItem>
                          <SelectItem value="orange">Orange</SelectItem>
                          <SelectItem value="purple">Purple</SelectItem>
                          <SelectItem value="black">Black</SelectItem>
                          <SelectItem value="white">White</SelectItem>
                          <SelectItem value="gold">Gold</SelectItem>
                          <SelectItem value="silver">Silver</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="practicePreferences">Practice Preferences</Label>
                    <Textarea
                      id="practicePreferences"
                      {...register('practicePreferences')}
                      placeholder="Preferred days, times, or locations for practice"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 'league-selection' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>League & Division Selection</span>
                  </CardTitle>
                  <CardDescription>
                    Choose the league and division for your team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="league" variant="required">Select League</Label>
                    <Select
                      value={watch('leagueId')}
                      onValueChange={(value) => {
                        setValue('leagueId', value)
                        setValue('divisionId', '') // Reset division when league changes
                        setSelectedLeague(value)
                      }}
                    >
                      <SelectTrigger id="league" error={!!errors.leagueId}>
                        <SelectValue placeholder="Choose a league" />
                      </SelectTrigger>
                      <SelectContent>
                        {leagues.map((league) => (
                          <SelectItem key={league.id} value={league.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{league.name}</span>
                              <Badge variant="secondary" className="ml-2">
                                ${league.fee}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.leagueId && (
                      <p className="text-xs text-destructive">{errors.leagueId.message}</p>
                    )}
                  </div>

                  {watch('leagueId') && (
                    <div className="space-y-2">
                      <Label htmlFor="division" variant="required">Select Division</Label>
                      <Select
                        value={watch('divisionId')}
                        onValueChange={(value) => setValue('divisionId', value)}
                      >
                        <SelectTrigger id="division" error={!!errors.divisionId}>
                          <SelectValue placeholder="Choose a division" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions[watch('leagueId') as keyof typeof divisions]?.map((division) => (
                            <SelectItem key={division.id} value={division.id}>
                              <div>
                                <p>{division.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Ages {division.minAge}-{division.maxAge}
                                </p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.divisionId && (
                        <p className="text-xs text-destructive">{errors.divisionId.message}</p>
                      )}
                    </div>
                  )}

                  {selectedLeagueData && (
                    <div className="p-4 bg-basketball-orange-50 border border-basketball-orange-200 rounded-lg">
                      <h4 className="font-medium text-basketball-orange-900 mb-2">
                        League Information
                      </h4>
                      <div className="space-y-1 text-sm text-basketball-orange-800">
                        <p><strong>Registration Fee:</strong> ${selectedLeagueData.fee}</p>
                        <p><strong>Season:</strong> Winter 2024</p>
                        <p><strong>Start Date:</strong> January 15, 2024</p>
                        <p><strong>Games:</strong> 10 regular season + playoffs</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 'coach-info' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Coaching Staff Information</span>
                  </CardTitle>
                  <CardDescription>
                    Head coach and assistant coach details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Head Coach</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="coachName" variant="required">Full Name</Label>
                      <Input
                        id="coachName"
                        {...register('coachName')}
                        placeholder="Coach's full name"
                        error={!!errors.coachName}
                      />
                      {errors.coachName && (
                        <p className="text-xs text-destructive">{errors.coachName.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="coachEmail" variant="required">Email</Label>
                        <Input
                          id="coachEmail"
                          type="email"
                          {...register('coachEmail')}
                          placeholder="coach@example.com"
                          error={!!errors.coachEmail}
                        />
                        {errors.coachEmail && (
                          <p className="text-xs text-destructive">{errors.coachEmail.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="coachPhone" variant="required">Phone</Label>
                        <Input
                          id="coachPhone"
                          type="tel"
                          value={watch('coachPhone') || ''}
                          onChange={handlePhoneChange('coachPhone')}
                          placeholder="123-456-7890"
                          error={!!errors.coachPhone}
                        />
                        {errors.coachPhone && (
                          <p className="text-xs text-destructive">{errors.coachPhone.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="font-medium text-lg">Assistant Coach (Optional)</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="assistantCoachName">Full Name</Label>
                      <Input
                        id="assistantCoachName"
                        {...register('assistantCoachName')}
                        placeholder="Assistant coach's full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assistantCoachEmail">Email</Label>
                      <Input
                        id="assistantCoachEmail"
                        type="email"
                        {...register('assistantCoachEmail')}
                        placeholder="assistant@example.com"
                        error={!!errors.assistantCoachEmail}
                      />
                      {errors.assistantCoachEmail && (
                        <p className="text-xs text-destructive">{errors.assistantCoachEmail.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialRequests">Special Requests or Notes</Label>
                    <Textarea
                      id="specialRequests"
                      {...register('specialRequests')}
                      placeholder="Any special accommodations or requests"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 'waiver' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <WaiverStep
                participantName={watch('coachName')}
                participantType="coach"
                onSign={handleWaiverSign}
                signed={waiverSigned}
              />
            </motion.div>
          )}

          {currentStep === 'payment' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Registration Summary</span>
                  </CardTitle>
                  <CardDescription>
                    Review your registration and complete payment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <h4 className="font-medium">Registration Details</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Team:</strong> {watch('teamName')}</p>
                      <p><strong>League:</strong> {selectedLeagueData?.name}</p>
                      <p><strong>Coach:</strong> {watch('coachName')}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Registration Fee</span>
                        <span>${registrationFee}</span>
                      </div>
                      {discount && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount ({discount.code})</span>
                          <span>-${discount.amount}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium text-lg pt-2 border-t">
                        <span>Total</span>
                        <span>${totalAmount}</span>
                      </div>
                    </div>
                  </div>

                  {!discount && (
                    <DiscountCode
                      onApply={handleDiscountApply}
                      registrationFee={registrationFee}
                    />
                  )}
                </CardContent>
              </Card>

              <PaymentStep
                amount={totalAmount}
                onSuccess={handlePaymentSuccess}
                teamName={watch('teamName')}
              />
            </motion.div>
          )}

          {currentStep === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
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
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  </motion.div>
                  
                  <div>
                    <h3 className="text-2xl font-semibold">Registration Complete!</h3>
                    <p className="text-muted-foreground mt-2">
                      Your team has been successfully registered
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Payment Confirmed
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      <FileText className="h-3 w-3 mr-1" />
                      Waiver Signed
                    </Badge>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-left">
                    <p className="font-medium mb-2">What's Next?</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• You'll receive a confirmation email shortly</li>
                      <li>• Add players to your roster in the dashboard</li>
                      <li>• Schedule information will be sent 2 weeks before season start</li>
                      <li>• Download the GameTriq mobile app for easy access</li>
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => router.push('/dashboard/coach')}
                      className="flex-1"
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/register/player')}
                      className="flex-1"
                    >
                      Register Players
                      <Users className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          {currentStep !== 'success' && (
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleStepBack}
                disabled={currentStepIndex === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              
              {currentStep !== 'payment' && (
                <Button
                  type="button"
                  onClick={handleStepNext}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}