'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Trophy, Target, Users, TrendingUp, Search, Filter } from 'lucide-react'

interface PlayerStats {
  player_id: string
  player_name: string
  team_name: string
  games_played: number
  ppg: number
  rpg: number
  apg: number
  fg_percentage: number
  total_points: number
  total_rebounds: number
  total_assists: number
}

export default function StatsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'ppg' | 'rpg' | 'apg' | 'fg_percentage'>('ppg')
  const [filterTeam, setFilterTeam] = useState('')

  useEffect(() => {
    const loadStats = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      // Load player stats
      const { data: statsData, error } = await supabase
        .from('v_player_season_stats')
        .select('*')
        .gte('games_played', 1)
        .order(sortBy, { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error loading stats:', error)
      } else {
        setPlayerStats(statsData || [])
      }

      setLoading(false)
    }

    loadStats()
  }, [router, sortBy])

  const filteredStats = playerStats.filter(player => {
    const matchesSearch = player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.team_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTeam = !filterTeam || player.team_name === filterTeam
    return matchesSearch && matchesTeam
  })

  const topPerformers = {
    scoring: playerStats[0],
    rebounds: [...playerStats].sort((a, b) => b.rpg - a.rpg)[0],
    assists: [...playerStats].sort((a, b) => b.apg - a.apg)[0],
    shooting: [...playerStats].sort((a, b) => b.fg_percentage - a.fg_percentage)[0]
  }

  const teams = Array.from(new Set(playerStats.map(p => p.team_name))).sort()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading statistics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Statistics</h1>
          <p className="text-text-secondary">
            Player and team performance statistics
          </p>
        </div>

        {/* League Leaders */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-text-secondary">Scoring Leader</span>
            </div>
            {topPerformers.scoring && (
              <div>
                <p className="font-semibold">{topPerformers.scoring.player_name}</p>
                <p className="text-text-secondary text-sm">{topPerformers.scoring.team_name}</p>
                <p className="text-2xl font-bold text-primary">{topPerformers.scoring.ppg} PPG</p>
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-text-secondary">Rebounding Leader</span>
            </div>
            {topPerformers.rebounds && (
              <div>
                <p className="font-semibold">{topPerformers.rebounds.player_name}</p>
                <p className="text-text-secondary text-sm">{topPerformers.rebounds.team_name}</p>
                <p className="text-2xl font-bold text-accent">{topPerformers.rebounds.rpg} RPG</p>
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-text-secondary">Assists Leader</span>
            </div>
            {topPerformers.assists && (
              <div>
                <p className="font-semibold">{topPerformers.assists.player_name}</p>
                <p className="text-text-secondary text-sm">{topPerformers.assists.team_name}</p>
                <p className="text-2xl font-bold text-success">{topPerformers.assists.apg} APG</p>
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-warning" />
              <span className="text-sm font-medium text-text-secondary">Shooting Leader</span>
            </div>
            {topPerformers.shooting && (
              <div>
                <p className="font-semibold">{topPerformers.shooting.player_name}</p>
                <p className="text-text-secondary text-sm">{topPerformers.shooting.team_name}</p>
                <p className="text-2xl font-bold text-warning">{topPerformers.shooting.fg_percentage}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
              <input
                type="text"
                placeholder="Search players or teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="select"
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="select"
              >
                <option value="ppg">Points Per Game</option>
                <option value="rpg">Rebounds Per Game</option>
                <option value="apg">Assists Per Game</option>
                <option value="fg_percentage">Field Goal %</option>
              </select>
            </div>
          </div>
        </div>

        {/* Player Stats Table */}
        <div className="card">
          <div className="p-6 border-b border-border-card">
            <h2 className="text-xl font-semibold">Player Statistics</h2>
            <p className="text-text-secondary text-sm">
              {filteredStats.length} players shown
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th className="text-left">Rank</th>
                  <th className="text-left">Player</th>
                  <th className="text-left">Team</th>
                  <th className="text-center">GP</th>
                  <th className="text-center">PPG</th>
                  <th className="text-center">RPG</th>
                  <th className="text-center">APG</th>
                  <th className="text-center">FG%</th>
                  <th className="text-center">Total PTS</th>
                </tr>
              </thead>
              <tbody>
                {filteredStats.map((player, index) => (
                  <tr key={player.player_id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">
                          #{index + 1}
                        </span>
                        {index < 3 && (
                          <Trophy className={`w-4 h-4 ${
                            index === 0 ? 'text-yellow-500' : 
                            index === 1 ? 'text-gray-400' : 'text-yellow-600'
                          }`} />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium">{player.player_name}</div>
                    </td>
                    <td className="text-text-secondary">{player.team_name}</td>
                    <td className="text-center font-mono">{player.games_played}</td>
                    <td className="text-center font-mono text-primary font-bold">
                      {player.ppg}
                    </td>
                    <td className="text-center font-mono text-accent font-bold">
                      {player.rpg}
                    </td>
                    <td className="text-center font-mono text-success font-bold">
                      {player.apg}
                    </td>
                    <td className="text-center font-mono">
                      {player.fg_percentage}%
                    </td>
                    <td className="text-center font-mono">{player.total_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStats.length === 0 && (
            <div className="p-12 text-center">
              <Target className="w-12 h-12 text-text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No statistics found</h3>
              <p className="text-text-secondary">
                {searchTerm || filterTeam 
                  ? 'No players match your search criteria'
                  : 'No player statistics available yet'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}