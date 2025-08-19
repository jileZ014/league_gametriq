import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test the database connection
    const { data, error } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true })
    
    // Test auth service
    const { data: { session } } = await supabase.auth.getSession()
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: error ? 'error' : 'connected',
        auth: 'connected',
        session: session ? 'active' : 'none'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      error: error ? error.message : null
    })
  } catch (error: any) {
    console.error('Health check failed:', error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}