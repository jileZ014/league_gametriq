import { useTranslation as useI18nTranslation } from 'react-i18next'
import { useCallback, useMemo } from 'react'
import { 
  formatters, 
  basketballFormatters,
  getComponentText,
  getValidationMessage,
  getErrorMessage,
  getSuccessMessage,
  getCurrentLanguage,
  type SupportedLanguage 
} from '@/lib/i18n'

/**
 * Enhanced translation hook with formatters and helpers
 */
export function useTranslation(namespace?: string | string[]) {
  const { t, i18n, ready } = useI18nTranslation(namespace)
  
  const currentLanguage = getCurrentLanguage()
  
  // Memoized formatters bound to current language
  const format = useMemo(() => ({
    date: (date: Date | string) => formatters.date(date, currentLanguage),
    time: (date: Date | string) => formatters.time(date, currentLanguage),
    dateTime: (date: Date | string) => formatters.dateTime(date, currentLanguage),
    relative: (date: Date | string) => formatters.relative(date, currentLanguage),
    distance: (date: Date | string) => formatters.distance(date, currentLanguage),
    number: (value: number) => formatters.number(value, currentLanguage),
    currency: (value: number) => formatters.currency(value, currentLanguage),
    percent: (value: number) => formatters.percent(value, currentLanguage),
  }), [currentLanguage])
  
  // Basketball-specific formatters
  const basketball = useMemo(() => ({
    score: (home: number, away: number) => 
      basketballFormatters.score(home, away, currentLanguage),
    quarter: (quarter: number) => 
      basketballFormatters.quarter(quarter, currentLanguage),
    foulCount: (fouls: number, limit: number) => 
      basketballFormatters.foulCount(fouls, limit, currentLanguage),
    timeoutCount: (used: number, total: number) => 
      basketballFormatters.timeoutCount(used, total, currentLanguage),
    playerStats: (points: number, rebounds: number, assists: number) => 
      basketballFormatters.playerStats(points, rebounds, assists, currentLanguage),
  }), [currentLanguage])
  
  // Component-specific translation helper
  const tc = useCallback((key: string, options?: any) => {
    if (namespace && typeof namespace === 'string') {
      return getComponentText(namespace)(key, options)
    }
    return t(key, options)
  }, [namespace, t])
  
  // Validation message helper
  const validation = useCallback((type: string, params?: any) => {
    return getValidationMessage(type, params)
  }, [])
  
  // Error message helper
  const error = useCallback((code: string, fallback?: string) => {
    return getErrorMessage(code, fallback)
  }, [])
  
  // Success message helper
  const success = useCallback((action: string) => {
    return getSuccessMessage(action)
  }, [])
  
  return {
    t,
    tc,
    i18n,
    ready,
    currentLanguage,
    format,
    basketball,
    validation,
    error,
    success,
  }
}

/**
 * Hook for basketball-specific translations
 */
export function useBasketballTranslation() {
  return useTranslation('basketball')
}

/**
 * Hook for registration translations
 */
export function useRegistrationTranslation() {
  return useTranslation('registration')
}

/**
 * Hook for scoring translations
 */
export function useScoringTranslation() {
  return useTranslation('scoring')
}

/**
 * Hook for common translations
 */
export function useCommonTranslation() {
  return useTranslation('common')
}