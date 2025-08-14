'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useOffline } from '@/hooks/useOffline';
import { WebSocketEvent, GameUpdatePayload } from '@/lib/websocket/websocket.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Users, 
  Clock, 
  Wifi, 
  WifiOff,
  Zap,
  Target,
  AlertTriangle,
  Trophy,
  Timer,
  Activity,
  MoreHorizontal,
  Maximize2,
  Volume2,
  VolumeX,
  Settings,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Team {
  id: string;
  name: string;
  shortName?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface Player {
  id: string;
  name: string;
  number: string;
  position?: string;
  isStarter?: boolean;
  stats?: {
    points: number;
    rebounds: number;
    assists: number;
    fouls: number;
  };
}

interface GameScore {
  home: number;
  away: number;
  quarters?: number[];
}

interface GameStats {
  teamFouls: {
    home: number;
    away: number;
  };
  timeouts: {
    home: number;
    away: number;
  };
  possessionArrow?: 'home' | 'away';
  bonusSituation: {
    home: boolean;
    away: boolean;
  };
}

interface GameState {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  score: GameScore;
  quarter: number;
  timeRemaining: string;
  shotClock?: string;
  status: 'scheduled' | 'pregame' | 'in_progress' | 'halftime' | 'overtime' | 'finished' | 'postponed';
  stats: GameStats;
  lastUpdate: Date;
  isLive: boolean;
}

interface LiveScoreBoardProps {
  gameId: string;
  initialGameState?: Partial<GameState>;
  showPlayerStats?: boolean;
  showAdvancedStats?: boolean;
  enableSounds?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onScoreUpdate?: (gameState: GameState) => void;
  onGameEnd?: (gameState: GameState) => void;
  className?: string;
}

const SCORE_ANIMATION_VARIANTS = {
  scoreUpdate: {
    initial: { scale: 1 },
    animate: { 
      scale: [1, 1.2, 1],
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  },
  teamHighlight: {
    initial: { backgroundColor: 'transparent' },
    animate: { 
      backgroundColor: ['transparent', '#22c55e20', 'transparent'],
      transition: { duration: 0.8, ease: 'easeInOut' }
    }
  },
  urgentTime: {
    initial: { color: 'inherit' },
    animate: { 
      color: ['#ef4444', '#dc2626', '#ef4444'],
      transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' }
    }
  }
};

/**
 * Live ScoreBoard Component
 * 
 * Features:
 * - Real-time score updates via WebSocket
 * - Basketball-specific stats (fouls, timeouts, shot clock)
 * - Offline support with queue-based syncing
 * - Sound notifications for score changes
 * - Responsive design for various screen sizes
 * - WCAG 2.1 AA compliant
 * - Optimistic UI updates for better UX
 */
export function LiveScoreBoard({
  gameId,
  initialGameState,
  showPlayerStats = false,
  showAdvancedStats = true,
  enableSounds = true,
  autoRefresh = true,
  refreshInterval = 10000,
  onScoreUpdate,
  onGameEnd,
  className = ''
}: LiveScoreBoardProps) {
  // State management
  const [gameState, setGameState] = useState<GameState>({
    id: gameId,
    homeTeam: { id: 'home', name: 'Home Team' },
    awayTeam: { id: 'away', name: 'Away Team' },
    score: { home: 0, away: 0, quarters: [0, 0, 0, 0] },
    quarter: 1,
    timeRemaining: '12:00',
    shotClock: '24',
    status: 'scheduled',
    stats: {
      teamFouls: { home: 0, away: 0 },
      timeouts: { home: 3, away: 3 },
      bonusSituation: { home: false, away: false }
    },
    lastUpdate: new Date(),
    isLive: false,
    ...initialGameState
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(enableSounds);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastScoreUpdate, setLastScoreUpdate] = useState<{team: 'home' | 'away', points: number} | null>(null);

  // Hooks
  const { isConnected, subscribe, unsubscribe, subscribeToGame, updateScore } = useWebSocket();
  const { isOffline, queueAction } = useOffline();

  // Computed values
  const isGameActive = useMemo(() => 
    ['in_progress', 'halftime', 'overtime'].includes(gameState.status), 
    [gameState.status]
  );

  const isTimeUrgent = useMemo(() => {
    if (!gameState.timeRemaining) return false;
    const [minutes, seconds] = gameState.timeRemaining.split(':').map(Number);
    return minutes === 0 && seconds <= 30 && gameState.status === 'in_progress';
  }, [gameState.timeRemaining, gameState.status]);

  const isShotClockUrgent = useMemo(() => {
    if (!gameState.shotClock) return false;
    return parseInt(gameState.shotClock) <= 5;
  }, [gameState.shotClock]);

  // Game status display helpers
  const getStatusBadge = () => {
    const statusConfig = {
      scheduled: { label: 'Scheduled', variant: 'secondary' as const, icon: Clock },
      pregame: { label: 'Pre-Game', variant: 'outline' as const, icon: Timer },
      in_progress: { label: 'Live', variant: 'destructive' as const, icon: Activity },
      halftime: { label: 'Halftime', variant: 'warning' as const, icon: Pause },
      overtime: { label: 'Overtime', variant: 'destructive' as const, icon: Zap },
      finished: { label: 'Final', variant: 'default' as const, icon: Trophy },
      postponed: { label: 'Postponed', variant: 'outline' as const, icon: AlertTriangle },
    };

    const config = statusConfig[gameState.status] || statusConfig.scheduled;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={isGameActive ? 'animate-pulse' : ''}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getQuarterDisplay = () => {
    if (gameState.quarter <= 4) {
      return `Q${gameState.quarter}`;
    } else {
      return `OT${gameState.quarter - 4}`;
    }
  };

  // WebSocket event handlers
  const handleGameUpdate = useCallback((payload: GameUpdatePayload) => {
    if (payload.gameId !== gameId) return;

    console.log('Game update received:', payload);

    setGameState(prevState => {
      const newState: GameState = {
        ...prevState,
        lastUpdate: new Date(payload.timestamp),
        isLive: payload.data.status === 'in_progress'
      };

      // Update scores
      if (payload.data.homeScore !== undefined || payload.data.awayScore !== undefined) {
        const oldScore = prevState.score;
        newState.score = {
          ...oldScore,
          home: payload.data.homeScore ?? oldScore.home,
          away: payload.data.awayScore ?? oldScore.away
        };

        // Track which team scored
        if (payload.data.homeScore !== undefined && payload.data.homeScore > oldScore.home) {
          setLastScoreUpdate({ team: 'home', points: payload.data.homeScore - oldScore.home });
        } else if (payload.data.awayScore !== undefined && payload.data.awayScore > oldScore.away) {
          setLastScoreUpdate({ team: 'away', points: payload.data.awayScore - oldScore.away });
        }

        // Play sound notification
        if (soundEnabled && (payload.data.homeScore !== oldScore.home || payload.data.awayScore !== oldScore.away)) {
          playScoreSound();
        }
      }

      // Update quarter and time
      if (payload.data.quarter !== undefined) {
        newState.quarter = payload.data.quarter;
      }
      if (payload.data.timeRemaining !== undefined) {
        newState.timeRemaining = payload.data.timeRemaining;
      }

      // Update team fouls
      if (payload.data.teamFouls) {
        newState.stats = {
          ...newState.stats,
          teamFouls: payload.data.teamFouls,
          bonusSituation: {
            home: payload.data.teamFouls.home >= 7,
            away: payload.data.teamFouls.away >= 7
          }
        };
      }

      // Update game status
      if (payload.data.status) {
        newState.status = payload.data.status;
        
        if (payload.data.status === 'finished') {
          onGameEnd?.(newState);
          toast.success('Game Finished!', {
            description: `Final Score: ${newState.homeTeam.name} ${newState.score.home} - ${newState.score.away} ${newState.awayTeam.name}`
          });
        }
      }

      // Callback for score updates
      onScoreUpdate?.(newState);

      return newState;
    });

    // Clear score update animation after delay
    setTimeout(() => setLastScoreUpdate(null), 2000);
  }, [gameId, soundEnabled, onScoreUpdate, onGameEnd]);

  // Sound effects
  const playScoreSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Create audio context for Web Audio API
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play score sound:', error);
    }
  }, [soundEnabled]);

  // WebSocket subscription effect
  useEffect(() => {
    if (!gameId) return;

    // Subscribe to game updates
    subscribe(WebSocketEvent.GAME_UPDATE, handleGameUpdate);
    subscribe(WebSocketEvent.UPDATE_SCORE, handleGameUpdate);
    subscribe(WebSocketEvent.QUARTER_START, handleGameUpdate);
    subscribe(WebSocketEvent.QUARTER_END, handleGameUpdate);

    // Subscribe to specific game
    if (isConnected) {
      subscribeToGame(gameId);
    }

    return () => {
      unsubscribe(WebSocketEvent.GAME_UPDATE, handleGameUpdate);
      unsubscribe(WebSocketEvent.UPDATE_SCORE, handleGameUpdate);
      unsubscribe(WebSocketEvent.QUARTER_START, handleGameUpdate);
      unsubscribe(WebSocketEvent.QUARTER_END, handleGameUpdate);
    };
  }, [gameId, isConnected, subscribe, unsubscribe, subscribeToGame, handleGameUpdate]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      // Trigger refresh of game data
      if (isConnected) {
        subscribeToGame(gameId);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isConnected, subscribeToGame, gameId]);

  // Render loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header with game info and controls */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <span>Live Game</span>
            {getStatusBadge()}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div className="flex items-center gap-1 text-xs">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-500" />
                  <span className="text-red-600">Offline</span>
                </>
              )}
            </div>

            {/* Controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Toggle fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Game time and quarter */}
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-lg font-bold">{getQuarterDisplay()}</div>
            <div className="text-xs text-muted-foreground">Quarter</div>
          </div>
          
          <motion.div 
            className="text-center"
            variants={SCORE_ANIMATION_VARIANTS.urgentTime}
            animate={isTimeUrgent ? 'animate' : 'initial'}
          >
            <div className="text-2xl font-mono font-bold">
              {gameState.timeRemaining}
            </div>
            <div className="text-xs text-muted-foreground">Time</div>
          </motion.div>
          
          {gameState.shotClock && (
            <motion.div 
              className="text-center"
              variants={SCORE_ANIMATION_VARIANTS.urgentTime}
              animate={isShotClockUrgent ? 'animate' : 'initial'}
            >
              <div className="text-lg font-mono font-bold">
                {gameState.shotClock}
              </div>
              <div className="text-xs text-muted-foreground">Shot</div>
            </motion.div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Scoreboard */}
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Home Team */}
          <motion.div 
            className="text-center p-4 rounded-lg border"
            variants={SCORE_ANIMATION_VARIANTS.teamHighlight}
            animate={lastScoreUpdate?.team === 'home' ? 'animate' : 'initial'}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              {gameState.homeTeam.logo && (
                <img 
                  src={gameState.homeTeam.logo} 
                  alt={gameState.homeTeam.name}
                  className="w-8 h-8 rounded"
                />
              )}
              <div>
                <div className="font-bold text-lg">{gameState.homeTeam.shortName || gameState.homeTeam.name}</div>
                <div className="text-xs text-muted-foreground">Home</div>
              </div>
            </div>
            
            <motion.div 
              className="text-4xl font-bold"
              variants={SCORE_ANIMATION_VARIANTS.scoreUpdate}
              animate={lastScoreUpdate?.team === 'home' ? 'animate' : 'initial'}
            >
              {gameState.score.home}
            </motion.div>
            
            {lastScoreUpdate?.team === 'home' && (
              <motion.div 
                className="text-green-600 font-bold"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                +{lastScoreUpdate.points}
              </motion.div>
            )}
          </motion.div>

          {/* VS indicator */}
          <div className="text-center">
            <div className="text-xl font-bold text-muted-foreground">VS</div>
            {gameState.stats.possessionArrow && (
              <div className="mt-2">
                <div className={`text-xs ${gameState.stats.possessionArrow === 'home' ? 'text-blue-600' : 'text-red-600'}`}>
                  ← {gameState.stats.possessionArrow === 'home' ? 'Home' : 'Away'} →
                </div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <motion.div 
            className="text-center p-4 rounded-lg border"
            variants={SCORE_ANIMATION_VARIANTS.teamHighlight}
            animate={lastScoreUpdate?.team === 'away' ? 'animate' : 'initial'}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              {gameState.awayTeam.logo && (
                <img 
                  src={gameState.awayTeam.logo} 
                  alt={gameState.awayTeam.name}
                  className="w-8 h-8 rounded"
                />
              )}
              <div>
                <div className="font-bold text-lg">{gameState.awayTeam.shortName || gameState.awayTeam.name}</div>
                <div className="text-xs text-muted-foreground">Away</div>
              </div>
            </div>
            
            <motion.div 
              className="text-4xl font-bold"
              variants={SCORE_ANIMATION_VARIANTS.scoreUpdate}
              animate={lastScoreUpdate?.team === 'away' ? 'animate' : 'initial'}
            >
              {gameState.score.away}
            </motion.div>
            
            {lastScoreUpdate?.team === 'away' && (
              <motion.div 
                className="text-green-600 font-bold"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                +{lastScoreUpdate.points}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Advanced Stats */}
        {showAdvancedStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {/* Team Fouls */}
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="font-bold">Team Fouls</div>
              <div className="flex justify-between mt-1">
                <span className={gameState.stats.bonusSituation.home ? 'text-red-600 font-bold' : ''}>
                  {gameState.stats.teamFouls.home}
                  {gameState.stats.bonusSituation.home && ' (Bonus)'}
                </span>
                <span className="text-muted-foreground">-</span>
                <span className={gameState.stats.bonusSituation.away ? 'text-red-600 font-bold' : ''}>
                  {gameState.stats.teamFouls.away}
                  {gameState.stats.bonusSituation.away && ' (Bonus)'}
                </span>
              </div>
            </div>

            {/* Timeouts */}
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="font-bold">Timeouts Left</div>
              <div className="flex justify-between mt-1">
                <span>{gameState.stats.timeouts.home}</span>
                <span className="text-muted-foreground">-</span>
                <span>{gameState.stats.timeouts.away}</span>
              </div>
            </div>

            {/* Quarter Scores */}
            {gameState.score.quarters && (
              <div className="col-span-2 p-3 bg-muted/30 rounded-lg">
                <div className="font-bold mb-2">Quarter Scores</div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {gameState.score.quarters.map((score, index) => (
                    <div key={index} className="text-center">
                      <div className="font-medium">Q{index + 1}</div>
                      <div className="text-muted-foreground">{score || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer with last update */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Last updated: {gameState.lastUpdate.toLocaleTimeString()}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {isOffline && (
              <Badge variant="outline" className="text-xs">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline Mode
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => subscribeToGame(gameId)}
              disabled={!isConnected}
              className="text-xs h-6"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default LiveScoreBoard;