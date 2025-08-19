'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useModernUI, ModernUIConditional } from '@/components/providers/modern-ui-provider'
import { Badge } from '@/components/simple-ui'

interface ScoreCardProps {
  homeTeam: {
    name: string
    logo?: string
    score: number
    color?: string
  }
  awayTeam: {
    name: string
    logo?: string
    score: number
    color?: string
  }
  gameStatus: 'scheduled' | 'live' | 'halftime' | 'final' | 'cancelled'
  gameTime?: string
  quarter?: string
  venue?: string
  className?: string
}

// Legacy Score Card (original design)
function LegacyScoreCard({
  homeTeam,
  awayTeam,
  gameStatus,
  gameTime,
  quarter,
  venue,
  className
}: ScoreCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-lg shadow-md border p-4',
      className
    )}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-sm font-medium text-gray-900">
            {homeTeam.name}
          </div>
          <div className="text-xl font-bold text-gray-900">
            {homeTeam.score}
          </div>
        </div>
        <div className="text-xs text-gray-500">vs</div>
        <div className="flex items-center space-x-3">
          <div className="text-xl font-bold text-gray-900">
            {awayTeam.score}
          </div>
          <div className="text-sm font-medium text-gray-900">
            {awayTeam.name}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Badge variant={gameStatus === 'live' ? 'default' : 'secondary'}>
            {gameStatus.toUpperCase()}
          </Badge>
          {quarter && (
            <span className="text-xs text-gray-500">{quarter}</span>
          )}
        </div>
        
        {gameTime && (
          <div className="text-xs text-gray-500">{gameTime}</div>
        )}
      </div>
      
      {venue && (
        <div className="mt-2 text-xs text-gray-400">{venue}</div>
      )}
    </div>
  )
}

// Modern Score Card (NBA 2K + ESPN inspired design)
function ModernScoreCard({
  homeTeam,
  awayTeam,
  gameStatus,
  gameTime,
  quarter,
  venue,
  className
}: ScoreCardProps) {
  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-gray-500',
      live: 'bg-gradient-to-r from-red-500 to-orange-500 animate-pulse',
      halftime: 'bg-yellow-500',
      final: 'bg-gray-700',
      cancelled: 'bg-red-600'
    }
    return colors[status as keyof typeof colors] || colors.scheduled
  }

  const getTeamGradient = (isHome: boolean) => {
    return isHome 
      ? 'from-orange-500 to-orange-600' 
      : 'from-purple-500 to-purple-600'
  }

  return (
    <div className={cn(
      'card-modern relative overflow-hidden',
      'bg-gradient-to-br from-white via-gray-50 to-white',
      'border border-gray-100 rounded-2xl shadow-lg',
      'hover:shadow-2xl hover:-translate-y-1',
      'transition-all duration-300 ease-out',
      className
    )}>
      {/* Top accent bar with gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-purple-500 to-orange-500" />
      
      {/* Game status indicator */}
      <div className="absolute top-3 right-3">
        <div className={cn(
          'px-3 py-1 rounded-full text-xs font-semibold text-white',
          'flex items-center gap-1',
          getStatusColor(gameStatus)
        )}>
          {gameStatus === 'live' && (
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          )}
          {gameStatus.toUpperCase()}
        </div>
      </div>
      
      <div className="p-6 pt-8">
        {/* Teams and Scores */}
        <div className="grid grid-cols-3 gap-4 items-center mb-4">
          {/* Home Team */}
          <div className="text-center">
            <div className="mb-2">
              <div className={cn(
                'w-12 h-12 mx-auto rounded-full bg-gradient-to-br',
                getTeamGradient(true),
                'flex items-center justify-center text-white font-bold text-lg',
                'shadow-lg'
              )}>
                {homeTeam.logo ? (
                  <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8" />
                ) : (
                  homeTeam.name.charAt(0)
                )}
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-700 leading-tight">
              {homeTeam.name}
            </div>
          </div>
          
          {/* Score Display */}
          <div className="text-center">
            <div className="score-display text-4xl font-mono font-black">
              <span className="text-orange-600">{homeTeam.score}</span>
              <span className="text-gray-400 mx-2">-</span>
              <span className="text-purple-600">{awayTeam.score}</span>
            </div>
            {quarter && (
              <div className="text-xs font-medium text-gray-500 mt-1">
                {quarter}
              </div>
            )}
          </div>
          
          {/* Away Team */}
          <div className="text-center">
            <div className="mb-2">
              <div className={cn(
                'w-12 h-12 mx-auto rounded-full bg-gradient-to-br',
                getTeamGradient(false),
                'flex items-center justify-center text-white font-bold text-lg',
                'shadow-lg'
              )}>
                {awayTeam.logo ? (
                  <img src={awayTeam.logo} alt={awayTeam.name} className="w-8 h-8" />
                ) : (
                  awayTeam.name.charAt(0)
                )}
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-700 leading-tight">
              {awayTeam.name}
            </div>
          </div>
        </div>
        
        {/* Game Details */}
        <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {gameTime && (
              <span className="font-mono font-medium">{gameTime}</span>
            )}
            {venue && (
              <>
                <span>•</span>
                <span>{venue}</span>
              </>
            )}
          </div>
          
          {gameStatus === 'live' && (
            <div className="flex items-center gap-1 text-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="font-semibold">LIVE</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
    </div>
  )
}

// Main component with feature flag switching
export function ScoreCard(props: ScoreCardProps) {
  return (
    <ModernUIConditional
      fallback={<LegacyScoreCard {...props} />}
    >
      <ModernScoreCard {...props} />
    </ModernUIConditional>
  )
}

// Development/Testing component to show both versions
export function ScoreCardComparison(props: ScoreCardProps) {
  const { isModernUIEnabled, toggleModernUI } = useModernUI()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Score Card Comparison</h2>
        <button
          onClick={toggleModernUI}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Toggle to {isModernUIEnabled ? 'Legacy' : 'Modern'} UI
        </button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Legacy Design</h3>
          <LegacyScoreCard {...props} />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-3">Modern Design (NBA 2K + ESPN)</h3>
          <ModernScoreCard {...props} />
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        <p><strong>Currently active:</strong> {isModernUIEnabled ? 'Modern UI' : 'Legacy UI'}</p>
        <p><strong>Feature flag:</strong> UI_MODERN_V1 = {isModernUIEnabled ? '1' : '0'}</p>
      </div>
    </div>
  )
}

export default ScoreCard