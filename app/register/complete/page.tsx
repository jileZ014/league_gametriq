'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/simple-ui'
import { Input } from '@/components/simple-ui'
import { Label } from '@/components/simple-ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/simple-ui'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { UserRole } from '@/lib/supabase/types'

const completeProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['league-admin', 'coach', 'parent', 'player', 'referee', 'scorekeeper', 'spectator']),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentName: z.string().optional(),
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

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

export default function CompleteProfilePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
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
  const isUnder13 = dateOfBirth ? calculateAge(new Date(dateOfBirth)) < 13 : false

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('No authenticated user, redirecting to login')
        router.push('/login')
        return
      }

      setUserEmail(user.email || '')
      setUserId(user.id)

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (existingProfile) {
        console.log('Profile already exists, redirecting to dashboard')
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (userData) {
          router.push(`/dashboard/${userData.role}`)
        }
      }
    }

    checkAuth()
  }, [supabase, router])

  const onSubmit = async (data: CompleteProfileFormData) => {
    setIsLoading(true)
    console.log('Completing profile for user:', userId)

    try {
      // Calculate age group
      let ageGroup: 'youth' | 'teen' | 'adult' | null = null
      if (data.dateOfBirth) {
        const age = calculateAge(new Date(data.dateOfBirth))
        if (age < 13) ageGroup = 'youth'
        else if (age < 18) ageGroup = 'teen'
        else ageGroup = 'adult'
      }

      // Create user profile in database
      const profileData = {
        id: userId,
        email: userEmail,
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

      console.log('Creating profile with data:', profileData)

      const { error: profileError } = await supabase
        .from('users')
        .insert(profileData)

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw profileError
      }

      // Create default preferences
      await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          theme: 'system',
          notifications_enabled: true,
          email_notifications: true,
          sms_notifications: false,
          language: 'en',
          timezone: 'America/Phoenix',
        })

      // If under 13, send parent consent email
      if (isUnder13 && data.parentEmail) {
        console.log('Parent consent email would be sent to:', data.parentEmail)
      }

      toast.success('Profile completed successfully!')
      
      // Redirect to role-specific dashboard
      const dashboardPath = `/dashboard/${data.role}`
      router.push(dashboardPath)
      router.refresh()
    } catch (error: any) {
      console.error('Profile completion error:', error)
      
      if (error.code === '23505') {
        toast.error('Profile already exists. Redirecting to dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        toast.error(`Failed to complete profile: ${error.message || 'Unknown error occurred'}`)
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Just a few more details to get you started
          </p>
          {userEmail && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              Account: {userEmail}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
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
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {roleDescriptions[selectedRole]}
                </p>
              )}
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            <div>
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
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
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
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  disabled={isLoading}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  {...register('dateOfBirth')}
                />
                {errors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
                )}
              </div>
            )}

            {isUnder13 && (
              <div className="space-y-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Parent/Guardian Information Required
                </p>
                <div>
                  <Label htmlFor="parentName">Parent/Guardian Name</Label>
                  <Input
                    id="parentName"
                    type="text"
                    placeholder="Jane Doe"
                    disabled={isLoading}
                    {...register('parentName')}
                  />
                </div>
                <div>
                  <Label htmlFor="parentEmail">Parent/Guardian Email</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    placeholder="parent@example.com"
                    disabled={isLoading}
                    {...register('parentEmail')}
                  />
                  {errors.parentEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.parentEmail.message}</p>
                  )}
                </div>
              </div>
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