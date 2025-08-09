'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AgeGate } from '@/components/age-gate'
import { useAuth } from '@/components/providers/auth-provider'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Basketball,
  Eye,
  EyeOff,
  Shield,
  Users,
  Trophy,
  BarChart3,
  Clock,
  Calendar,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  User,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type UserRole = 'league-admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper'
type RegistrationStep = 'personal-info' | 'role-selection' | 'age-verification' | 'account-creation' | 'success'

const roleConfig = {
  'league-admin': {
    icon: Trophy,
    title: 'League Administrator',
    description: 'Manage leagues, teams, and tournaments',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    minAge: 18,
  },
  'coach': {
    icon: Users,
    title: 'Team Coach',
    description: 'Manage team roster and game strategy',
    color: 'text-basketball-orange-600',
    bgColor: 'bg-basketball-orange-50',
    borderColor: 'border-basketball-orange-200',
    minAge: 16,
  },
  'parent': {
    icon: Shield,
    title: 'Parent/Guardian',
    description: 'Follow your child\'s progress and games',
    color: 'text-basketball-green-600',
    bgColor: 'bg-basketball-green-50',
    borderColor: 'border-basketball-green-200',
    minAge: 18,
  },
  'player': {
    icon: Basketball,
    title: 'Player',
    description: 'View your stats and team information',
    color: 'text-team-home-primary',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    minAge: 6,
  },
  'referee': {
    icon: BarChart3,
    title: 'Referee',
    description: 'Officiate games and manage calls',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    minAge: 16,
  },
  'scorekeeper': {
    icon: Clock,
    title: 'Scorekeeper',
    description: 'Record scores and game statistics',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    minAge: 14,
  },
}

