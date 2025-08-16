'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, hasPermission } from '@/lib/auth'
import { supabase, Game } from '@/lib/supabase'
import { offlineQueue, isOnline } from '@/lib/offline'
import LiveScore from '@/components/LiveScore'
import { AlertCircle } from 'lucide-react'

export default function ScoreGamesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }

      const role = currentUser.user_metadata?.role || 'spectator'
      if (!hasPermission(role, 'games:write')) {
        router.push('/dashboard')
        return
      }

      setUser(currentUser)
      
      // Load today's games
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('games')
        .select('*')
        .gte('scheduled_at', today)
        .lte('scheduled_at', today + 'T23:59:59')
        .order('scheduled_at', { ascending: true })

      if (data) {
        setGames(data)
      }
      setLoading(false)
    }

    checkAccess()
  }, [router])

  const handleScoreUpdate = async (homeScore: number, awayScore: number) => {
    if (!selectedGame) return

    const updateData = {
      home_score: homeScore,
      away_score: awayScore,
      status: 'in_progress' as const
    }

    if (isOnline()) {
      // Online - update directly
      await supabase
        .from('games')
        .update(updateData)
        .eq('id', selectedGame.id)
    } else {
      // Offline - queue update
      await offlineQueue.addToQueue('UPDATE', 'games', {
        id: selectedGame.id,
        updates: updateData
      })
    }
  }

  const startScoring = async (game: Game) => {
    setSelectedGame(game)
    
    // Update game status to live
    if (isOnline()) {
      await supabase
        .from('games')
        .update({ status: 'in_progress' })
        .eq('id', game.id)
    } else {
      await offlineQueue.addToQueue('UPDATE', 'games', {
        id: game.id,
        updates: { status: 'in_progress' }
      })
    }
  }

  const endGame = async () => {
    if (!selectedGame) return

    if (isOnline()) {
      await supabase
        .from('games')
        .update({ status: 'completed' })
        .eq('id', selectedGame.id)
    } else {
      await offlineQueue.addToQueue('UPDATE', 'games', {
        id: selectedGame.id,
        updates: { status: 'completed' }
      })
    }

    setSelectedGame(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Score Games</h1>
          <p className="text-text-secondary">Select a game to start scoring</p>
        </div>

        {!isOnline() && (
          <div className="bg-warning/20 text-warning p-4 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>You're offline. Scores will sync when connection is restored.</span>
          </div>
        )}

        {selectedGame ? (
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Scoring: {selectedGame.venue}</h2>
              <button onClick={endGame} className="btn-secondary">
                End Game
              </button>
            </div>
            <LiveScore 
              game={selectedGame} 
              isScorekeeper={true}
              onScoreUpdate={handleScoreUpdate}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <div key={game.id} className="card p-4">
                <div className="mb-4">
                  <p className="text-sm text-text-secondary">
                    {new Date(game.scheduled_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  <p className="font-semibold">{game.venue}</p>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    game.status === 'in_progress' ? 'bg-live bg-opacity-20 text-live' : 
                    game.status === 'completed' ? 'bg-success bg-opacity-20 text-success' : 
                    'bg-bg-secondary text-text-secondary'
                  }`}>
                    {game.status.toUpperCase()}
                  </span>
                </div>

                {game.status === 'scheduled' && (
                  <button 
                    onClick={() => startScoring(game)}
                    className="btn-primary w-full"
                  >
                    Start Scoring
                  </button>
                )}
                {game.status === 'in_progress' && (
                  <button 
                    onClick={() => setSelectedGame(game)}
                    className="btn-secondary w-full"
                  >
                    Continue Scoring
                  </button>
                )}
                {game.status === 'completed' && (
                  <div className="text-center text-text-secondary">
                    Final: {game.home_score} - {game.away_score}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}