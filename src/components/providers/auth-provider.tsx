'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// User types for different personas
type UserRole = 'league-admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  ageGroup?: 'youth' | 'teen' | 'adult'
  isUnder13: boolean
  hasParentalConsent: boolean
  avatar?: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    notifications: boolean
    language: string
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (userData: RegisterData) => Promise<boolean>
  updateUser: (updates: Partial<User>) => void
  isAuthenticated: boolean
}

interface RegisterData {
  email: string
  password: string
  name: string
  role: UserRole
  dateOfBirth?: Date
  parentEmail?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing session on mount
    checkExistingSession()
  }, [])

  const checkExistingSession = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      if (token) {
        // In a real implementation, verify token with backend
        const userData = localStorage.getItem('user-data')
        if (userData) {
          setUser(JSON.parse(userData))
        }
      }
    } catch (error) {
      console.error('Session check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      // Simulate API call - replace with actual authentication
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock user data - replace with actual API response
      const mockUser: User = {
        id: '1',
        email,
        name: 'John Doe',
        role: 'coach',
        ageGroup: 'adult',
        isUnder13: false,
        hasParentalConsent: true,
        preferences: {
          theme: 'system',
          notifications: true,
          language: 'en'
        }
      }
      
      // Store auth token and user data
      localStorage.setItem('auth-token', 'mock-jwt-token')
      localStorage.setItem('user-data', JSON.stringify(mockUser))
      
      setUser(mockUser)
      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      setLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Check if user is under 13 for COPPA compliance
      const isUnder13 = userData.dateOfBirth ? 
        new Date().getFullYear() - userData.dateOfBirth.getFullYear() < 13 : false
      
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email: userData.email,
        name: userData.name,
        role: userData.role,
        ageGroup: isUnder13 ? 'youth' : userData.role === 'player' ? 'teen' : 'adult',
        isUnder13,
        hasParentalConsent: isUnder13 ? !!userData.parentEmail : true,
        preferences: {
          theme: 'system',
          notifications: true,
          language: 'en'
        }
      }
      
      localStorage.setItem('auth-token', 'mock-jwt-token')
      localStorage.setItem('user-data', JSON.stringify(newUser))
      
      setUser(newUser)
      return true
    } catch (error) {
      console.error('Registration failed:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('auth-token')
    localStorage.removeItem('user-data')
    localStorage.removeItem('age-verified')
    localStorage.removeItem('parental-consent')
    setUser(null)
    router.push('/')
  }

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      localStorage.setItem('user-data', JSON.stringify(updatedUser))
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
    updateUser,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}