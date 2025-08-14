import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

// TEMPORARY HARDCODED VALUES FOR UAT DEPLOYMENT
// TODO: After UAT, investigate why process.env variables aren't loading
const supabaseUrl = 'https://mqfpbqvkhqjivqeqaclj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnBicXZraHFqaXZxZXFhY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxNjU1NzksImV4cCI6MjA0Mzc0MTU3OX0.pYXQiOjE3NTUxMjAxNjAsImV4cCI6MjA3MDg2NDE2MH0.zMn6_xI5RMKE0DwYDVsInpuSqI47eXunQnGMxvU1RILtJuUng'

// Server-side Supabase client for use in Server Components, Route Handlers, and Server Actions
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'x-application-name': 'gametriq-basketball',
        },
      },
      db: {
        schema: 'public',
      },
    }
  )
}

// Helper function to get the current user from server components
export async function getCurrentUser() {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // Fetch additional user data from our custom users table
    const { data: userData } = await supabase
      .from('users')
      .select('*, preferences:user_preferences(*)')
      .eq('id', user.id)
      .single()

    return userData
  } catch (error) {
    console.error('Error fetching current user:', error)
    return null
  }
}

// Helper function to require authentication
export async function requireAuth() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized')
  }

  // Fetch additional user data from our custom users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*, preferences:user_preferences(*)')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    throw new Error('User not found')
  }

  return userData
}

// Helper function to check if user has a specific role
export async function requireRole(allowedRoles: Database['public']['Enums']['user_role'][]) {
  const user = await requireAuth()
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions')
  }

  return user
}