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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { WaiverStep } from '@/components/registration/WaiverStep'
import { PaymentStep } from '@/components/registration/PaymentStep'
import { DiscountCode } from '@/components/registration/DiscountCode'
import { useRegistration } from '@/hooks/useRegistration'
import { AgeGate } from '@/components/age-gate'
import {
  Basketball,
  User,
  Calendar,
  Phone,
  Mail,
  Shield,
  FileText,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Users,
  Home,
  Heart
} from 'lucide-react'
import { cn } from '@/lib/utils'

const playerRegistrationSchema = z.object({
  // Player Information
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  dateOfBirth: z.object({
    month: z.string().min(1, 'Month is required'),
    day: z.string().min(1, 'Day is required'),
    year: z.string().min(1, 'Year is required')
  }),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']),
  
  // Contact Information
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone format: 123-456-7890').optional().or(z.literal('')),
  
  // Parent/Guardian Information (for minors)
  parentName: z.string().optional(),
  parentEmail: z.string().optional(),
  parentPhone: z.string().optional(),
  
  // Team Selection
  teamId: z.string().min(1, 'Please select a team'),
  jerseySize: z.enum(['YS', 'YM', 'YL', 'YXL', 'S', 'M', 'L', 'XL', '2XL', '3XL']),
  jerseyNumber: z.string().regex(/^\d{1,2}$/, 'Jersey number must be 1-99').optional(),
  
  // Medical Information
  emergencyContactName: z.string().min(2, 'Emergency contact name is required'),
  emergencyContactPhone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone format: 123-456-7890'),
  emergencyContactRelation: z.string().min(2, 'Relationship is required'),
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional()
})

type PlayerRegistrationForm = z.infer<typeof playerRegistrationSchema>

type RegistrationStep = 'player-info' | 'contact-info' | 'team-selection' | 'medical-info' | 'waiver' | 'payment' | 'success'

const steps: { id: RegistrationStep; title: string; description: string }[] = [
  { id: 'player-info', title: 'Player Information', description: 'Basic player details' },
  { id: 'contact-info', title: 'Contact Details', description: 'Contact information' },
  { id: 'team-selection', title: 'Team Selection', description: 'Choose your team' },
  { id: 'medical-info', title: 'Medical Information', description: 'Emergency & medical details' },
  { id: 'waiver', title: 'Waiver & Terms', description: 'Review and sign waivers' },
  { id: 'payment', title: 'Payment', description: 'Complete registration payment' },
  { id: 'success', title: 'Confirmation', description: 'Registration complete' }
]

// Mock data - replace with API calls
const teams = [
  { id: '1', name: 'Thunder Hawks', league: 'Youth Basketball League', division: '3rd-4th Grade', fee: 125 },
  { id: '2', name: 'Lightning Bolts', league: 'Youth Basketball League', division: '5th-6th Grade', fee: 125 },
  { id: '3', name: 'Fire Dragons', league: 'Teen Basketball League', division: 'Junior Varsity', fee: 150 },
  { id: '4', name: 'Storm Warriors', league: 'Teen Basketball League', division: 'Varsity', fee: 150 }
]

const jerseySizes = [
  { value: 'YS', label: 'Youth Small' },
  { value: 'YM', label: 'Youth Medium' },
  { value: 'YL', label: 'Youth Large' },
  { value: 'YXL', label: 'Youth X-Large' },
  { value: 'S', label: 'Adult Small' },
  { value: 'M', label: 'Adult Medium' },
  { value: 'L', label: 'Adult Large' },
  { value: 'XL', label: 'Adult X-Large' },
  { value: '2XL', label: 'Adult 2X-Large' },
  { value: '3XL', label: 'Adult 3X-Large' }
]

