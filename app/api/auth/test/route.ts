import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: Request) {
  try {
    const { email, password, action } = await request.json()
    
    if (!email || !password || !action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const supabase = createClient()
    
    if (action === 'register') {
      // Test registration
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://leaguegametriq.vercel.app'}/auth/callback`,
        }
      })
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message,
          details: error
        }, { status: 400 })
      }
      
      return NextResponse.json({
        success: true,
        message: 'Registration successful. Please check your email for verification.',
        userId: data.user?.id,
        email: data.user?.email
      })
      
    } else if (action === 'login') {
      // Test login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message,
          details: error
        }, { status: 401 })
      }
      
      // Check if user has a profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      return NextResponse.json({
        success: true,
        message: 'Login successful',
        userId: data.user.id,
        email: data.user.email,
        hasProfile: !!profile,
        profile: profile || null
      })
      
    } else if (action === 'logout') {
      // Test logout
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 400 })
      }
      
      return NextResponse.json({
        success: true,
        message: 'Logout successful'
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })
    
  } catch (error: any) {
    console.error('Auth test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}