import { supabase } from './supabase'

export type UserRole = 'admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper' | 'spectator'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  name: string
  teamId?: string
}

// Simplified auth without database dependencies
export async function signUp(email: string, password: string, role: UserRole, name: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          role, 
          name,
          full_name: name 
        }
      }
    })

    if (error) {
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err: any) {
    return { data: null, error: err }
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err: any) {
    return { data: null, error: err }
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    // Get user data from auth metadata instead of database
    const metadata = user.user_metadata || {}
    
    return {
      id: user.id,
      email: user.email || '',
      role: metadata.role || 'spectator',
      name: metadata.name || metadata.full_name || user.email || 'User',
      teamId: metadata.teamId
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export function hasPermission(user: AuthUser | null, requiredRoles: UserRole[]): boolean {
  if (!user) return false
  return requiredRoles.includes(user.role)
}

// Export auth object for compatibility
export const auth = {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  hasPermission
}