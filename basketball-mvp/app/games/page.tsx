'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Calendar, Clock, MapPin, Users, Play, Square } from 'lucide-react'
import Link from 'next/link'

// Mock games data
const MOCK_GAMES = [
  {
    id: '1',
    home_team_name: 'Phoenix Suns Youth',
    away_team_name: 'Desert Eagles',
    home_score: 45,
    away_score: 42,
    scheduled_at: new Date().toISOString(),
    status: 'in_progress' as const,
    current_period: 3,
    current_period_time_remaining: 425,
    venue: 'Phoenix Sports Complex',
    division_name: 'U12 Division'
  },
  {
    id: '2',
    home_team_name: 'Tempe Thunder',
    away_team_name: 'Mesa Mavericks',
    home_score: 0,
    away_score: 0,
    scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled' as const,
    current_period: 0,
    venue: 'Tempe Arena',
    division_name: 'U14 Division'
  },
  {
    id: '3',
    home_team_name: 'Scottsdale Storm',
    away_team_name: 'Chandler Champions',
    home_score: 67,
    away_score: 61,
    scheduled_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'completed' as const,
    current_period: 4,
    venue: 'Scottsdale Gym',
    division_name: 'U14 Division'
  },
  {
    id: '4',
    home_team_name: 'Gilbert Grizzlies',
    away_team_name: 'Peoria Panthers',
    home_score: 38,
    away_score: 35,
    scheduled_at: new Date().toISOString(),
    status: 'in_progress' as const,
    current_period: 2,
    current_period_time_remaining: 180,
    venue: 'Gilbert Recreation Center',
    division_name: 'U12 Division'
  },
  {
    id: '5',
    home_team_name: 'Glendale Giants',
    away_team_name: 'Surprise Storm',
    home_score: 0,
    away_score: 0,
    scheduled_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled' as const,
    current_period: 0,
    venue: 'Glendale Sports Center',
    division_name: 'U16 Division'
  }
]

interface Game {
  id: string
  home_team_name: string
  away_team_name: string
  home_score: number
  away_score: number
  scheduled_at: string
  status: 'scheduled' | 'in_progress' | 'completed'
  current_period: number
  current_period_time_remaining?: number
  venue: string
  division_name: string
}

export default function GamesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filter, setFilter] = useState<'all' | 'live' | 'scheduled' | 'completed'>('all')

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }
        setUser(currentUser)
        
        // Use mock data
        setGames(MOCK_GAMES)
      } catch (error) {
        console.error('Error loading data:', error)
        // Still show mock data even if there's an error
        setGames(MOCK_GAMES)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, selectedDate])

  const filteredGames = games.filter(game => {
    if (filter === 'all') return true
    if (filter === 'live') return game.status === 'in_progress'
    return game.status === filter
  })

  const gamesByStatus = {
    live: games.filter(g => g.status === 'in_progress'),
    scheduled: games.filter(g => g.status === 'scheduled'),
    completed: games.filter(g => g.status === 'completed')
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Play className="w-4 h-4 text-live" />
      case 'scheduled':
        return <Clock className="w-4 h-4 text-accent" />
      case 'completed':
        return <Square className="w-4 h-4 text-success" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-live bg-opacity-20 text-live'
      case 'scheduled':
        return 'bg-accent bg-opacity-20 text-accent'
      case 'completed':
        return 'bg-success bg-opacity-20 text-success'
      default:
        return 'bg-text-secondary bg-opacity-20 text-text-secondary'
    }
  }

  const canScore = (game: Game) => {
    const userRole = user?.role
    return userRole === 'scorekeeper' || userRole === 'admin'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading games...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Games</h1>
            <p className="text-text-secondary">
              Schedule and live game tracking
            </p>
          </div>
          
          {gamesByStatus.live.length > 0 && (
            <Link
              href="/games/live"
              className="btn-primary animate-pulse"
            >
              <Play className="w-4 h-4 mr-2" />
              {gamesByStatus.live.length} Live Games
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex gap-2">
              <Calendar className="w-5 h-5 text-text-secondary mt-0.5" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input"
              />
            </div>

            <div className="flex gap-2">
              {(['all', 'live', 'scheduled', 'completed'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-primary text-white'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status === 'live' && gamesByStatus.live.length > 0 && (
                    <span className="ml-1 bg-live text-white text-xs px-1.5 py-0.5 rounded-full">
                      {gamesByStatus.live.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Games List */}
        <div className="space-y-4">
          {filteredGames.map((game) => (
            <div key={game.id} className="card">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Game Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(game.status)}`}>
                        {getStatusIcon(game.status)}
                        {game.status === 'in_progress' ? 'LIVE' : game.status.toUpperCase()}
                      </span>
                      <span className="text-text-secondary text-sm">{game.division_name}</span>
                      <div className="flex items-center gap-1 text-text-secondary text-sm">
                        <MapPin className="w-3 h-3" />
                        {game.venue}
                      </div>
                    </div>

                    {/* Teams and Score */}
                    <div className="grid grid-cols-3 gap-4 items-center">
                      {/* Home Team */}
                      <div className="text-center">
                        <div className="font-bold text-lg mb-1">{game.home_team_name}</div>
                        {(game.status === 'in_progress' || game.status === 'completed') && (
                          <div className="text-3xl font-bold text-primary">{game.home_score}</div>
                        )}
                      </div>

                      {/* VS / Score */}
                      <div className="text-center">
                        {game.status === 'scheduled' ? (
                          <div>
                            <div className="text-text-secondary text-sm mb-1">
                              {formatTime(game.scheduled_at)}
                            </div>
                            <div className="text-2xl font-bold text-text-secondary">VS</div>
                          </div>
                        ) : (
                          <div>
                            {game.status === 'in_progress' && (
                              <div className="text-text-secondary text-sm mb-1">
                                Q{game.current_period}
                                {game.current_period_time_remaining && (
                                  <span className="ml-1">
                                    {Math.floor(game.current_period_time_remaining / 60)}:
                                    {String(game.current_period_time_remaining % 60).padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="text-2xl font-bold">
                              {game.home_score} - {game.away_score}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="text-center">
                        <div className="font-bold text-lg mb-1">{game.away_team_name}</div>
                        {(game.status === 'in_progress' || game.status === 'completed') && (
                          <div className="text-3xl font-bold text-primary">{game.away_score}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {game.status === 'in_progress' && (
                      <Link
                        href={`/games/live/${game.id}`}
                        className="btn-primary"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Watch Live
                      </Link>
                    )}
                    
                    {canScore(game) && game.status !== 'completed' && (
                      <Link
                        href={`/games/score/${game.id}`}
                        className="btn-secondary"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        {game.status === 'scheduled' ? 'Start Game' : 'Score'}
                      </Link>
                    )}

                    <Link
                      href={`/games/${game.id}`}
                      className="text-text-secondary hover:text-primary transition-colors p-2"
                    >
                      <Calendar className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredGames.length === 0 && (
          <div className="card p-12 text-center">
            <Calendar className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No games found</h3>
            <p className="text-text-secondary">
              No games scheduled for {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}