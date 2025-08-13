/**
 * Critical Performance Configuration for Basketball League Platform
 * Handles 1000+ concurrent users during tournament events
 * Optimized for Phoenix market load patterns
 */

import { registerAs } from '@nestjs/config';

export default registerAs('performance', () => ({
  // Database Connection Pooling Configuration
  database: {
    // Connection pool settings for high concurrency
    connectionPool: {
      max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections
      min: parseInt(process.env.DB_POOL_MIN || '2'),  // Minimum connections
      idle: parseInt(process.env.DB_POOL_IDLE || '10000'), // 10 seconds idle timeout
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'), // 30 seconds acquire timeout
      evict: parseInt(process.env.DB_POOL_EVICT || '60000'), // 60 seconds eviction timeout
      handleDisconnects: true,
      validate: true
    },

    // Query optimization settings
    queryOptimization: {
      // Enable prepared statements for repeated queries
      preparedStatements: true,
      
      // Connection settings for tournament load
      connectionTimeoutMillis: 30000, // 30 seconds
      idleTimeoutMillis: 600000, // 10 minutes
      
      // Query timeout for performance monitoring
      statementTimeoutMillis: 30000, // 30 seconds max query time
      
      // Enable query result caching
      cache: true,
      
      // Log slow queries for optimization
      slowQueryLogMs: 50, // Log queries slower than 50ms
      
      // Connection validation
      testOnBorrow: true,
      validationQuery: 'SELECT 1',
      validationInterval: 300000 // 5 minutes
    },

    // Read replica configuration for load distribution
    readReplicas: {
      enabled: process.env.DB_READ_REPLICAS_ENABLED === 'true',
      hosts: process.env.DB_READ_REPLICA_HOSTS?.split(',') || [],
      loadBalancing: 'round-robin', // or 'random', 'least-connections'
      maxLag: 1000 // Maximum replication lag in ms
    }
  },

  // Redis Connection and Caching Configuration
  redis: {
    // Connection pool for Redis
    connectionPool: {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableAutoPipelining: true,
      maxLoadingTimeout: 5000,
      
      // Connection limits for concurrent users
      family: 4, // IPv4
      keepAlive: true,
      connectTimeout: 10000,
      lazyConnect: true,
      
      // Memory optimization
      maxMemoryPolicy: 'allkeys-lru',
      keyspaceNotifications: true
    },

    // Performance optimization
    performance: {
      // Pipelining for batch operations
      enableAutoPipelining: true,
      pipelineTimeout: 1000,
      
      // Compression for large values
      compression: {
        enabled: process.env.REDIS_COMPRESSION === 'true',
        threshold: 1024, // Compress values larger than 1KB
        algorithm: 'gzip'
      },
      
      // Memory management
      memoryOptimization: {
        maxMemory: process.env.REDIS_MAX_MEMORY || '2gb',
        evictionPolicy: 'allkeys-lru',
        sampling: 5
      }
    },

    // Cluster configuration for high availability
    cluster: {
      enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
      nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 10000,
        lazyConnect: true
      },
      clusterRetryDelayOnFailover: 100,
      clusterRetryDelayOnClusterDown: 300,
      clusterMaxRedirections: 16,
      maxRetriesPerRequest: 3
    }
  },

  // Advanced Rate Limiting Configuration
  rateLimiting: {
    // Global rate limits
    global: {
      windowMs: 60 * 1000, // 1 minute window
      max: 1000, // requests per window
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
      
      // Skip rate limiting for health checks and monitoring
      skip: (req: any) => {
        const skipPaths = ['/health', '/metrics', '/api/docs'];
        return skipPaths.some(path => req.url.startsWith(path));
      }
    },

    // Per-endpoint rate limits for basketball operations
    endpoints: {
      // Authentication endpoints - stricter limits
      '/api/auth/login': {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per IP per 15 minutes
        skipSuccessfulRequests: true
      },

      '/api/auth/register': {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 registrations per IP per hour
        skipSuccessfulRequests: true
      },

      // Live game endpoints - high throughput for tournaments
      '/api/games/live/*': {
        windowMs: 60 * 1000, // 1 minute
        max: 300, // 300 requests per minute (5 per second)
        keyGenerator: (req: any) => {
          // Rate limit by user + game combination
          return `${req.ip}:${req.user?.id}:${req.params.gameId}`;
        }
      },

      // Score updates - critical for real-time updates
      '/api/games/*/score': {
        windowMs: 60 * 1000, // 1 minute
        max: 120, // 2 per second for scorekeeper
        keyGenerator: (req: any) => req.user?.id || req.ip
      },

      // Tournament bracket updates
      '/api/tournaments/*/bracket': {
        windowMs: 60 * 1000, // 1 minute
        max: 60, // 1 per second
        keyGenerator: (req: any) => `tournament:${req.params.tournamentId}:${req.user?.id}`
      },

      // Public viewing endpoints - higher limits for spectators
      '/api/standings/*': {
        windowMs: 60 * 1000, // 1 minute
        max: 180, // 3 per second
        keyGenerator: (req: any) => req.ip
      },

      '/api/schedules/*': {
        windowMs: 60 * 1000, // 1 minute
        max: 120, // 2 per second
        keyGenerator: (req: any) => req.ip
      },

      // Payment endpoints - moderate limits for security
      '/api/payments/*': {
        windowMs: 60 * 1000, // 1 minute
        max: 30, // 0.5 per second
        keyGenerator: (req: any) => req.user?.id || req.ip
      },

      // File upload endpoints - restricted
      '/api/upload/*': {
        windowMs: 60 * 1000, // 1 minute
        max: 10, // 10 uploads per minute
        keyGenerator: (req: any) => req.user?.id || req.ip
      }
    },

    // User-specific rate limiting
    userBased: {
      // Authenticated users get higher limits
      authenticated: {
        windowMs: 60 * 1000, // 1 minute
        max: 300, // 5 per second
        keyGenerator: (req: any) => req.user?.id
      },

      // Anonymous users get lower limits
      anonymous: {
        windowMs: 60 * 1000, // 1 minute
        max: 60, // 1 per second
        keyGenerator: (req: any) => req.ip
      },

      // Premium/admin users get highest limits
      premium: {
        windowMs: 60 * 1000, // 1 minute
        max: 600, // 10 per second
        keyGenerator: (req: any) => req.user?.id
      }
    },

    // Tournament-specific rate limiting
    tournament: {
      // During tournament events, increase limits
      tournamentMode: {
        enabled: process.env.TOURNAMENT_MODE === 'true',
        multiplier: 2, // Double the normal rate limits
        activeHours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // 9 AM - 8 PM
        weekends: true // Apply tournament mode on weekends
      }
    }
  },

  // WebSocket Connection Management
  websocket: {
    // Connection limits for real-time features
    maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '2000'),
    connectionTimeout: parseInt(process.env.WS_CONNECTION_TIMEOUT || '30000'),
    
    // Message rate limiting
    messageRateLimit: {
      points: 100, // Number of messages
      duration: 60, // Per 60 seconds
      blockDuration: 60 // Block for 60 seconds if exceeded
    },

    // Connection pooling
    connectionPool: {
      maxSize: 1000, // Maximum active connections per instance
      idleTimeout: 300000, // 5 minutes idle timeout
      heartbeatInterval: 30000, // 30 second ping/pong
      maxPayloadSize: 1024 * 1024 // 1MB max message size
    },

    // Performance optimization
    performance: {
      compression: true,
      maxCompressedSize: 64 * 1024, // 64KB
      compressionLevel: 6,
      
      // Buffering for high-frequency updates
      messageBuffering: {
        enabled: true,
        bufferTime: 50, // Buffer messages for 50ms
        maxBufferSize: 100 // Maximum messages in buffer
      }
    }
  },

  // API Gateway Configuration
  apiGateway: {
    // Request/Response optimization
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024, // Compress responses larger than 1KB
      memLevel: 8
    },

    // Response caching
    caching: {
      enabled: true,
      defaultTtl: 300, // 5 minutes
      maxTtl: 3600, // 1 hour
      
      // Cache configuration by endpoint type
      endpoints: {
        '/api/standings/*': { ttl: 300 }, // 5 minutes
        '/api/schedules/*': { ttl: 600 }, // 10 minutes  
        '/api/teams/*': { ttl: 1800 }, // 30 minutes
        '/api/players/*': { ttl: 1800 }, // 30 minutes
        '/api/leagues/*': { ttl: 3600 }, // 1 hour
      }
    },

    // Request timeout configuration
    timeouts: {
      request: 30000, // 30 seconds
      keepAlive: 5000, // 5 seconds
      server: 60000 // 1 minute server timeout
    }
  },

  // Monitoring and Alerting
  monitoring: {
    // Performance thresholds for alerting
    thresholds: {
      apiResponseTime: 100, // 100ms P95
      databaseQueryTime: 50, // 50ms average
      cacheHitRate: 85, // 85% minimum
      errorRate: 1, // 1% maximum
      memoryUsage: 85, // 85% maximum
      cpuUsage: 80 // 80% maximum
    },

    // Metrics collection
    metrics: {
      enabled: true,
      interval: 10000, // Collect every 10 seconds
      retention: 24 * 60 * 60 * 1000, // Keep 24 hours of detailed metrics
      
      // Custom metrics for basketball platform
      custom: {
        tournamentMetrics: true,
        gameMetrics: true,
        userEngagement: true,
        paymentMetrics: true
      }
    }
  },

  // Load Balancing and Scaling
  scaling: {
    // Auto-scaling configuration
    autoScaling: {
      enabled: process.env.AUTO_SCALING_ENABLED === 'true',
      minInstances: parseInt(process.env.MIN_INSTANCES || '2'),
      maxInstances: parseInt(process.env.MAX_INSTANCES || '10'),
      
      // Scaling triggers
      triggers: {
        cpuThreshold: 70, // Scale up when CPU > 70%
        memoryThreshold: 80, // Scale up when memory > 80%
        requestRate: 800, // Scale up when requests > 800/min
        responseTime: 200 // Scale up when P95 > 200ms
      }
    },

    // Load balancing strategy
    loadBalancing: {
      strategy: 'least-connections', // or 'round-robin', 'ip-hash'
      healthCheck: {
        enabled: true,
        interval: 30000, // 30 seconds
        timeout: 10000, // 10 seconds
        unhealthyThreshold: 3,
        healthyThreshold: 2
      }
    }
  }
}));