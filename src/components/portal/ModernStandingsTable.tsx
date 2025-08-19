'use client';

import React from 'react';
import { usePublicPortal } from '@/providers/public-portal-provider';

export interface TeamStanding {
  id: string;
  rank: number;
  name: string;
  logo?: string;
  wins: number;
  losses: number;
  winPercentage: number;
  gamesBack?: number;
  streak?: string;
  pointsFor: number;
  pointsAgainst: number;
  differential: number;
  lastFive?: string;
  division?: string;
}

export interface ModernStandingsProps {
  teams: TeamStanding[];
  division: string;
  highlightTeamId?: string;
}

export function ModernStandingsTable({
  teams,
  division,
  highlightTeamId,
}: ModernStandingsProps) {
  const { config } = usePublicPortal();

  const getStreakColor = (streak?: string) => {
    if (!streak) return 'text-gray-400';
    if (streak.startsWith('W')) return 'text-green-400';
    if (streak.startsWith('L')) return 'text-red-400';
    return 'text-gray-400';
  };

  const getDifferentialColor = (diff: number) => {
    if (diff > 0) return 'text-green-400';
    if (diff < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="modern-standings-table">
      {/* Division Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 rounded-t-xl">
        <h3 className="text-xl font-bold tracking-wider">{division}</h3>
        <p className="text-sm opacity-90 mt-1">2024-25 Season Standings</p>
      </div>

      {/* Table Container */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-b-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  W-L
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  PCT
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  GB
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  PF
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  PA
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  DIFF
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  STRK
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                  L5
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {teams.map((team) => (
                <tr
                  key={team.id}
                  className={`
                    hover:bg-gray-800/50 transition-colors
                    ${highlightTeamId === team.id ? 'bg-yellow-500/10' : ''}
                  `}
                >
                  {/* Rank */}
                  <td className="px-4 py-4">
                    <div className={`
                      font-bold text-lg
                      ${team.rank <= 3 ? 'text-yellow-400' : 'text-gray-400'}
                    `}>
                      {team.rank}
                    </div>
                  </td>

                  {/* Team */}
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-600 rounded-lg flex items-center justify-center">
                        {team.logo ? (
                          <img src={team.logo} alt={team.name} className="w-8 h-8 object-contain" />
                        ) : (
                          <span className="text-white font-bold text-sm">
                            {team.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{team.name}</div>
                        {team.division && (
                          <div className="text-gray-500 text-xs">{team.division}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* W-L Record */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-white font-medium">
                      {team.wins}-{team.losses}
                    </span>
                  </td>

                  {/* Win Percentage */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-white font-medium">
                      .{Math.round(team.winPercentage * 1000).toString().padStart(3, '0')}
                    </span>
                  </td>

                  {/* Games Back */}
                  <td className="px-4 py-4 text-center hidden sm:table-cell">
                    <span className="text-gray-400">
                      {team.gamesBack === 0 ? '-' : team.gamesBack}
                    </span>
                  </td>

                  {/* Points For */}
                  <td className="px-4 py-4 text-center hidden md:table-cell">
                    <span className="text-gray-400">
                      {team.pointsFor.toFixed(1)}
                    </span>
                  </td>

                  {/* Points Against */}
                  <td className="px-4 py-4 text-center hidden md:table-cell">
                    <span className="text-gray-400">
                      {team.pointsAgainst.toFixed(1)}
                    </span>
                  </td>

                  {/* Differential */}
                  <td className="px-4 py-4 text-center hidden lg:table-cell">
                    <span className={`font-medium ${getDifferentialColor(team.differential)}`}>
                      {team.differential > 0 ? '+' : ''}{team.differential.toFixed(1)}
                    </span>
                  </td>

                  {/* Streak */}
                  <td className="px-4 py-4 text-center hidden lg:table-cell">
                    <span className={`font-medium ${getStreakColor(team.streak)}`}>
                      {team.streak || '-'}
                    </span>
                  </td>

                  {/* Last 5 Games */}
                  <td className="px-4 py-4 text-center hidden xl:table-cell">
                    <div className="flex items-center justify-center space-x-1">
                      {team.lastFive?.split('').map((result, idx) => (
                        <div
                          key={idx}
                          className={`
                            w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center
                            ${result === 'W' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                          `}
                        >
                          {result}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-6 py-4 border-t border-gray-700">
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <span>PCT: Win Percentage</span>
            <span>GB: Games Behind</span>
            <span>PF: Points For</span>
            <span>PA: Points Against</span>
            <span>DIFF: Point Differential</span>
            <span>STRK: Current Streak</span>
            <span>L5: Last 5 Games</span>
          </div>
        </div>
      </div>
    </div>
  );
}