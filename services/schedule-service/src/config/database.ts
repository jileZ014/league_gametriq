import { Knex } from 'knex';
import knex from 'knex';
import Redis from 'ioredis';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

// Winston logger configuration
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'schedule-service',
    version: '1.0.0'
  },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Database configuration
const databaseConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gametriq_schedule',
    user: process.env.DB_USER || 'gametriq',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
    createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'),
    destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000'),
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations_schedule',
  },
  seeds: {
    directory: './seeds',
  },
  debug: process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true',
  asyncStackTraces: process.env.NODE_ENV === 'development',
};

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'schedule:',
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

// Connection instances
let db: Knex;
let redisClient: Redis;

// Initialize database connections
export async function initializeConnections(): Promise<void> {
  try {
    // Initialize PostgreSQL connection
    db = knex(databaseConfig);
    
    // Test database connection
    await db.raw('SELECT NOW()');
    logger.info('PostgreSQL connection established');

    // Initialize Redis connection
    redisClient = new Redis(redisConfig);
    
    // Test Redis connection
    await redisClient.ping();
    logger.info('Redis connection established');

    // Set up Redis error handling
    redisClient.on('error', (error: Error) => {
      logger.error('Redis error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

  } catch (error) {
    logger.error('Failed to initialize database connections:', error);
    throw error;
  }
}

// Close database connections
export async function closeConnections(): Promise<void> {
  try {
    if (db) {
      await db.destroy();
      logger.info('PostgreSQL connection closed');
    }

    if (redisClient) {
      redisClient.disconnect();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connections:', error);
    throw error;
  }
}

// Get database instance
export function getDB(): Knex {
  if (!db) {
    throw new Error('Database not initialized. Call initializeConnections() first.');
  }
  return db;
}

// Get Redis instance
export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeConnections() first.');
  }
  return redisClient;
}

// Cache utilities
export class CacheService {
  private static redis: Redis;

  static initialize(): void {
    this.redis = getRedis();
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }

  static async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error:', { key, error });
    }
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

  static async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      logger.error('Cache flush error:', error);
    }
  }

  // Cache key generators
  static scheduleKey(seasonId: string, divisionId?: string): string {
    return `schedule:${seasonId}${divisionId ? `:${divisionId}` : ''}`;
  }

  static conflictsKey(seasonId: string): string {
    return `conflicts:${seasonId}`;
  }

  static venueAvailabilityKey(venueId: string, date: string): string {
    return `venue:${venueId}:availability:${date}`;
  }

  static heatPolicyKey(venueId: string, date: string): string {
    return `heat:${venueId}:${date}`;
  }
}

// Database transaction wrapper
export async function withTransaction<T>(
  callback: (trx: Knex.Transaction) => Promise<T>
): Promise<T> {
  const db = getDB();
  return db.transaction(callback);
}

// Query performance monitoring
export function trackQuery(tableName: string, operation: string) {
  const startTime = Date.now();
  
  return {
    end: () => {
      const duration = Date.now() - startTime;
      logger.info('Query performance', {
        table: tableName,
        operation,
        duration,
      });

      // Alert on slow queries (>150ms for schedule queries as per requirements)
      if (duration > 150) {
        logger.warn('Slow query detected', {
          table: tableName,
          operation,
          duration,
        });
      }
    }
  };
}