import winston from 'winston';
import Redis from 'ioredis';
import knex, { Knex } from 'knex';

// Logger configuration
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'game-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Console logging for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Database connection
let db: Knex | null = null;

export const getDatabaseConnection = (): Knex => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeConnections() first.');
  }
  return db;
};

// Redis connection
let redis: Redis | null = null;

export const getRedisConnection = (): Redis => {
  if (!redis) {
    throw new Error('Redis not initialized. Call initializeConnections() first.');
  }
  return redis;
};

// Cache service
export class CacheService {
  private static redis: Redis;

  static initialize(redisConnection: Redis): void {
    this.redis = redisConnection;
  }

  static async get(key: string): Promise<any> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }

  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      logger.error('Cache set error:', { key, error });
    }
  }

  static async setex(key: string, ttlSeconds: number, value: any): Promise<void> {
    return this.set(key, value, ttlSeconds);
  }

  static async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Cache del error:', { key, error });
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error });
      return false;
    }
  }

  static async flushAll(): Promise<void> {
    try {
      await this.redis.flushall();
    } catch (error) {
      logger.error('Cache flush error:', error);
    }
  }

  // Cache key generators for consistency
  static gameKey(gameId: string): string {
    return `game:${gameId}`;
  }

  static bracketKey(bracketId: string): string {
    return `bracket:${bracketId}`;
  }

  static standingsKey(seasonId: string): string {
    return `standings:${seasonId}`;
  }

  static tournamentKey(tournamentId: string): string {
    return `tournament:${tournamentId}`;
  }

  static userSessionKey(userId: string): string {
    return `session:${userId}`;
  }
}

// Transaction wrapper
export const withTransaction = async <T>(
  callback: (trx: Knex.Transaction) => Promise<T>
): Promise<T> => {
  const dbConnection = getDatabaseConnection();
  return dbConnection.transaction(callback);
};

// Connection initialization
export async function initializeConnections(): Promise<void> {
  try {
    // Initialize PostgreSQL connection
    const dbConfig: Knex.Config = {
      client: 'postgresql',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'gametriq',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'gametriq_dev',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      },
      pool: {
        min: parseInt(process.env.DB_POOL_MIN || '2', 10),
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
      },
      migrations: {
        directory: './migrations',
        tableName: 'knex_migrations',
      },
      debug: process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true',
    };

    db = knex(dbConfig);

    // Test database connection
    await db.raw('SELECT 1');
    logger.info('Database connection established');

    // Initialize Redis connection
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'gametriq:game-service:',
    };

    redis = new Redis(redisConfig);

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connection established');

    // Initialize cache service
    CacheService.initialize(redis);

    // Set up Redis event handlers
    redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('disconnect', () => {
      logger.warn('Redis disconnected');
    });

  } catch (error) {
    logger.error('Failed to initialize connections:', error);
    throw error;
  }
}

// Connection cleanup
export async function closeConnections(): Promise<void> {
  try {
    if (redis) {
      await redis.quit();
      redis = null;
      logger.info('Redis connection closed');
    }

    if (db) {
      await db.destroy();
      db = null;
      logger.info('Database connection closed');
    }
  } catch (error) {
    logger.error('Error closing connections:', error);
    throw error;
  }
}

// Health check functions
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  if (!db) {
    return { healthy: false, error: 'Database not initialized' };
  }

  try {
    const start = Date.now();
    await db.raw('SELECT 1');
    const latency = Date.now() - start;
    return { healthy: true, latency };
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    };
  }
}

export async function checkRedisHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  if (!redis) {
    return { healthy: false, error: 'Redis not initialized' };
  }

  try {
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    return { healthy: true, latency };
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown Redis error' 
    };
  }
}