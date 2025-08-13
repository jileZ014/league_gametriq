/**
 * WebSocket Type Definitions for Client
 * Mirrors server types for consistency across the platform
 */

// WebSocket Events
export enum WebSocketEvent {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  RECONNECT = 'reconnect',
  
  // Game events
  SUBSCRIBE_GAME = 'subscribe_game',
  UNSUBSCRIBE_GAME = 'unsubscribe_game',
  GAME_UPDATE = 'game_update',
  UPDATE_SCORE = 'update_score',
  GAME_START = 'game_start',
  GAME_END = 'game_end',
  QUARTER_START = 'quarter_start',
  QUARTER_END = 'quarter_end',
  TIMEOUT_CALLED = 'timeout_called',
  FOUL_CALLED = 'foul_called',
  SUBSTITUTION = 'substitution',
  
  // Tournament events
  SUBSCRIBE_TOURNAMENT = 'subscribe_tournament',
  UNSUBSCRIBE_TOURNAMENT = 'unsubscribe_tournament',
  TOURNAMENT_UPDATE = 'tournament_update',
  BRACKET_UPDATE = 'bracket_update',
  MATCH_COMPLETE = 'match_complete',
  ROUND_COMPLETE = 'round_complete',
  
  // Notification events
  NOTIFICATION = 'notification',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  REFEREE_ASSIGNMENT = 'referee_assignment',
  GAME_REMINDER = 'game_reminder',
  
  // Admin events
  METRICS_UPDATE = 'metrics_update',
  SYSTEM_STATUS = 'system_status',
  CONNECTION_STATS = 'connection_stats',
}

// WebSocket Namespaces
export enum WebSocketNamespace {
  DEFAULT = '/',
  GAMES = '/games',
  TOURNAMENTS = '/tournaments',
  ADMIN = '/admin',
  NOTIFICATIONS = '/notifications',
}

// Game Update Payloads
export interface GameUpdatePayload {
  gameId: string;
  type: 'score' | 'foul' | 'timeout' | 'substitution' | 'quarter_change' | 'game_status';
  timestamp: string;
  clientTimestamp?: number;
  data: {
    homeScore?: number;
    awayScore?: number;
    quarter?: number;
    timeRemaining?: string;
    teamFouls?: {
      home: number;
      away: number;
    };
    players?: {
      playerId: string;
      action: string;
      stats?: Record<string, any>;
    }[];
    status?: 'scheduled' | 'in_progress' | 'halftime' | 'finished' | 'postponed';
  };
  metadata?: {
    updatedBy?: string;
    updateSource?: 'scorekeeper' | 'referee' | 'admin' | 'system';
    notes?: string;
  };
}

// Tournament Update Payloads
export interface TournamentUpdatePayload {
  tournamentId: string;
  type: 'bracket' | 'match_result' | 'schedule_change' | 'team_advance' | 'tournament_status';
  timestamp?: string;
  data: {
    bracket?: BracketData;
    matchId?: string;
    matchResult?: {
      winnerId: string;
      loserId: string;
      homeScore: number;
      awayScore: number;
    };
    nextMatch?: {
      matchId: string;
      scheduledTime: string;
      court: string;
    };
    status?: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  };
  metadata?: {
    updatedBy?: string;
    reason?: string;
  };
}

// Bracket Data Structure
export interface BracketData {
  rounds: BracketRound[];
  teams: BracketTeam[];
  currentRound: number;
  format: 'single_elimination' | 'double_elimination' | 'round_robin' | 'pool_play';
}

export interface BracketRound {
  roundNumber: number;
  name: string;
  matches: BracketMatch[];
  startTime?: string;
  endTime?: string;
}

export interface BracketMatch {
  matchId: string;
  roundNumber: number;
  position: number;
  homeTeam?: BracketTeam;
  awayTeam?: BracketTeam;
  winner?: string;
  score?: {
    home: number;
    away: number;
  };
  scheduledTime?: string;
  court?: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed';
}

export interface BracketTeam {
  teamId: string;
  name: string;
  seed?: number;
  record?: {
    wins: number;
    losses: number;
  };
}

// Notification Payloads
export interface NotificationPayload {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'game_reminder' | 'assignment' | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
  actions?: NotificationAction[];
  expiresAt?: string;
  persistent?: boolean;
}

export interface NotificationAction {
  label: string;
  action: string;
  data?: Record<string, any>;
}

// Metrics Payloads
export interface MetricsPayload {
  timestamp: string;
  connections: {
    total: number;
    byNamespace: Record<string, number>;
    byOrganization: Record<string, number>;
    byRole: Record<string, number>;
  };
  messages: {
    sent: number;
    received: number;
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
  };
  rooms: {
    total: number;
    byType: Record<string, number>;
    topRooms: Array<{
      room: string;
      subscribers: number;
    }>;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    eventLoopLag: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    recentErrors: Array<{
      timestamp: string;
      type: string;
      message: string;
    }>;
  };
}

// WebSocket Response Types
export interface WebSocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Message Queue for Offline Handling
export interface QueuedMessage {
  id: string;
  userId: string;
  event: WebSocketEvent;
  payload: any;
  timestamp: string;
  attempts: number;
  maxAttempts: number;
  nextRetry?: string;
}

// Client Configuration
export interface WebSocketClientConfig {
  url: string;
  namespaces: string[];
  auth: {
    token: string;
  };
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  timeout: number;
  transports: ('websocket' | 'polling')[];
  autoConnect: boolean;
}

// Connection State
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// WebSocket Hook Return Type
export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionState: ConnectionState;
  subscribe: (event: WebSocketEvent, handler: Function) => void;
  unsubscribe: (event: WebSocketEvent, handler: Function) => void;
  emit: (event: WebSocketEvent, data: any) => Promise<WebSocketResponse>;
  subscribeToGame: (gameId: string) => Promise<WebSocketResponse>;
  unsubscribeFromGame: (gameId: string) => Promise<WebSocketResponse>;
  subscribeToTournament: (tournamentId: string) => Promise<WebSocketResponse>;
  unsubscribeFromTournament: (tournamentId: string) => Promise<WebSocketResponse>;
  updateScore: (gameId: string, update: Partial<GameUpdatePayload>) => Promise<WebSocketResponse>;
  metrics?: MetricsPayload;
}