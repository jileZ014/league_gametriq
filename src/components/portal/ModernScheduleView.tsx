'use client';

import React, { useState } from 'react';
import { ModernGameCard, Team } from './ModernGameCard';
import { usePublicPortal } from '@/providers/public-portal-provider';

export interface Game {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  gameStatus: 'scheduled' | 'live' | 'halftime' | 'final';
  gameTime: string;
  gameDate: string;
  venue: string;
  score?: {
    home: number;
    away: number;
  };
  quarter?: number;
  timeRemaining?: string;
  division?: string;
}

export interface ModernScheduleViewProps {
  games: Game[];
  selectedDate?: Date;
  selectedDivision?: string;
  selectedTeam?: string;
}

export function ModernScheduleView({
  games,
  selectedDate = new Date(),
  selectedDivision,
  selectedTeam,
}: ModernScheduleViewProps) {
  const { config } = usePublicPortal();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [filterDivision, setFilterDivision] = useState(selectedDivision || 'all');
  const [filterTeam, setFilterTeam] = useState(selectedTeam || 'all');

  // Get unique divisions and teams
  const divisions = Array.from(new Set(games.map(g => g.division).filter(Boolean)));
  const teams = Array.from(new Set(games.flatMap(g => [g.homeTeam.name, g.awayTeam.name])));

  // Filter games
  const filteredGames = games.filter(game => {
    if (filterDivision !== 'all' && game.division !== filterDivision) return false;
    if (filterTeam !== 'all' && 
        game.homeTeam.name !== filterTeam && 
        game.awayTeam.name !== filterTeam) return false;
    return true;
  });

  // Group games by date
  const gamesByDate = filteredGames.reduce((acc, game) => {
    const date = game.gameDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(game);
    return acc;
  }, {} as Record<string, Game[]>);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="modern-schedule-view">
      {/* Header Controls */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-wider">Game Schedule</h2>
            <p className="text-sm opacity-90 mt-1">Phoenix Youth Basketball League</p>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center space-x-2">
            {(['day', 'week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all
                  ${viewMode === mode 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'}
                `}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 px-6 py-4 border-b border-gray-800">
        <div className="flex flex-wrap gap-4">
          {/* Division Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Division
            </label>
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-yellow-500 focus:outline-none"
            >
              <option value="all">All Divisions</option>
              {divisions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Team
            </label>
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-yellow-500 focus:outline-none"
            >
              <option value="all">All Teams</option>
              {teams.sort().map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* Date Navigation */}
          <div className="flex items-end space-x-2">
            <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors">
              Today
            </button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Games List */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-b-xl p-6">
        {Object.entries(gamesByDate).length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">No games scheduled</div>
            <p className="text-gray-500 text-sm mt-2">Check back later for updated schedules</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(gamesByDate).map(([date, dateGames]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white">
                    {formatDate(date)}
                  </h3>
                  <div className="text-gray-400 text-sm">
                    {dateGames.length} {dateGames.length === 1 ? 'Game' : 'Games'}
                  </div>
                </div>

                {/* Games Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {dateGames.map((game) => (
                    <ModernGameCard
                      key={game.id}
                      homeTeam={game.homeTeam}
                      awayTeam={game.awayTeam}
                      gameStatus={game.gameStatus}
                      gameTime={game.gameTime}
                      venue={game.venue}
                      score={game.score}
                      quarter={game.quarter}
                      timeRemaining={game.timeRemaining}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {filteredGames.filter(g => g.gameStatus === 'live').length}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Live Now</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {filteredGames.filter(g => g.gameStatus === 'scheduled').length}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Upcoming</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {filteredGames.filter(g => g.gameStatus === 'final').length}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {divisions.length}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Divisions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}