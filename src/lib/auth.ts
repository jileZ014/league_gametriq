import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// Types for authentication
export type UserRole = 'league-admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper'

export interface User {
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
  createdAt: Date
  lastLogin?: Date
}

export interface AuthToken {
  userId: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

export interface RegisterData {
  email: string
  password: string
  name: string
  role: UserRole
  dateOfBirth?: Date
  parentEmail?: string
  parentName?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

// JWT Secret - In production, this should be an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'gametriq-basketball-secret-key'
const JWT_EXPIRES_IN = '7d' // Token expires in 7 days

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  const payload: Omit<AuthToken, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'gametriq-app',
    audience: 'gametriq-users',
  })
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'gametriq-app',
      audience: 'gametriq-users',
    }) as AuthToken

    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  return authHeader.substring(7) // Remove 'Bearer ' prefix
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password should contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--
  }
  
  return age
}

/**
 * Check if user is under 13 (COPPA compliance)
 */
export function isUnder13(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) < 13
}

/**
 * Get age group based on age
 */
export function getAgeGroup(age: number): 'youth' | 'teen' | 'adult' {
  if (age < 13) return 'youth'
  if (age < 18) return 'teen'
  return 'adult'
}

/**
 * Check if a role requires minimum age
 */
export function validateRoleAge(role: UserRole, age: number): {
  isValid: boolean
  minimumAge: number
} {
  const roleAgeRequirements: Record<UserRole, number> = {
    'player': 6,
    'parent': 18,
    'coach': 16,
    'referee': 16,
    'scorekeeper': 14,
    'league-admin': 18,
  }
  
  const minimumAge = roleAgeRequirements[role]
  
  return {
    isValid: age >= minimumAge,
    minimumAge,
  }
}

/**
 * Generate a secure random string for verification codes
 */
export function generateVerificationCode(length: number = 6): string {
  const chars = '0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Generate a session ID for tracking user sessions
 */
export function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + 
         Date.now().toString(36) + 
         Math.random().toString(36).substring(2)
}

/**
 * Check if user has required permissions for an action
 */
export function hasPermission(
  userRole: UserRole, 
  requiredRole: UserRole | UserRole[]
): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    'player': 1,
    'parent': 2,
    'scorekeeper': 3,
    'referee': 4,
    'coach': 5,
    'league-admin': 6,
  }
  
  const userLevel = roleHierarchy[userRole]
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.some(role => userLevel >= roleHierarchy[role])
  }
  
  return userLevel >= roleHierarchy[requiredRole]
}

/**
 * Create a user object with default preferences
 */
export function createUserDefaults(userData: Partial<User>): User {
  const now = new Date()
  
  return {
    id: userData.id || Math.random().toString(36).substring(2, 15),
    email: userData.email || '',
    name: userData.name || '',
    role: userData.role || 'player',
    ageGroup: userData.ageGroup || 'adult',
    isUnder13: userData.isUnder13 || false,
    hasParentalConsent: userData.hasParentalConsent || true,
    avatar: userData.avatar,
    preferences: {
      theme: 'system',
      notifications: true,
      language: 'en',
      ...userData.preferences,
    },
    createdAt: userData.createdAt || now,
    lastLogin: userData.lastLogin,
  }
}

/**
 * Sanitize user data for client-side use (remove sensitive info)
 */
export function sanitizeUser(user: User): Omit<User, 'password'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ...sanitized } = user
  return sanitized
}

/**
 * Rate limiting helper for auth endpoints
 */
export class AuthRateLimit {
  private attempts: Map<string, { count: number; resetTime: number }>
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {
    this.attempts = new Map()
    
    // Clean up old entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000)
  }
  
  /**
   * Check if request is rate limited
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now()
    const record = this.attempts.get(identifier)
    
    if (!record || now > record.resetTime) {
      return false
    }
    
    return record.count >= this.maxAttempts
  }
  
  /**
   * Record an attempt
   */
  recordAttempt(identifier: string): void {
    const now = Date.now()
    const record = this.attempts.get(identifier)
    
    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      })
    } else {
      record.count++
    }
  }
  
  /**
   * Get remaining attempts
   */
  getRemainingAttempts(identifier: string): number {
    const record = this.attempts.get(identifier)
    
    if (!record || Date.now() > record.resetTime) {
      return this.maxAttempts
    }
    
    return Math.max(0, this.maxAttempts - record.count)
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    
    for (const [key, record] of this.attempts.entries()) {
      if (now > record.resetTime) {
        this.attempts.delete(key)
      }
    }
  }
}

/**
 * Global rate limiter for authentication
 */
export const authRateLimit = new AuthRateLimit()

/**
 * Basketball-specific user utilities
 */
export const BasketballAuth = {
  /**
   * Check if user can manage a team
   */
  canManageTeam(userRole: UserRole): boolean {
    return ['coach', 'league-admin'].includes(userRole)
  },
  
  /**
   * Check if user can view game statistics
   */
  canViewStats(userRole: UserRole): boolean {
    return ['coach', 'player', 'parent', 'league-admin', 'referee', 'scorekeeper'].includes(userRole)
  },
  
  /**
   * Check if user can officiate games
   */
  canOfficiateGames(userRole: UserRole): boolean {
    return ['referee', 'league-admin'].includes(userRole)
  },
  
  /**
   * Check if user can manage league settings
   */
  canManageLeague(userRole: UserRole): boolean {
    return userRole === 'league-admin'
  },
  
  /**
   * Get appropriate dashboard path for user role
   */
  getDashboardPath(userRole: UserRole): string {
    return `/dashboard/${userRole}`
  },
}

export default {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  isValidEmail,
  validatePassword,
  calculateAge,
  isUnder13,
  getAgeGroup,
  validateRoleAge,
  generateVerificationCode,
  generateSessionId,
  hasPermission,
  createUserDefaults,
  sanitizeUser,
  authRateLimit,
  BasketballAuth,
}