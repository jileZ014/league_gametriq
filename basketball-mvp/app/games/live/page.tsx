'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Play, Clock, MapPin, Users } from 'lucide-react'
import Link from 'next/link'

interface LiveGame {
  id: string
  home_team_name: string
  away_team_name: string
  home_score: number
  away_score: number
  current_period: number
  current_period_time_remaining?: number
  venue: string
  division_name: string
  status: string
}

export default function LiveGamesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [liveGames, setLiveGames] = useState<LiveGame[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLiveGames = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      const { data, error } = await supabase
        .from('v_games_with_teams')
        .select('*')
        .eq('status', 'in_progress')
        .order('scheduled_at', { ascending: true })

      if (error) {
        console.error('Error loading live games:', error)
      } else {
        setLiveGames(data || [])
      }
      setLoading(false)
    }

    loadLiveGames()

    // Set up real-time subscription
    const subscription = supabase
      .channel('live-games')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: 'status=eq.in_progress'
      }, () => {
        loadLiveGames() // Reload on any game update
      })
      .subscribe()

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadLiveGames, 30000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [router])

  const canScore = (game: LiveGame) => {
    const userRole = user?.user_metadata?.role
    return userRole === 'scorekeeper' || userRole === 'admin'
  }

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading live games...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">Live Games</h1>
              <div className="badge-live">
                LIVE
              </div>
            </div>
            <p className="text-text-secondary">
              {liveGames.length} game{liveGames.length !== 1 ? 's' : ''} in progress
            </p>
          </div>
          
          <Link href="/games" className="btn-secondary">
            <Clock className="w-4 h-4 mr-2" />
            All Games
          </Link>
        </div>

        {liveGames.length === 0 ? (
          <div className="card p-12 text-center">
            <Play className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No live games</h3>
            <p className="text-text-secondary">No games are currently in progress</p>
            <p className="text-sm text-text-muted mt-2">Check back during game time!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {liveGames.map((game) => (
              <div key={game.id} className="card border-l-4 border-live">
                <div className="p-6">
                  {/* Game Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="badge-live mb-2">LIVE</div>
                      <div className="text-text-secondary text-sm">{game.division_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-text-secondary text-sm mb-1">Quarter {game.current_period}</div>
                      {game.current_period_time_remaining && (
                        <div className="font-mono text-accent font-bold">
                          {formatTimeRemaining(game.current_period_time_remaining)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score Display */}
                  <div className="grid grid-cols-3 gap-4 items-center mb-4">
                    {/* Home Team */}
                    <div className="text-center">
                      <div className="font-bold text-lg mb-2">{game.home_team_name}</div>
                      <div className="text-4xl font-bold text-primary">{game.home_score}</div>
                    </div>

                    {/* VS */}
                    <div className="text-center">
                      <div className="text-text-secondary text-sm">VS</div>
                    </div>

                    {/* Away Team */}
                    <div className="text-center">
                      <div className="font-bold text-lg mb-2">{game.away_team_name}</div>
                      <div className="text-4xl font-bold text-primary">{game.away_score}</div>
                    </div>
                  </div>

                  {/* Game Info */}
                  <div className="flex items-center gap-2 text-text-secondary text-sm mb-4">
                    <MapPin className="w-3 h-3" />
                    <span>{game.venue}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {canScore(game) && (
                      <Link
                        href={`/games/score/${game.id}`}
                        className="btn-primary flex-1"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Update Score
                      </Link>
                    )}
                    
                    <Link
                      href={`/games/${game.id}`}
                      className="btn-secondary"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}