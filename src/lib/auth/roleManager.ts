import { createClient } from '@/lib/supabase/client'
import { User } from 'firebase/auth'

export type UserRole = 'coach' | 'parent' | 'referee' | 'scorer' | 'scorekeeper' | 'admin' | 'league-admin'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  league_id?: string
  team_id?: string
  google_photo_url?: string
  created_at: string
  updated_at?: string
}

const supabase = createClient()

/**
 * Get user profile from Supabase
 */
export async function getUserProfile(email: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return null
  }
}

/**
 * Create or update user profile in Supabase
 */
export async function upsertUserProfile(user: User, role?: UserRole, leagueId?: string): Promise<UserProfile | null> {
  try {
    const profileData = {
      id: user.uid,
      email: user.email!,
      full_name: user.displayName || user.email?.split('@')[0] || 'User',
      google_photo_url: user.photoURL || undefined,
      role: role || undefined,
      league_id: leagueId || undefined,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'email'
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in upsertUserProfile:', error)
    return null
  }
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user role:', error)
      return false
    }

    // Store role in localStorage for quick access
    if (typeof window !== 'undefined') {
      localStorage.setItem('userRole', role)
    }

    return true
  } catch (error) {
    console.error('Error in updateUserRole:', error)
    return false
  }
}

/**
 * Get dashboard path for a given role
 */
export function getDashboardPath(role: UserRole): string {
  switch(role) {
    case 'coach':
      return '/coach/dashboard'
    case 'parent':
      return '/parent/dashboard'
    case 'referee':
      return '/referee/dashboard'
    case 'scorer':
    case 'scorekeeper':
      return '/scorer/dashboard'
    case 'admin':
    case 'league-admin':
      return '/admin/dashboard'
    default:
      return '/dashboard'
  }
}

/**
 * Check if user has access to a specific route
 */
export function hasRouteAccess(userRole: UserRole | null, requiredRole: UserRole): boolean {
  if (!userRole) return false
  
  // Admin has access to everything
  if (userRole === 'admin' || userRole === 'league-admin') return true
  
  // Scorer and scorekeeper are interchangeable
  if ((userRole === 'scorer' || userRole === 'scorekeeper') && 
      (requiredRole === 'scorer' || requiredRole === 'scorekeeper')) {
    return true
  }
  
  // Otherwise, role must match exactly
  return userRole === requiredRole
}

/**
 * Get league ID from subdomain
 */
export function getLeagueFromSubdomain(): string | null {
  if (typeof window === 'undefined') return null
  
  const hostname = window.location.hostname
  
  // Check if we're on a subdomain
  const parts = hostname.split('.')
  
  // localhost or single domain
  if (parts.length < 2) return null
  
  // Check for league subdomain (e.g., suns.gametriq.com)
  if (parts.length >= 3 && parts[1] === 'gametriq') {
    return parts[0] // Return the subdomain as league ID
  }
  
  // For leagues.gametriq.com, we might store league in localStorage or URL param
  if (hostname.startsWith('leagues.') || hostname.startsWith('leaguegametriq.')) {
    return localStorage.getItem('leagueId')
  }
  
  return null
}

/**
 * Set league context for multi-tenant support
 */
export function setLeagueContext(leagueId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('leagueId', leagueId)
  }
}

/**
 * Clear league context
 */
export function clearLeagueContext() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('leagueId')
  }
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  switch(role) {
    case 'coach':
      return 'Coach'
    case 'parent':
      return 'Parent/Guardian'
    case 'referee':
      return 'Referee'
    case 'scorer':
    case 'scorekeeper':
      return 'Scorekeeper'
    case 'admin':
    case 'league-admin':
      return 'League Administrator'
    default:
      return 'User'
  }
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  switch(role) {
    case 'coach':
      return 'Manage teams, view schedules, track player statistics'
    case 'parent':
      return "Follow your child's games, view schedules, receive updates"
    case 'referee':
      return 'View assigned games, submit reports, manage schedule'
    case 'scorer':
    case 'scorekeeper':
      return 'Score live games, track statistics, manage game data'
    case 'admin':
    case 'league-admin':
      return 'Full access to league management, teams, and settings'
    default:
      return 'Access to GameTriq features'
  }
}