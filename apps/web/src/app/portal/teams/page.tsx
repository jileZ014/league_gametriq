'use client'

import { SearchBar } from '@/components/portal/SearchBar'
import { Filters } from '@/components/portal/Filters'
import { usePortalFilters } from '@/hooks/usePortalFilters'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

interface Team {
  id: string
  name: string
  league: string
  division: string
  ageGroup: string
  wins: number
  losses: number
  points: number
  logoUrl?: string
  captain: string
  playerCount: number
}

// Mock team data (replace with API call)
const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Thunder Hawks',
    league: 'premier',
    division: 'a',
    ageGroup: 'u16',
    wins: 12,
    losses: 3,
    points: 36,
    captain: 'John Smith',
    playerCount: 12,
  },
  {
    id: 'team-2',
    name: 'Lightning Bolts',
    league: 'premier',
    division: 'b',
    ageGroup: 'u14',
    wins: 10,
    losses: 5,
    points: 30,
    captain: 'Sarah Johnson',
    playerCount: 10,
  },
  {
    id: 'team-3',
    name: 'Fire Dragons',
    league: 'championship',
    division: 'a',
    ageGroup: 'u18',
    wins: 15,
    losses: 2,
    points: 45,
    captain: 'Mike Chen',
    playerCount: 15,
  },
  {
    id: 'team-4',
    name: 'Ice Warriors',
    league: 'recreational',
    division: 'c',
    ageGroup: 'u12',
    wins: 8,
    losses: 7,
    points: 24,
    captain: 'Emily Davis',
    playerCount: 11,
  },
]

export default function TeamsPage() {
  const { filters } = usePortalFilters()
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filter teams based on active filters
  useEffect(() => {
    setIsLoading(true)
    
    // Simulate API call with filtering
    setTimeout(() => {
      let filteredTeams = [...mockTeams]
      
      // Apply search query
      if (filters.query) {
        const query = filters.query.toLowerCase()
        filteredTeams = filteredTeams.filter(team => 
          team.name.toLowerCase().includes(query) ||
          team.captain.toLowerCase().includes(query)
        )
      }
      
      // Apply league filter
      if (filters.league) {
        filteredTeams = filteredTeams.filter(team => team.league === filters.league)
      }
      
      // Apply division filter
      if (filters.division) {
        filteredTeams = filteredTeams.filter(team => team.division === filters.division)
      }
      
      // Apply age group filter
      if (filters.ageGroup) {
        filteredTeams = filteredTeams.filter(team => team.ageGroup === filters.ageGroup)
      }
      
      // Apply sorting
      if (filters.sortBy) {
        filteredTeams.sort((a, b) => {
          let compareValue = 0
          
          switch (filters.sortBy) {
            case 'name':
              compareValue = a.name.localeCompare(b.name)
              break
            case 'points':
              compareValue = b.points - a.points
              break
            case 'wins':
              compareValue = b.wins - a.wins
              break
            default:
              compareValue = 0
          }
          
          return filters.sortOrder === 'desc' ? -compareValue : compareValue
        })
      }
      
      setTeams(filteredTeams)
      setIsLoading(false)
    }, 500)
  }, [filters])
  
  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses
    if (total === 0) return '0%'
    return `${Math.round((wins / total) * 100)}%`
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Teams</h1>
        <p className="text-muted-foreground mb-6">
          Browse all teams competing in our leagues
        </p>
        
        {/* Search Bar */}
        <div className="max-w-2xl mb-6">
          <SearchBar placeholder="Search teams or captains..." />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Filters showSort={true} />
        </div>
        
        {/* Teams Grid */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-muted-foreground">Loading teams...</p>
              </div>
            </div>
          ) : teams.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">No teams found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search query
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/portal/teams'}
              >
                Clear filters
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => (
                <Card key={team.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">{team.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Captain: {team.captain}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{team.points}</div>
                      <div className="text-sm text-muted-foreground">points</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">
                      {team.league === 'premier' ? 'Premier' : 
                       team.league === 'championship' ? 'Championship' : 
                       'Recreational'}
                    </Badge>
                    <Badge variant="outline">Division {team.division.toUpperCase()}</Badge>
                    <Badge variant="outline">
                      {team.ageGroup === 'u10' ? 'Under 10' :
                       team.ageGroup === 'u12' ? 'Under 12' :
                       team.ageGroup === 'u14' ? 'Under 14' :
                       team.ageGroup === 'u16' ? 'Under 16' :
                       team.ageGroup === 'u18' ? 'Under 18' :
                       'Open'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div>
                      <div className="text-lg font-semibold">{team.wins}</div>
                      <div className="text-sm text-muted-foreground">Wins</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{team.losses}</div>
                      <div className="text-sm text-muted-foreground">Losses</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{getWinRate(team.wins, team.losses)}</div>
                      <div className="text-sm text-muted-foreground">Win Rate</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {team.playerCount} players
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/portal/teams/${team.id}`}>View Details</a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          {/* Pagination would go here */}
          {teams.length > 0 && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" disabled>
                Previous
              </Button>
              <div className="mx-4 flex items-center">
                <span className="text-sm text-muted-foreground">Page 1 of 1</span>
              </div>
              <Button variant="outline" disabled>
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}