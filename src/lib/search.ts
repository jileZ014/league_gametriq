// Search utilities for portal functionality
import { ReadonlyURLSearchParams } from 'next/navigation'

export interface SearchFilters {
  query?: string
  league?: string
  division?: string
  ageGroup?: string
  dateFrom?: string
  dateTo?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SearchResult {
  id: string
  type: 'team' | 'player' | 'game' | 'event'
  title: string
  subtitle?: string
  description?: string
  imageUrl?: string
  url: string
  metadata?: Record<string, any>
}

// Parse search filters from URL search params
export function parseSearchFilters(searchParams: ReadonlyURLSearchParams): SearchFilters {
  return {
    query: searchParams.get('q') || undefined,
    league: searchParams.get('league') || undefined,
    division: searchParams.get('division') || undefined,
    ageGroup: searchParams.get('age') || undefined,
    dateFrom: searchParams.get('from') || undefined,
    dateTo: searchParams.get('to') || undefined,
    status: searchParams.get('status') || undefined,
    sortBy: searchParams.get('sort') || undefined,
    sortOrder: (searchParams.get('order') as 'asc' | 'desc') || undefined,
  }
}

// Build URL search params from filters
export function buildSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams()
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      const paramKey = key === 'query' ? 'q' : 
                      key === 'ageGroup' ? 'age' :
                      key === 'dateFrom' ? 'from' :
                      key === 'dateTo' ? 'to' :
                      key === 'sortOrder' ? 'order' :
                      key === 'sortBy' ? 'sort' :
                      key
      params.set(paramKey, value)
    }
  })
  
  return params
}

// Debounce function for search input
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Mock search function (replace with actual API call)
export async function searchPortal(filters: SearchFilters): Promise<SearchResult[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const results: SearchResult[] = []
  
  // Mock team results
  if (!filters.query || filters.query.toLowerCase().includes('team')) {
    results.push(
      {
        id: 'team-1',
        type: 'team',
        title: 'Thunder Hawks',
        subtitle: 'Division A - U16',
        description: '12 wins, 3 losses',
        imageUrl: '/images/teams/thunder-hawks.jpg',
        url: '/portal/teams/thunder-hawks',
        metadata: { league: 'Premier', division: 'A', ageGroup: 'U16' }
      },
      {
        id: 'team-2',
        type: 'team',
        title: 'Lightning Bolts',
        subtitle: 'Division B - U14',
        description: '10 wins, 5 losses',
        imageUrl: '/images/teams/lightning-bolts.jpg',
        url: '/portal/teams/lightning-bolts',
        metadata: { league: 'Premier', division: 'B', ageGroup: 'U14' }
      }
    )
  }
  
  // Mock player results
  if (!filters.query || filters.query.toLowerCase().includes('player')) {
    results.push(
      {
        id: 'player-1',
        type: 'player',
        title: 'John Smith',
        subtitle: 'Thunder Hawks - Forward',
        description: '15 goals, 8 assists',
        imageUrl: '/images/players/john-smith.jpg',
        url: '/portal/players/john-smith',
        metadata: { team: 'Thunder Hawks', position: 'Forward' }
      }
    )
  }
  
  // Mock game results
  if (!filters.query || filters.query.toLowerCase().includes('game')) {
    results.push(
      {
        id: 'game-1',
        type: 'game',
        title: 'Thunder Hawks vs Lightning Bolts',
        subtitle: 'March 15, 2024 - 7:00 PM',
        description: 'Division A Championship',
        url: '/portal/games/game-1',
        metadata: { date: '2024-03-15', time: '19:00', venue: 'Main Arena' }
      }
    )
  }
  
  // Apply filters
  let filteredResults = results
  
  if (filters.league) {
    filteredResults = filteredResults.filter(r => 
      r.metadata?.league === filters.league
    )
  }
  
  if (filters.division) {
    filteredResults = filteredResults.filter(r => 
      r.metadata?.division === filters.division
    )
  }
  
  if (filters.ageGroup) {
    filteredResults = filteredResults.filter(r => 
      r.metadata?.ageGroup === filters.ageGroup
    )
  }
  
  return filteredResults
}

// Filter options (would typically come from API)
export const filterOptions = {
  leagues: [
    { value: 'premier', label: 'Premier League' },
    { value: 'championship', label: 'Championship' },
    { value: 'recreational', label: 'Recreational' },
  ],
  divisions: [
    { value: 'a', label: 'Division A' },
    { value: 'b', label: 'Division B' },
    { value: 'c', label: 'Division C' },
  ],
  ageGroups: [
    { value: 'u10', label: 'Under 10' },
    { value: 'u12', label: 'Under 12' },
    { value: 'u14', label: 'Under 14' },
    { value: 'u16', label: 'Under 16' },
    { value: 'u18', label: 'Under 18' },
    { value: 'open', label: 'Open' },
  ],
  statuses: [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'live', label: 'Live' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
  sortOptions: [
    { value: 'date', label: 'Date' },
    { value: 'name', label: 'Name' },
    { value: 'relevance', label: 'Relevance' },
  ],
}