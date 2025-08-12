'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { filterOptions } from '@/lib/search'
import { usePortalFilters, useFilterPreferences } from '@/hooks/usePortalFilters'
import { useState } from 'react'

interface FiltersProps {
  className?: string
  showDateRange?: boolean
  showStatus?: boolean
  showSort?: boolean
  onFiltersChange?: () => void
}

export function Filters({ 
  className = '',
  showDateRange = false,
  showStatus = false,
  showSort = true,
  onFiltersChange
}: FiltersProps) {
  const { 
    filters, 
    updateFilter, 
    clearFilters, 
    clearFilter,
    hasActiveFilters,
    activeFilterCount 
  } = usePortalFilters()
  
  const { preferences, savePreferences } = useFilterPreferences('portal')
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const handleFilterChange = (key: string, value: string | undefined) => {
    updateFilter(key as any, value)
    if (onFiltersChange) {
      onFiltersChange()
    }
  }
  
  const handleSavePreferences = () => {
    savePreferences(filters)
  }
  
  const handleLoadPreferences = () => {
    Object.entries(preferences).forEach(([key, value]) => {
      updateFilter(key as any, value)
    })
  }
  
  // Mobile toggle button
  const MobileToggle = () => (
    <button
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="lg:hidden flex items-center justify-between w-full p-4 bg-background border rounded-lg mb-4"
    >
      <div className="flex items-center space-x-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-2">
            {activeFilterCount}
          </Badge>
        )}
      </div>
      <svg 
        className={`w-5 h-5 transform transition-transform ${isCollapsed ? '' : 'rotate-180'}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
  
  return (
    <div className={className}>
      <MobileToggle />
      
      <Card className={`p-4 space-y-4 ${isCollapsed ? 'hidden lg:block' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Filters</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
        
        {/* League Filter */}
        <div className="space-y-2">
          <Label htmlFor="league-filter">League</Label>
          <Select
            value={filters.league || ''}
            onValueChange={(value) => handleFilterChange('league', value || undefined)}
          >
            <SelectTrigger id="league-filter">
              <SelectValue placeholder="All leagues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All leagues</SelectItem>
              {filterOptions.leagues.map((league) => (
                <SelectItem key={league.value} value={league.value}>
                  {league.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Division Filter */}
        <div className="space-y-2">
          <Label htmlFor="division-filter">Division</Label>
          <Select
            value={filters.division || ''}
            onValueChange={(value) => handleFilterChange('division', value || undefined)}
          >
            <SelectTrigger id="division-filter">
              <SelectValue placeholder="All divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All divisions</SelectItem>
              {filterOptions.divisions.map((division) => (
                <SelectItem key={division.value} value={division.value}>
                  {division.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Age Group Filter */}
        <div className="space-y-2">
          <Label htmlFor="age-filter">Age Group</Label>
          <Select
            value={filters.ageGroup || ''}
            onValueChange={(value) => handleFilterChange('ageGroup', value || undefined)}
          >
            <SelectTrigger id="age-filter">
              <SelectValue placeholder="All age groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All age groups</SelectItem>
              {filterOptions.ageGroups.map((age) => (
                <SelectItem key={age.value} value={age.value}>
                  {age.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Date Range Filters */}
        {showDateRange && (
          <>
            <div className="space-y-2">
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
              />
            </div>
          </>
        )}
        
        {/* Status Filter */}
        {showStatus && (
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select
              value={filters.status || ''}
              onValueChange={(value) => handleFilterChange('status', value || undefined)}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {filterOptions.statuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Sort Options */}
        {showSort && (
          <>
            <div className="space-y-2">
              <Label htmlFor="sort-filter">Sort By</Label>
              <Select
                value={filters.sortBy || ''}
                onValueChange={(value) => handleFilterChange('sortBy', value || undefined)}
              >
                <SelectTrigger id="sort-filter">
                  <SelectValue placeholder="Default sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default sort</SelectItem>
                  {filterOptions.sortOptions.map((sort) => (
                    <SelectItem key={sort.value} value={sort.value}>
                      {sort.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {filters.sortBy && (
              <div className="space-y-2">
                <Label htmlFor="order-filter">Sort Order</Label>
                <Select
                  value={filters.sortOrder || 'asc'}
                  onValueChange={(value) => handleFilterChange('sortOrder', value as 'asc' | 'desc')}
                >
                  <SelectTrigger id="order-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
        
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => {
                if (!value || ['sortBy', 'sortOrder'].includes(key)) return null
                
                const label = key === 'query' ? `Search: ${value}` :
                            key === 'league' ? `League: ${filterOptions.leagues.find(l => l.value === value)?.label}` :
                            key === 'division' ? `Division: ${filterOptions.divisions.find(d => d.value === value)?.label}` :
                            key === 'ageGroup' ? `Age: ${filterOptions.ageGroups.find(a => a.value === value)?.label}` :
                            key === 'dateFrom' ? `From: ${value}` :
                            key === 'dateTo' ? `To: ${value}` :
                            key === 'status' ? `Status: ${filterOptions.statuses.find(s => s.value === value)?.label}` :
                            `${key}: ${value}`
                
                return (
                  <Badge key={key} variant="secondary" className="pl-2 pr-1">
                    <span className="mr-1">{label}</span>
                    <button
                      onClick={() => clearFilter(key as any)}
                      className="ml-1 hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Save/Load Preferences */}
        <div className="pt-4 border-t space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleSavePreferences}
            disabled={!hasActiveFilters}
          >
            Save Filter Preferences
          </Button>
          {Object.keys(preferences).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLoadPreferences}
            >
              Load Saved Filters
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}