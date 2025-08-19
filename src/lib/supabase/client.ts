import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

// TEMPORARY HARDCODED VALUES FOR UAT DEPLOYMENT
// These are your actual values from Vercel environment variables
// TODO: After UAT, investigate why process.env variables aren't loading
const supabaseUrl = 'https://mgfpbqvkhqjlvgeqaclj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZnBicXZraHFqbHZnZXFhY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMDIzNDUsImV4cCI6MjA0OTg3ODM0NX0.G2v1cYDdpgXCJ9cJ_rtHJJfbKLEr0z6FCd3gRCqzSrc'

// Debug logging - remove after confirming it works
if (typeof window !== 'undefined') {
  console.log('Supabase Client Initializing with:', {
    url: supabaseUrl,
    keyPrefix: supabaseAnonKey.substring(0, 20) + '...',
    keyLength: supabaseAnonKey.length
  })
}

// Original code that should work but isn't due to env var issue:
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validation to ensure we have the required values
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create the Supabase client with type safety
export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Export for use in other components
export type SupabaseClient = typeof supabase

// Export createClient function for auth pages
export const createClient = () => supabase