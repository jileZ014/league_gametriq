import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, addMinutes, isAfter, isBefore } from 'date-fns'

// Utility function for conditional CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Basketball-specific utilities
export const basketballUtils = {
  // Format game time (MM:SS)
  formatGameTime: (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  },

  // Calculate win percentage
  calculateWinPercentage: (wins: number, losses: number): number => {
    const totalGames = wins + losses
    return totalGames === 0 ? 0 : wins / totalGames
  },

  // Determine if team is in bonus situation
  isInBonus: (teamFouls: number, quarter: number): boolean => {
    return teamFouls >= 7
  },

  // Calculate remaining timeouts
  calculateRemainingTimeouts: (used: number, quarter: number): number => {
    const maxTimeouts = quarter <= 2 ? 3 : 2
    return Math.max(0, maxTimeouts - used)
  },

  // Format player statistics
  formatPlayerStats: (stats: PlayerStats): FormattedStats => {
    return {
      points: stats.points,
      rebounds: stats.rebounds,
      assists: stats.assists,
      steals: stats.steals,
      blocks: stats.blocks,
      fouls: stats.fouls,
      fieldGoalPercentage: stats.fieldGoalAttempts > 0 
        ? ((stats.fieldGoalsMade / stats.fieldGoalAttempts) * 100).toFixed(1)
        : '0.0',
      freeThrowPercentage: stats.freeThrowAttempts > 0
        ? ((stats.freeThrowsMade / stats.freeThrowAttempts) * 100).toFixed(1)
        : '0.0'
    }
  },

  // Validate jersey number
  isValidJerseyNumber: (number: number): boolean => {
    return number >= 0 && number <= 99
  },

  // Calculate age from birth year (COPPA compliance)
  calculateAgeFromBirthYear: (birthYear: number): number => {
    return new Date().getFullYear() - birthYear
  },

  // Determine division by age
  determineDivision: (age: number): string => {
    if (age <= 7) return 'U8'
    if (age <= 9) return 'U10'
    if (age <= 11) return 'U12'
    if (age <= 13) return 'U14'
    if (age <= 15) return 'U16'
    return 'U18'
  },

  // Phoenix heat safety check
  getHeatAlertLevel: (temperature: number): HeatLevel => {
    if (temperature >= 110) return 'red'
    if (temperature >= 105) return 'orange'
    if (temperature >= 100) return 'yellow'
    return 'green'
  }
}

// Date utilities for basketball scheduling
export const scheduleUtils = {
  // Format game schedule display
  formatGameSchedule: (dateTime: string): string => {
    return format(new Date(dateTime), 'PPp')
  },

  // Check if game is today
  isGameToday: (gameDate: string): boolean => {
    const today = new Date()
    const game = new Date(gameDate)
    return format(today, 'yyyy-MM-dd') === format(game, 'yyyy-MM-dd')
  },

  // Calculate game end time (assuming 32-minute games + 15 min setup)
  calculateGameEndTime: (startTime: string, gameDuration = 32): string => {
    const start = new Date(startTime)
    const end = addMinutes(start, gameDuration + 15) // Game + setup time
    return end.toISOString()
  },

  // Check for scheduling conflicts
  hasSchedulingConflict: (
    newGame: { start: string; end: string; court: string },
    existingGames: Array<{ start: string; end: string; court: string }>
  ): boolean => {
    const newStart = new Date(newGame.start)
    const newEnd = new Date(newGame.end)

    return existingGames.some(game => {
      if (game.court !== newGame.court) return false
      
      const existingStart = new Date(game.start)
      const existingEnd = new Date(game.end)

      // Check for time overlap
      return (
        (isAfter(newStart, existingStart) && isBefore(newStart, existingEnd)) ||
        (isAfter(newEnd, existingStart) && isBefore(newEnd, existingEnd)) ||
        (isBefore(newStart, existingStart) && isAfter(newEnd, existingEnd))
      )
    })
  }
}

// Form validation utilities
export const validationUtils = {
  // Email validation
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // Phone number validation (US format)
  isValidPhoneNumber: (phone: string): boolean => {
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
    return phoneRegex.test(phone)
  },

  // Team name validation
  isValidTeamName: (name: string): boolean => {
    return name.length >= 2 && name.length <= 50 && /^[a-zA-Z0-9\s]+$/.test(name)
  },

  // Birth year validation (must be reasonable for youth basketball)
  isValidBirthYear: (year: number): boolean => {
    const currentYear = new Date().getFullYear()
    return year >= currentYear - 18 && year <= currentYear - 5
  }
}

// Error handling utilities
export const errorUtils = {
  // Extract error message from various error types
  getErrorMessage: (error: unknown): string => {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    return 'An unexpected error occurred'
  },

  // Create user-friendly error messages for basketball contexts
  createBasketballError: (context: string, originalError: unknown): string => {
    const baseMessage = errorUtils.getErrorMessage(originalError)
    
    switch (context) {
      case 'score_update':
        return `Failed to update game score: ${baseMessage}`
      case 'team_registration':
        return `Team registration failed: ${baseMessage}`
      case 'payment_processing':
        return `Payment could not be processed: ${baseMessage}`
      case 'schedule_conflict':
        return `Scheduling conflict detected: ${baseMessage}`
      default:
        return baseMessage
    }
  }
}

// Type definitions
export interface PlayerStats {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  fouls: number
  fieldGoalsMade: number
  fieldGoalAttempts: number
  freeThrowsMade: number
  freeThrowAttempts: number
}

export interface FormattedStats {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  fouls: number
  fieldGoalPercentage: string
  freeThrowPercentage: string
}

export type HeatLevel = 'green' | 'yellow' | 'orange' | 'red'

export type GameStatus = 'scheduled' | 'warmup' | 'live' | 'halftime' | 'timeout' | 'completed' | 'cancelled'

export type UserRole = 'admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper' | 'spectator'