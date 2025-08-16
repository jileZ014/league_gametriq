/**
 * Redis Caching Configuration for Basketball League Platform
 * Optimized for tournament day traffic with 1000+ concurrent users
 * Target: >85% cache hit ratio
 */

export interface CacheConfig {
  ttl: number;
  maxItems?: number;
  keys: string[];
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  memoryUsage: number;
}

/**
 * Cache configuration tiers based on access patterns
 * Hot: Frequently accessed during live games and tournaments
 * Warm: Moderately accessed, updates periodically 
 * Cold: Rarely changes, long-lived data
 */
export const cacheConfig = {
  // Hot data - frequently accessed during tournaments (5-minute TTL)
  hot: {
    ttl: 300, // 5 minutes
    maxItems: 10000,
    keys: [
      'standings:*',           // Team standings - updated every 5 min
      'live_games:*',          // Live game scores - real-time updates
      'team_stats:*',          // Team statistics - tournament critical
      'player_stats:*',        // Player performance data
      'tournament_bracket:*',  // Tournament bracket state
      'leaderboards:*',        // Top performers lists
      'game_events:*'          // Live game events (fouls, timeouts)
    ]
  },

  // Warm data - moderately accessed (30-minute TTL)
  warm: {
    ttl: 1800, // 30 minutes
    maxItems: 5000,
    keys: [
      'league_info:*',         // League details and settings
      'team_rosters:*',        // Team player rosters
      'schedule:*',            // Game schedules
      'venue_info:*',          // Court/venue information
      'referee_assignments:*', // Referee game assignments
      'tournament_teams:*',    // Tournament registered teams
      'player_profiles:*'      // Player profile information
    ]
  },

  // Cold data - rarely changes (24-hour TTL)
  cold: {
    ttl: 86400, // 24 hours
    maxItems: 2000,
    keys: [
      'league_settings:*',     // League configuration
      'user_permissions:*',    // Role-based access control
      'system_config:*',       // Application settings
      'branding:*',            // Organization branding
      'payment_methods:*',     // Available payment options
      'registration_config:*'  // Registration form settings
    ]
  },

  // Session data - user-specific (2-hour TTL)
  session: {
    ttl: 7200, // 2 hours
    maxItems: 50000, // Support 1000+ concurrent users with multiple sessions
    keys: [
      'user_session:*',        // User authentication sessions
      'user_preferences:*',    // User UI preferences
      'cart_items:*',          // Registration shopping cart
      'form_drafts:*',         // Partially completed forms
      'notification_queue:*'   // User notification queue
    ]
  },

  // Real-time data - very short TTL for WebSocket optimization
  realtime: {
    ttl: 30, // 30 seconds
    maxItems: 20000,
    keys: [
      'websocket_rooms:*',     // Active WebSocket connections
      'live_score_updates:*',  // Rapid score changes
      'active_scorekeepers:*', // Currently active scorekeepers
      'game_clock:*',          // Game timing information
      'timeout_status:*'       // Team timeout usage
    ]
  }
};

/**
 * Cache key patterns for specific data types
 */
export const CacheKeys = {
  // Standings
  LEAGUE_STANDINGS: (leagueId: string, divisionId?: string) => 
    `standings:league:${leagueId}${divisionId ? `:division:${divisionId}` : ''}`,
  
  // Live Games
  LIVE_GAME: (gameId: string) => `live_games:${gameId}`,
  LIVE_GAMES_BY_LEAGUE: (leagueId: string) => `live_games:league:${leagueId}`,
  
  // Team Data
  TEAM_STATS: (teamId: string, seasonId: string) => `team_stats:${teamId}:season:${seasonId}`,
  TEAM_ROSTER: (teamId: string, seasonId: string) => `team_rosters:${teamId}:season:${seasonId}`,
  
  // Player Data
  PLAYER_STATS: (playerId: string, seasonId: string) => `player_stats:${playerId}:season:${seasonId}`,
  PLAYER_PROFILE: (playerId: string) => `player_profiles:${playerId}`,
  
  // Tournament Data
  TOURNAMENT_BRACKET: (tournamentId: string) => `tournament_bracket:${tournamentId}`,
  TOURNAMENT_TEAMS: (tournamentId: string) => `tournament_teams:${tournamentId}`,
  
  // Schedule
  SCHEDULE_BY_DATE: (date: string, leagueId?: string) => 
    `schedule:date:${date}${leagueId ? `:league:${leagueId}` : ''}`,
  
  // User Sessions
  USER_SESSION: (userId: string) => `user_session:${userId}`,
  USER_PREFERENCES: (userId: string) => `user_preferences:${userId}`,
  
  // Leaderboards
  LEADERBOARD: (type: string, leagueId: string, seasonId: string) => 
    `leaderboards:${type}:league:${leagueId}:season:${seasonId}`,
  
  // Real-time WebSocket
  WEBSOCKET_ROOM: (roomId: string) => `websocket_rooms:${roomId}`,
  GAME_CLOCK: (gameId: string) => `game_clock:${gameId}`,
  
  // System Configuration
  LEAGUE_SETTINGS: (leagueId: string) => `league_settings:${leagueId}`,
  SYSTEM_CONFIG: () => 'system_config:global',
} as const;

