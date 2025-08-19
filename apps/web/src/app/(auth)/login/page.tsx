'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { Button } from '@/components/simple-ui'
import { Input } from '@/components/simple-ui'
import { Label } from '@/components/simple-ui'
import { Checkbox } from '@/components/simple-ui'
import { Separator } from '@/components/simple-ui'
import { Badge } from '@/components/simple-ui'
import { toast } from 'sonner'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const supabase = createClient()
  const { signInWithGoogle, user, loading: authLoading, setDemoMode } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      // User is already logged in, redirect to dashboard
      const role = localStorage.getItem('userRole')
      if (role) {
        router.push(`/${role}/dashboard`)
      }
    }
  }, [user, authLoading, router])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: true,
    },
  })

  const rememberMe = watch('rememberMe')

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    console.log('Login attempt for:', data.email)

    try {
      // Validate Supabase client is initialized
      if (!supabase) {
        console.error('Supabase client not initialized')
        throw new Error('Authentication service is not available. Please refresh the page and try again.')
      }

      // Sign in with Supabase
      console.log('Signing in with Supabase...')
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      console.log('Login response:', {
        success: !!authData?.user,
        userId: authData?.user?.id,
        error: authError?.message || 'none'
      })

      if (authError) {
        console.error('Auth error details:', {
          message: authError.message,
          status: authError.status,
          code: authError.code
        })
        throw authError
      }

      if (!authData.user) {
        throw new Error('Login failed - no user data returned')
      }

      // Get user role from database
      console.log('Fetching user profile...')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', authData.user.id)
        .single()

      if (userError) {
        console.error('Profile fetch error:', userError)
        // User exists in auth but not in database - they need to complete registration
        toast.warning('Please complete your profile registration')
        router.push('/register/complete')
        return
      }

      if (!userData) {
        console.warn('No user profile found for:', authData.user.id)
        toast.warning('Please complete your profile registration')
        router.push('/register/complete')
        return
      }

      // Update last login timestamp
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authData.user.id)

      toast.success(`Welcome back, ${userData.name}!`)

      // Redirect to role-specific dashboard
      const dashboardPath = `/dashboard/${userData.role}`
      router.push(dashboardPath)
      router.refresh()
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        fullError: error
      })
      
      if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid email or password')) {
        toast.error('Invalid email or password. Please check your credentials and try again.')
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Please verify your email before logging in. Check your inbox for the verification email.')
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.')
      } else if (error.message?.includes('rate limit')) {
        toast.error('Too many login attempts. Please wait a few minutes and try again.')
      } else if (error.message?.includes('not available')) {
        toast.error('Authentication service is temporarily unavailable. Please try again.')
      } else {
        toast.error(`Login failed: ${error.message || 'Unknown error occurred'}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async (role: string) => {
    setIsDemoMode(true)
    setDemoMode(true)
    
    // In demo mode, bypass authentication and go directly to dashboard
    toast.success(`Demo mode: ${role}`, {
      description: 'Viewing in demo mode - changes will not be saved'
    })
    
    // Map role names for navigation
    const roleMap: Record<string, string> = {
      'league-admin': 'admin',
      'scorekeeper': 'scorer'
    }
    
    const dashboardRole = roleMap[role] || role
    router.push(`/${dashboardRole}/dashboard`)
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to GameTriq</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Basketball League Management Platform
        </p>
      </div>

      {/* Google Sign In - PRIMARY METHOD */}
      <div className="space-y-4">
        <GoogleSignInButton
          onClick={signInWithGoogle}
          text="Sign in with Google"
          fullWidth
        />
        
        {isDemoMode && (
          <Badge variant="outline" className="w-full justify-center py-2">
            Demo Mode Active - Changes will not be saved
          </Badge>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-gray-50 dark:bg-gray-900 px-2 text-gray-500">
            Or sign in with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
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

        <div className="flex items-center space-x-2">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setValue('rememberMe', checked as boolean)}
            disabled={isLoading}
          />
          <Label
            htmlFor="rememberMe"
            className="text-sm font-normal cursor-pointer"
          >
            Remember me for 30 days
          </Label>
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
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <Separator className="my-6" />

      <div className="space-y-3">
        <p className="text-center text-sm text-gray-500">Quick demo access (no login required)</p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDemoLogin('coach')}
            disabled={isLoading}
            className="text-sm"
          >
            Demo Coach
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDemoLogin('parent')}
            disabled={isLoading}
            className="text-sm"
          >
            Demo Parent
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDemoLogin('referee')}
            disabled={isLoading}
            className="text-xs px-2"
          >
            Referee
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDemoLogin('scorekeeper')}
            disabled={isLoading}
            className="text-xs px-2"
          >
            Scorer
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDemoLogin('league-admin')}
            disabled={isLoading}
            className="text-xs px-2"
          >
            Admin
          </Button>
        </div>
      </div>

      <div className="text-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">Don&apos;t have an account? </span>
        <Link
          href="/register"
          className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
        >
          Sign up
        </Link>
      </div>
    </div>
  )
}