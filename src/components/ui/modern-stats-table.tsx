'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';

interface PlayerStat {
  id: string;
  playerNumber: string;
  playerName: string;
  position: string;
  minutes: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  plusMinus: number;
}

interface ModernStatsTableProps {
  teamName: string;
  teamColor?: string;
  players: PlayerStat[];
  className?: string;
}

export function ModernStatsTable({
  teamName,
  teamColor = '#ea580c',
  players,
  className
}: ModernStatsTableProps) {
  const [sortField, setSortField] = useState<keyof PlayerStat>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const isModernUI = typeof window !== 'undefined' && 
    (localStorage.getItem('UI_MODERN_V1') === '1' || 
     process.env.NEXT_PUBLIC_UI_MODERN_V1 === '1');

  const handleSort = (field: keyof PlayerStat) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'string') {
      return aValue.localeCompare(bValue as string) * direction;
    }
    return ((aValue as number) - (bValue as number)) * direction;
  });

  if (!isModernUI) {
    // Legacy table
    return (
      <div className={cn("bg-white rounded-lg shadow overflow-hidden", className)}>
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">{teamName}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Player</th>
                <th className="px-4 py-2 text-center">MIN</th>
                <th className="px-4 py-2 text-center">PTS</th>
                <th className="px-4 py-2 text-center">REB</th>
                <th className="px-4 py-2 text-center">AST</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => (
                <tr key={player.id} className="border-t">
                  <td className="px-4 py-2">{player.playerNumber}</td>
                  <td className="px-4 py-2">{player.playerName}</td>
                  <td className="px-4 py-2 text-center">{player.minutes}</td>
                  <td className="px-4 py-2 text-center font-semibold">{player.points}</td>
                  <td className="px-4 py-2 text-center">{player.rebounds}</td>
                  <td className="px-4 py-2 text-center">{player.assists}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Modern NBA 2K/ESPN Style
  const SortIcon = ({ field }: { field: keyof PlayerStat }) => {
    if (sortField !== field) {
      return <ChevronUp className="w-3 h-3 opacity-30" />;
    }
    return sortDirection === 'desc' ? 
      <ChevronDown className="w-3 h-3 text-orange-400" /> : 
      <ChevronUp className="w-3 h-3 text-orange-400" />;
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl",
      "bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900",
      "border border-gray-700/50 shadow-2xl",
      className
    )}>
      {/* Header */}
      <div 
        className="px-6 py-4 border-b border-gray-700/50"
        style={{
          background: `linear-gradient(135deg, ${teamColor}20 0%, transparent 100%)`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-bold text-xl tracking-tight">{teamName}</h3>
            <div className="flex items-center gap-1 px-2 py-1 bg-red-600/20 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-xs font-semibold">LIVE</span>
            </div>
          </div>
          <div className="text-gray-400 text-sm">
            {players.length} Active Players
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="sticky left-0 z-10 bg-gray-900/95 backdrop-blur-sm px-4 py-3 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">#</span>
                </div>
              </th>
              <th className="sticky left-14 z-10 bg-gray-900/95 backdrop-blur-sm px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('playerName')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Player</span>
                  <SortIcon field="playerName" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort('position')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mx-auto"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Pos</span>
                  <SortIcon field="position" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort('minutes')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mx-auto"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Min</span>
                  <SortIcon field="minutes" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort('points')}
                  className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors mx-auto"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Pts</span>
                  <SortIcon field="points" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort('rebounds')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mx-auto"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Reb</span>
                  <SortIcon field="rebounds" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort('assists')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mx-auto"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">Ast</span>
                  <SortIcon field="assists" />
                </button>
              </th>
              <th className="px-4 py-3">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">FG</span>
              </th>
              <th className="px-4 py-3">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">3PT</span>
              </th>
              <th className="px-4 py-3">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">FT</span>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort('plusMinus')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mx-auto"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">+/-</span>
                  <SortIcon field="plusMinus" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, index) => {
              const fgPercentage = player.fieldGoalsAttempted > 0 
                ? ((player.fieldGoalsMade / player.fieldGoalsAttempted) * 100).toFixed(1)
                : '0.0';
              const tpPercentage = player.threePointersAttempted > 0
                ? ((player.threePointersMade / player.threePointersAttempted) * 100).toFixed(1)
                : '0.0';
              const ftPercentage = player.freeThrowsAttempted > 0
                ? ((player.freeThrowsMade / player.freeThrowsAttempted) * 100).toFixed(1)
                : '0.0';

              return (
                <tr
                  key={player.id}
                  className={cn(
                    "border-b border-gray-800/50 transition-all duration-200",
                    hoveredRow === player.id && "bg-white/5"
                  )}
                  onMouseEnter={() => setHoveredRow(player.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="sticky left-0 z-10 bg-gray-900/95 backdrop-blur-sm px-4 py-3">
                    <span className="text-orange-400 font-bold text-lg">{player.playerNumber}</span>
                  </td>
                  <td className="sticky left-14 z-10 bg-gray-900/95 backdrop-blur-sm px-4 py-3">
                    <div>
                      <div className="text-white font-semibold">{player.playerName}</div>
                      {index < 5 && (
                        <div className="text-xs text-orange-400 font-semibold">STARTER</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs font-semibold rounded">
                      {player.position}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{player.minutes}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-orange-400 font-bold text-lg">{player.points}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-white font-semibold">{player.rebounds}</td>
                  <td className="px-4 py-3 text-center text-white font-semibold">{player.assists}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-gray-300 text-sm">
                      {player.fieldGoalsMade}-{player.fieldGoalsAttempted}
                    </div>
                    <div className="text-xs text-gray-500">{fgPercentage}%</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-gray-300 text-sm">
                      {player.threePointersMade}-{player.threePointersAttempted}
                    </div>
                    <div className="text-xs text-gray-500">{tpPercentage}%</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-gray-300 text-sm">
                      {player.freeThrowsMade}-{player.freeThrowsAttempted}
                    </div>
                    <div className="text-xs text-gray-500">{ftPercentage}%</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={cn(
                      "font-bold text-lg",
                      player.plusMinus > 0 ? "text-green-400" : 
                      player.plusMinus < 0 ? "text-red-400" : 
                      "text-gray-400"
                    )}>
                      {player.plusMinus > 0 && "+"}{player.plusMinus}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-600">
              <td colSpan={4} className="px-4 py-3 text-gray-400 font-semibold">
                TEAM TOTALS
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-orange-400 font-bold text-lg">
                  {sortedPlayers.reduce((sum, p) => sum + p.points, 0)}
                </span>
              </td>
              <td className="px-4 py-3 text-center text-white font-bold">
                {sortedPlayers.reduce((sum, p) => sum + p.rebounds, 0)}
              </td>
              <td className="px-4 py-3 text-center text-white font-bold">
                {sortedPlayers.reduce((sum, p) => sum + p.assists, 0)}
              </td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}