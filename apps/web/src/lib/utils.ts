import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Calculates age from date of birth
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

/**
 * Formats a date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

/**
 * Formats a date and time for display
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

/**
 * Formats game time (MM:SS format)
 */
export function formatGameTime(minutes: number, seconds: number): string {
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Determines if a user is under 13 for COPPA compliance
 */
export function isUnder13(birthDate: Date): boolean {
  return calculateAge(birthDate) < 13
}

/**
 * Heat index calculation for Phoenix safety monitoring
 */
export function calculateHeatIndex(temperature: number, humidity: number): number {
  if (temperature < 80) return temperature
  
  const t = temperature
  const h = humidity
  
  // Rothfusz regression equation
  let hi = -42.379 + 2.04901523 * t + 10.14333127 * h - 0.22475541 * t * h
  hi += -0.00683783 * t * t - 0.05481717 * h * h + 0.00122874 * t * t * h
  hi += 0.00085282 * t * h * h - 0.00000199 * t * t * h * h
  
  return Math.round(hi)
}

/**
 * Gets heat safety level based on heat index
 */
export function getHeatSafetyLevel(heatIndex: number): {
  level: 'green' | 'yellow' | 'orange' | 'red'
  label: string
  description: string
} {
  if (heatIndex < 90) {
    return {
      level: 'green',
      label: 'Safe',
      description: 'Normal basketball activities'
    }
  } else if (heatIndex < 100) {
    return {
      level: 'yellow',
      label: 'Caution',
      description: 'Increase water breaks'
    }
  } else if (heatIndex < 110) {
    return {
      level: 'orange',
      label: 'Enhanced Safety',
      description: 'Frequent breaks and monitoring'
    }
  } else {
    return {
      level: 'red',
      label: 'Extreme Caution',
      description: 'Consider postponement'
    }
  }
}

/**
 * Debounce utility for search and input handling
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Formats a number as a percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Formats basketball statistics
 */
export function formatStat(value: number, decimals = 1): string {
  return value.toFixed(decimals)
}

/**
 * Truncates text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Generates a random ID for components
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Checks if the device is likely a touch device
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Gets the appropriate touch target size based on user age group
 */
export function getTouchTargetSize(ageGroup: 'youth' | 'teen' | 'adult'): string {
  switch (ageGroup) {
    case 'youth':
      return 'touch-target-large' // 56px minimum
    case 'teen':
      return 'touch-target' // 48px minimum
    case 'adult':
      return 'touch-target' // 48px minimum
    default:
      return 'touch-target'
  }
}

/**
 * Announces text to screen readers
 */
export function announceToScreenReader(message: string): void {
  if (typeof window === 'undefined') return
  
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Formats a jersey number for display
 */
export function formatJerseyNumber(number: number): string {
  return `#${number}`
}

/**
 * Gets player position abbreviation
 */
export function getPositionAbbreviation(position: string): string {
  const positions: Record<string, string> = {
    'Point Guard': 'PG',
    'Shooting Guard': 'SG',
    'Small Forward': 'SF',
    'Power Forward': 'PF',
    'Center': 'C',
    'Guard': 'G',
    'Forward': 'F'
  }
  
  return positions[position] || position.slice(0, 2).toUpperCase()
}