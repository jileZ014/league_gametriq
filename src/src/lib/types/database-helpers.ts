import type { Database, UserRole, User } from '@/lib/supabase/types'

/**
 * Type guard to check if a value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Type guard to check if a database response has data
 */
export function hasData<T>(response: { data: T | null; error: any }): response is { data: T; error: null } {
  return response.data !== null && response.error === null
}

/**
 * Type guard to check if a user has a specific role
 */
export function hasRole(user: { role?: UserRole | null }, role: UserRole): boolean {
  return isDefined(user.role) && user.role === role
}

/**
 * Type guard to check if a user has any of the specified roles
 */
export function hasAnyRole(user: { role?: UserRole | null }, roles: UserRole[]): boolean {
  return isDefined(user.role) && roles.includes(user.role)
}

/**
 * Type guard to check if a user is an admin
 */
export function isAdmin(user: { role?: UserRole | null }): boolean {
  return hasRole(user, 'league-admin')
}

/**
 * Type guard to check if a user is a coach or admin
 */
export function isCoachOrAdmin(user: { role?: UserRole | null }): boolean {
  return hasAnyRole(user, ['coach', 'league-admin'])
}

/**
 * Type guard to check if a user is authorized for referee operations
 */
export function isRefereeAuthorized(user: { role?: UserRole | null }): boolean {
  return hasAnyRole(user, ['referee', 'league-admin'])
}

/**
 * Type guard to check if a user is authorized for scorekeeper operations
 */
export function isScorekeeperAuthorized(user: { role?: UserRole | null }): boolean {
  return hasAnyRole(user, ['scorekeeper', 'referee', 'league-admin'])
}

/**
 * Safe getter for nullable database fields with default values
 */
export function getOrDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return isDefined(value) ? value : defaultValue
}

/**
 * Helper to safely extract user role from database response
 */
export function extractUserRole(userData: { role?: UserRole | null } | null): UserRole | null {
  if (!userData || !isDefined(userData.role)) {
    return null
  }
  return userData.role
}

/**
 * Helper to build a redirect URL based on user role
 */
export function getRoleBasedRedirectUrl(role: UserRole | null, baseUrl: string): string {
  if (!role) {
    return `${baseUrl}/register/complete`
  }

  const roleRoutes: Record<UserRole, string> = {
    'league-admin': '/admin',
    'coach': '/coach/dashboard',
    'parent': '/dashboard/parent',
    'player': '/dashboard/player',
    'referee': '/referee',
    'scorekeeper': '/scorekeeper',
    'spectator': '/spectator'
  }

  return `${baseUrl}${roleRoutes[role] || '/dashboard'}`
}

/**
 * Helper to get dashboard URL for a specific role
 */
export function getDashboardUrl(role: UserRole, baseUrl: string = ''): string {
  return `${baseUrl}/dashboard/${role}`
}

/**
 * Type-safe helper for database queries with nullable fields
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await queryFn()
    return result
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown database error')
    }
  }
}

/**
 * Helper to handle Supabase single row queries that might return null
 */
export function handleSingleRowQuery<T>(
  data: T | null,
  error: any
): { success: boolean; data: T | null; error: string | null } {
  if (error) {
    return {
      success: false,
      data: null,
      error: error.message || 'Database query failed'
    }
  }

  if (!data) {
    return {
      success: false,
      data: null,
      error: 'No data found'
    }
  }

  return {
    success: true,
    data,
    error: null
  }
}

/**
 * Helper to handle Supabase multi-row queries
 */
export function handleMultiRowQuery<T>(
  data: T[] | null,
  error: any
): { success: boolean; data: T[]; error: string | null } {
  if (error) {
    return {
      success: false,
      data: [],
      error: error.message || 'Database query failed'
    }
  }

  return {
    success: true,
    data: data || [],
    error: null
  }
}

/**
 * Type guard for checking if a value is a valid UserRole
 */
export function isValidUserRole(value: unknown): value is UserRole {
  const validRoles: UserRole[] = [
    'league-admin',
    'coach',
    'parent',
    'player',
    'referee',
    'scorekeeper',
    'spectator'
  ]
  return typeof value === 'string' && validRoles.includes(value as UserRole)
}

/**
 * Helper to safely parse JSON fields from database
 */
export function parseJsonField<T = any>(field: any): T | null {
  if (!field) return null
  
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T
    } catch {
      return null
    }
  }
  
  return field as T
}

/**
 * Helper to stringify data for JSON database fields
 */
export function stringifyForDb(data: any): string | null {
  if (!data) return null
  
  try {
    return JSON.stringify(data)
  } catch {
    return null
  }
}

/**
 * Helper to get a safe timestamp for database operations
 */
export function getDbTimestamp(date?: Date | string | null): string {
  if (!date) {
    return new Date().toISOString()
  }
  
  if (typeof date === 'string') {
    return date
  }
  
  return date.toISOString()
}

/**
 * Helper to validate required fields for database insert
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: Partial<T>,
  requiredFields: (keyof T)[]
): { valid: boolean; missingFields: (keyof T)[] } {
  const missingFields = requiredFields.filter(field => !isDefined(data[field]))
  
  return {
    valid: missingFields.length === 0,
    missingFields
  }
}

/**
 * Helper to sanitize user input for database storage
 */
export function sanitizeInput(input: string | null | undefined): string | null {
  if (!isDefined(input)) return null
  
  // Remove leading/trailing whitespace
  const trimmed = input.trim()
  
  // Return null for empty strings
  if (trimmed.length === 0) return null
  
  // Basic XSS prevention (more comprehensive sanitization should be done server-side)
  return trimmed
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Helper to build a WHERE clause object for Supabase queries
 */
export function buildWhereClause<T extends Record<string, any>>(
  filters: Partial<T>
): Partial<T> {
  const whereClause: Partial<T> = {}
  
  Object.entries(filters).forEach(([key, value]) => {
    if (isDefined(value)) {
      whereClause[key as keyof T] = value
    }
  })
  
  return whereClause
}

// Export all helper functions and type guards
export default {
  isDefined,
  hasData,
  hasRole,
  hasAnyRole,
  isAdmin,
  isCoachOrAdmin,
  isRefereeAuthorized,
  isScorekeeperAuthorized,
  getOrDefault,
  extractUserRole,
  getRoleBasedRedirectUrl,
  getDashboardUrl,
  safeQuery,
  handleSingleRowQuery,
  handleMultiRowQuery,
  isValidUserRole,
  parseJsonField,
  stringifyForDb,
  getDbTimestamp,
  validateRequiredFields,
  sanitizeInput,
  buildWhereClause
}