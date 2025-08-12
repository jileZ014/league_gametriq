'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PlayerStats {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fouls: number;
  minutes: string;
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
}

interface ModernPlayerCardProps {
  playerNumber: string;
  playerName: string;
  position: string;
  team: string;
  stats: PlayerStats;
  imageUrl?: string;
  className?: string;
}

export function ModernPlayerCard({
  playerNumber,
  playerName,
  position,
  team,
  stats,
  imageUrl,
  className
}: ModernPlayerCardProps) {
  // NBA 2K + ESPN inspired design
  const isModernUI = typeof window !== 'undefined' && 
    (localStorage.getItem('UI_MODERN_V1') === '1' || 
     process.env.NEXT_PUBLIC_UI_MODERN_V1 === '1');

  if (!isModernUI) {
    // Legacy fallback
    return (
      <div className={cn("bg-white rounded-lg shadow p-6", className)}>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-3xl font-bold text-gray-400">#{playerNumber}</div>
          <div>
            <h3 className="font-semibold text-lg">{playerName}</h3>
            <p className="text-sm text-gray-600">{position} • {team}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-gray-500">PPG</div>
            <div className="font-semibold">{stats.points}</div>
          </div>
          <div>
            <div className="text-gray-500">RPG</div>
            <div className="font-semibold">{stats.rebounds}</div>
          </div>
          <div>
            <div className="text-gray-500">APG</div>
            <div className="font-semibold">{stats.assists}</div>
          </div>
        </div>
      </div>
    );
  }

  // Modern NBA 2K/ESPN Style
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900",
      "border border-orange-500/20 shadow-2xl",
      "transform transition-all duration-300 hover:scale-105 hover:shadow-orange-500/30",
      className
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9IiNmZmYiIG9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')]" />
      </div>

      {/* Player Number Background */}
      <div className="absolute -top-8 -right-8 text-[200px] font-black text-white/5 select-none">
        {playerNumber}
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-orange-500 font-bold text-5xl mb-1">
              #{playerNumber}
            </div>
            <h3 className="text-white font-bold text-2xl tracking-tight">
              {playerName}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-purple-600/80 text-white text-xs font-semibold rounded-full">
                {position}
              </span>
              <span className="text-gray-400 text-sm">{team}</span>
            </div>
          </div>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={playerName}
              className="w-20 h-20 rounded-full border-2 border-orange-500/50"
            />
          )}
        </div>

        {/* Primary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-white/5 rounded-xl backdrop-blur-sm">
            <div className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Points
            </div>
            <div className="text-white text-3xl font-black">{stats.points}</div>
            <div className="text-gray-400 text-xs">per game</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl backdrop-blur-sm">
            <div className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Rebounds
            </div>
            <div className="text-white text-3xl font-black">{stats.rebounds}</div>
            <div className="text-gray-400 text-xs">per game</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl backdrop-blur-sm">
            <div className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Assists
            </div>
            <div className="text-white text-3xl font-black">{stats.assists}</div>
            <div className="text-gray-400 text-xs">per game</div>
          </div>
        </div>

        {/* Shooting Stats */}
        <div className="bg-black/30 rounded-xl p-4 mb-4">
          <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Shooting
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">FG%</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                    style={{ width: `${stats.fieldGoalPercentage}%` }}
                  />
                </div>
                <span className="text-white font-semibold text-sm w-12 text-right">
                  {stats.fieldGoalPercentage}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">3P%</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                    style={{ width: `${stats.threePointPercentage}%` }}
                  />
                </div>
                <span className="text-white font-semibold text-sm w-12 text-right">
                  {stats.threePointPercentage}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">FT%</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                    style={{ width: `${stats.freeThrowPercentage}%` }}
                  />
                </div>
                <span className="text-white font-semibold text-sm w-12 text-right">
                  {stats.freeThrowPercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <div className="text-gray-500 text-xs">STL</div>
            <div className="text-white font-bold">{stats.steals}</div>
          </div>
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <div className="text-gray-500 text-xs">BLK</div>
            <div className="text-white font-bold">{stats.blocks}</div>
          </div>
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <div className="text-gray-500 text-xs">PF</div>
            <div className="text-white font-bold">{stats.fouls}</div>
          </div>
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <div className="text-gray-500 text-xs">MIN</div>
            <div className="text-white font-bold">{stats.minutes}</div>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600/90 rounded-full animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            <span className="text-white text-xs font-semibold">LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}