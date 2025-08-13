'use client';

import React from 'react';
import { usePublicPortal } from '@/providers/public-portal-provider';

export interface Team {
  id: string;
  name: string;
  logo?: string;
  color?: string;
  wins?: number;
  losses?: number;
}

export interface ModernGameCardProps {
  homeTeam: Team;
  awayTeam: Team;
  gameStatus: 'scheduled' | 'live' | 'halftime' | 'final';
  gameTime: string;
  venue: string;
  score?: {
    home: number;
    away: number;
  };
  quarter?: number;
  timeRemaining?: string;
}

export function ModernGameCard({
  homeTeam,
  awayTeam,
  gameStatus,
  gameTime,
  venue,
  score,
  quarter,
  timeRemaining,
}: ModernGameCardProps) {
  const { config } = usePublicPortal();

  const getStatusColor = () => {
    switch (gameStatus) {
      case 'live':
        return 'bg-gradient-to-r from-red-500 to-orange-500';
      case 'halftime':
        return 'bg-gradient-to-r from-yellow-500 to-amber-500';
      case 'final':
        return 'bg-gray-600';
      default:
        return 'bg-gradient-to-r from-blue-500 to-purple-500';
    }
  };

  const getStatusText = () => {
    switch (gameStatus) {
      case 'live':
        return `Q${quarter || 1} - ${timeRemaining || '10:00'}`;
      case 'halftime':
        return 'HALFTIME';
      case 'final':
        return 'FINAL';
      default:
        return gameTime;
    }
  };

  return (
    <div className="modern-game-card group">
      {/* Status Banner */}
      <div className={`${getStatusColor()} text-white px-4 py-2 rounded-t-xl font-bold text-sm text-center tracking-wider`}>
        {getStatusText()}
      </div>

      {/* Game Content */}
      <div className="p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-b-xl">
        {/* Teams Section */}
        <div className="space-y-4">
          {/* Away Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-600 rounded-lg flex items-center justify-center text-white font-bold">
                {awayTeam.logo ? (
                  <img src={awayTeam.logo} alt={awayTeam.name} className="w-10 h-10 object-contain" />
                ) : (
                  <span>{awayTeam.name.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className="text-white font-semibold">{awayTeam.name}</div>
                {awayTeam.wins !== undefined && (
                  <div className="text-gray-400 text-xs">
                    {awayTeam.wins}-{awayTeam.losses}
                  </div>
                )}
              </div>
            </div>
            {score && (
              <div className={`text-3xl font-bold ${
                gameStatus === 'final' && score.away > score.home 
                  ? 'text-yellow-400' 
                  : 'text-white'
              }`}>
                {score.away}
              </div>
            )}
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
            <span className="px-3 text-gray-500 text-xs font-medium">VS</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
          </div>

          {/* Home Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-600 rounded-lg flex items-center justify-center text-white font-bold">
                {homeTeam.logo ? (
                  <img src={homeTeam.logo} alt={homeTeam.name} className="w-10 h-10 object-contain" />
                ) : (
                  <span>{homeTeam.name.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className="text-white font-semibold">{homeTeam.name}</div>
                {homeTeam.wins !== undefined && (
                  <div className="text-gray-400 text-xs">
                    {homeTeam.wins}-{homeTeam.losses}
                  </div>
                )}
              </div>
            </div>
            {score && (
              <div className={`text-3xl font-bold ${
                gameStatus === 'final' && score.home > score.away 
                  ? 'text-yellow-400' 
                  : 'text-white'
              }`}>
                {score.home}
              </div>
            )}
          </div>
        </div>

        {/* Venue */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-center text-gray-400 text-sm">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {venue}
          </div>
        </div>

        {/* Live Indicator */}
        {gameStatus === 'live' && (
          <div className="absolute top-4 right-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-500 text-xs font-semibold">LIVE</span>
            </div>
          </div>
        )}
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
  );
}