export default function PlayerRegistrationPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('player-info')
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null)
  const [waiverSigned, setWaiverSigned] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [isMinor, setIsMinor] = useState(false)
  const [showAgeGate, setShowAgeGate] = useState(false)
  const [ageVerified, setAgeVerified] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm<PlayerRegistrationForm>({
    resolver: zodResolver(playerRegistrationSchema),
    mode: 'onBlur'
  })

  const { createPlayerRegistration, loading } = useRegistration()

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const selectedTeamData = teams.find(t => t.id === selectedTeam)
  const registrationFee = selectedTeamData?.fee || 0
  const discountAmount = discount ? discount.amount : 0
  const totalAmount = registrationFee - discountAmount

  const currentYear = new Date().getFullYear()

  const calculateAge = () => {
    const dob = watch('dateOfBirth')
    if (!dob.month || !dob.day || !dob.year) return null
    
    const birth = new Date(
      parseInt(dob.year), 
      parseInt(dob.month) - 1, 
      parseInt(dob.day)
    )
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

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

  const handlePhoneChange = (field: 'phone' | 'parentPhone' | 'emergencyContactPhone') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setValue(field, formatted)
  }

  const handleStepNext = async () => {
    let fieldsToValidate: (keyof PlayerRegistrationForm)[] = []
    
    switch (currentStep) {
      case 'player-info':
        fieldsToValidate = ['firstName', 'lastName', 'dateOfBirth', 'gender']
        break
      case 'contact-info':
        const age = calculateAge()
        if (age && age < 18) {
          fieldsToValidate = ['parentName', 'parentEmail', 'parentPhone']
        }
        break
      case 'team-selection':
        fieldsToValidate = ['teamId', 'jerseySize']
        break
      case 'medical-info':
        fieldsToValidate = ['emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation']
        break
    }

    const isValid = await trigger(fieldsToValidate)
    if (!isValid) return

    // Check age after player info step
    if (currentStep === 'player-info') {
      const age = calculateAge()
      if (age && age < 13) {
        setShowAgeGate(true)
        return
      }
      setIsMinor(age! < 18)
    }

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

  const handleAgeGateVerification = (isOver13: boolean, hasParentalConsent: boolean) => {
    setAgeVerified(true)
    setShowAgeGate(false)
    
    if (isOver13 || hasParentalConsent) {
      const age = calculateAge()
      setIsMinor(age! < 18)
      setCurrentStep('contact-info')
    } else {
      toast.error('Parental consent is required for players under 13')
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
      await createPlayerRegistration({
        ...formData,
        paymentIntentId,
        discount: discount?.code,
        waiverSignedAt: new Date().toISOString(),
        isMinor
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
    <>
      {showAgeGate && (
        <AgeGate
          onVerify={handleAgeGateVerification}
          onClose={() => setShowAgeGate(false)}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-basketball-orange-50 via-white to-basketball-green-50 py-8">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Basketball className="h-10 w-10 text-basketball-orange-500" />
              <span className="text-2xl font-bold text-basketball-orange-500">GameTriq</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Player Registration</h1>
            <p className="text-gray-600 mt-2">Join a team and start playing basketball</p>
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
            {currentStep === 'player-info' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Player Information</span>
                    </CardTitle>
                    <CardDescription>
                      Tell us about the player being registered
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" variant="required">First Name</Label>
                        <Input
                          id="firstName"
                          {...register('firstName')}
                          placeholder="First name"
                          error={!!errors.firstName}
                        />
                        {errors.firstName && (
                          <p className="text-xs text-destructive">{errors.firstName.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName" variant="required">Last Name</Label>
                        <Input
                          id="lastName"
                          {...register('lastName')}
                          placeholder="Last name"
                          error={!!errors.lastName}
                        />
                        {errors.lastName && (
                          <p className="text-xs text-destructive">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label variant="required">Date of Birth</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <Select
                          value={watch('dateOfBirth.month')}
                          onValueChange={(value) => setValue('dateOfBirth.month', value)}
                        >
                          <SelectTrigger error={!!errors.dateOfBirth?.month}>
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

                        <Select
                          value={watch('dateOfBirth.day')}
                          onValueChange={(value) => setValue('dateOfBirth.day', value)}
                        >
                          <SelectTrigger error={!!errors.dateOfBirth?.day}>
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

                        <Select
                          value={watch('dateOfBirth.year')}
                          onValueChange={(value) => setValue('dateOfBirth.year', value)}
                        >
                          <SelectTrigger error={!!errors.dateOfBirth?.year}>
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 20 }, (_, i) => (
                              <SelectItem key={currentYear - i} value={(currentYear - i).toString()}>
                                {currentYear - i}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {errors.dateOfBirth && (
                        <p className="text-xs text-destructive">Please enter a valid date of birth</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender" variant="required">Gender</Label>
                      <Select
                        value={watch('gender')}
                        onValueChange={(value) => setValue('gender', value as any)}
                      >
                        <SelectTrigger id="gender" error={!!errors.gender}>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && (
                        <p className="text-xs text-destructive">{errors.gender.message}</p>
                      )}
                    </div>

                    {calculateAge() !== null && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Age:</strong> {calculateAge()} years old
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 'contact-info' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Phone className="h-5 w-5" />
                      <span>Contact Information</span>
                    </CardTitle>
                    <CardDescription>
                      {isMinor ? 'Parent/Guardian contact information' : 'Player contact information'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {isMinor ? (
                      <>
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-amber-800">Parent/Guardian Required</h4>
                              <p className="text-sm text-amber-700 mt-1">
                                Since the player is under 18, parent or guardian information is required.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="parentName" variant="required">Parent/Guardian Name</Label>
                          <Input
                            id="parentName"
                            {...register('parentName')}
                            placeholder="Full name"
                            error={!!errors.parentName}
                          />
                          {errors.parentName && (
                            <p className="text-xs text-destructive">{errors.parentName.message}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="parentEmail" variant="required">Parent Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="parentEmail"
                                type="email"
                                {...register('parentEmail')}
                                placeholder="parent@example.com"
                                className="pl-10"
                                error={!!errors.parentEmail}
                              />
                            </div>
                            {errors.parentEmail && (
                              <p className="text-xs text-destructive">{errors.parentEmail.message}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="parentPhone" variant="required">Parent Phone</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="parentPhone"
                                type="tel"
                                value={watch('parentPhone') || ''}
                                onChange={handlePhoneChange('parentPhone')}
                                placeholder="123-456-7890"
                                className="pl-10"
                                error={!!errors.parentPhone}
                              />
                            </div>
                            {errors.parentPhone && (
                              <p className="text-xs text-destructive">{errors.parentPhone.message}</p>
                            )}
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            Optional: Player's contact information (if available)
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="email">Player Email</Label>
                              <Input
                                id="email"
                                type="email"
                                {...register('email')}
                                placeholder="player@example.com"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="phone">Player Phone</Label>
                              <Input
                                id="phone"
                                type="tel"
                                value={watch('phone') || ''}
                                onChange={handlePhoneChange('phone')}
                                placeholder="123-456-7890"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email" variant="required">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="email"
                                type="email"
                                {...register('email')}
                                placeholder="player@example.com"
                                className="pl-10"
                                error={!!errors.email}
                              />
                            </div>
                            {errors.email && (
                              <p className="text-xs text-destructive">{errors.email.message}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="phone" variant="required">Phone</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="phone"
                                type="tel"
                                value={watch('phone') || ''}
                                onChange={handlePhoneChange('phone')}
                                placeholder="123-456-7890"
                                className="pl-10"
                                error={!!errors.phone}
                              />
                            </div>
                            {errors.phone && (
                              <p className="text-xs text-destructive">{errors.phone.message}</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 'team-selection' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Team Selection</span>
                    </CardTitle>
                    <CardDescription>
                      Choose your team and jersey preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="team" variant="required">Select Team</Label>
                      <Select
                        value={watch('teamId')}
                        onValueChange={(value) => {
                          setValue('teamId', value)
                          setSelectedTeam(value)
                        }}
                      >
                        <SelectTrigger id="team" error={!!errors.teamId}>
                          <SelectValue placeholder="Choose a team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <p className="font-medium">{team.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {team.league} - {team.division}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="ml-4">
                                  ${team.fee}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.teamId && (
                        <p className="text-xs text-destructive">{errors.teamId.message}</p>
                      )}
                    </div>

                    {selectedTeamData && (
                      <div className="p-4 bg-basketball-orange-50 border border-basketball-orange-200 rounded-lg">
                        <h4 className="font-medium text-basketball-orange-900 mb-2">
                          Team Information
                        </h4>
                        <div className="space-y-1 text-sm text-basketball-orange-800">
                          <p><strong>Team:</strong> {selectedTeamData.name}</p>
                          <p><strong>League:</strong> {selectedTeamData.league}</p>
                          <p><strong>Division:</strong> {selectedTeamData.division}</p>
                          <p><strong>Registration Fee:</strong> ${selectedTeamData.fee}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="jerseySize" variant="required">Jersey Size</Label>
                        <Select
                          value={watch('jerseySize')}
                          onValueChange={(value) => setValue('jerseySize', value as any)}
                        >
                          <SelectTrigger id="jerseySize" error={!!errors.jerseySize}>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {jerseySizes.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.jerseySize && (
                          <p className="text-xs text-destructive">{errors.jerseySize.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="jerseyNumber">Jersey Number (Optional)</Label>
                        <Input
                          id="jerseyNumber"
                          {...register('jerseyNumber')}
                          placeholder="00-99"
                          maxLength={2}
                          error={!!errors.jerseyNumber}
                        />
                        {errors.jerseyNumber && (
                          <p className="text-xs text-destructive">{errors.jerseyNumber.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Leave blank for auto-assignment
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 'medical-info' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Heart className="h-5 w-5" />
                      <span>Medical Information</span>
                    </CardTitle>
                    <CardDescription>
                      Emergency contact and medical details for player safety
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-800">Important</h4>
                          <p className="text-sm text-red-700 mt-1">
                            This information is crucial for player safety and will only be accessed in case of emergency.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Emergency Contact</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="emergencyContactName" variant="required">Contact Name</Label>
                        <Input
                          id="emergencyContactName"
                          {...register('emergencyContactName')}
                          placeholder="Emergency contact full name"
                          error={!!errors.emergencyContactName}
                        />
                        {errors.emergencyContactName && (
                          <p className="text-xs text-destructive">{errors.emergencyContactName.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactPhone" variant="required">Phone Number</Label>
                          <Input
                            id="emergencyContactPhone"
                            type="tel"
                            value={watch('emergencyContactPhone') || ''}
                            onChange={handlePhoneChange('emergencyContactPhone')}
                            placeholder="123-456-7890"
                            error={!!errors.emergencyContactPhone}
                          />
                          {errors.emergencyContactPhone && (
                            <p className="text-xs text-destructive">{errors.emergencyContactPhone.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactRelation" variant="required">Relationship</Label>
                          <Input
                            id="emergencyContactRelation"
                            {...register('emergencyContactRelation')}
                            placeholder="e.g., Parent, Guardian, Spouse"
                            error={!!errors.emergencyContactRelation}
                          />
                          {errors.emergencyContactRelation && (
                            <p className="text-xs text-destructive">{errors.emergencyContactRelation.message}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6 space-y-4">
                      <h3 className="font-medium text-lg">Medical Details (Optional)</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="medicalConditions">Medical Conditions</Label>
                        <Textarea
                          id="medicalConditions"
                          {...register('medicalConditions')}
                          placeholder="Any medical conditions we should be aware of (e.g., asthma, diabetes)"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="allergies">Allergies</Label>
                        <Textarea
                          id="allergies"
                          {...register('allergies')}
                          placeholder="List any allergies (food, medication, environmental)"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="medications">Current Medications</Label>
                        <Textarea
                          id="medications"
                          {...register('medications')}
                          placeholder="List any medications the player takes regularly"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                          <Input
                            id="insuranceProvider"
                            {...register('insuranceProvider')}
                            placeholder="Insurance company name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                          <Input
                            id="insurancePolicyNumber"
                            {...register('insurancePolicyNumber')}
                            placeholder="Insurance policy number"
                          />
                        </div>
                      </div>
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
                  participantName={`${watch('firstName')} ${watch('lastName')}`}
                  participantType="player"
                  isMinor={isMinor}
                  parentName={watch('parentName')}
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
                        <p><strong>Player:</strong> {watch('firstName')} {watch('lastName')}</p>
                        <p><strong>Team:</strong> {selectedTeamData?.name}</p>
                        <p><strong>Division:</strong> {selectedTeamData?.division}</p>
                        <p><strong>Jersey Size:</strong> {watch('jerseySize')}</p>
                        {watch('jerseyNumber') && (
                          <p><strong>Jersey Number:</strong> {watch('jerseyNumber')}</p>
                        )}
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
                  playerName={`${watch('firstName')} ${watch('lastName')}`}
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
                        {watch('firstName')} has been successfully registered
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
                      {isMinor && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                          <Shield className="h-3 w-3 mr-1" />
                          Parental Consent on File
                        </Badge>
                      )}
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg text-sm text-left">
                      <p className="font-medium mb-2">What's Next?</p>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• A confirmation email has been sent to {isMinor ? watch('parentEmail') : watch('email')}</li>
                        <li>• Team practice schedule will be sent 1 week before season start</li>
                        <li>• Jersey pickup information will be emailed separately</li>
                        <li>• Download the GameTriq mobile app to stay updated</li>
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => router.push('/')}
                        className="flex-1"
                      >
                        <Home className="mr-2 h-4 w-4" />
                        Back to Home
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="flex-1"
                      >
                        Register Another Player
                        <User className="ml-2 h-4 w-4" />
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
    </>
  )
}