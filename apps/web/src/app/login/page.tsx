'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Basketball,
  Eye,
  EyeOff,
  Shield,
  Users,
  Trophy,
  BarChart3,
  Clock,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type UserRole = 'league-admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper'

const roleConfig = {
  'league-admin': {
    icon: Trophy,
    title: 'League Administrator',
    description: 'Manage leagues, teams, and tournaments',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  'coach': {
    icon: Users,
    title: 'Team Coach',
    description: 'Manage team roster and game strategy',
    color: 'text-basketball-orange-600',
    bgColor: 'bg-basketball-orange-50',
    borderColor: 'border-basketball-orange-200',
  },
  'parent': {
    icon: Shield,
    title: 'Parent/Guardian',
    description: 'Follow your child\'s progress and games',
    color: 'text-basketball-green-600',
    bgColor: 'bg-basketball-green-50',
    borderColor: 'border-basketball-green-200',
  },
  'player': {
    icon: Basketball,
    title: 'Player',
    description: 'View your stats and team information',
    color: 'text-team-home-primary',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  'referee': {
    icon: BarChart3,
    title: 'Referee',
    description: 'Officiate games and manage calls',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  'scorekeeper': {
    icon: Clock,
    title: 'Scorekeeper',
    description: 'Record scores and game statistics',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
  },
}

type LoginStep = 'credentials' | 'role-selection' | 'mfa' | 'success'

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, router, redirectTo])

  const validateCredentials = () => {
    const newErrors: Record<string, string> = {}
    
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateCredentials()) return
    
    setLoading(true)
    
    try {
      // Simulate API call to verify credentials
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // For demo purposes, any valid email/password combo works
      if (email && password.length >= 6) {
        setStep('role-selection')
      } else {
        setErrors({ general: 'Invalid email or password' })
      }
    } catch (error) {
      setErrors({ general: 'Login failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelection = () => {
    if (!selectedRole) {
      setErrors({ role: 'Please select your role' })
      return
    }
    
    setErrors({})
    
    // For high-security roles, require MFA
    if (['league-admin', 'referee'].includes(selectedRole)) {
      setStep('mfa')
    } else {
      completeLogin()
    }
  }

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!mfaCode || mfaCode.length !== 6) {
      setErrors({ mfa: 'Please enter a valid 6-digit code' })
      return
    }
    
    // For demo, accept any 6-digit code
    if (mfaCode === '123456' || mfaCode.length === 6) {
      completeLogin()
    } else {
      setErrors({ mfa: 'Invalid verification code' })
    }
  }

  const completeLogin = async () => {
    setLoading(true)
    
    try {
      const success = await login(email, password)
      
      if (success) {
        setStep('success')
        
        toast.success('Welcome to GameTriq!', {
          description: 'You have successfully logged in.'
        })
        
        // Redirect after a brief success display
        setTimeout(() => {
          const dashboardPath = selectedRole ? `/dashboard/${selectedRole}` : '/dashboard'
          router.push(dashboardPath)
        }, 2000)
      } else {
        setErrors({ general: 'Login failed. Please try again.' })
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    // In a real implementation, this would redirect to OAuth provider
    toast.info(`${provider} login not implemented in demo`, {
      description: 'Use the email login form instead'
    })
  }

  return (
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
          <h1 className="text-2xl font-bold text-gray-900">Sign In to Your Account</h1>
          <p className="text-gray-600 mt-2">
            Access your basketball league management dashboard
          </p>
        </div>

        {step === 'credentials' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Enter Your Credentials</CardTitle>
              <CardDescription className="text-center">
                Sign in with your email and password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" variant="required">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="pl-10"
                      error={!!errors.email}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" variant="required">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-10 pr-10"
                      error={!!errors.password}
                      autoComplete="current-password"
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
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm">Remember me</Label>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-basketball-orange-500 hover:text-basketball-orange-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                {errors.general && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {errors.general}
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin('google')}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin('apple')}
                  >
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C8.396 0 8.83.011 8.83.011v9.508c0 1.174.898 2.126 2.006 2.126.386 0 .739-.103 1.047-.285l.135-.099 4.91 10.952s.36.746 1.425.746c1.104 0 1.903-.815 1.903-1.92 0-.385-.135-.735-.36-1.02L12.017 0zm-1.662 3.852c-.647 0-1.17-.523-1.17-1.17s.523-1.17 1.17-1.17 1.17.523 1.17 1.17-.523 1.17-1.17 1.17z" />
                    </svg>
                    Apple
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'role-selection' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Select Your Role</CardTitle>
              <CardDescription className="text-center">
                Choose your primary role to personalize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {(Object.entries(roleConfig) as [UserRole, typeof roleConfig[UserRole]][]).map(([role, config]) => {
                  const IconComponent = config.icon
                  const isSelected = selectedRole === role
                  
                  return (
                    <motion.button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
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
                  onClick={() => setStep('credentials')}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleRoleSelection}
                  className="flex-1"
                  disabled={!selectedRole}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'mfa' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center space-x-2">
                <Shield className="h-5 w-5 text-basketball-orange-500" />
                <span>Two-Factor Authentication</span>
              </CardTitle>
              <CardDescription className="text-center">
                Enter the verification code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMfaSubmit} className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-basketball-orange-100 rounded-full flex items-center justify-center mb-4">
                    <Smartphone className="h-8 w-8 text-basketball-orange-500" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Open your authenticator app and enter the 6-digit code
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mfa-code" variant="required">Verification Code</Label>
                  <Input
                    id="mfa-code"
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-lg tracking-wider"
                    maxLength={6}
                    error={!!errors.mfa}
                    autoComplete="one-time-code"
                  />
                  {errors.mfa && (
                    <p className="text-sm text-destructive flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.mfa}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-700">
                    <strong>Demo Mode:</strong> Enter "123456" or any 6-digit code to continue.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('role-selection')}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={mfaCode.length !== 6 || loading}
                  >
                    {loading ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
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
                <p className="text-sm text-muted-foreground mt-1">
                  You have successfully signed in. Redirecting to your dashboard...
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Shield className="h-3 w-3 mr-1" />
                  Authenticated
                </Badge>
                {selectedRole && (
                  <Badge variant="outline">
                    {roleConfig[selectedRole].title}
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                <Clock className="h-3 w-3 inline mr-1" />
                Redirecting in a moment...
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="text-basketball-orange-500 hover:text-basketball-orange-600 hover:underline font-medium"
            >
              Sign up here
            </Link>
          </p>
        </div>

        <div className="flex items-center justify-center space-x-4 mt-6 text-xs text-gray-500">
          <div className="flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            Phoenix, AZ
          </div>
          <div className="flex items-center">
            <Shield className="h-3 w-3 mr-1" />
            COPPA Compliant
          </div>
        </div>
      </motion.div>
    </div>
  )
}