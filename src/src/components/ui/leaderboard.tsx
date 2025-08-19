'use client';

import React, { useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Minus, Medal, Award } from 'lucide-react';

// Types
export interface PlayerLeaderStats {
  id: string;
  name: string;
  team: string;
  teamColor?: string;
  jersey?: string;
  avatar?: string;
  value: number;
  previousRank?: number;
  gamesPlayed?: number;
  perGame?: number;
}

export interface LeaderboardProps {
  title: string;
  players: PlayerLeaderStats[];
  variant?: 'default' | 'compact' | 'detailed';
  showRankChange?: boolean;
  showPerGame?: boolean;
  maxDisplay?: number;
  unit?: string;
  colorScheme?: 'default' | 'team' | 'gradient';
  onPlayerClick?: (player: PlayerLeaderStats) => void;
  className?: string;
}

// Rank badge component
const RankBadge = memo(({ rank }: { rank: number }) => {
  const getIcon = () => {
    switch (rank) {
      case 1:
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 3:
        return <Award className="w-4 h-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/50';
      case 2:
        return 'bg-gradient-to-br from-gray-400/20 to-gray-500/20 border-gray-400/50';
      case 3:
        return 'bg-gradient-to-br from-amber-600/20 to-amber-700/20 border-amber-600/50';
      default:
        return 'bg-muted border-border';
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-center w-8 h-8 rounded-full border font-bold text-sm",
      getBgColor()
    )}>
      {getIcon() || rank}
    </div>
  );
});
RankBadge.displayName = 'RankBadge';

// Rank change indicator
const RankChange = memo(({ current, previous }: { current: number; previous?: number }) => {
  if (!previous || previous === current) {
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  }

  const change = previous - current;
  const isUp = change > 0;

  return (
    <div className={cn(
      "flex items-center gap-1 text-xs font-semibold",
      isUp ? "text-success" : "text-error"
    )}>
      {isUp ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      <span>{Math.abs(change)}</span>
    </div>
  );
});
RankChange.displayName = 'RankChange';

// Player row component
const PlayerRow = memo(({
  player,
  rank,
  variant,
  showRankChange,
  showPerGame,
  unit,
  colorScheme,
  onClick
}: {
  player: PlayerLeaderStats;
  rank: number;
  variant: string;
  showRankChange?: boolean;
  showPerGame?: boolean;
  unit?: string;
  colorScheme?: string;
  onClick?: () => void;
}) => {
  const isTop3 = rank <= 3;
  const delay = rank * 0.05;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ 
        duration: 0.3, 
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      whileHover={{ scale: 1.02, x: 5 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
        "hover:bg-accent/5",
        isTop3 && "bg-gradient-to-r from-transparent",
        isTop3 && rank === 1 && "to-yellow-500/5",
        isTop3 && rank === 2 && "to-gray-400/5",
        isTop3 && rank === 3 && "to-amber-600/5",
        variant === 'compact' && "p-2"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${player.name} - Rank ${rank}`}
    >
      {/* Rank */}
      <div className="flex items-center gap-2">
        <RankBadge rank={rank} />
        {showRankChange && (
          <RankChange current={rank} previous={player.previousRank} />
        )}
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {player.avatar && variant !== 'compact' && (
            <img 
              src={player.avatar} 
              alt={player.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className={cn(
              "font-semibold truncate",
              variant === 'compact' ? "text-sm" : "text-base"
            )}>
              {player.jersey && (
                <span className="font-mono text-muted-foreground mr-2">
                  #{player.jersey}
                </span>
              )}
              {player.name}
            </div>
            {variant !== 'compact' && (
              <div 
                className="text-xs text-muted-foreground truncate"
                style={{ 
                  color: colorScheme === 'team' && player.teamColor ? player.teamColor : undefined 
                }}
              >
                {player.team}
                {player.gamesPlayed && (
                  <span className="ml-2">
                    • {player.gamesPlayed} games
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="text-right">
        <div className={cn(
          "font-mono font-bold",
          variant === 'compact' ? "text-lg" : "text-xl",
          isTop3 && "text-primary"
        )}>
          {player.value}
          {unit && <span className="text-xs ml-1">{unit}</span>}
        </div>
        {showPerGame && player.perGame !== undefined && variant !== 'compact' && (
          <div className="text-xs text-muted-foreground">
            {player.perGame.toFixed(1)} per game
          </div>
        )}
      </div>
    </motion.div>
  );
});
PlayerRow.displayName = 'PlayerRow';

// Main Leaderboard component
export const Leaderboard = memo(({
  title,
  players,
  variant = 'default',
  showRankChange = false,
  showPerGame = false,
  maxDisplay = 10,
  unit,
  colorScheme = 'default',
  onPlayerClick,
  className
}: LeaderboardProps) => {
  // Sort and limit players
  const rankedPlayers = useMemo(() => {
    return [...players]
      .sort((a, b) => b.value - a.value)
      .slice(0, maxDisplay);
  }, [players, maxDisplay]);

  // Calculate if there's a dominant leader
  const isDominant = useMemo(() => {
    if (rankedPlayers.length < 2) return false;
    const gap = rankedPlayers[0].value - rankedPlayers[1].value;
    return gap > rankedPlayers[1].value * 0.2; // 20% lead
  }, [rankedPlayers]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative rounded-lg border bg-background/95 backdrop-blur-sm",
        variant === 'compact' ? "p-3" : "p-4",
        className
      )}
    >
      {/* Gradient background for top players */}
      {colorScheme === 'gradient' && (
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-b from-primary to-transparent" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn(
          "font-bold uppercase tracking-wider",
          variant === 'compact' ? "text-xs" : "text-sm",
          "text-muted-foreground"
        )}>
          {title}
        </h3>
        {isDominant && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 text-xs text-warning"
          >
            <Trophy className="w-3 h-3" />
            <span>Dominant</span>
          </motion.div>
        )}
      </div>

      {/* Players list */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {rankedPlayers.map((player, index) => (
            <PlayerRow
              key={player.id}
              player={player}
              rank={index + 1}
              variant={variant}
              showRankChange={showRankChange}
              showPerGame={showPerGame}
              unit={unit}
              colorScheme={colorScheme}
              onClick={onPlayerClick ? () => onPlayerClick(player) : undefined}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {players.length > maxDisplay && (
        <div className="mt-4 text-center">
          <button className="text-xs text-primary hover:underline">
            View all {players.length} players →
          </button>
        </div>
      )}
    </motion.div>
  );
});

Leaderboard.displayName = 'Leaderboard';

export default Leaderboard;