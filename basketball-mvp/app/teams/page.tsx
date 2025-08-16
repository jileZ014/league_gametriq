'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Users, Search, Plus, Trophy, Target } from 'lucide-react'
import Link from 'next/link'

// Mock data for teams
const MOCK_TEAMS = [
  {
    id: '1',
    name: 'Phoenix Suns Youth',
    wins: 12,
    losses: 3,
    points_for: 892,
    points_against: 721,
    division_name: 'U12 Division',
    coach: { full_name: 'Mike Johnson' },
    player_count: 12
  },
  {
    id: '2',
    name: 'Desert Eagles',
    wins: 10,
    losses: 5,
    points_for: 823,
    points_against: 756,
    division_name: 'U12 Division',
    coach: { full_name: 'Sarah Williams' },
    player_count: 11
  },
  {
    id: '3',
    name: 'Scottsdale Storm',
    wins: 8,
    losses: 7,
    points_for: 745,
    points_against: 768,
    division_name: 'U12 Division',
    coach: { full_name: 'David Chen' },
    player_count: 10
  },
  {
    id: '4',
    name: 'Tempe Thunder',
    wins: 14,
    losses: 2,
    points_for: 1023,
    points_against: 821,
    division_name: 'U14 Division',
    coach: { full_name: 'Robert Garcia' },
    player_count: 13
  },
  {
    id: '5',
    name: 'Mesa Mavericks',
    wins: 11,
    losses: 5,
    points_for: 967,
    points_against: 892,
    division_name: 'U14 Division',
    coach: { full_name: 'Emily Davis' },
    player_count: 12
  },
  {
    id: '6',
    name: 'Chandler Champions',
    wins: 9,
    losses: 7,
    points_for: 834,
    points_against: 856,
    division_name: 'U14 Division',
    coach: { full_name: 'James Wilson' },
    player_count: 11
  }
]

interface Team {
  id: string
  name: string
  wins: number
  losses: number
  points_for: number
  points_against: number
  division_name?: string
  coach?: {
    full_name: string
  }
  player_count?: number
}

export default function TeamsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }
        setUser(currentUser)
        
        // Use mock data instead of database query
        setTeams(MOCK_TEAMS)
      } catch (error) {
        console.error('Error loading data:', error)
        // Still show mock data even if there's an error
        setTeams(MOCK_TEAMS)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.division_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedTeams = filteredTeams.reduce((acc, team) => {
    const division = team.division_name || 'Unknown Division'
    if (!acc[division]) {
      acc[division] = []
    }
    acc[division].push(team)
    return acc
  }, {} as Record<string, Team[]>)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading teams...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Teams</h1>
            <p className="text-text-secondary">
              League standings and team information
            </p>
          </div>
          
          <div className="flex gap-3">
            {user?.role === 'admin' && (
              <Link href="/teams/create" className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Team
              </Link>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="card p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <input
              type="text"
              placeholder="Search teams or divisions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full md:w-96"
            />
          </div>
        </div>

        {/* Teams by Division */}
        <div className="space-y-8">
          {Object.entries(groupedTeams).map(([division, divisionTeams]) => (
            <div key={division} className="card">
              <div className="p-6 border-b border-border-card">
                <h2 className="text-xl font-semibold">{division}</h2>
                <p className="text-text-secondary text-sm">{divisionTeams.length} teams</p>
              </div>

              <div className="overflow-x-auto">
                <table className="table-dark">
                  <thead>
                    <tr>
                      <th className="text-left">Rank</th>
                      <th className="text-left">Team</th>
                      <th className="text-left">Coach</th>
                      <th className="text-center">W</th>
                      <th className="text-center">L</th>
                      <th className="text-center">Win %</th>
                      <th className="text-center">PF</th>
                      <th className="text-center">PA</th>
                      <th className="text-center">Diff</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisionTeams
                      .sort((a, b) => {
                        // Sort by win percentage
                        const aWinPct = a.wins / (a.wins + a.losses || 1)
                        const bWinPct = b.wins / (b.wins + b.losses || 1)
                        return bWinPct - aWinPct
                      })
                      .map((team, index) => {
                        const winPercentage = team.wins + team.losses > 0 
                          ? (team.wins / (team.wins + team.losses) * 100).toFixed(1)
                          : '0.0'
                        const pointDiff = team.points_for - team.points_against

                        return (
                          <tr key={team.id}>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-primary">
                                  #{index + 1}
                                </span>
                                {index === 0 && (
                                  <Trophy className="w-4 h-4 text-accent" />
                                )}
                              </div>
                            </td>
                            <td>
                              <Link 
                                href={`/teams/${team.id}`}
                                className="font-medium hover:text-primary transition-colors"
                              >
                                {team.name}
                              </Link>
                            </td>
                            <td className="text-text-secondary">
                              {team.coach?.full_name || 'No coach assigned'}
                            </td>
                            <td className="text-center font-mono">
                              <span className="text-success">{team.wins}</span>
                            </td>
                            <td className="text-center font-mono">
                              <span className="text-live">{team.losses}</span>
                            </td>
                            <td className="text-center font-mono">
                              {winPercentage}%
                            </td>
                            <td className="text-center font-mono">
                              {team.points_for}
                            </td>
                            <td className="text-center font-mono">
                              {team.points_against}
                            </td>
                            <td className="text-center font-mono">
                              <span className={pointDiff >= 0 ? 'text-success' : 'text-live'}>
                                {pointDiff > 0 ? '+' : ''}{pointDiff}
                              </span>
                            </td>
                            <td className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link
                                  href={`/teams/${team.id}`}
                                  className="text-text-secondary hover:text-primary transition-colors"
                                >
                                  <Users className="w-4 h-4" />
                                </Link>
                                <Link
                                  href={`/teams/${team.id}/stats`}
                                  className="text-text-secondary hover:text-accent transition-colors"
                                >
                                  <Target className="w-4 h-4" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {filteredTeams.length === 0 && (
          <div className="card p-12 text-center">
            <Users className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No teams found</h3>
            <p className="text-text-secondary">
              {searchTerm 
                ? `No teams match "${searchTerm}"`
                : 'No teams are registered yet'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}