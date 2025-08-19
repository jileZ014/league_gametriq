import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  // Handle errors from Supabase
  if (error) {
    console.error('Auth callback error:', error, error_description)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (code) {
    try {
      const supabase = await createClient()
      
      // Exchange the code for a session
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(sessionError.message)}`
        )
      }

      // Get the user to check if they have a profile
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        console.log('User authenticated:', user.id, user.email)
        
        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          console.log('User profile not found, redirecting to complete registration')
          // User doesn't have a profile yet, redirect to complete registration
          return NextResponse.redirect(`${origin}/register/complete`)
        }

        console.log('User has profile with role:', profile.role)
        // User has a profile, redirect to their dashboard
        return NextResponse.redirect(`${origin}/dashboard/${profile.role}`)
      }
    } catch (error) {
      console.error('Auth callback processing error:', error)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Authentication failed')}`
      )
    }
  }

  // No code provided, redirect to login
  console.log('No auth code provided, redirecting to login')
  return NextResponse.redirect(`${origin}/login`)
}