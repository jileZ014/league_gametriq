'use client'

import { Game } from '@/lib/supabase'

interface ScoreCardProps {
  game: Game & {
    home_team?: { name: string }
    away_team?: { name: string }
  }
}

export default function ScoreCard({ game }: ScoreCardProps) {
  const isLive = game.status === 'live'
  
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-text-secondary text-sm">
          {game.status === 'scheduled' && 'UPCOMING'}
          {game.status === 'completed' && 'FINAL'}
        </div>
        {isLive && (
          <div className="live-indicator">
            <span className="w-2 h-2 bg-live rounded-full animate-pulse"></span>
            <span>LIVE</span>
          </div>
        )}
        <div className="text-text-secondary text-sm">
          {isLive && `Q${game.quarter} - ${game.time_remaining}`}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-text-secondary text-sm mb-1">HOME</div>
          <div className="text-2xl font-bold mb-2">
            {game.home_team?.name || 'TBD'}
          </div>
          <div className="text-5xl font-bold text-primary">
            {game.home_score || 0}
          </div>
        </div>

        <div className="text-4xl font-bold text-text-muted mx-8">VS</div>

        <div className="flex-1 text-right">
          <div className="text-text-secondary text-sm mb-1">AWAY</div>
          <div className="text-2xl font-bold mb-2">
            {game.away_team?.name || 'TBD'}
          </div>
          <div className="text-5xl font-bold">
            {game.away_score || 0}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border-card">
        <div className="flex items-center justify-between text-sm">
          <div className="text-text-secondary">
            <span className="text-text-primary font-medium">{game.venue}</span>
          </div>
          <div className="text-text-secondary">
            {new Date(game.scheduled_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}