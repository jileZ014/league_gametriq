'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { hasRouteAccess, UserRole } from '@/lib/auth/roleManager'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  allowDemo?: boolean
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  allowDemo = true 
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, userRole, loading, isDemo } = useAuth()

  useEffect(() => {
    // Wait for auth to load
    if (loading) return

    // Allow demo mode if specified
    if (allowDemo && isDemo) return

    // Redirect to login if not authenticated
    if (!user) {
      router.push('/login')
      return
    }

    // Check role-based access if required
    if (requiredRole && userRole) {
      if (!hasRouteAccess(userRole, requiredRole)) {
        // Redirect to user's appropriate dashboard
        router.push(`/${userRole}/dashboard`)
      }
    }
  }, [user, userRole, loading, isDemo, requiredRole, allowDemo, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-basketball-orange-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!user && !isDemo) {
    return null
  }

  // Check role access
  if (requiredRole && userRole && !hasRouteAccess(userRole, requiredRole) && !isDemo) {
    return null
  }

  return <>{children}</>
}