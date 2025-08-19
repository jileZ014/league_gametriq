'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Tournament, 
  Match, 
  Team, 
  BracketStructure,
  TournamentEngine,
  UseTournamentReturn,
  UseBracketReturn,
  BracketUIState,
  BracketLayout,
  BRACKET_CONSTANTS
} from '@/lib/tournament/types';
import { 
  TournamentStateManager,
  TournamentEventEmitter,
  TournamentEvent,
  TournamentEventType,
  getGlobalRealtimeManager
} from '@/lib/tournament/realtime';

/**
 * Hook for managing tournament state with real-time updates
 */
export function useTournament(
  tournamentId: string | null,
  enableRealtime: boolean = true
): UseTournamentReturn {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const stateManagerRef = useRef<TournamentStateManager | null>(null);

  // Load tournament data
  const loadTournament = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // In real app, this would be an API call
      const response = await fetch(`/api/tournaments/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load tournament');
      }
      
      const tournamentData = await response.json();
      setTournament(tournamentData);
      
      // Create state manager
      const stateManager = new TournamentStateManager(tournamentData);
      stateManagerRef.current = stateManager;
      
      // Connect to real-time if enabled
      if (enableRealtime) {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
        stateManager.connectRealtime(wsUrl);
      }
      
      // Subscribe to state changes
      const unsubscribe = stateManager.on('score_update', () => {
        setTournament({ ...stateManager.getTournament() });
      });
      
      return () => {
        unsubscribe();
        stateManager.disconnectRealtime();
      };
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, [enableRealtime]);

  // Load tournament when ID changes
  useEffect(() => {
    if (tournamentId) {
      const cleanup = loadTournament(tournamentId);
      return () => {
        cleanup?.then(fn => fn?.());
      };
    }
  }, [tournamentId, loadTournament]);

  // Update tournament
  const updateTournament = useCallback((updates: Partial<Tournament>) => {
    if (tournament) {
      const updatedTournament = { ...tournament, ...updates };
      setTournament(updatedTournament);
      
      if (stateManagerRef.current) {
        (stateManagerRef.current as any).tournament = updatedTournament;
      }
    }
  }, [tournament]);

  // Advance team
  const advanceTeam = useCallback((matchId: string, winner: Team, loser: Team) => {
    if (stateManagerRef.current) {
      stateManagerRef.current.advanceTeam(matchId, winner, loser);
      setTournament({ ...stateManagerRef.current.getTournament() });
    }
  }, []);

  // Reset tournament
  const resetTournament = useCallback(() => {
    setTournament(null);
    setError(null);
    
    if (stateManagerRef.current) {
      stateManagerRef.current.disconnectRealtime();
      stateManagerRef.current = null;
    }
  }, []);

  return {
    tournament,
    loading,
    error,
    updateTournament,
    advanceTeam,
    resetTournament,
  };
}

/**
 * Hook for managing bracket UI state and interactions
 */
export function useBracket(bracket: BracketStructure | null): UseBracketReturn {
  const [layout, setLayout] = useState<BracketLayout | null>(null);
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

  // Calculate bracket layout
  const calculateLayout = useCallback((): BracketLayout | null => {
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

  // Actions
  const selectMatch = useCallback((matchId: string | null) => {
    setUIState(prev => ({ ...prev, selectedMatch: matchId }));
  }, []);

  const highlightTeam = useCallback((teamId: string | null) => {
    setUIState(prev => ({ ...prev, highlightedTeam: teamId }));
  }, []);

  const setZoom = useCallback((level: number) => {
    setUIState(prev => ({ 
      ...prev, 
      zoomLevel: Math.max(0.25, Math.min(3, level)) 
    }));
  }, []);

  const pan = useCallback((deltaX: number, deltaY: number) => {
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
      selectedMatch: null,
      highlightedTeam: null,
    }));
  }, []);

  return {
    bracket,
    layout,
    uiState,
    actions: {
      selectMatch,
      highlightTeam,
      setZoom,
      pan,
      resetView,
    },
  };
}

/**
 * Hook for real-time tournament events
 */
export function useTournamentEvents(
  tournamentId: string | null,
  eventTypes?: TournamentEventType[]
) {
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;

    const realtimeManager = getGlobalRealtimeManager(
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    );

    setIsConnected(realtimeManager.getConnectionStatus());

    const subscriberId = realtimeManager.subscribe(
      tournamentId,
      (event) => {
        setEvents(prev => [...prev, event].slice(-50)); // Keep last 50 events
      },
      eventTypes
    );

    // Monitor connection status
    const checkConnection = () => {
      setIsConnected(realtimeManager.getConnectionStatus());
    };

    const connectionInterval = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(connectionInterval);
      realtimeManager.unsubscribe(subscriberId);
    };
  }, [tournamentId, eventTypes]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isConnected,
    clearEvents,
  };
}

/**
 * Hook for tournament statistics
 */
export function useTournamentStats(tournament: Tournament | null) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!tournament) {
      setStats(null);
      return;
    }

    const matches = tournament.matches || [];
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const inProgressMatches = matches.filter(m => m.status === 'in_progress').length;
    const pendingMatches = matches.filter(m => m.status === 'pending').length;
    
    // Team statistics
    const teamStats = tournament.teams.map(team => {
      const teamMatches = matches.filter(m => 
        (m.team1?.id === team.id || m.team2?.id === team.id) && m.status === 'completed'
      );
      
      const wins = teamMatches.filter(m => m.winner?.id === team.id).length;
      const losses = teamMatches.length - wins;
      
      let totalPoints = 0;
      let totalPointsAllowed = 0;
      
      teamMatches.forEach(match => {
        if (match.score) {
          if (match.team1?.id === team.id) {
            totalPoints += match.score.team1Score;
            totalPointsAllowed += match.score.team2Score;
          } else {
            totalPoints += match.score.team2Score;
            totalPointsAllowed += match.score.team1Score;
          }
        }
      });

      return {
        team,
        matchesPlayed: teamMatches.length,
        wins,
        losses,
        winPercentage: teamMatches.length > 0 ? wins / teamMatches.length : 0,
        totalPoints,
        totalPointsAllowed,
        pointDifferential: totalPoints - totalPointsAllowed,
        averagePoints: teamMatches.length > 0 ? totalPoints / teamMatches.length : 0,
        averagePointsAllowed: teamMatches.length > 0 ? totalPointsAllowed / teamMatches.length : 0,
      };
    });

    // Round statistics
    const roundStats = tournament.bracket?.rounds.map(round => ({
      roundNumber: round.roundNumber,
      name: round.name,
      totalMatches: round.matches.length,
      completedMatches: round.matches.filter(m => m.status === 'completed').length,
      inProgressMatches: round.matches.filter(m => m.status === 'in_progress').length,
      pendingMatches: round.matches.filter(m => m.status === 'pending').length,
      isComplete: round.isComplete,
    })) || [];

    setStats({
      overview: {
        totalMatches,
        completedMatches,
        inProgressMatches,
        pendingMatches,
        completionPercentage: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
        teamsRemaining: tournament.teams.filter(team => 
          !matches.some(m => m.loser?.id === team.id)
        ).length,
      },
      teams: teamStats.sort((a, b) => b.winPercentage - a.winPercentage),
      rounds: roundStats,
      topScorers: teamStats
        .filter(t => t.matchesPlayed > 0)
        .sort((a, b) => b.averagePoints - a.averagePoints)
        .slice(0, 5),
      bestDefense: teamStats
        .filter(t => t.matchesPlayed > 0)
        .sort((a, b) => a.averagePointsAllowed - b.averagePointsAllowed)
        .slice(0, 5),
    });
  }, [tournament]);

  return stats;
}

/**
 * Hook for managing scorekeeper functionality
 */
export function useScorekeeperMode(tournament: Tournament | null, matchId: string | null) {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const stateManagerRef = useRef<TournamentStateManager | null>(null);

  useEffect(() => {
    if (tournament && matchId) {
      const match = tournament.matches?.find(m => m.id === matchId);
      setCurrentMatch(match || null);
      
      if (tournament && !stateManagerRef.current) {
        stateManagerRef.current = new TournamentStateManager(tournament);
        stateManagerRef.current.connectRealtime(
          process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
        );
      }
    }
  }, [tournament, matchId]);

  const updateScore = useCallback((team1Score: number, team2Score: number) => {
    if (currentMatch && stateManagerRef.current) {
      stateManagerRef.current.updateMatchScore(currentMatch.id, team1Score, team2Score);
    }
  }, [currentMatch]);

  const startMatch = useCallback(() => {
    if (currentMatch && stateManagerRef.current) {
      stateManagerRef.current.startMatch(currentMatch.id);
      setIsScoring(true);
    }
  }, [currentMatch]);

  const endMatch = useCallback((winner: Team, loser: Team) => {
    if (currentMatch && stateManagerRef.current) {
      stateManagerRef.current.endMatch(currentMatch.id);
      stateManagerRef.current.advanceTeam(currentMatch.id, winner, loser);
      setIsScoring(false);
    }
  }, [currentMatch]);

  return {
    currentMatch,
    isScoring,
    updateScore,
    startMatch,
    endMatch,
  };
}