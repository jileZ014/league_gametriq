'use client'

import { useEffect, useState } from 'react'
import { GameChannel } from '@/lib/realtime'
import { Game } from '@/lib/supabase'
import { Clock, Users } from 'lucide-react'

interface LiveScoreProps {
  game: Game
  isScorekeeper?: boolean
  onScoreUpdate?: (homeScore: number, awayScore: number) => void
}

export default function LiveScore({ game, isScorekeeper = false, onScoreUpdate }: LiveScoreProps) {
  const [homeScore, setHomeScore] = useState(game.home_score || 0)
  const [awayScore, setAwayScore] = useState(game.away_score || 0)
  const [quarter, setQuarter] = useState(game.quarter || 1)
  const [timeRemaining, setTimeRemaining] = useState(game.time_remaining || '10:00')
  const [channel, setChannel] = useState<GameChannel | null>(null)

  useEffect(() => {
    const gameChannel = new GameChannel(game.id)
    gameChannel.subscribe((payload) => {
      if (payload.event === 'score_update') {
        setHomeScore(payload.payload.homeScore)
        setAwayScore(payload.payload.awayScore)
        setQuarter(payload.payload.quarter)
        setTimeRemaining(payload.payload.timeRemaining)
      }
    })
    setChannel(gameChannel)

    return () => {
      gameChannel.unsubscribe()
    }
  }, [game.id])

  const updateScore = async (team: 'home' | 'away', points: number) => {
    if (!isScorekeeper) return

    const newHomeScore = team === 'home' ? homeScore + points : homeScore
    const newAwayScore = team === 'away' ? awayScore + points : awayScore

    // Optimistic update
    setHomeScore(newHomeScore)
    setAwayScore(newAwayScore)

    // Broadcast update
    await channel?.broadcastScore(newHomeScore, newAwayScore, quarter, timeRemaining)
    
    if (onScoreUpdate) {
      onScoreUpdate(newHomeScore, newAwayScore)
    }
  }

  return (
    <div className="card p-6">
      {game.status === 'live' && (
        <div className="flex justify-center mb-4">
          <span className="badge-live">LIVE</span>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Home Team */}
        <div className="text-center">
          <h3 className="text-text-secondary text-sm mb-2">HOME</h3>
          <p className="text-2xl font-bold mb-2">{homeScore}</p>
          {isScorekeeper && (
            <div className="flex gap-1 justify-center">
              <button onClick={() => updateScore('home', 1)} className="btn-primary text-xs px-2 py-1">+1</button>
              <button onClick={() => updateScore('home', 2)} className="btn-primary text-xs px-2 py-1">+2</button>
              <button onClick={() => updateScore('home', 3)} className="btn-primary text-xs px-2 py-1">+3</button>
            </div>
          )}
        </div>

        {/* Game Info */}
        <div className="text-center">
          <div className="mb-2">
            <p className="text-text-secondary text-xs">Q{quarter}</p>
            <p className="text-xl font-mono">{timeRemaining}</p>
          </div>
        </div>

        {/* Away Team */}
        <div className="text-center">
          <h3 className="text-text-secondary text-sm mb-2">AWAY</h3>
          <p className="text-2xl font-bold mb-2">{awayScore}</p>
          {isScorekeeper && (
            <div className="flex gap-1 justify-center">
              <button onClick={() => updateScore('away', 1)} className="btn-primary text-xs px-2 py-1">+1</button>
              <button onClick={() => updateScore('away', 2)} className="btn-primary text-xs px-2 py-1">+2</button>
              <button onClick={() => updateScore('away', 3)} className="btn-primary text-xs px-2 py-1">+3</button>
            </div>
          )}
        </div>
      </div>

      {isScorekeeper && (
        <div className="flex gap-2 justify-center">
          <button onClick={() => setQuarter(Math.min(4, quarter + 1))} className="btn-secondary text-sm">
            Next Quarter
          </button>
        </div>
      )}
    </div>
  )
}