export default function RegisterPage() {
  const [step, setStep] = useState<RegistrationStep>('personal-info')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthMonth: '',
    birthDay: '',
    birthYear: '',
    parentEmail: '',
    parentName: '',
    role: '' as UserRole | '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [allowMarketing, setAllowMarketing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showAgeGate, setShowAgeGate] = useState(false)
  const [ageVerified, setAgeVerified] = useState(false)
  const [isUnder13, setIsUnder13] = useState(false)
  const [hasParentalConsent, setHasParentalConsent] = useState(false)

  const { register, isAuthenticated } = useAuth()
  const router = useRouter()

  const calculateAge = () => {
    if (!formData.birthMonth || !formData.birthDay || !formData.birthYear) return null
    
    const birth = new Date(
      parseInt(formData.birthYear), 
      parseInt(formData.birthMonth) - 1, 
      parseInt(formData.birthDay)
    )
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const validatePersonalInfo = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers'
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateRole = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.role) {
      newErrors.role = 'Please select your role'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateAge = () => {
    const newErrors: Record<string, string> = {}
    const age = calculateAge()
    
    if (!formData.birthMonth || !formData.birthDay || !formData.birthYear) {
      newErrors.birthDate = 'Date of birth is required'
    } else if (age === null || age < 0) {
      newErrors.birthDate = 'Please enter a valid date of birth'
    } else if (formData.role && age < roleConfig[formData.role].minAge) {
      newErrors.birthDate = `You must be at least ${roleConfig[formData.role].minAge} years old for this role`
    }
    
    // Check for parental information if under 13
    const calculatedIsUnder13 = age !== null && age < 13
    setIsUnder13(calculatedIsUnder13)
    
    if (calculatedIsUnder13) {
      if (!formData.parentName.trim()) {
        newErrors.parentName = 'Parent/guardian name is required'
      }
      if (!formData.parentEmail) {
        newErrors.parentEmail = 'Parent/guardian email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
        newErrors.parentEmail = 'Please enter a valid email address'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePersonalInfoNext = () => {
    if (validatePersonalInfo()) {
      setStep('role-selection')
    }
  }

  const handleRoleNext = () => {
    if (validateRole()) {
      setStep('age-verification')
    }
  }

  const handleAgeNext = () => {
    if (validateAge()) {
      const age = calculateAge()
      const calculatedIsUnder13 = age !== null && age < 13
      
      if (calculatedIsUnder13) {
        // Show age gate for parental consent
        setShowAgeGate(true)
      } else {
        setStep('account-creation')
      }
    }
  }

  const handleAgeGateVerification = (isOver13: boolean, hasParentalConsent: boolean) => {
    setAgeVerified(true)
    setHasParentalConsent(hasParentalConsent)
    setShowAgeGate(false)
    
    if (isOver13 || hasParentalConsent) {
      setStep('account-creation')
    }
  }

  const handleRegistration = async () => {
    if (!agreedToTerms || !agreedToPrivacy) {
      setErrors({ 
        terms: 'You must agree to the Terms of Service and Privacy Policy' 
      })
      return
    }

    setLoading(true)
    
    try {
      const registrationData = {
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`,
        role: formData.role as UserRole,
        dateOfBirth: new Date(
          parseInt(formData.birthYear),
          parseInt(formData.birthMonth) - 1,
          parseInt(formData.birthDay)
        ),
        parentEmail: isUnder13 ? formData.parentEmail : undefined,
      }

      const success = await register(registrationData)
      
      if (success) {
        setStep('success')
        
        toast.success('Account created successfully!', {
          description: 'Welcome to GameTriq. You can now start using the platform.'
        })

        // Redirect after showing success
        setTimeout(() => {
          router.push(`/dashboard/${formData.role}`)
        }, 3000)
      } else {
        setErrors({ general: 'Registration failed. Please try again.' })
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const currentYear = new Date().getFullYear()

  return (
    <>
      {/* Age Gate for parental consent */}
      {showAgeGate && (
        <AgeGate
          onVerify={handleAgeGateVerification}
          onClose={() => setShowAgeGate(false)}
        />
      )}

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-basketball-orange-50 via-white to-basketball-green-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Basketball className="h-10 w-10 text-basketball-orange-500" />
              <span className="text-2xl font-bold text-basketball-orange-500">GameTriq</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
            <p className="text-gray-600 mt-2">
              Join the basketball community and start managing your team
            </p>
          </div>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Step {['personal-info', 'role-selection', 'age-verification', 'account-creation'].indexOf(step) + 1} of 4</span>
              <span>{Math.round(((['personal-info', 'role-selection', 'age-verification', 'account-creation'].indexOf(step) + 1) / 4) * 100)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-basketball-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((['personal-info', 'role-selection', 'age-verification', 'account-creation'].indexOf(step) + 1) / 4) * 100}%` 
                }}
              />
            </div>
          </div>

          {step === 'personal-info' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Personal Information</span>
                </CardTitle>
                <CardDescription>
                  Let's start with your basic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" variant="required">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => updateFormData('firstName', e.target.value)}
                      placeholder="First name"
                      error={!!errors.firstName}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-destructive">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" variant="required">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => updateFormData('lastName', e.target.value)}
                      placeholder="Last name"
                      error={!!errors.lastName}
                    />
                    {errors.lastName && (
                      <p className="text-xs text-destructive">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" variant="required">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      placeholder="Enter your email"
                      className="pl-10"
                      error={!!errors.email}
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" variant="required">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                      placeholder="Create a strong password"
                      className="pl-10 pr-10"
                      error={!!errors.password}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                  <div className="text-xs text-gray-500">
                    Password must contain uppercase, lowercase, and numbers
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" variant="required">Confirm Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10"
                      error={!!errors.confirmPassword}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button onClick={handlePersonalInfoNext} className="w-full">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 'role-selection' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Select Your Role</span>
                </CardTitle>
                <CardDescription>
                  Choose your primary role to personalize your experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {(Object.entries(roleConfig) as [UserRole, typeof roleConfig[UserRole]][]).map(([role, config]) => {
                    const IconComponent = config.icon
                    const isSelected = formData.role === role
                    
                    return (
                      <motion.button
                        key={role}
                        type="button"
                        onClick={() => updateFormData('role', role)}
                        className={cn(
                          'p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-md',
                          isSelected
                            ? `${config.borderColor} ${config.bgColor} ring-2 ring-basketball-orange-500 ring-opacity-50`
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={cn(
                            'p-2 rounded-md',
                            isSelected ? config.bgColor : 'bg-gray-100'
                          )}>
                            <IconComponent className={cn(
                              'h-5 w-5',
                              isSelected ? config.color : 'text-gray-600'
                            )} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{config.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Minimum age: {config.minAge} years
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-basketball-orange-500" />
                          )}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                {errors.role && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.role}
                  </p>
                )}

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('personal-info')}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleRoleNext}
                    className="flex-1"
                    disabled={!formData.role}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'age-verification' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Age Verification</span>
                </CardTitle>
                <CardDescription>
                  We need your date of birth to comply with privacy regulations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="birthMonth" variant="required">Month</Label>
                      <Select
                        value={formData.birthMonth}
                        onValueChange={(value) => updateFormData('birthMonth', value)}
                      >
                        <SelectTrigger>
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
                      <Label htmlFor="birthDay" variant="required">Day</Label>
                      <Select
                        value={formData.birthDay}
                        onValueChange={(value) => updateFormData('birthDay', value)}
                      >
                        <SelectTrigger>
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
                      <Label htmlFor="birthYear" variant="required">Year</Label>
                      <Select
                        value={formData.birthYear}
                        onValueChange={(value) => updateFormData('birthYear', value)}
                      >
                        <SelectTrigger>
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

                  {errors.birthDate && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {errors.birthDate}
                    </p>
                  )}

                  {/* Show parental info fields if user might be under 13 */}
                  {formData.birthMonth && formData.birthDay && formData.birthYear && 
                   calculateAge() !== null && calculateAge()! < 13 && (
                    <>
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-amber-800">Parental Consent Required</h4>
                            <p className="text-sm text-amber-700 mt-1">
                              Since you're under 13, we need parent or guardian information for COPPA compliance.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="parentName" variant="required">
                            Parent/Guardian Full Name
                          </Label>
                          <Input
                            id="parentName"
                            value={formData.parentName}
                            onChange={(e) => updateFormData('parentName', e.target.value)}
                            placeholder="Enter parent or guardian's full name"
                            error={!!errors.parentName}
                          />
                          {errors.parentName && (
                            <p className="text-xs text-destructive">{errors.parentName}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="parentEmail" variant="required">
                            Parent/Guardian Email
                          </Label>
                          <Input
                            id="parentEmail"
                            type="email"
                            value={formData.parentEmail}
                            onChange={(e) => updateFormData('parentEmail', e.target.value)}
                            placeholder="Enter parent or guardian's email"
                            error={!!errors.parentEmail}
                          />
                          {errors.parentEmail && (
                            <p className="text-xs text-destructive">{errors.parentEmail}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            We'll send a consent form to this email address.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('role-selection')}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleAgeNext}
                    className="flex-1"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'account-creation' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Create Your Account</span>
                </CardTitle>
                <CardDescription>
                  Review your information and agree to our terms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <h4 className="font-medium">Account Summary</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                    <p><strong>Email:</strong> {formData.email}</p>
                    <p><strong>Role:</strong> {formData.role && roleConfig[formData.role].title}</p>
                    <p><strong>Age:</strong> {calculateAge()} years old</p>
                    {isUnder13 && (
                      <div className="mt-2 pt-2 border-t">
                        <p><strong>Parent/Guardian:</strong> {formData.parentName}</p>
                        <p><strong>Parent Email:</strong> {formData.parentEmail}</p>
                        <Badge variant="secondary" className="mt-1">
                          <Shield className="h-3 w-3 mr-1" />
                          COPPA Compliant
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="agree-terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    />
                    <Label htmlFor="agree-terms" className="text-sm leading-relaxed">
                      I agree to the{' '}
                      <Link href="/terms" className="text-basketball-orange-500 hover:underline" target="_blank">
                        Terms of Service
                      </Link>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="agree-privacy"
                      checked={agreedToPrivacy}
                      onCheckedChange={(checked) => setAgreedToPrivacy(checked as boolean)}
                    />
                    <Label htmlFor="agree-privacy" className="text-sm leading-relaxed">
                      I have read and agree to the{' '}
                      <Link href="/privacy" className="text-basketball-orange-500 hover:underline" target="_blank">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="allow-marketing"
                      checked={allowMarketing}
                      onCheckedChange={(checked) => setAllowMarketing(checked as boolean)}
                    />
                    <Label htmlFor="allow-marketing" className="text-sm leading-relaxed">
                      <span className="font-normal text-muted-foreground">Optional:</span> Send me updates about GameTriq features and basketball content
                    </Label>
                  </div>
                </div>

                {errors.terms && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {errors.terms}
                  </p>
                )}

                {errors.general && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {errors.general}
                    </p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('age-verification')}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleRegistration}
                    className="flex-1"
                    disabled={loading || !agreedToTerms || !agreedToPrivacy}
                  >
                    {loading ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'success' && (
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
                  <h3 className="text-lg font-semibold">Welcome to GameTriq!</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your account has been created successfully. You're now ready to start managing your basketball activities.
                  </p>
                </div>

                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Account Verified
                  </Badge>
                  
                  {isUnder13 && (
                    <div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        <Shield className="h-3 w-3 mr-1" />
                        Parental Consent Granted
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium mb-1">What's next:</p>
                  <ul className="text-muted-foreground space-y-1 text-left">
                    <li>• Complete your profile setup</li>
                    <li>• Join or create your first team</li>
                    <li>• Explore the dashboard features</li>
                    <li>• Connect with other players and coaches</li>
                  </ul>
                </div>

                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Redirecting to your dashboard...
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-basketball-orange-500 hover:text-basketball-orange-600 hover:underline font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}