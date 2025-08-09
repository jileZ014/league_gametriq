import { Knex } from 'knex';
import knex from 'knex';
import { Pool, PoolConfig } from 'pg';
import Redis from 'redis';
import winston from 'winston';

// Database connection configuration
const dbConfig: Knex.Config = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'gametriq_auth',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    createTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
    idleTimeoutMillis: 600000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
  debug: process.env.NODE_ENV === 'development',
  asyncStackTraces: process.env.NODE_ENV === 'development',
};

// Redis configuration for session management and caching
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

// PostgreSQL connection pool configuration
const pgPoolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'gametriq_auth',
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: 600000,
  connectionTimeoutMillis: 30000,
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
};

// Initialize database connections
export const db: Knex = knex(dbConfig);
export const pgPool = new Pool(pgPoolConfig);
export const redisClient = Redis.createClient(redisConfig);

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

// Redis health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}

// Multi-tenant database utilities
export class TenantDatabase {
  private static getSchemaName(tenantId: string): string {
    return `tenant_${tenantId.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
  }

  /**
   * Create tenant-specific database schema
   */
  static async createTenantSchema(tenantId: string): Promise<void> {
    const schemaName = this.getSchemaName(tenantId);
    
    try {
      // Create schema if it doesn't exist
      await db.raw(`CREATE SCHEMA IF NOT EXISTS ??`, [schemaName]);
      
      // Set search path to include tenant schema
      await db.raw(`SET search_path = ??, public`, [schemaName]);
      
      // Create tenant-specific tables
      await this.createTenantTables(schemaName);
      
      logger.info(`Created tenant schema: ${schemaName}`);
    } catch (error) {
      logger.error(`Failed to create tenant schema ${schemaName}:`, error);
      throw error;
    }
  }

  /**
   * Get database connection for specific tenant
   */
  static getTenantConnection(tenantId: string): Knex {
    const schemaName = this.getSchemaName(tenantId);
    
    return db.withSchema(schemaName);
  }

  /**
   * Execute query with tenant context
   */
  static async withTenant<T>(
    tenantId: string,
    operation: (tenantDb: Knex) => Promise<T>
  ): Promise<T> {
    const tenantDb = this.getTenantConnection(tenantId);
    return await operation(tenantDb);
  }

  /**
   * Create tenant-specific authentication tables
   */
  private static async createTenantTables(schemaName: string): Promise<void> {
    const tenantDb = db.withSchema(schemaName);

    // Users table
    await tenantDb.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.date('birth_date').notNullable();
      table.integer('age').notNullable();
      table.enum('gender', ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).notNullable();
      table.string('phone').nullable();
      table.enum('status', ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'ARCHIVED']).defaultTo('PENDING_VERIFICATION');
      table.enum('role', ['SYSTEM_ADMIN', 'ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH', 'ASSISTANT_COACH', 'PARENT', 'PLAYER', 'REFEREE', 'SCOREKEEPER', 'VOLUNTEER']).notNullable();
      table.boolean('email_verified').defaultTo(false);
      table.boolean('phone_verified').defaultTo(false);
      table.boolean('mfa_enabled').defaultTo(false);
      table.string('mfa_secret').nullable();
      table.json('mfa_backup_codes').nullable();
      table.timestamp('last_login').nullable();
      table.string('timezone').defaultTo('America/Phoenix');
      table.json('preferences').defaultTo('{}');
      table.timestamp('password_changed_at').nullable();
      table.boolean('force_password_change').defaultTo(false);
      table.integer('failed_login_attempts').defaultTo(0);
      table.timestamp('locked_until').nullable();
      table.timestamps(true, true);
      
      table.index(['email']);
      table.index(['status']);
      table.index(['role']);
      table.index(['age']);
    });

    // COPPA compliance table for users under 13
    await tenantDb.schema.createTable('coppa_users', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable(`${schemaName}.users`).onDelete('CASCADE');
      table.uuid('parent_id').references('id').inTable(`${schemaName}.users`).nullable();
      table.string('encrypted_first_name').notNullable();
      table.string('encrypted_last_name').notNullable();
      table.string('encrypted_birth_date').notNullable();
      table.json('parental_consents').defaultTo('{}');
      table.timestamp('consent_date').nullable();
      table.string('consent_method').nullable(); // EMAIL, DIGITAL_SIGNATURE, etc.
      table.string('parent_verification_method').nullable();
      table.json('data_permissions').defaultTo('{}');
      table.boolean('marketing_consent').defaultTo(false);
      table.boolean('communication_consent').defaultTo(true);
      table.boolean('photo_consent').defaultTo(false);
      table.timestamp('data_retention_date').notNullable();
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['parent_id']);
      table.index(['consent_date']);
    });

    // Authentication sessions
    await tenantDb.schema.createTable('user_sessions', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable(`${schemaName}.users`).onDelete('CASCADE');
      table.string('refresh_token').unique().notNullable();
      table.string('device_fingerprint').nullable();
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      table.timestamp('expires_at').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['refresh_token']);
      table.index(['expires_at']);
    });

    // Password reset tokens
    await tenantDb.schema.createTable('password_reset_tokens', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable(`${schemaName}.users`).onDelete('CASCADE');
      table.string('token').unique().notNullable();
      table.timestamp('expires_at').notNullable();
      table.boolean('used').defaultTo(false);
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['token']);
      table.index(['expires_at']);
    });

    // Email verification tokens
    await tenantDb.schema.createTable('email_verification_tokens', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable(`${schemaName}.users`).onDelete('CASCADE');
      table.string('token').unique().notNullable();
      table.timestamp('expires_at').notNullable();
      table.boolean('used').defaultTo(false);
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['token']);
      table.index(['expires_at']);
    });

    // Audit log for authentication events
    await tenantDb.schema.createTable('auth_audit_log', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable(`${schemaName}.users`).nullable();
      table.string('event_type').notNullable(); // LOGIN, LOGOUT, REGISTER, etc.
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      table.json('metadata').defaultTo('{}');
      table.boolean('success').notNullable();
      table.string('failure_reason').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      
      table.index(['user_id']);
      table.index(['event_type']);
      table.index(['created_at']);
      table.index(['success']);
    });
  }
}

// Connection initialization
export async function initializeConnections(): Promise<void> {
  try {
    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Test PostgreSQL connection
    await db.raw('SELECT 1');
    logger.info('Connected to PostgreSQL');

    // Setup connection event handlers
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis Client Reconnecting');
    });

  } catch (error) {
    logger.error('Failed to initialize database connections:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeConnections(): Promise<void> {
  try {
    await redisClient.quit();
    await db.destroy();
    await pgPool.end();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
    throw error;
  }
}

export { logger };