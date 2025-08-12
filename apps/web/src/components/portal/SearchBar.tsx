'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SearchResult, searchPortal, debounce } from '@/lib/search'
import { usePortalFilters } from '@/hooks/usePortalFilters'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface SearchBarProps {
  className?: string
  placeholder?: string
  autofocus?: boolean
  onResultClick?: (result: SearchResult) => void
}

export function SearchBar({ 
  className = '', 
  placeholder = 'Search teams, players, games...', 
  autofocus = false,
  onResultClick 
}: SearchBarProps) {
  const router = useRouter()
  const { filters, updateFilter } = usePortalFilters()
  const [query, setQuery] = useState(filters.query || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Handle search with debouncing
  const performSearch = useRef(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      try {
        const searchResults = await searchPortal({ ...filters, query: searchQuery })
        setResults(searchResults)
      } catch (error) {
        console.error('Search failed:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
  ).current
  
  // Update search query
  useEffect(() => {
    setQuery(filters.query || '')
  }, [filters.query])
  
  // Perform search when query changes
  useEffect(() => {
    if (query) {
      performSearch(query)
    } else {
      setResults([])
    }
  }, [query, performSearch])
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Auto-focus on mount if requested
  useEffect(() => {
    if (autofocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autofocus])
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setShowResults(true)
    
    if (!value.trim()) {
      updateFilter('query', undefined)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      updateFilter('query', query)
      setShowResults(false)
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setShowResults(false)
      inputRef.current?.blur()
    }
  }
  
  const handleResultClick = (result: SearchResult) => {
    setShowResults(false)
    if (onResultClick) {
      onResultClick(result)
    } else {
      router.push(result.url)
    }
  }
  
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'team':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      case 'player':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'game':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }
  
  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="pl-10 pr-4"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <Card className="absolute z-50 w-full mt-2 py-2 max-h-96 overflow-y-auto shadow-lg">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-3 hover:bg-accent transition-colors flex items-start space-x-3 text-left"
            >
              <div className="mt-0.5 text-muted-foreground">
                {getResultIcon(result.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{result.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {result.type}
                  </Badge>
                </div>
                {result.subtitle && (
                  <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                )}
                {result.description && (
                  <div className="text-sm text-muted-foreground mt-1">{result.description}</div>
                )}
              </div>
            </button>
          ))}
        </Card>
      )}
      
      {/* No Results */}
      {showResults && query.trim() && !isLoading && results.length === 0 && (
        <Card className="absolute z-50 w-full mt-2 p-8 text-center shadow-lg">
          <p className="text-muted-foreground">No results found for "{query}"</p>
        </Card>
      )}
    </div>
  )
}