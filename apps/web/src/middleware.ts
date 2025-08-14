import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database, UserRole } from '@/lib/supabase/types'

// TEMPORARY HARDCODED VALUES FOR UAT DEPLOYMENT
// TODO: After UAT, investigate why process.env variables aren't loading in Edge Runtime
const SUPABASE_URL = 'https://mqfpbqvkhqjivqeqaclj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnBicXZraHFqaXZxZXFhY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxNjU1NzksImV4cCI6MjA0Mzc0MTU3OX0.pYXQiOjE3NTUxMjAxNjAsImV4cCI6MjA3MDg2NDE2MH0.zMn6_xI5RMKE0DwYDVsInpuSqI47eXunQnGMxvU1RILtJuUng'

// Define protected routes and their required roles
const protectedRoutes: Record<string, UserRole[]> = {
  '/admin': ['league-admin'],
  '/coach': ['coach', 'league-admin'],
  '/referee': ['referee', 'league-admin'],
  '/scorekeeper': ['scorekeeper', 'referee', 'league-admin'],
  '/dashboard': ['league-admin', 'coach', 'parent', 'player', 'referee', 'scorekeeper'],
}

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/portal',
  '/spectator',
  '/privacy',
  '/terms',
]

// Auth routes that should redirect to dashboard if already logged in
const authRoutes = ['/login', '/register', '/forgot-password']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create a Supabase client configured for the server
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get the current session
  const { data: { session } } = await supabase.auth.getSession()

  // Handle auth routes (redirect to dashboard if already logged in)
  if (authRoutes.includes(pathname)) {
    if (session?.user) {
      // Get user role from database
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (userData) {
        const dashboardUrl = new URL(`/dashboard/${userData.role}`, request.url)
        return NextResponse.redirect(dashboardUrl)
      }
    }
    return response
  }

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  if (isPublicRoute) {
    return response
  }

  // Check if the route is protected
  const protectedRoute = Object.keys(protectedRoutes).find(route => 
    pathname.startsWith(route)
  )

  if (protectedRoute) {
    // User must be authenticated
    if (!session?.user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Get user role from database
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!userData) {
      // User exists in auth but not in database - redirect to complete profile
      const completeProfileUrl = new URL('/register/complete', request.url)
      return NextResponse.redirect(completeProfileUrl)
    }

    // Check if user has required role
    const requiredRoles = protectedRoutes[protectedRoute]
    if (!requiredRoles.includes(userData.role)) {
      // User doesn't have permission - redirect to their dashboard
      const dashboardUrl = new URL(`/dashboard/${userData.role}`, request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // Handle dynamic dashboard routes
  if (pathname.startsWith('/dashboard/')) {
    if (!session?.user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Get user role from database
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!userData) {
      const completeProfileUrl = new URL('/register/complete', request.url)
      return NextResponse.redirect(completeProfileUrl)
    }

    // Extract the role from the URL
    const urlRole = pathname.split('/')[2] as UserRole

    // If the URL role doesn't match the user's role, redirect to their correct dashboard
    if (urlRole && urlRole !== userData.role) {
      const correctDashboardUrl = new URL(`/dashboard/${userData.role}`, request.url)
      return NextResponse.redirect(correctDashboardUrl)
    }
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // Add CSP header for additional security
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspHeader)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}