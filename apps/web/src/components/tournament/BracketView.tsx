'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Tournament, 
  Match, 
  Team, 
  BracketStructure, 
  BracketLayout, 
  BracketUIState,
  BRACKET_CONSTANTS,
  ANIMATIONS,
  TouchGesture,
  TournamentTheme,
  DEFAULT_TOURNAMENT_THEME
} from '@/lib/tournament/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Share2, 
  Settings,
  Maximize2,
  Play,
  Trophy
} from 'lucide-react';

interface BracketViewProps {
  tournament: Tournament;
  bracket: BracketStructure;
  onMatchClick?: (match: Match) => void;
  onTeamClick?: (team: Team) => void;
  showControls?: boolean;
  interactive?: boolean;
  theme?: TournamentTheme;
  className?: string;
}

export function BracketView({
  tournament,
  bracket,
  onMatchClick,
  onTeamClick,
  showControls = true,
  interactive = true,
  theme = DEFAULT_TOURNAMENT_THEME,
  className = '',
}: BracketViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [uiState, setUIState] = useState<BracketUIState>({
    selectedMatch: null,
    highlightedTeam: null,
    draggedTeam: null,
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    showTooltip: false,
    tooltipContent: '',
    tooltipPosition: { x: 0, y: 0 },
  });

  const [layout, setLayout] = useState<BracketLayout | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // Calculate bracket layout
  const calculateLayout = useCallback((): BracketLayout => {
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

    const positions = new Map<string, any>();
    
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

    return {
      width,
      height,
      matchWidth: BRACKET_CONSTANTS.MATCH_WIDTH,
      matchHeight: BRACKET_CONSTANTS.MATCH_HEIGHT,
      roundSpacing: BRACKET_CONSTANTS.ROUND_SPACING,
      matchSpacing: BRACKET_CONSTANTS.MATCH_SPACING,
      positions,
    };
  }, [bracket]);

  // Update layout when bracket changes
  useEffect(() => {
    setLayout(calculateLayout());
  }, [calculateLayout]);

  // Handle zoom
  const handleZoom = useCallback((delta: number) => {
    setUIState(prev => ({
      ...prev,
      zoomLevel: Math.max(0.25, Math.min(3, prev.zoomLevel + delta)),
    }));
  }, []);

  // Handle pan
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    setUIState(prev => ({
      ...prev,
      panOffset: {
        x: prev.panOffset.x + deltaX,
        y: prev.panOffset.y + deltaY,
      },
    }));
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 },
    }));
  }, []);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && interactive) { // Left click
      setIsPanning(true);
      setTouchStart({ x: e.clientX, y: e.clientY });
    }
  }, [interactive]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && touchStart) {
      const deltaX = e.clientX - touchStart.x;
      const deltaY = e.clientY - touchStart.y;
      handlePan(deltaX * 0.5, deltaY * 0.5);
      setTouchStart({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, touchStart, handlePan]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setTouchStart(null);
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  }, [handleZoom]);

  // Handle touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStart) {
      const deltaX = e.touches[0].clientX - touchStart.x;
      const deltaY = e.touches[0].clientY - touchStart.y;
      handlePan(deltaX * 0.3, deltaY * 0.3);
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, [touchStart, handlePan]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
  }, []);

  // Match click handler
  const handleMatchClick = useCallback((match: Match) => {
    setUIState(prev => ({
      ...prev,
      selectedMatch: prev.selectedMatch === match.id ? null : match.id,
    }));
    onMatchClick?.(match);
  }, [onMatchClick]);

  // Team click handler
  const handleTeamClick = useCallback((team: Team) => {
    setUIState(prev => ({
      ...prev,
      highlightedTeam: prev.highlightedTeam === team.id ? null : team.id,
    }));
    onTeamClick?.(team);
  }, [onTeamClick]);

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoom(0.2)}
            className="bg-white/90 backdrop-blur-sm"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoom(-0.2)}
            className="bg-white/90 backdrop-blur-sm"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
            className="bg-white/90 backdrop-blur-sm"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Tournament Info */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="p-3 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-sm">{tournament.name}</h3>
              <p className="text-xs text-gray-600">
                {tournament.teams.length} teams • {tournament.type.replace('_', ' ')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bracket Container */}
      <div 
        ref={containerRef}
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{
            transform: `scale(${uiState.zoomLevel}) translate(${uiState.panOffset.x}px, ${uiState.panOffset.y}px)`,
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {/* Background */}
          <rect
            width={layout.width}
            height={layout.height}
            fill={theme.colors.background}
            stroke={theme.colors.border}
            strokeWidth="1"
          />

          {/* Grid */}
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
          <rect width={layout.width} height={layout.height} fill="url(#grid)" />

          {/* Round Labels */}
          {bracket.rounds.map((round, index) => {
            const position = layout.positions.get(round.matches[0]?.id);
            if (!position) return null;

            return (
              <text
                key={`round-${index}`}
                x={position.x + layout.matchWidth / 2}
                y={30}
                textAnchor="middle"
                className="fill-current text-sm font-semibold"
                fill={theme.colors.foreground}
              >
                {round.name || `Round ${round.roundNumber}`}
              </text>
            );
          })}

          {/* Connectors */}
          {bracket.rounds.map((round, roundIndex) => {
            if (roundIndex === bracket.rounds.length - 1) return null;

            return round.matches.map((match, matchIndex) => {
              if (matchIndex % 2 === 1) return null; // Only draw from first match of pair

              const match1Position = layout.positions.get(match.id);
              const match2 = round.matches[matchIndex + 1];
              const match2Position = match2 ? layout.positions.get(match2.id) : null;
              
              if (!match1Position || !match2Position) return null;

              const nextRound = bracket.rounds[roundIndex + 1];
              const nextMatch = nextRound?.matches[Math.floor(matchIndex / 2)];
              const nextPosition = nextMatch ? layout.positions.get(nextMatch.id) : null;

              if (!nextPosition) return null;

              const startX = match1Position.x + layout.matchWidth;
              const startY1 = match1Position.y + layout.matchHeight / 2;
              const startY2 = match2Position.y + layout.matchHeight / 2;
              const endX = nextPosition.x;
              const endY = nextPosition.y + layout.matchHeight / 2;
              const midX = startX + (endX - startX) / 2;

              return (
                <g key={`connector-${match.id}`}>
                  {/* Horizontal lines from matches */}
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
                  {/* Vertical connector */}
                  <line
                    x1={midX}
                    y1={startY1}
                    x2={midX}
                    y2={startY2}
                    stroke={theme.colors.border}
                    strokeWidth="2"
                  />
                  {/* Line to next match */}
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

          {/* Matches */}
          {bracket.rounds.map((round) =>
            round.matches.map((match) => {
              const position = layout.positions.get(match.id);
              if (!position) return null;

              const isSelected = uiState.selectedMatch === match.id;
              const isHighlighted = 
                match.team1 && uiState.highlightedTeam === match.team1.id ||
                match.team2 && uiState.highlightedTeam === match.team2.id;

              return (
                <MatchComponent
                  key={match.id}
                  match={match}
                  x={position.x}
                  y={position.y}
                  width={layout.matchWidth}
                  height={layout.matchHeight}
                  isSelected={isSelected}
                  isHighlighted={isHighlighted}
                  theme={theme}
                  onClick={() => handleMatchClick(match)}
                  onTeamClick={handleTeamClick}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="p-3 bg-white/90 backdrop-blur-sm">
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
          </div>
        </Card>
      </div>
    </div>
  );
}

// Match Component
interface MatchComponentProps {
  match: Match;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  isHighlighted: boolean;
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
  theme,
  onClick,
  onTeamClick,
}: MatchComponentProps) {
  const getStatusColor = () => {
    switch (match.status) {
      case 'completed': return theme.colors.winner;
      case 'in_progress': return theme.colors.primary;
      case 'bye': return theme.colors.muted;
      default: return theme.colors.pending;
    }
  };

  const teamHeight = height / 2;
  const scoreWidth = 40;

  return (
    <g>
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
        <g>
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
        </g>
      )}

      {/* Match status indicator */}
      {match.status === 'in_progress' && (
        <circle
          cx={x + width - 10}
          cy={y + 10}
          r="4"
          fill={theme.colors.primary}
          className="animate-pulse"
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
    </g>
  );
}