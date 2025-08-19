import React, { useEffect, useState } from 'react';
import { Card } from '@/components/simple-ui';
import { Badge } from '@/components/simple-ui';
import { useGameWebSocket } from '@/hooks/useWebSocket';
import { GameUpdatePayload } from '@/lib/websocket/websocket.types';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveScoreCardProps {
  gameId: string;
  homeTeam: {
    id: string;
    name: string;
    logo?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    logo?: string;
  };
  initialScore?: {
    home: number;
    away: number;
  };
  token?: string;
}

/**
 * Live Score Card Component
 * Displays real-time game scores with WebSocket updates
 * 
 * Features:
 * - Real-time score updates
 * - Animated score changes
 * - Connection status indicator
 * - Quarter/time display
 * - Team foul tracking
 */
export const LiveScoreCard: React.FC<LiveScoreCardProps> = ({
  gameId,
  homeTeam,
  awayTeam,
  initialScore = { home: 0, away: 0 },
  token,
}) => {
  const { isConnected, gameState } = useGameWebSocket(gameId, token);
  const [scores, setScores] = useState(initialScore);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Handle game state updates
  useEffect(() => {
    if (gameState?.data) {
      const newScores = {
        home: gameState.data.homeScore ?? scores.home,
        away: gameState.data.awayScore ?? scores.away,
      };

      // Check if scores changed
      if (newScores.home !== scores.home || newScores.away !== scores.away) {
        setIsUpdating(true);
        setScores(newScores);
        setLastUpdate(new Date());
        
        // Reset animation state
        setTimeout(() => setIsUpdating(false), 500);
      }
    }
  }, [gameState]);

  // Format time remaining
  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return time;
  };

  // Get game status badge
  const getStatusBadge = () => {
    const status = gameState?.data?.status || 'scheduled';
    const statusConfig = {
      scheduled: { label: 'Scheduled', variant: 'secondary' as const },
      in_progress: { label: 'Live', variant: 'destructive' as const },
      halftime: { label: 'Halftime', variant: 'warning' as const },
      finished: { label: 'Final', variant: 'default' as const },
      postponed: { label: 'Postponed', variant: 'outline' as const },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    
    return (
      <Badge variant={config.variant} className="animate-pulse">
        {config.label}
      </Badge>
    );
  };

  // Get quarter display
  const getQuarterDisplay = () => {
    const quarter = gameState?.data?.quarter;
    if (!quarter) return null;

    const quarterLabels = ['1st', '2nd', '3rd', '4th', 'OT'];
    return quarterLabels[quarter - 1] || `Q${quarter}`;
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Connection Status Indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            } animate-pulse`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>
      </div>

      <div className="p-6">
        {/* Game Time and Quarter */}
        <div className="text-center mb-4">
          <div className="text-sm text-gray-500">
            {getQuarterDisplay() && (
              <>
                <span className="font-semibold">{getQuarterDisplay()}</span>
                <span className="mx-2">•</span>
              </>
            )}
            <span>{formatTime(gameState?.data?.timeRemaining)}</span>
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Home Team */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">{homeTeam.name}</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={scores.home}
                initial={{ scale: 1.2, color: '#ef4444' }}
                animate={{ scale: 1, color: '#000000' }}
                exit={{ scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="text-4xl font-bold"
              >
                {scores.home}
              </motion.div>
            </AnimatePresence>
            {gameState?.data?.teamFouls && (
              <div className="text-xs text-gray-500 mt-1">
                Fouls: {gameState.data.teamFouls.home}
                {gameState.data.teamFouls.home >= 7 && (
                  <span className="text-red-500 ml-1">• Bonus</span>
                )}
              </div>
            )}
          </div>

          {/* VS Separator */}
          <div className="text-center text-gray-400">
            <span className="text-sm">VS</span>
          </div>

          {/* Away Team */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">{awayTeam.name}</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={scores.away}
                initial={{ scale: 1.2, color: '#ef4444' }}
                animate={{ scale: 1, color: '#000000' }}
                exit={{ scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="text-4xl font-bold"
              >
                {scores.away}
              </motion.div>
            </AnimatePresence>
            {gameState?.data?.teamFouls && (
              <div className="text-xs text-gray-500 mt-1">
                Fouls: {gameState.data.teamFouls.away}
                {gameState.data.teamFouls.away >= 7 && (
                  <span className="text-red-500 ml-1">• Bonus</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Last Update Indicator */}
        {lastUpdate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center mt-4 text-xs text-gray-500"
          >
            Updated {lastUpdate.toLocaleTimeString()}
          </motion.div>
        )}

        {/* Update Animation Overlay */}
        <AnimatePresence>
          {isUpdating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-green-500 pointer-events-none"
            />
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

/**
 * Live Score Dashboard Component
 * Displays multiple live games with real-time updates
 */
export const LiveScoreDashboard: React.FC<{ games: any[]; token?: string }> = ({ 
  games, 
  token 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map((game) => (
        <LiveScoreCard
          key={game.id}
          gameId={game.id}
          homeTeam={game.homeTeam}
          awayTeam={game.awayTeam}
          initialScore={game.currentScore}
          token={token}
        />
      ))}
    </div>
  );
};