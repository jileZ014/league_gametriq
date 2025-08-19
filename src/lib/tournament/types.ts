/**
 * Tournament Types and Utilities
 * Comprehensive type definitions for tournament management system
 */

export * from './tournament-engine';

// Additional UI-specific types
export interface BracketPosition {
  x: number;
  y: number;
  round: number;
  matchIndex: number;
}

export interface BracketLayout {
  width: number;
  height: number;
  matchWidth: number;
  matchHeight: number;
  roundSpacing: number;
  matchSpacing: number;
  positions: Map<string, BracketPosition>;
}

export interface DragDropTeam {
  id: string;
  name: string;
  isPlaceholder?: boolean;
  originalPosition?: number;
}

export interface TournamentTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
    winner: string;
    loser: string;
    pending: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export interface TournamentView {
  id: string;
  name: string;
  showSeeds: boolean;
  showScores: boolean;
  showTimes: boolean;
  showCourts: boolean;
  compactMode: boolean;
  theme: TournamentTheme;
}

// Bracket visualization constants
export const BRACKET_CONSTANTS = {
  MATCH_WIDTH: 200,
  MATCH_HEIGHT: 60,
  ROUND_SPACING: 250,
  MATCH_SPACING: 80,
  MIN_BRACKET_WIDTH: 800,
  MIN_BRACKET_HEIGHT: 600,
  CONNECTOR_CURVE: 20,
  TEAM_HEIGHT: 25,
  SCORE_WIDTH: 40,
} as const;

// Tournament format configurations
export const TOURNAMENT_FORMATS = {
  single_elimination: {
    name: 'Single Elimination',
    description: 'Win or go home format',
    minTeams: 2,
    maxTeams: 128,
    guaranteedGames: 1,
    supportsByes: true,
    supportsSeeding: true,
    supportsConsolation: true,
  },
  double_elimination: {
    name: 'Double Elimination',
    description: 'Two losses eliminate a team',
    minTeams: 3,
    maxTeams: 64,
    guaranteedGames: 2,
    supportsByes: true,
    supportsSeeding: true,
    supportsConsolation: false,
  },
  round_robin: {
    name: 'Round Robin',
    description: 'Every team plays every other team',
    minTeams: 3,
    maxTeams: 16,
    guaranteedGames: (teams: number) => teams - 1,
    supportsByes: false,
    supportsSeeding: false,
    supportsConsolation: false,
  },
  pool_play: {
    name: 'Pool Play + Elimination',
    description: 'Pool play followed by elimination bracket',
    minTeams: 6,
    maxTeams: 32,
    guaranteedGames: 3,
    supportsByes: false,
    supportsSeeding: true,
    supportsConsolation: true,
  },
  three_game_guarantee: {
    name: '3-Game Guarantee',
    description: 'Every team plays at least 3 games',
    minTeams: 4,
    maxTeams: 32,
    guaranteedGames: 3,
    supportsByes: false,
    supportsSeeding: true,
    supportsConsolation: true,
  },
} as const;

// Seeding method configurations
export const SEEDING_METHODS = {
  manual: {
    name: 'Manual Seeding',
    description: 'Manually assign seed numbers',
    requiresInput: true,
  },
  power_rating: {
    name: 'Power Rating',
    description: 'Seed by power rating/strength',
    requiresInput: false,
  },
  win_percentage: {
    name: 'Win Percentage',
    description: 'Seed by win-loss record',
    requiresInput: false,
  },
  random: {
    name: 'Random',
    description: 'Random team placement',
    requiresInput: false,
  },
  regional: {
    name: 'Regional Balance',
    description: 'Balance teams by region',
    requiresInput: false,
  },
  divisional: {
    name: 'Divisional Balance',
    description: 'Balance teams by division',
    requiresInput: false,
  },
} as const;

// Tiebreaker configurations
export const TIEBREAKER_RULES = {
  head_to_head: {
    name: 'Head-to-Head',
    description: 'Direct matchup results',
    order: 1,
  },
  point_differential: {
    name: 'Point Differential',
    description: 'Points scored minus points allowed',
    order: 2,
  },
  points_scored: {
    name: 'Points Scored',
    description: 'Total points scored',
    order: 3,
  },
  random: {
    name: 'Random',
    description: 'Random selection',
    order: 4,
  },
} as const;

// UI State types
export interface BracketUIState {
  selectedMatch: string | null;
  highlightedTeam: string | null;
  draggedTeam: DragDropTeam | null;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  showTooltip: boolean;
  tooltipContent: string;
  tooltipPosition: { x: number; y: number };
}

