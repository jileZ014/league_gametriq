import { Pool, PoolConfig } from 'pg';
import winston from 'winston';

// Logger configuration
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'registration-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Database connection pools for multi-tenant architecture
export class TenantDatabase {
  private static pools: Map<string, Pool> = new Map();
  private static defaultConfig: PoolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  /**
   * Get or create a connection pool for a tenant
   */
  static async getConnection(tenantId: string): Promise<Pool> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Check if pool already exists
    if (this.pools.has(tenantId)) {
      return this.pools.get(tenantId)!;
    }

    // Create new pool for tenant
    const config: PoolConfig = {
      ...this.defaultConfig,
      database: `gametriq_${tenantId}`,
    };

    const pool = new Pool(config);

    // Test connection
    try {
      await pool.query('SELECT 1');
      logger.info(`Database connection established for tenant: ${tenantId}`);
    } catch (error) {
      logger.error(`Failed to connect to database for tenant: ${tenantId}`, error);
      throw error;
    }

    // Store pool
    this.pools.set(tenantId, pool);

    // Handle pool errors
    pool.on('error', (err) => {
      logger.error(`Database pool error for tenant ${tenantId}:`, err);
    });

    return pool;
  }

  /**
   * Close connection pool for a tenant
   */
  static async closeConnection(tenantId: string): Promise<void> {
    const pool = this.pools.get(tenantId);
    if (pool) {
      await pool.end();
      this.pools.delete(tenantId);
      logger.info(`Database connection closed for tenant: ${tenantId}`);
    }
  }

  /**
   * Close all connection pools
   */
  static async closeAll(): Promise<void> {
    const promises = Array.from(this.pools.keys()).map(tenantId => 
      this.closeConnection(tenantId)
    );
    await Promise.all(promises);
  }
}

// Health check functions
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const pool = await TenantDatabase.getConnection('default');
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connections...');
  await TenantDatabase.closeAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connections...');
  await TenantDatabase.closeAll();
  process.exit(0);
});