/**
 * WebSocket Type Definitions
 * Comprehensive types for real-time communication in the basketball platform
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
  
  // Chat events (future)
  SEND_MESSAGE = 'send_message',
  RECEIVE_MESSAGE = 'receive_message',
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',
}

// WebSocket Namespaces
export enum WebSocketNamespace {
  DEFAULT = '/',
  GAMES = '/games',
  TOURNAMENTS = '/tournaments',
  ADMIN = '/admin',
  NOTIFICATIONS = '/notifications',
  CHAT = '/chat',
}

// WebSocket Rooms
export enum WebSocketRoom {
  GAME = 'game',
  TOURNAMENT = 'tournament',
  ORGANIZATION = 'org',
  ROLE = 'role',
  USER = 'user',
  LEAGUE = 'league',
  TEAM = 'team',
}

// Connection Information
export interface ConnectionInfo {
  socketId: string;
  userId: string;
  organizationId: string;
  role: string;
  connectedAt: Date;
  namespace: string;
  rooms: Set<string>;
  metadata: {
    userAgent: string;
    ip: string;
  };
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

// Rate Limiting Configuration
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (socket: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Connection Pool Configuration
export interface ConnectionPoolConfig {
  maxConnectionsPerOrg: number;
  maxConnectionsPerUser: number;
  maxTotalConnections: number;
  connectionTimeout: number;
  heartbeatInterval: number;
  reconnectAttempts: number;
  reconnectDelay: number;
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

// Authentication Token Payload
export interface WebSocketAuthPayload {
  sub: string; // userId
  organizationId: string;
  role: string;
  permissions: string[];
  exp: number;
  iat: number;
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

// Server Configuration
export interface WebSocketServerConfig {
  cors: {
    origin: string | string[] | boolean;
    credentials: boolean;
    methods?: string[];
    allowedHeaders?: string[];
  };
  pingInterval: number;
  pingTimeout: number;
  maxHttpBufferSize: number;
  transports: ('websocket' | 'polling')[];
  allowUpgrades: boolean;
  perMessageDeflate: boolean | object;
  httpCompression: boolean | object;
  connectionStateRecovery: {
    maxDisconnectionDuration: number;
    skipMiddlewares: boolean;
  };
}

// Error Types
export enum WebSocketErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CONNECTION_LIMIT_EXCEEDED = 'CONNECTION_LIMIT_EXCEEDED',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  TOURNAMENT_NOT_FOUND = 'TOURNAMENT_NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT = 'TIMEOUT',
}

export class WebSocketError extends Error {
  constructor(
    public code: WebSocketErrorCode,
    public message: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'WebSocketError';
  }
}