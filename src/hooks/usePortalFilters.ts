'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { SearchFilters, buildSearchParams, parseSearchFilters } from '@/lib/search'

export function usePortalFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Parse filters from URL
  const filters = parseSearchFilters(searchParams)
  
  // Local state for immediate UI updates
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters)
  
  // Sync local state with URL params
  useEffect(() => {
    setLocalFilters(parseSearchFilters(searchParams))
  }, [searchParams])
  
  // Update single filter
  const updateFilter = useCallback((key: keyof SearchFilters, value: string | undefined) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    
    // Update URL
    const params = buildSearchParams(newFilters)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [localFilters, pathname, router])
  
  // Update multiple filters at once
  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    const newFilters = { ...localFilters, ...updates }
    setLocalFilters(newFilters)
    
    // Update URL
    const params = buildSearchParams(newFilters)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [localFilters, pathname, router])
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setLocalFilters({})
    router.push(pathname, { scroll: false })
  }, [pathname, router])
  
  // Clear single filter
  const clearFilter = useCallback((key: keyof SearchFilters) => {
    const newFilters = { ...localFilters }
    delete newFilters[key]
    setLocalFilters(newFilters)
    
    // Update URL
    const params = buildSearchParams(newFilters)
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(url, { scroll: false })
  }, [localFilters, pathname, router])
  
  // Check if any filters are active
  const hasActiveFilters = Object.keys(localFilters).length > 0
  
  // Get count of active filters (excluding sortBy and sortOrder)
  const activeFilterCount = Object.entries(localFilters)
    .filter(([key]) => !['sortBy', 'sortOrder'].includes(key))
    .length
  
  return {
    filters: localFilters,
    updateFilter,
    updateFilters,
    clearFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
  }
}

// Hook for persisting filter preferences
export function useFilterPreferences(key: string) {
  const [preferences, setPreferences] = useState<SearchFilters>({})
  
  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`portal-filters-${key}`)
      if (saved) {
        try {
          setPreferences(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to parse saved filters:', e)
        }
      }
    }
  }, [key])
  
  // Save preferences
  const savePreferences = useCallback((filters: SearchFilters) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`portal-filters-${key}`, JSON.stringify(filters))
      setPreferences(filters)
    }
  }, [key])
  
  // Clear preferences
  const clearPreferences = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`portal-filters-${key}`)
      setPreferences({})
    }
  }, [key])
  
  return {
    preferences,
    savePreferences,
    clearPreferences,
  }
}