import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { GameUpdatePayload, TournamentUpdatePayload, NotificationPayload, QueuedMessage } from './websocket.types';

/**
 * Redis Service for WebSocket Scaling
 * Provides Redis pub/sub adapter for Socket.io and manages distributed state
 * 
 * Features:
 * - Redis adapter for horizontal scaling across multiple servers
 * - Distributed cache for game and tournament states
 * - Message queuing for offline users
 * - Pub/sub for cross-server communication
 * - Automatic reconnection and failover
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private pubClient: Redis;
  private subClient: Redis;
  private cacheClient: Redis;
  private isConnected = false;

  // Redis key prefixes
  private readonly KEY_PREFIX = {
    GAME_STATE: 'game:state:',
    TOURNAMENT_STATE: 'tournament:state:',
    USER_SESSIONS: 'user:sessions:',
    OFFLINE_QUEUE: 'offline:queue:',
    METRICS: 'metrics:',
    RATE_LIMIT: 'rate:limit:',
    CONNECTION_POOL: 'connection:pool:',
  };

  // TTL configurations (in seconds)
  private readonly TTL = {
    GAME_STATE: 3600 * 4, // 4 hours
    TOURNAMENT_STATE: 3600 * 8, // 8 hours
    USER_SESSION: 3600 * 2, // 2 hours
    OFFLINE_MESSAGE: 3600 * 24 * 7, // 7 days
    METRICS: 300, // 5 minutes
    RATE_LIMIT: 60, // 1 minute
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeClients();
  }

  /**
   * Initialize Redis clients with proper configuration
   */
  private initializeClients() {
    const redisConfig = this.getRedisConfig();

    // Publisher client for sending messages
    this.pubClient = new Redis(redisConfig);
    
    // Subscriber client for receiving messages
    this.subClient = this.pubClient.duplicate();
    
    // Cache client for data storage
    this.cacheClient = this.pubClient.duplicate();

    this.setupEventHandlers();
    this.setupReconnectStrategy();
  }

  /**
   * Get Redis configuration from environment
   */
  private getRedisConfig(): Redis.RedisOptions {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const db = this.configService.get<number>('REDIS_DB', 0);
    const tls = this.configService.get<boolean>('REDIS_TLS', false);

    return {
      host,
      port,
      password,
      db,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis reconnection attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      family: 4,
      keepAlive: 30000,
      noDelay: true,
      ...(tls && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
    };
  }

  /**
   * Setup event handlers for Redis clients
   */
  private setupEventHandlers() {
    // Pub client events
    this.pubClient.on('connect', () => {
      this.logger.log('Redis publisher connected');
      this.isConnected = true;
    });

    this.pubClient.on('error', (error) => {
      this.logger.error('Redis publisher error:', error);
      this.isConnected = false;
    });

    // Sub client events
    this.subClient.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });

    this.subClient.on('error', (error) => {
      this.logger.error('Redis subscriber error:', error);
    });

    // Cache client events
    this.cacheClient.on('connect', () => {
      this.logger.log('Redis cache client connected');
    });

    this.cacheClient.on('error', (error) => {
      this.logger.error('Redis cache client error:', error);
    });
  }

  /**
   * Setup automatic reconnection strategy
   */
  private setupReconnectStrategy() {
    const checkConnection = setInterval(async () => {
      if (!this.isConnected) {
        try {
          await this.pubClient.ping();
          this.isConnected = true;
        } catch (error) {
          this.logger.warn('Redis connection check failed, attempting reconnect...');
        }
      }
    }, 5000);

    process.on('SIGTERM', () => clearInterval(checkConnection));
  }

  /**
   * Create Socket.io Redis adapter for horizontal scaling
   */
  async createAdapter() {
    return createAdapter(this.pubClient, this.subClient, {
      key: 'socket.io',
      requestsTimeout: 5000,
    });
  }

  /**
   * Store game state in Redis
   */
  async storeGameUpdate(update: GameUpdatePayload): Promise<void> {
    const key = `${this.KEY_PREFIX.GAME_STATE}${update.gameId}`;
    
    try {
      const currentState = await this.cacheClient.get(key);
      const state = currentState ? JSON.parse(currentState) : {};
      
      // Merge update with existing state
      const updatedState = {
        ...state,
        ...update.data,
        lastUpdate: update.timestamp,
        updateHistory: [
          ...(state.updateHistory || []).slice(-99), // Keep last 100 updates
          {
            timestamp: update.timestamp,
            type: update.type,
            updatedBy: update.metadata?.updatedBy,
          },
        ],
      };

      await this.cacheClient.setex(
        key,
        this.TTL.GAME_STATE,
        JSON.stringify(updatedState),
      );

      // Publish update for subscribers
      await this.pubClient.publish(
        `game:${update.gameId}`,
        JSON.stringify(update),
      );
    } catch (error) {
      this.logger.error(`Failed to store game update: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get game state from Redis
   */
  async getGameState(gameId: string): Promise<any> {
    const key = `${this.KEY_PREFIX.GAME_STATE}${gameId}`;
    
    try {
      const state = await this.cacheClient.get(key);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      this.logger.error(`Failed to get game state: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Store tournament state in Redis
   */
  async storeTournamentUpdate(update: TournamentUpdatePayload): Promise<void> {
    const key = `${this.KEY_PREFIX.TOURNAMENT_STATE}${update.tournamentId}`;
    
    try {
      const currentState = await this.cacheClient.get(key);
      const state = currentState ? JSON.parse(currentState) : {};
      
      // Merge update with existing state
      const updatedState = {
        ...state,
        ...update.data,
        lastUpdate: update.timestamp,
      };

      await this.cacheClient.setex(
        key,
        this.TTL.TOURNAMENT_STATE,
        JSON.stringify(updatedState),
      );

      // Publish update for subscribers
      await this.pubClient.publish(
        `tournament:${update.tournamentId}`,
        JSON.stringify(update),
      );
    } catch (error) {
      this.logger.error(`Failed to store tournament update: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get tournament state from Redis
   */
  async getTournamentState(tournamentId: string): Promise<any> {
    const key = `${this.KEY_PREFIX.TOURNAMENT_STATE}${tournamentId}`;
    
    try {
      const state = await this.cacheClient.get(key);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      this.logger.error(`Failed to get tournament state: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Queue notification for offline user
   */
  async queueOfflineNotification(userId: string, notification: NotificationPayload): Promise<void> {
    const key = `${this.KEY_PREFIX.OFFLINE_QUEUE}${userId}`;
    
    try {
      const message: QueuedMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        event: 'notification' as any,
        payload: notification,
        timestamp: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      };

      await this.cacheClient.rpush(key, JSON.stringify(message));
      await this.cacheClient.expire(key, this.TTL.OFFLINE_MESSAGE);
    } catch (error) {
      this.logger.error(`Failed to queue offline notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Get queued messages for user
   */
  async getQueuedMessages(userId: string): Promise<QueuedMessage[]> {
    const key = `${this.KEY_PREFIX.OFFLINE_QUEUE}${userId}`;
    
    try {
      const messages = await this.cacheClient.lrange(key, 0, -1);
      await this.cacheClient.del(key); // Clear queue after retrieval
      
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      this.logger.error(`Failed to get queued messages: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Track user session
   */
  async trackUserSession(userId: string, socketId: string, metadata: any): Promise<void> {
    const key = `${this.KEY_PREFIX.USER_SESSIONS}${userId}`;
    
    try {
      const session = {
        socketId,
        connectedAt: new Date().toISOString(),
        ...metadata,
      };

      await this.cacheClient.hset(key, socketId, JSON.stringify(session));
      await this.cacheClient.expire(key, this.TTL.USER_SESSION);
    } catch (error) {
      this.logger.error(`Failed to track user session: ${error.message}`, error.stack);
    }
  }

  /**
   * Remove user session
   */
  async removeUserSession(userId: string, socketId: string): Promise<void> {
    const key = `${this.KEY_PREFIX.USER_SESSIONS}${userId}`;
    
    try {
      await this.cacheClient.hdel(key, socketId);
    } catch (error) {
      this.logger.error(`Failed to remove user session: ${error.message}`, error.stack);
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    const key = `${this.KEY_PREFIX.USER_SESSIONS}${userId}`;
    
    try {
      const sessions = await this.cacheClient.hgetall(key);
      return Object.values(sessions).map(session => JSON.parse(session));
    } catch (error) {
      this.logger.error(`Failed to get user sessions: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Implement rate limiting
   */
  async checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
    const key = `${this.KEY_PREFIX.RATE_LIMIT}${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Remove old entries
      await this.cacheClient.zremrangebyscore(key, '-inf', windowStart);

      // Count current entries
      const count = await this.cacheClient.zcard(key);

      if (count >= limit) {
        return false; // Rate limit exceeded
      }

      // Add new entry
      await this.cacheClient.zadd(key, now, `${now}-${Math.random()}`);
      await this.cacheClient.expire(key, Math.ceil(windowMs / 1000));

      return true;
    } catch (error) {
      this.logger.error(`Failed to check rate limit: ${error.message}`, error.stack);
      return true; // Allow on error to prevent blocking users
    }
  }

  /**
   * Store metrics data
   */
  async storeMetrics(type: string, metrics: any): Promise<void> {
    const key = `${this.KEY_PREFIX.METRICS}${type}`;
    
    try {
      await this.cacheClient.setex(
        key,
        this.TTL.METRICS,
        JSON.stringify({
          ...metrics,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to store metrics: ${error.message}`, error.stack);
    }
  }

  /**
   * Get metrics data
   */
  async getMetrics(type: string): Promise<any> {
    const key = `${this.KEY_PREFIX.METRICS}${type}`;
    
    try {
      const metrics = await this.cacheClient.get(key);
      return metrics ? JSON.parse(metrics) : null;
    } catch (error) {
      this.logger.error(`Failed to get metrics: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    this.logger.log('Closing Redis connections...');
    
    await Promise.all([
      this.pubClient.quit(),
      this.subClient.quit(),
      this.cacheClient.quit(),
    ]);
    
    this.logger.log('Redis connections closed');
  }
}