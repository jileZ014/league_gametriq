'use client'

import { Filters } from '@/components/portal/Filters'
import { usePortalFilters } from '@/hooks/usePortalFilters'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'

interface TeamStanding {
  id: string
  position: number
  name: string
  league: string
  division: string
  ageGroup: string
  gamesPlayed: number
  wins: number
  losses: number
  draws: number
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

// Mock standings data
const mockStandings: TeamStanding[] = [
  {
    id: 'team-1',
    position: 1,
    name: 'Thunder Hawks',
    league: 'premier',
    division: 'a',
    ageGroup: 'u16',
    gamesPlayed: 15,
    wins: 12,
    losses: 3,
    draws: 0,
    points: 36,
    goalsFor: 45,
    goalsAgainst: 15,
    goalDifference: 30,
  },
  {
    id: 'team-3',
    position: 2,
    name: 'Fire Dragons',
    league: 'premier',
    division: 'a',
    ageGroup: 'u16',
    gamesPlayed: 15,
    wins: 11,
    losses: 3,
    draws: 1,
    points: 34,
    goalsFor: 38,
    goalsAgainst: 18,
    goalDifference: 20,
  },
  {
    id: 'team-2',
    position: 3,
    name: 'Lightning Bolts',
    league: 'premier',
    division: 'a',
    ageGroup: 'u16',
    gamesPlayed: 15,
    wins: 10,
    losses: 5,
    draws: 0,
    points: 30,
    goalsFor: 35,
    goalsAgainst: 25,
    goalDifference: 10,
  },
]

export default function StandingsPage() {
  const { filters } = usePortalFilters()
  const [standings, setStandings] = useState<TeamStanding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filter standings based on active filters
  useEffect(() => {
    setIsLoading(true)
    
    // Simulate API call with filtering
    setTimeout(() => {
      let filteredStandings = [...mockStandings]
      
      // Apply league filter
      if (filters.league) {
        filteredStandings = filteredStandings.filter(team => team.league === filters.league)
      }
      
      // Apply division filter
      if (filters.division) {
        filteredStandings = filteredStandings.filter(team => team.division === filters.division)
      }
      
      // Apply age group filter
      if (filters.ageGroup) {
        filteredStandings = filteredStandings.filter(team => team.ageGroup === filters.ageGroup)
      }
      
      // Sort by position
      filteredStandings.sort((a, b) => a.position - b.position)
      
      setStandings(filteredStandings)
      setIsLoading(false)
    }, 500)
  }, [filters])
  
  const getPositionBadge = (position: number) => {
    if (position === 1) return <Badge className="bg-yellow-500">1st</Badge>
    if (position === 2) return <Badge className="bg-gray-400">2nd</Badge>
    if (position === 3) return <Badge className="bg-orange-600">3rd</Badge>
    return <span className="font-semibold">{position}</span>
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Standings</h1>
        <p className="text-muted-foreground">
          Current league standings and team rankings
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Filters showSort={false} />
        </div>
        
        {/* Standings Table */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-muted-foreground">Loading standings...</p>
              </div>
            </div>
          ) : standings.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">No standings found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Pos</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Team</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">P</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">W</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">D</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">L</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">GF</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">GA</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">GD</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {standings.map((team) => (
                      <tr key={team.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-4">
                          {getPositionBadge(team.position)}
                        </td>
                        <td className="px-4 py-4">
                          <a href={`/portal/teams/${team.id}`} className="font-medium hover:text-primary">
                            {team.name}
                          </a>
                        </td>
                        <td className="px-4 py-4 text-center">{team.gamesPlayed}</td>
                        <td className="px-4 py-4 text-center text-green-600 font-medium">{team.wins}</td>
                        <td className="px-4 py-4 text-center text-gray-600">{team.draws}</td>
                        <td className="px-4 py-4 text-center text-red-600">{team.losses}</td>
                        <td className="px-4 py-4 text-center">{team.goalsFor}</td>
                        <td className="px-4 py-4 text-center">{team.goalsAgainst}</td>
                        <td className="px-4 py-4 text-center font-medium">
                          <span className={team.goalDifference > 0 ? 'text-green-600' : team.goalDifference < 0 ? 'text-red-600' : ''}>
                            {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-lg font-bold">{team.points}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {standings.map((team) => (
                  <div key={team.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getPositionBadge(team.position)}
                        <a href={`/portal/teams/${team.id}`} className="font-medium text-lg">
                          {team.name}
                        </a>
                      </div>
                      <div className="text-2xl font-bold">{team.points}</div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div>
                        <div className="text-muted-foreground">P</div>
                        <div className="font-medium">{team.gamesPlayed}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">W</div>
                        <div className="font-medium text-green-600">{team.wins}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">D</div>
                        <div className="font-medium">{team.draws}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">L</div>
                        <div className="font-medium text-red-600">{team.losses}</div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <div className="text-muted-foreground">GF</div>
                        <div className="font-medium">{team.goalsFor}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">GA</div>
                        <div className="font-medium">{team.goalsAgainst}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">GD</div>
                        <div className={`font-medium ${team.goalDifference > 0 ? 'text-green-600' : team.goalDifference < 0 ? 'text-red-600' : ''}`}>
                          {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
          {/* Legend */}
          {standings.length > 0 && (
            <div className="mt-6 text-sm text-muted-foreground">
              <div className="flex flex-wrap gap-4">
                <div><span className="font-medium">P:</span> Played</div>
                <div><span className="font-medium">W:</span> Won</div>
                <div><span className="font-medium">D:</span> Drawn</div>
                <div><span className="font-medium">L:</span> Lost</div>
                <div><span className="font-medium">GF:</span> Goals For</div>
                <div><span className="font-medium">GA:</span> Goals Against</div>
                <div><span className="font-medium">GD:</span> Goal Difference</div>
                <div><span className="font-medium">Pts:</span> Points</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}