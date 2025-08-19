'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { 
  signInWithGoogle as firebaseSignInWithGoogle, 
  signOut as firebaseSignOut,
  onAuthStateChange,
  checkSSOStatus
} from '@/lib/firebase'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  loading: boolean
  userRole: string | null
  leagueId: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  isDemo: boolean
  setDemoMode: (demo: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [leagueId, setLeagueId] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Check for SSO on mount
  useEffect(() => {
    const checkSSO = async () => {
      const isLoggedIn = await checkSSOStatus()
      if (isLoggedIn) {
        console.log('User already logged in via SSO')
      }
    }
    checkSSO()
  }, [])

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        // User is signed in, check their profile in Supabase
        await checkUserProfile(firebaseUser)
      } else {
        // User is signed out
        setUserRole(null)
        setLeagueId(null)
        localStorage.removeItem('userRole')
        localStorage.removeItem('leagueId')
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Check user profile in Supabase
  const checkUserProfile = async (firebaseUser: User) => {
    try {
      // First, check if user exists in Supabase profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', firebaseUser.email)
        .single()

      if (error || !profile) {
        // User doesn't exist in Supabase, create profile
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            google_photo_url: firebaseUser.photoURL,
            created_at: new Date().toISOString(),
            // Role will be set when user selects it
          })
          .select()
          .single()

        if (!createError && newProfile) {
          // New user - redirect to role selection
          router.push('/select-role')
        }
      } else {
        // Existing user - set role and redirect to dashboard
        setUserRole(profile.role)
        setLeagueId(profile.league_id)
        localStorage.setItem('userRole', profile.role)
        if (profile.league_id) {
          localStorage.setItem('leagueId', profile.league_id)
        }

        // If we're on login page, redirect to appropriate dashboard
        if (window.location.pathname === '/login' || window.location.pathname === '/') {
          redirectToDashboard(profile.role)
        }
      }
    } catch (error) {
      console.error('Error checking user profile:', error)
    }
  }

  // Redirect to role-specific dashboard
  const redirectToDashboard = (role: string) => {
    switch(role) {
      case 'coach':
        router.push('/coach/dashboard')
        break
      case 'parent':
        router.push('/parent/dashboard')
        break
      case 'referee':
        router.push('/referee/dashboard')
        break
      case 'scorer':
      case 'scorekeeper':
        router.push('/scorer/dashboard')
        break
      case 'admin':
      case 'league-admin':
        router.push('/admin/dashboard')
        break
      default:
        router.push('/dashboard')
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      const { user: firebaseUser, error } = await firebaseSignInWithGoogle()
      
      if (error) {
        if (error.code === 'auth/popup-blocked') {
          toast.error('Popup was blocked. Please allow popups for this site.')
        } else if (error.code === 'auth/cancelled-popup-request') {
          // User cancelled, no need to show error
        } else {
          toast.error(`Sign in failed: ${error.message}`)
        }
      } else if (firebaseUser) {
        toast.success('Signed in successfully!')
        await checkUserProfile(firebaseUser)
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      toast.error('An unexpected error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      const { success, error } = await firebaseSignOut()
      
      if (success) {
        setUser(null)
        setUserRole(null)
        setLeagueId(null)
        setIsDemo(false)
        toast.success('Signed out successfully')
        router.push('/login')
      } else if (error) {
        toast.error(`Sign out failed: ${error.message}`)
      }
    } catch (error: any) {
      console.error('Sign out error:', error)
      toast.error('An unexpected error occurred during sign out')
    } finally {
      setLoading(false)
    }
  }

  // Set demo mode
  const setDemoMode = (demo: boolean) => {
    setIsDemo(demo)
    if (demo) {
      // In demo mode, we bypass authentication
      toast.info('Demo mode activated')
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    userRole,
    leagueId,
    signInWithGoogle,
    signOut,
    isDemo,
    setDemoMode
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}