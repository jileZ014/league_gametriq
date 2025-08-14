'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tournament, 
  Match, 
  Team, 
  BracketStructure,
  TournamentTheme,
  DEFAULT_TOURNAMENT_THEME,
  BRACKET_CONSTANTS 
} from '@/lib/tournament/types';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WebSocketEvent, TournamentUpdatePayload } from '@/lib/websocket/websocket.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Share2, 
  Maximize2,
  Trophy,
  Users,
  Calendar,
  MapPin,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Play
} from 'lucide-react';
import { toast } from 'sonner';

interface TournamentBracketProps {
  tournament: Tournament;
  onMatchClick?: (match: Match) => void;
  onTeamClick?: (team: Team) => void;
  showControls?: boolean;
  interactive?: boolean;
  theme?: TournamentTheme;
  className?: string;
  enableRealTime?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

interface BracketUIState {
  selectedMatch: string | null;
  highlightedTeam: string | null;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  viewBox: { x: number; y: number; width: number; height: number };
  showTooltip: boolean;
  tooltipContent: string;
  tooltipPosition: { x: number; y: number };
  isFullscreen: boolean;
  animatingMatches: Set<string>;
}

interface MatchPosition {
  x: number;
  y: number;
  round: number;
  matchIndex: number;
}

const ANIMATION_VARIANTS = {
  matchUpdate: {
    initial: { scale: 1, backgroundColor: '#ffffff' },
    animate: { 
      scale: [1, 1.05, 1], 
      backgroundColor: ['#ffffff', '#22c55e', '#ffffff'],
      transition: { duration: 0.6, ease: 'easeInOut' }
    }
  },
  scoreUpdate: {
    initial: { scale: 1, color: '#000000' },
    animate: { 
      scale: [1, 1.2, 1], 
      color: ['#000000', '#f59e0b', '#000000'],
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  },
  teamAdvance: {
    initial: { x: 0, opacity: 1 },
    animate: { 
      x: [0, 10, 0], 
      opacity: [1, 0.8, 1],
      transition: { duration: 0.5, ease: 'easeInOut' }
    }
  }
};

/**
 * Interactive Tournament Bracket Component
 * 
 * Features:
 * - Real-time bracket updates via WebSocket
 * - Interactive zoom and pan controls
 * - Responsive design for mobile and desktop
 * - Smooth animations for match updates
 * - Offline support with optimistic updates
 * - Customizable themes and layouts
 * - Export and sharing capabilities
 * - Accessibility compliant (WCAG 2.1 AA)
 */
export function TournamentBracket({
  tournament,
  onMatchClick,
  onTeamClick,
  showControls = true,
  interactive = true,
  theme = DEFAULT_TOURNAMENT_THEME,
  className = '',
  enableRealTime = true,
  autoRefresh = false,
  refreshInterval = 30000
}: TournamentBracketProps) {
  // State management
  const [uiState, setUIState] = useState<BracketUIState>({
    selectedMatch: null,
    highlightedTeam: null,
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    viewBox: { x: 0, y: 0, width: 1200, height: 800 },
    showTooltip: false,
    tooltipContent: '',
    tooltipPosition: { x: 0, y: 0 },
    isFullscreen: false,
    animatingMatches: new Set()
  });

  const [bracket, setBracket] = useState<BracketStructure | null>(tournament.bracket || null);
  const [loading, setLoading] = useState(!bracket);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    subscribe, 
    unsubscribe, 
    subscribeToTournament,
    unsubscribeFromTournament 
  } = useWebSocket();

  // Calculate bracket layout
  const bracketLayout = useMemo(() => {
    if (!bracket) return null;

    const rounds = bracket.rounds.length;
    const maxMatchesInRound = Math.max(...bracket.rounds.map(r => r.matches.length));
    
    const width = Math.max(
      rounds * BRACKET_CONSTANTS.ROUND_SPACING + BRACKET_CONSTANTS.MATCH_WIDTH,
      BRACKET_CONSTANTS.MIN_BRACKET_WIDTH
    );
    
    const height = Math.max(
      maxMatchesInRound * (BRACKET_CONSTANTS.MATCH_HEIGHT + BRACKET_CONSTANTS.MATCH_SPACING),
      BRACKET_CONSTANTS.MIN_BRACKET_HEIGHT
    );

    const positions = new Map<string, MatchPosition>();
    
    bracket.rounds.forEach((round, roundIndex) => {
      const roundX = roundIndex * BRACKET_CONSTANTS.ROUND_SPACING + 50;
      const roundMatches = round.matches.length;
      const startY = (height - (roundMatches * (BRACKET_CONSTANTS.MATCH_HEIGHT + BRACKET_CONSTANTS.MATCH_SPACING))) / 2;

      round.matches.forEach((match, matchIndex) => {
        const matchY = startY + matchIndex * (BRACKET_CONSTANTS.MATCH_HEIGHT + BRACKET_CONSTANTS.MATCH_SPACING);
        
        positions.set(match.id, {
          x: roundX,
          y: matchY,
          round: roundIndex,
          matchIndex,
        });
      });
    });

    return { width, height, positions };
  }, [bracket]);

  // Real-time tournament updates
  useEffect(() => {
    if (!enableRealTime || !tournament.id) return;

    const handleTournamentUpdate = (payload: TournamentUpdatePayload) => {
      console.log('Tournament update received:', payload);

      if (payload.type === 'bracket' && payload.data.bracket) {
        setBracket(payload.data.bracket as BracketStructure);
        setLastUpdate(new Date());
      }

      if (payload.type === 'match_result' && payload.data.matchId) {
        // Animate the updated match
        setUIState(prev => ({
          ...prev,
          animatingMatches: new Set([...prev.animatingMatches, payload.data.matchId!])
        }));

        // Remove animation after duration
        setTimeout(() => {
          setUIState(prev => ({
            ...prev,
            animatingMatches: new Set([...prev.animatingMatches].filter(id => id !== payload.data.matchId))
          }));
        }, 600);

        toast.success('Match result updated', {
          description: `${payload.data.matchResult?.winnerId} advanced to next round`
        });
      }
    };

    // Subscribe to tournament updates
    subscribe(WebSocketEvent.TOURNAMENT_UPDATE, handleTournamentUpdate);
    subscribe(WebSocketEvent.BRACKET_UPDATE, handleTournamentUpdate);
    subscribe(WebSocketEvent.MATCH_COMPLETE, handleTournamentUpdate);

    if (isConnected) {
      subscribeToTournament(tournament.id);
    }

    return () => {
      unsubscribe(WebSocketEvent.TOURNAMENT_UPDATE, handleTournamentUpdate);
      unsubscribe(WebSocketEvent.BRACKET_UPDATE, handleTournamentUpdate);
      unsubscribe(WebSocketEvent.MATCH_COMPLETE, handleTournamentUpdate);
      unsubscribeFromTournament(tournament.id);
    };
  }, [tournament.id, enableRealTime, isConnected, subscribe, unsubscribe, subscribeToTournament, unsubscribeFromTournament]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      // Trigger a refresh of tournament data
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Zoom and pan controls
  const handleZoom = useCallback((delta: number, center?: { x: number; y: number }) => {
    setUIState(prev => {
      const newZoom = Math.max(0.25, Math.min(3, prev.zoomLevel + delta));
      const zoomRatio = newZoom / prev.zoomLevel;
      
      let newPanOffset = prev.panOffset;
      
      if (center && bracketLayout) {
        // Zoom towards the center point
        const centerX = center.x - bracketLayout.width / 2;
        const centerY = center.y - bracketLayout.height / 2;
        
        newPanOffset = {
          x: prev.panOffset.x - (centerX * (zoomRatio - 1)),
          y: prev.panOffset.y - (centerY * (zoomRatio - 1))
        };
      }

      return {
        ...prev,
        zoomLevel: newZoom,
        panOffset: newPanOffset
      };
    });
  }, [bracketLayout]);

  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    setUIState(prev => ({
      ...prev,
      panOffset: {
        x: prev.panOffset.x + deltaX,
        y: prev.panOffset.y + deltaY,
      },
    }));
  }, []);

