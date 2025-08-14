'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { UserRole } from '@/lib/supabase/types'

const completeProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['league-admin', 'coach', 'parent', 'player', 'referee', 'scorekeeper', 'spectator']),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
})

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>

export default function CompleteProfilePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      role: 'player',
    },
  })

  const selectedRole = watch('role')
  const dateOfBirth = watch('dateOfBirth')

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (existingProfile) {
        // Profile already exists, redirect to dashboard
        router.push(`/dashboard/${existingProfile.role}`)
        return
      }

      setUserEmail(user.email || null)
      
      // Pre-fill name if available from auth metadata
      if (user.user_metadata?.name) {
        setValue('name', user.user_metadata.name)
      }
    }

    checkUser()
  }, [supabase, router, setValue])

  const onSubmit = async (data: CompleteProfileFormData) => {
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('No authenticated user found')
      }

      // Calculate age group
      let ageGroup: 'youth' | 'teen' | 'adult' | null = null
      let isUnder13 = false
      
      if (data.dateOfBirth) {
        const birthDate = new Date(data.dateOfBirth)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        
        isUnder13 = age < 13
        if (age < 13) ageGroup = 'youth'
        else if (age < 18) ageGroup = 'teen'
        else ageGroup = 'adult'
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          name: data.name,
          role: data.role as UserRole,
          phone_number: data.phoneNumber || null,
          date_of_birth: data.dateOfBirth || null,
          age_group: ageGroup,
          is_under_13: isUnder13,
          has_parental_consent: !isUnder13,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (profileError) {
        throw profileError
      }

      // Create default preferences
      await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          theme: 'system',
          notifications_enabled: true,
          email_notifications: true,
          sms_notifications: false,
          language: 'en',
          timezone: 'America/Phoenix',
        })

      toast.success('Profile completed successfully!')
      router.push(`/dashboard/${data.role}`)
    } catch (error: any) {
      console.error('Profile completion error:', error)
      toast.error(error.message || 'An error occurred while completing your profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Complete Your Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Just a few more details to get you started
          </p>
          {userEmail && (
            <p className="text-sm text-gray-500">
              Signed in as: <span className="font-medium">{userEmail}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            {errors.role && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.role.message}</p>
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

          {selectedRole === 'player' && (
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
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
                Completing profile...
              </>
            ) : (
              'Complete Profile'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}