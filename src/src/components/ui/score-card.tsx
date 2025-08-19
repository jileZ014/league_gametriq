'use client';

import React, { useEffect, useState, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Types
export interface TeamInfo {
  id: string;
  name: string;
  shortName?: string;
  logo?: string;
  score: number;
  color?: string;
  record?: string;
  fouls?: number;
  timeouts?: number;
}

export interface ScoreCardProps {
  // Required
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  gameStatus: 'scheduled' | 'live' | 'final' | 'postponed';
  
  // Optional
  period?: string;
  timeRemaining?: string;
  momentum?: number;
  variant?: 'default' | 'compact' | 'expanded';
  showDetails?: boolean;
  onTeamClick?: (team: 'home' | 'away') => void;
  className?: string;
}

// Status badge component
const StatusBadge = memo(({ status, period, timeRemaining }: {
  status: string;
  period?: string;
  timeRemaining?: string;
}) => {
  const isLive = status === 'live';
  
  return (
    <div className="flex items-center justify-between">
      <div className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
        isLive && "bg-error/20 text-error animate-pulse",
        status === 'final' && "bg-muted text-muted-foreground",
        status === 'scheduled' && "bg-primary/10 text-primary",
        status === 'postponed' && "bg-warning/20 text-warning"
      )}>
        {isLive && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
          </span>
        )}
        {status === 'live' ? period || 'LIVE' : status}
      </div>
      
      {timeRemaining && isLive && (
        <div className="text-lg font-mono font-bold text-foreground">
          {timeRemaining}
        </div>
      )}
    </div>
  );
});
StatusBadge.displayName = 'StatusBadge';

// Team row component
const TeamRow = memo(({ 
  team, 
  isWinner, 
  onClick,
  showDetails,
  variant = 'default'
}: {
  team: TeamInfo;
  isWinner?: boolean;
  onClick?: () => void;
  showDetails?: boolean;
  variant?: string;
}) => {
  const [prevScore, setPrevScore] = useState(team.score);
  const scoreChanged = team.score !== prevScore;
  
  useEffect(() => {
    if (scoreChanged) {
      const timer = setTimeout(() => setPrevScore(team.score), 600);
      return () => clearTimeout(timer);
    }
  }, [team.score, scoreChanged]);
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center justify-between p-4 cursor-pointer transition-all",
        "hover:bg-accent/5 rounded-lg group",
        isWinner && "bg-success/5",
        variant === 'compact' && "p-2"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${team.name}: ${team.score} points`}
    >
      <div className="flex items-center gap-3">
        {team.logo && (
          <div 
            className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden"
            style={{
              backgroundColor: team.color ? `${team.color}20` : undefined
            }}
          >
            <img 
              src={team.logo} 
              alt={`${team.name} logo`}
              className="w-8 h-8 object-contain"
            />
          </div>
        )}
        
        <div>
          <div className={cn(
            "font-bold",
            variant === 'compact' ? "text-sm" : "text-lg",
            isWinner && "text-success"
          )}>
            {variant === 'compact' && team.shortName ? team.shortName : team.name}
          </div>
          {showDetails && team.record && (
            <div className="text-xs text-muted-foreground">
              {team.record}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {showDetails && (
          <div className="flex gap-2 text-xs text-muted-foreground">
            {team.fouls !== undefined && (
              <span>F: {team.fouls}</span>
            )}
            {team.timeouts !== undefined && (
              <span>TO: {team.timeouts}</span>
            )}
          </div>
        )}
        
        <AnimatePresence mode="wait">
          <motion.div
            key={team.score}
            initial={scoreChanged ? { scale: 0.8, opacity: 0, y: 20 } : false}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{
              duration: 0.6,
              ease: [0.68, -0.55, 0.265, 1.55]
            }}
            className={cn(
              "font-mono font-black",
              variant === 'compact' ? "text-2xl" : "text-4xl",
              scoreChanged && "text-primary animate-pulse",
              isWinner && "text-success",
              team.color && "group-hover:drop-shadow-glow"
            )}
            style={{
              color: isWinner ? undefined : team.color,
              textShadow: scoreChanged ? `0 0 20px ${team.color || 'var(--primary)'}` : undefined
            }}
          >
            {team.score}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
TeamRow.displayName = 'TeamRow';

// Momentum bar component
const MomentumBar = memo(({ momentum = 0 }: { momentum?: number }) => {
  const normalizedMomentum = Math.max(-100, Math.min(100, momentum));
  const isHome = normalizedMomentum > 0;
  const width = Math.abs(normalizedMomentum);
  
  return (
    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        className={cn(
          "absolute top-0 h-full rounded-full",
          isHome ? "bg-primary right-1/2" : "bg-secondary left-1/2"
        )}
        initial={{ width: 0 }}
        animate={{ width: `${width / 2}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          transformOrigin: isHome ? 'right' : 'left'
        }}
      />
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
    </div>
  );
});
MomentumBar.displayName = 'MomentumBar';

// Main ScoreCard component
export const ScoreCard = memo(({
  homeTeam,
  awayTeam,
  gameStatus,
  period,
  timeRemaining,
  momentum,
  variant = 'default',
  showDetails = false,
  onTeamClick,
  className
}: ScoreCardProps) => {
  const isLive = gameStatus === 'live';
  const isFinal = gameStatus === 'final';
  const homeWins = isFinal && homeTeam.score > awayTeam.score;
  const awayWins = isFinal && awayTeam.score > homeTeam.score;
  
  const handleTeamClick = useCallback((team: 'home' | 'away') => {
    onTeamClick?.(team);
  }, [onTeamClick]);
  
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-xl border",
        "bg-gradient-to-br from-background to-background/80",
        "backdrop-blur-sm shadow-lg",
        isLive && "border-error/50 shadow-error/20",
        variant === 'compact' && "text-sm",
        variant === 'expanded' && "text-lg",
        className
      )}
      role="region"
      aria-label="Game score card"
      aria-live={isLive ? "polite" : "off"}
      aria-atomic="true"
    >
      {/* Animated background for live games */}
      {isLive && (
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-error to-transparent animate-pulse" />
        </div>
      )}
      
      {/* Header */}
      <div className="relative z-10 p-4 border-b">
        <StatusBadge 
          status={gameStatus} 
          period={period} 
          timeRemaining={timeRemaining} 
        />
      </div>
      
      {/* Teams */}
      <div className="relative z-10 divide-y">
        <TeamRow
          team={awayTeam}
          isWinner={awayWins}
          onClick={() => handleTeamClick('away')}
          showDetails={showDetails}
          variant={variant}
        />
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed opacity-50" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-xs text-muted-foreground uppercase tracking-wider">
              vs
            </span>
          </div>
        </div>
        
        <TeamRow
          team={homeTeam}
          isWinner={homeWins}
          onClick={() => handleTeamClick('home')}
          showDetails={showDetails}
          variant={variant}
        />
      </div>
      
      {/* Footer with momentum */}
      {momentum !== undefined && variant !== 'compact' && (
        <div className="relative z-10 p-4 border-t">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 text-center">
            Momentum
          </div>
          <MomentumBar momentum={momentum} />
        </div>
      )}
    </motion.article>
  );
});

ScoreCard.displayName = 'ScoreCard';

export default ScoreCard;