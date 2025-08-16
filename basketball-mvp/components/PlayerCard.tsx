'use client'

import { Player, PlayerStats } from '@/lib/supabase'

interface PlayerCardProps {
  player: Player & { stats?: PlayerStats }
  rank: number
}

export default function PlayerCard({ player, rank }: PlayerCardProps) {
  const stats = player.stats || {
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    field_goal_percentage: 0,
    three_point_percentage: 0,
    free_throw_percentage: 0,
  }

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-4xl font-bold text-primary">#{rank}</div>
          <h3 className="text-xl font-bold mt-2">{player.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-text-secondary text-sm">#{player.jersey_number}</span>
            <span className="text-text-secondary text-sm">•</span>
            <span className="text-text-secondary text-sm">{player.position}</span>
            {player.verified && (
              <>
                <span className="text-text-secondary text-sm">•</span>
                <span className="text-success text-sm">✓ Verified</span>
              </>
            )}
          </div>
        </div>
        {rank === 1 && (
          <div className="bg-live text-white text-xs px-2 py-1 rounded">
            LIVE
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-text-secondary text-xs uppercase mb-1">Points</div>
          <div className="text-2xl font-bold">{stats.points}</div>
          <div className="text-text-secondary text-xs">per game</div>
        </div>
        <div className="text-center">
          <div className="text-text-secondary text-xs uppercase mb-1">Rebounds</div>
          <div className="text-2xl font-bold">{stats.rebounds}</div>
          <div className="text-text-secondary text-xs">per game</div>
        </div>
        <div className="text-center">
          <div className="text-text-secondary text-xs uppercase mb-1">Assists</div>
          <div className="text-2xl font-bold">{stats.assists}</div>
          <div className="text-text-secondary text-xs">per game</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-text-secondary">SHOOTING</div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-secondary">FG%</span>
              <span>{(stats.field_goal_percentage * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${stats.field_goal_percentage * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-secondary">3P%</span>
              <span>{(stats.three_point_percentage * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${stats.three_point_percentage * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-secondary">FT%</span>
              <span>{(stats.free_throw_percentage * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full"
                style={{ width: `${stats.free_throw_percentage * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}