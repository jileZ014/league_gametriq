'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/simple-ui'
import { Input } from '@/components/simple-ui'
import { Label } from '@/components/simple-ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/simple-ui'
import { Checkbox } from '@/components/simple-ui'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { UserRole } from '@/lib/supabase/types'

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['league-admin', 'coach', 'parent', 'player', 'referee', 'scorekeeper', 'spectator']),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentName: z.string().optional(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
  agreeToPrivacy: z.boolean().refine(val => val === true, {
    message: 'You must agree to the privacy policy',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don&apos;t match",
  path: ['confirmPassword'],
}).refine((data) => {
  // If role is player and age < 13, require parent info
  if (data.role === 'player' && data.dateOfBirth) {
    const age = calculateAge(new Date(data.dateOfBirth))
    if (age < 13) {
      return !!(data.parentEmail && data.parentName)
    }
  }
  return true
}, {
  message: 'Parent information is required for players under 13',
  path: ['parentEmail'],
})

type RegisterFormData = z.infer<typeof registerSchema>

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'player',
      agreeToTerms: false,
      agreeToPrivacy: false,
    },
  })

  const selectedRole = watch('role')
  const dateOfBirth = watch('dateOfBirth')

  const isUnder13 = dateOfBirth ? calculateAge(new Date(dateOfBirth)) < 13 : false

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    console.log('Registration attempt:', { email: data.email, role: data.role })

    try {
      // Validate Supabase client is initialized
      if (!supabase) {
        console.error('Supabase client not initialized')
        throw new Error('Authentication service is not available. Please refresh the page and try again.')
      }

      // Create auth user with Supabase
      console.log('Creating Supabase auth user...')
      console.log('Supabase client exists:', !!supabase)
      console.log('Supabase auth exists:', !!supabase.auth)
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      console.log('Supabase signUp response:', { 
        success: !!authData?.user,
        userId: authData?.user?.id,
        error: authError?.message || 'none'
      })

      if (authError) {
        console.error('Auth error details:', {
          message: authError.message,
          status: authError.status,
          code: authError.code,
          name: authError.name
        })
        throw authError
      }

      if (!authData.user) {
        throw new Error('Registration failed - no user returned')
      }

      // Calculate age group
      let ageGroup: 'youth' | 'teen' | 'adult' | null = null
      if (data.dateOfBirth) {
        const age = calculateAge(new Date(data.dateOfBirth))
        if (age < 13) ageGroup = 'youth'
        else if (age < 18) ageGroup = 'teen'
        else ageGroup = 'adult'
      }

      // Create user profile in database
      console.log('Creating user profile in database...')
      const profileData = {
        id: authData.user.id,
        email: data.email,
        name: data.name,
        role: data.role as UserRole,
        phone_number: data.phoneNumber || null,
        date_of_birth: data.dateOfBirth || null,
        age_group: ageGroup,
        is_under_13: isUnder13,
        has_parental_consent: !isUnder13 || !!data.parentEmail,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      console.log('Profile data:', profileData)

      const { error: profileError } = await supabase
        .from('users')
        .insert(profileData)

      if (profileError) {
        console.error('Profile creation error:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint
        })
        // Note: We cannot delete auth user without admin access
        // User will need to complete profile later
        console.warn('Profile creation failed, user may need to complete profile later')
        // Don't throw here - let the user proceed with just auth created
      }

      // Create default preferences
      console.log('Creating user preferences...')
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: authData.user.id,
          theme: 'system',
          notifications_enabled: true,
          email_notifications: true,
          sms_notifications: false,
          language: 'en',
          timezone: 'America/Phoenix',
        })
      
      if (prefsError) {
        console.warn('Preferences creation failed:', prefsError.message)
        // Non-critical, continue
      }

      // If under 13, send parent consent email
      if (isUnder13 && data.parentEmail) {
        // This would trigger a backend function to send parent consent email
        // For now, we&apos;ll just log it
        console.log('Parent consent email would be sent to:', data.parentEmail)
      }

      toast.success('Registration successful! Please check your email to verify your account.')
      
      // Delay redirect to allow user to see success message
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error: any) {
      console.error('Full registration error:', {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error
      })
      
      // More detailed error handling
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        toast.error('An account with this email already exists. Please login instead.')
      } else if (error.code === '23505' || error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered. Please login or use a different email.')
      } else if (error.message?.includes('Invalid email') || error.code === 'auth/invalid-email') {
        toast.error('Please enter a valid email address')
      } else if (error.message?.includes('password') || error.code === 'auth/weak-password') {
        toast.error('Password does not meet security requirements')
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.')
      } else if (error.message?.includes('rate limit')) {
        toast.error('Too many attempts. Please wait a few minutes and try again.')
      } else if (error.message?.includes('not available')) {
        toast.error('Authentication service is temporarily unavailable. Please try again.')
      } else {
        toast.error(`Registration failed: ${error.message || 'Unknown error occurred'}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const roleDescriptions: Record<string, string> = {
    'player': 'Athletes participating in leagues and tournaments',
    'parent': 'Parents or guardians of youth players',
    'coach': 'Team coaches and assistant coaches',
    'referee': 'Game officials and referees',
    'scorekeeper': 'Official scorekeepers for games',
    'league-admin': 'League administrators and organizers',
    'spectator': 'Fans and spectators following games',
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Join GameTriq Trophy League
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="role">I am a...</Label>
          <Select
            value={selectedRole}
            onValueChange={(value) => setValue('role', value as any)}
            disabled={isLoading}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="player">Player</SelectItem>
              <SelectItem value="parent">Parent/Guardian</SelectItem>
              <SelectItem value="coach">Coach</SelectItem>
              <SelectItem value="referee">Referee</SelectItem>
              <SelectItem value="scorekeeper">Scorekeeper</SelectItem>
              <SelectItem value="league-admin">League Administrator</SelectItem>
              <SelectItem value="spectator">Spectator</SelectItem>
            </SelectContent>
          </Select>
          {selectedRole && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {roleDescriptions[selectedRole]}
            </p>
          )}
          {errors.role && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.role.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              disabled={isLoading}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="(602) 555-0123"
              autoComplete="tel"
              disabled={isLoading}
              {...register('phoneNumber')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isLoading}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>

        {selectedRole === 'player' && (
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              disabled={isLoading}
              max={format(new Date(), 'yyyy-MM-dd')}
              {...register('dateOfBirth')}
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.dateOfBirth.message}</p>
            )}
          </div>
        )}

        {isUnder13 && (
          <div className="space-y-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Parent/Guardian Information Required
            </p>
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent/Guardian Name</Label>
              <Input
                id="parentName"
                type="text"
                placeholder="Jane Doe"
                disabled={isLoading}
                {...register('parentName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent/Guardian Email</Label>
              <Input
                id="parentEmail"
                type="email"
                placeholder="parent@example.com"
                disabled={isLoading}
                {...register('parentEmail')}
              />
              {errors.parentEmail && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.parentEmail.message}</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              autoComplete="new-password"
              disabled={isLoading}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              autoComplete="new-password"
              disabled={isLoading}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="agreeToTerms"
              {...register('agreeToTerms')}
              disabled={isLoading}
            />
            <Label
              htmlFor="agreeToTerms"
              className="text-sm font-normal cursor-pointer"
            >
              I agree to the{' '}
              <Link href="/terms" className="text-orange-600 hover:text-orange-700 dark:text-orange-400">
                Terms and Conditions
              </Link>
            </Label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.agreeToTerms.message}</p>
          )}

          <div className="flex items-start space-x-2">
            <Checkbox
              id="agreeToPrivacy"
              {...register('agreeToPrivacy')}
              disabled={isLoading}
            />
            <Label
              htmlFor="agreeToPrivacy"
              className="text-sm font-normal cursor-pointer"
            >
              I agree to the{' '}
              <Link href="/privacy" className="text-orange-600 hover:text-orange-700 dark:text-orange-400">
                Privacy Policy
              </Link>
            </Label>
          </div>
          {errors.agreeToPrivacy && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.agreeToPrivacy.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-orange-600 hover:bg-orange-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
        <Link
          href="/login"
          className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}