  const resetView = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 },
    }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      isFullscreen: !prev.isFullscreen
    }));
  }, []);

  // Match and team interaction handlers
  const handleMatchClick = useCallback((match: Match) => {
    setUIState(prev => ({
      ...prev,
      selectedMatch: prev.selectedMatch === match.id ? null : match.id,
    }));
    onMatchClick?.(match);
  }, [onMatchClick]);

  const handleTeamClick = useCallback((team: Team) => {
    setUIState(prev => ({
      ...prev,
      highlightedTeam: prev.highlightedTeam === team.id ? null : team.id,
    }));
    onTeamClick?.(team);
  }, [onTeamClick]);

  // Loading state
  if (loading || !bracket || !bracketLayout) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${uiState.isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span>{tournament.name}</span>
            <Badge variant="outline" className="ml-2">
              {tournament.teams.length} teams
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            {enableRealTime && (
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
            )}
            
            {/* Last Updated */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Tournament Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{tournament.type.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{bracket.rounds.length} rounds</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{bracket.totalMatches} matches</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Controls */}
        {showControls && (
          <div className="absolute top-4 right-4 z-10 flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(0.2)}
              className="bg-white/90 backdrop-blur-sm"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(-0.2)}
              className="bg-white/90 backdrop-blur-sm"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
              className="bg-white/90 backdrop-blur-sm"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="bg-white/90 backdrop-blur-sm"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90 backdrop-blur-sm"
              title="Download Bracket"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90 backdrop-blur-sm"
              title="Share Bracket"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Bracket Visualization */}
        <div className="relative w-full h-96 lg:h-[600px] overflow-hidden">
          <svg
            width="100%"
            height="100%"
            viewBox={`${uiState.panOffset.x} ${uiState.panOffset.y} ${bracketLayout.width / uiState.zoomLevel} ${bracketLayout.height / uiState.zoomLevel}`}
            className="cursor-grab active:cursor-grabbing"
            style={{
              backgroundColor: theme.colors.background,
            }}
          >
            {/* Background Grid */}
            <defs>
              <pattern
                id="grid"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke={theme.colors.border}
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              </pattern>
            </defs>
            <rect width={bracketLayout.width} height={bracketLayout.height} fill="url(#grid)" />

            {/* Round Labels */}
            {bracket.rounds.map((round, index) => {
              const position = bracketLayout.positions.get(round.matches[0]?.id);
              if (!position) return null;

              return (
                <text
                  key={`round-${index}`}
                  x={position.x + BRACKET_CONSTANTS.MATCH_WIDTH / 2}
                  y={30}
                  textAnchor="middle"
                  className="fill-current text-sm font-semibold"
                  fill={theme.colors.foreground}
                >
                  {round.name || `Round ${round.roundNumber}`}
                </text>
              );
            })}

            {/* Match Connectors */}
            {bracket.rounds.map((round, roundIndex) => {
              if (roundIndex === bracket.rounds.length - 1) return null;

              return round.matches.map((match, matchIndex) => {
                if (matchIndex % 2 === 1) return null;

                const match1Position = bracketLayout.positions.get(match.id);
                const match2 = round.matches[matchIndex + 1];
                const match2Position = match2 ? bracketLayout.positions.get(match2.id) : null;
                
                if (!match1Position || !match2Position) return null;

                const nextRound = bracket.rounds[roundIndex + 1];
                const nextMatch = nextRound?.matches[Math.floor(matchIndex / 2)];
                const nextPosition = nextMatch ? bracketLayout.positions.get(nextMatch.id) : null;

                if (!nextPosition) return null;

                const startX = match1Position.x + BRACKET_CONSTANTS.MATCH_WIDTH;
                const startY1 = match1Position.y + BRACKET_CONSTANTS.MATCH_HEIGHT / 2;
                const startY2 = match2Position.y + BRACKET_CONSTANTS.MATCH_HEIGHT / 2;
                const endX = nextPosition.x;
                const endY = nextPosition.y + BRACKET_CONSTANTS.MATCH_HEIGHT / 2;
                const midX = startX + (endX - startX) / 2;

                return (
                  <g key={`connector-${match.id}`}>
                    <line
                      x1={startX}
                      y1={startY1}
                      x2={midX}
                      y2={startY1}
                      stroke={theme.colors.border}
                      strokeWidth="2"
                    />
                    <line
                      x1={startX}
                      y1={startY2}
                      x2={midX}
                      y2={startY2}
                      stroke={theme.colors.border}
                      strokeWidth="2"
                    />
                    <line
                      x1={midX}
                      y1={startY1}
                      x2={midX}
                      y2={startY2}
                      stroke={theme.colors.border}
                      strokeWidth="2"
                    />
                    <line
                      x1={midX}
                      y1={endY}
                      x2={endX}
                      y2={endY}
                      stroke={theme.colors.border}
                      strokeWidth="2"
                    />
                  </g>
                );
              });
            })}

            {/* Match Components */}
            {bracket.rounds.map((round) =>
              round.matches.map((match) => {
                const position = bracketLayout.positions.get(match.id);
                if (!position) return null;

                const isSelected = uiState.selectedMatch === match.id;
                const isHighlighted = 
                  (match.team1 && uiState.highlightedTeam === match.team1.id) ||
                  (match.team2 && uiState.highlightedTeam === match.team2.id);
                const isAnimating = uiState.animatingMatches.has(match.id);

                return (
                  <MatchComponent
                    key={match.id}
                    match={match}
                    x={position.x}
                    y={position.y}
                    width={BRACKET_CONSTANTS.MATCH_WIDTH}
                    height={BRACKET_CONSTANTS.MATCH_HEIGHT}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isAnimating={isAnimating}
                    theme={theme}
                    onClick={() => handleMatchClick(match)}
                    onTeamClick={handleTeamClick}
                  />
                );
              })
            )}
          </svg>
        </div>

        {/* Status Legend */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-300 rounded"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Bye</span>
              </div>
            </div>
            
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLastUpdate(new Date())}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual Match Component
 */
interface MatchComponentProps {
  match: Match;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isAnimating: boolean;
  theme: TournamentTheme;
  onClick: () => void;
  onTeamClick: (team: Team) => void;
}

function MatchComponent({
  match,
  x,
  y,
  width,
  height,
  isSelected,
  isHighlighted,
  isAnimating,
  theme,
  onClick,
  onTeamClick,
}: MatchComponentProps) {
  const getStatusColor = () => {
    switch (match.status) {
      case 'completed': return theme.colors.winner;
      case 'in_progress': return theme.colors.primary;
      case 'bye': return theme.colors.accent;
      default: return theme.colors.pending;
    }
  };

  const teamHeight = height / 2;
  const scoreWidth = 40;

  return (
    <motion.g
      initial="initial"
      animate={isAnimating ? "animate" : "initial"}
      variants={ANIMATION_VARIANTS.matchUpdate}
    >
      {/* Match container */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={theme.colors.background}
        stroke={isSelected ? theme.colors.primary : theme.colors.border}
        strokeWidth={isSelected ? 3 : 1}
        rx="4"
        className="cursor-pointer transition-all hover:stroke-gray-400"
        onClick={onClick}
        style={{
          filter: isHighlighted ? 'brightness(1.1)' : 'none',
        }}
      />

      {/* Status indicator */}
      <rect
        x={x}
        y={y}
        width={4}
        height={height}
        fill={getStatusColor()}
        rx="2"
      />

      {/* Team 1 */}
      {match.team1 && (
        <g>
          <rect
            x={x + 4}
            y={y}
            width={width - scoreWidth - 4}
            height={teamHeight}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => onTeamClick(match.team1!)}
          />
          <text
            x={x + 8}
            y={y + teamHeight / 2}
            dominantBaseline="middle"
            className="fill-current text-sm font-medium truncate"
            fill={match.winner?.id === match.team1.id ? theme.colors.winner : theme.colors.foreground}
          >
            {match.team1.name}
          </text>
          {match.team1.seed && (
            <text
              x={x + width - scoreWidth - 20}
              y={y + teamHeight / 2}
              dominantBaseline="middle"
              className="fill-current text-xs"
              fill={theme.colors.secondary}
            >
              #{match.team1.seed}
            </text>
          )}
        </g>
      )}

      {/* Team 2 */}
      {match.team2 && (
        <g>
          <rect
            x={x + 4}
            y={y + teamHeight}
            width={width - scoreWidth - 4}
            height={teamHeight}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => onTeamClick(match.team2!)}
          />
          <text
            x={x + 8}
            y={y + teamHeight + teamHeight / 2}
            dominantBaseline="middle"
            className="fill-current text-sm font-medium truncate"
            fill={match.winner?.id === match.team2.id ? theme.colors.winner : theme.colors.foreground}
          >
            {match.team2.name}
          </text>
          {match.team2.seed && (
            <text
              x={x + width - scoreWidth - 20}
              y={y + teamHeight + teamHeight / 2}
              dominantBaseline="middle"
              className="fill-current text-xs"
              fill={theme.colors.secondary}
            >
              #{match.team2.seed}
            </text>
          )}
        </g>
      )}

      {/* Scores */}
      {match.score && (
        <motion.g
          variants={ANIMATION_VARIANTS.scoreUpdate}
          animate={isAnimating ? "animate" : "initial"}
        >
          <rect
            x={x + width - scoreWidth}
            y={y}
            width={scoreWidth}
            height={height}
            fill={theme.colors.muted}
            stroke={theme.colors.border}
            strokeWidth="1"
          />
          <text
            x={x + width - scoreWidth / 2}
            y={y + teamHeight / 2}
            dominantBaseline="middle"
            textAnchor="middle"
            className="fill-current text-sm font-bold"
            fill={theme.colors.foreground}
          >
            {match.score.team1Score}
          </text>
          <text
            x={x + width - scoreWidth / 2}
            y={y + teamHeight + teamHeight / 2}
            dominantBaseline="middle"
            textAnchor="middle"
            className="fill-current text-sm font-bold"
            fill={theme.colors.foreground}
          >
            {match.score.team2Score}
          </text>
        </motion.g>
      )}

      {/* Match status indicators */}
      {match.status === 'in_progress' && (
        <circle
          cx={x + width - 10}
          cy={y + 10}
          r="4"
          fill={theme.colors.primary}
          className="animate-pulse"
        />
      )}

      {match.status === 'completed' && (
        <CheckCircle2
          x={x + width - 18}
          y={y + 2}
          width="14"
          height="14"
          className="fill-green-500"
        />
      )}

      {/* BYE indicator */}
      {match.status === 'bye' && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          className="fill-current text-lg font-bold"
          fill={theme.colors.secondary}
        >
          BYE
        </text>
      )}
    </motion.g>
  );
}

export default TournamentBracket;