/**
 * Cache invalidation patterns for data consistency
 */
export const InvalidationPatterns = {
  // When a game is completed, invalidate related caches
  GAME_COMPLETED: (gameId: string, homeTeamId: string, awayTeamId: string, leagueId: string) => [
    `live_games:${gameId}`,
    `standings:league:${leagueId}*`,
    `team_stats:${homeTeamId}*`,
    `team_stats:${awayTeamId}*`,
    `leaderboards:*:league:${leagueId}*`
  ],
  
  // When standings are updated
  STANDINGS_UPDATED: (leagueId: string) => [
    `standings:league:${leagueId}*`,
    `leaderboards:*:league:${leagueId}*`
  ],
  
  // When a player's stats are updated
  PLAYER_STATS_UPDATED: (playerId: string, teamId: string, seasonId: string) => [
    `player_stats:${playerId}*`,
    `team_stats:${teamId}*`,
    `leaderboards:*:season:${seasonId}*`
  ],
  
  // When user permissions change
  USER_PERMISSIONS_UPDATED: (userId: string) => [
    `user_session:${userId}`,
    `user_permissions:${userId}`
  ]
} as const;

/**
 * Performance monitoring configuration
 */
export const CachePerformanceConfig = {
  // Metrics collection interval
  metricsInterval: 60000, // 1 minute
  
  // Alert thresholds
  alertThresholds: {
    hitRateBelow: 0.80,        // Alert if hit rate drops below 80%
    memoryUsageAbove: 0.85,    // Alert if memory usage above 85%
    connectionCountAbove: 1000, // Alert if connections exceed 1000
    latencyAbove: 10           // Alert if cache latency > 10ms
  },
  
  // Automatic optimization settings
  autoOptimization: {
    enabled: true,
    evictionPolicy: 'allkeys-lru', // Least Recently Used eviction
    maxMemoryPolicy: 'volatile-lru',
    keyspaceNotifications: true
  }
} as const;

/**
 * Safe environment variable parsing utilities
 */
const parseInt10 = (value: string | undefined, defaultValue: number): number => {
  if (!value || value.trim() === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const parseBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value || value.trim() === '') return defaultValue;
  return value.toLowerCase() === 'true';
};

/**
 * Redis connection configuration for high availability
 */
export const RedisConfig = {
  // Connection settings
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt10(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt10(process.env.REDIS_DB, 0),
    
    // Connection pool settings for concurrent users
    family: 4, // IPv4
    keepAlive: 30000, // Keep-alive interval in milliseconds (30 seconds)
    connectTimeout: 10000,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    
    // High availability settings
    enableAutoPipelining: true,
    maxLoadingTimeout: 5000
  },
  
  // Cluster configuration for production
  cluster: {
    enabled: parseBoolean(process.env.REDIS_CLUSTER_ENABLED, false),
    nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
    options: {
      redisOptions: {
        password: process.env.REDIS_PASSWORD || undefined
      },
      enableOfflineQueue: false,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    }
  },
  
  // Sentinel configuration for failover
  sentinel: {
    enabled: parseBoolean(process.env.REDIS_SENTINEL_ENABLED, false),
    sentinels: process.env.REDIS_SENTINELS?.split(',').map(s => {
      const [host, port] = s.split(':');
      return { host, port: parseInt10(port, 26379) };
    }) || [],
    name: process.env.REDIS_SENTINEL_NAME || 'mymaster'
  }
} as const;

export type CacheConfigType = typeof cacheConfig;
export type CacheKeysType = typeof CacheKeys;