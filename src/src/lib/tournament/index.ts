/**
 * Tournament System - Main Export File
 * Comprehensive tournament bracket builder for Legacy Youth Sports
 */

// Core engine and types
export * from './tournament-engine';
export * from './types';
export * from './realtime';

// Re-export commonly used types for convenience
export type {
  Tournament,
  Team,
  Match,
  BracketStructure,
  TournamentType,
  SeedingMethod,
  TournamentSettings,
  TournamentTheme,
  BracketLayout,
  BracketUIState,
} from './types';

// Re-export core classes
export {
  TournamentEngine,
  TournamentFactory,
} from './tournament-engine';

export {
  TournamentStateManager,
  TournamentRealtimeManager,
  TournamentEventEmitter,
} from './realtime';

// Constants and configurations
export {
  TOURNAMENT_FORMATS,
  SEEDING_METHODS,
  TIEBREAKER_RULES,
  BRACKET_CONSTANTS,
  VALIDATION_RULES,
  DEFAULT_TOURNAMENT_THEME,
  ANIMATIONS,
} from './types';

// Utility functions
export const TournamentUtils = {
  /**
   * Calculate win percentage for a team
   */
  calculateWinPercentage: (wins: number, losses: number, ties: number = 0): number => {
    const totalGames = wins + losses + ties;
    if (totalGames === 0) return 0;
    return ((wins + ties * 0.5) / totalGames) * 100;
  },

  /**
   * Format team record as string
   */
  formatRecord: (wins: number, losses: number, ties?: number): string => {
    if (ties && ties > 0) {
      return `${wins}-${losses}-${ties}`;
    }
    return `${wins}-${losses}`;
  },

  /**
   * Get next power of 2 for bracket sizing
   */
  getNextPowerOfTwo: (n: number): number => {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  },

  /**
   * Calculate number of byes needed
   */
  calculateByes: (teamCount: number): number => {
    const bracketSize = TournamentUtils.getNextPowerOfTwo(teamCount);
    return bracketSize - teamCount;
  },

  /**
   * Get tournament capacity for different formats
   */
  getTournamentCapacity: (format: TournamentType): { min: number; max: number } => {
    const formats = {
      single_elimination: { min: 2, max: 128 },
      double_elimination: { min: 3, max: 64 },
      round_robin: { min: 3, max: 16 },
      pool_play: { min: 6, max: 32 },
      three_game_guarantee: { min: 4, max: 32 },
    };
    return formats[format] || { min: 2, max: 32 };
  },

  /**
   * Validate tournament configuration
   */
  validateTournament: (tournament: Partial<Tournament>): string[] => {
    const errors: string[] = [];

    if (!tournament.name || tournament.name.length < 3) {
      errors.push('Tournament name must be at least 3 characters');
    }

    if (!tournament.type) {
      errors.push('Tournament type is required');
    }

    if (!tournament.teams || tournament.teams.length === 0) {
      errors.push('At least one team is required');
    }

    if (tournament.type && tournament.teams) {
      const capacity = TournamentUtils.getTournamentCapacity(tournament.type);
      if (tournament.teams.length < capacity.min) {
        errors.push(`${tournament.type} requires at least ${capacity.min} teams`);
      }
      if (tournament.teams.length > capacity.max) {
        errors.push(`${tournament.type} supports maximum ${capacity.max} teams`);
      }
    }

    return errors;
  },

  /**
   * Generate tournament schedule
   */
  generateSchedule: (
    tournament: Tournament,
    startTime: Date,
    gameLength: number = 60,
    breakTime: number = 15,
    courtsAvailable: number = 1
  ): Match[] => {
    const matches = [...(tournament.matches || [])];
    let currentTime = new Date(startTime);
    
    // Sort matches by round to schedule in order
    matches.sort((a, b) => a.roundNumber - b.roundNumber);
    
    let courtIndex = 0;
    matches.forEach((match, index) => {
      match.scheduledTime = new Date(currentTime);
      match.court = `${courtIndex + 1}`;
      
      courtIndex = (courtIndex + 1) % courtsAvailable;
      
      // Move to next time slot if all courts are scheduled
      if (courtIndex === 0) {
        currentTime = new Date(currentTime.getTime() + (gameLength + breakTime) * 60000);
      }
    });
    
    return matches;
  },

  /**
   * Export bracket to different formats
   */
  exportBracket: {
    toJSON: (tournament: Tournament): string => {
      return JSON.stringify(tournament, null, 2);
    },
    
    toCSV: (tournament: Tournament): string => {
      const matches = tournament.matches || [];
      const headers = ['Round', 'Match', 'Team 1', 'Team 2', 'Score', 'Winner', 'Status', 'Court', 'Time'];
      
      const rows = matches.map(match => [
        match.roundNumber,
        match.bracketPosition,
        match.team1?.name || 'TBD',
        match.team2?.name || 'TBD',
        match.score ? `${match.score.team1Score}-${match.score.team2Score}` : '',
        match.winner?.name || '',
        match.status,
        match.court || '',
        match.scheduledTime ? match.scheduledTime.toISOString() : '',
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    },
  },

  /**
   * Calculate tournament statistics
   */
  calculateStats: (tournament: Tournament) => {
    const matches = tournament.matches || [];
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const inProgressMatches = matches.filter(m => m.status === 'in_progress').length;
    
    const teamStats = tournament.teams.map(team => {
      const teamMatches = matches.filter(m => 
        (m.team1?.id === team.id || m.team2?.id === team.id) && m.status === 'completed'
      );
      
      const wins = teamMatches.filter(m => m.winner?.id === team.id).length;
      const losses = teamMatches.length - wins;
      
      return {
        team,
        matchesPlayed: teamMatches.length,
        wins,
        losses,
        winPercentage: teamMatches.length > 0 ? (wins / teamMatches.length) * 100 : 0,
      };
    });

    return {
      totalMatches,
      completedMatches,
      inProgressMatches,
      pendingMatches: totalMatches - completedMatches - inProgressMatches,
      completionPercentage: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
      teams: teamStats.sort((a, b) => b.winPercentage - a.winPercentage),
    };
  },
};

// Error classes
export {
  TournamentError,
  BracketGenerationError,
  InvalidTournamentError,
} from './types';