export interface TournamentFilters {
  status: string[];
  rounds: number[];
  courts: string[];
  search: string;
}

// Animation types for smooth transitions
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export const ANIMATIONS = {
  bracket: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  match: {
    duration: 200,
    easing: 'ease-in-out',
  },
  team: {
    duration: 150,
    easing: 'ease-out',
  },
  score: {
    duration: 500,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// Touch gesture types for mobile
export interface TouchGesture {
  type: 'tap' | 'double-tap' | 'long-press' | 'pan' | 'pinch';
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  deltaX: number;
  deltaY: number;
  scale?: number;
  timestamp: number;
}

// Print/Export options
export interface ExportOptions {
  format: 'pdf' | 'png' | 'svg' | 'jpg';
  quality: 'low' | 'medium' | 'high';
  orientation: 'portrait' | 'landscape';
  includeScores: boolean;
  includeSeeds: boolean;
  includeTimes: boolean;
  includeCourts: boolean;
  paperSize: 'letter' | 'legal' | 'tabloid' | 'a4' | 'a3';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// Real-time update types
export interface TournamentUpdate {
  type: 'match_start' | 'match_end' | 'score_update' | 'team_advance' | 'tournament_complete';
  tournamentId: string;
  matchId?: string;
  teamId?: string;
  data: any;
  timestamp: Date;
}

// WebSocket message types
export interface WebSocketMessage {
  event: string;
  payload: TournamentUpdate;
  room: string;
}

// Validation schemas (can be used with Zod)
export interface TournamentValidation {
  nameMinLength: number;
  nameMaxLength: number;
  minTeams: number;
  maxTeams: number;
  requiredFields: string[];
}

export const VALIDATION_RULES: Record<string, TournamentValidation> = {
  single_elimination: {
    nameMinLength: 3,
    nameMaxLength: 100,
    minTeams: 2,
    maxTeams: 128,
    requiredFields: ['name', 'teams', 'type'],
  },
  double_elimination: {
    nameMinLength: 3,
    nameMaxLength: 100,
    minTeams: 3,
    maxTeams: 64,
    requiredFields: ['name', 'teams', 'type'],
  },
  round_robin: {
    nameMinLength: 3,
    nameMaxLength: 100,
    minTeams: 3,
    maxTeams: 16,
    requiredFields: ['name', 'teams', 'type'],
  },
  pool_play: {
    nameMinLength: 3,
    nameMaxLength: 100,
    minTeams: 6,
    maxTeams: 32,
    requiredFields: ['name', 'teams', 'type'],
  },
  three_game_guarantee: {
    nameMinLength: 3,
    nameMaxLength: 100,
    minTeams: 4,
    maxTeams: 32,
    requiredFields: ['name', 'teams', 'type'],
  },
};

// Default theme
export const DEFAULT_TOURNAMENT_THEME: TournamentTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#f59e0b',
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#f8fafc',
    border: '#e2e8f0',
    winner: '#22c55e',
    loser: '#ef4444',
    pending: '#94a3b8',
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

// Error types
export class TournamentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TournamentError';
  }
}

export class BracketGenerationError extends TournamentError {
  constructor(message: string, details?: any) {
    super(message, 'BRACKET_GENERATION_ERROR', details);
    this.name = 'BracketGenerationError';
  }
}

export class InvalidTournamentError extends TournamentError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_TOURNAMENT_ERROR', details);
    this.name = 'InvalidTournamentError';
  }
}

// Utility types
export type TournamentStatus = 'draft' | 'setup' | 'in_progress' | 'completed' | 'cancelled';
export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'bye';
export type TeamStatus = 'active' | 'eliminated' | 'winner' | 'bye';

// Hook return types
export interface UseTournamentReturn {
  tournament: Tournament | null;
  loading: boolean;
  error: string | null;
  updateTournament: (updates: Partial<Tournament>) => void;
  advanceTeam: (matchId: string, winner: Team, loser: Team) => void;
  resetTournament: () => void;
}

export interface UseBracketReturn {
  bracket: BracketStructure | null;
  layout: BracketLayout | null;
  uiState: BracketUIState;
  actions: {
    selectMatch: (matchId: string | null) => void;
    highlightTeam: (teamId: string | null) => void;
    setZoom: (level: number) => void;
    pan: (deltaX: number, deltaY: number) => void;
    resetView: () => void;
  };
}