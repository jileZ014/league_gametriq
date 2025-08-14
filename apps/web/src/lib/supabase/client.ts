import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

// TEMPORARY HARDCODED VALUES FOR UAT DEPLOYMENT
// These are your actual values from Vercel environment variables
// TODO: After UAT, investigate why process.env variables aren't loading
const supabaseUrl = 'https://mqfpbqvkhqjivqeqaclj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnBicXZraHFqaXZxZXFhY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxNjU1NzksImV4cCI6MjA0Mzc0MTU3OX0.pYXQiOjE3NTUxMjAxNjAsImV4cCI6MjA3MDg2NDE2MH0.zMn6_xI5RMKE0DwYDVsInpuSqI47eXunQnGMxvU1RILtJuUng'

// Debug logging - remove after confirming it works
if (typeof window !== 'undefined') {
  console.log('Supabase Client Initializing with:', {
    url: supabaseUrl,
    keyPrefix: supabaseAnonKey.substring(0, 20) + '...'
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
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Export for use in other components
export type SupabaseClient = typeof supabase