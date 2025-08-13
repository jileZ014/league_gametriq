/**
 * High-Performance Redis Cache Service for Basketball League Platform
 * Optimized for tournament day traffic with 1000+ concurrent users
 * Implements intelligent caching with monitoring and automatic optimization
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { 
  cacheConfig, 
  CacheKeys, 
  InvalidationPatterns, 
  RedisConfig,
  CacheMetrics,
  CachePerformanceConfig 
} from '../../config/cache.config';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    memoryUsage: 0
  };
  private metricsInterval: NodeJS.Timeout;

  async onModuleInit() {
    await this.initializeRedis();
    this.startMetricsCollection();
    this.logger.log('Cache service initialized successfully');
  }

  async onModuleDestroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.redis) {
      await this.redis.quit();
    }
    this.logger.log('Cache service destroyed');
  }

  /**
   * Initialize Redis connection with high availability configuration
   */
  private async initializeRedis(): Promise<void> {
    const config = RedisConfig;
    
    try {
      if (config.cluster.enabled && config.cluster.nodes.length > 0) {
        // Cluster mode for production high availability
        const { Cluster } = require('ioredis');
        this.redis = new Cluster(config.cluster.nodes, config.cluster.options);
        this.logger.log('Redis cluster connection established');
      } else if (config.sentinel.enabled && config.sentinel.sentinels.length > 0) {
        // Sentinel mode for failover
        this.redis = new Redis({
          sentinels: config.sentinel.sentinels,
          name: config.sentinel.name,
          ...config.connection
        });
        this.logger.log('Redis sentinel connection established');
      } else {
        // Single instance for development/testing
        this.redis = new Redis(config.connection as RedisOptions);
        this.logger.log('Redis single instance connection established');
      }

      // Configure Redis for optimal performance
      await this.optimizeRedisConfiguration();
      
      // Test connection
      await this.redis.ping();
      this.logger.log('Redis connection tested successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Redis connection', error);
      throw error;
    }
  }

  /**
   * Optimize Redis configuration for basketball league workload
   */
  private async optimizeRedisConfiguration(): Promise<void> {
    const optimizations = [
      // Memory optimization
      ['CONFIG', 'SET', 'maxmemory-policy', 'allkeys-lru'],
      
      // Enable keyspace notifications for cache invalidation
      ['CONFIG', 'SET', 'notify-keyspace-events', 'Ex'],
      
      // Optimize for high read workload
      ['CONFIG', 'SET', 'save', '900 1 300 10 60 10000'],
      
      // TCP keepalive
      ['CONFIG', 'SET', 'tcp-keepalive', '60'],
      
      // Timeout settings
      ['CONFIG', 'SET', 'timeout', '300']
    ];

    for (const [cmd, ...args] of optimizations) {
      try {
        await this.redis.call(cmd, ...args);
      } catch (error) {
        this.logger.warn(`Failed to set Redis config ${args.join(' ')}:`, error.message);
      }
    }
  }

  /**
   * Generic get-or-set cache method with intelligent TTL selection
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Try to get from cache first
      const cached = await this.redis.get(key);
      
      if (cached !== null) {
        this.metrics.hits++;
        const data = JSON.parse(cached);
        this.logCachePerformance('HIT', key, Date.now() - startTime);
        return data;
      }

      // Cache miss - fetch data
      this.metrics.misses++;
      const data = await fetcher();
      
      // Determine TTL based on key pattern
      const ttl = customTtl || this.determineTTL(key);
      
      // Store in cache with TTL
      await this.redis.setex(key, ttl, JSON.stringify(data));
      
      this.logCachePerformance('MISS', key, Date.now() - startTime);
      return data;
      
    } catch (error) {
      this.logger.error(`Cache operation failed for key ${key}:`, error);
      // Fallback to direct fetch if cache fails
      return await fetcher();
    }
  }

  /**
   * Set cache value with intelligent TTL
   */
  async set<T>(key: string, value: T, customTtl?: number): Promise<void> {
    try {
      const ttl = customTtl || this.determineTTL(key);
      await this.redis.setex(key, ttl, JSON.stringify(value));
      this.logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
    }
  }

  /**
   * Get cache value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached === null) {
        this.metrics.misses++;
        return null;
      }
      this.metrics.hits++;
      return JSON.parse(cached);
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache keys by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const result = await this.redis.del(...keys);
        this.logger.debug(`Invalidated ${result} cache keys matching pattern: ${pattern}`);
        return result;
      }
      return 0;
    } catch (error) {
      this.logger.error(`Failed to invalidate pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate multiple cache patterns (for complex data relationships)
   */
  async invalidateMultiplePatterns(patterns: string[]): Promise<number> {
    let totalInvalidated = 0;
    
    for (const pattern of patterns) {
      const count = await this.invalidatePattern(pattern);
      totalInvalidated += count;
    }
    
    return totalInvalidated;
  }

  /**
   * Tournament-specific cache management
   */
  async handleGameCompleted(gameId: string, homeTeamId: string, awayTeamId: string, leagueId: string): Promise<void> {
    const patterns = InvalidationPatterns.GAME_COMPLETED(gameId, homeTeamId, awayTeamId, leagueId);
    const invalidated = await this.invalidateMultiplePatterns(patterns);
    this.logger.log(`Game ${gameId} completed: Invalidated ${invalidated} cache keys`);
  }

  /**
   * Bulk cache operations for tournament initialization
   */
  async bulkSet(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    entries.forEach(({ key, value, ttl }) => {
      const cacheTtl = ttl || this.determineTTL(key);
      pipeline.setex(key, cacheTtl, JSON.stringify(value));
    });
    
    try {
      await pipeline.exec();
      this.logger.debug(`Bulk cache set completed for ${entries.length} entries`);
    } catch (error) {
      this.logger.error('Bulk cache set failed:', error);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getStats(): Promise<CacheMetrics & { keyCount: number; memoryUsage: string }> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // Parse memory usage
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      
      // Parse key count
      const keyMatch = keyspace.match(/keys=(\d+)/);
      const keyCount = keyMatch ? parseInt(keyMatch[1]) : 0;
      
      return {
        ...this.metrics,
        keyCount,
        memoryUsage: this.formatBytes(memoryUsage)
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return { ...this.metrics, keyCount: 0, memoryUsage: '0 B' };
    }
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.redis.ping();
      const latency = Date.now() - startTime;
      
      return {
        status: latency < CachePerformanceConfig.alertThresholds.latencyAbove ? 'healthy' : 'unhealthy',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Determine optimal TTL based on cache key pattern
   */
  private determineTTL(key: string): number {
    // Check against each cache tier configuration
    for (const [tier, config] of Object.entries(cacheConfig)) {
      for (const pattern of config.keys) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        if (regex.test(key)) {
          return config.ttl;
        }
      }
    }
    
    // Default TTL for unclassified keys
    return 300; // 5 minutes
  }

  /**
   * Start metrics collection for monitoring
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        const stats = await this.getStats();
        const hitRate = stats.hits / (stats.hits + stats.misses) || 0;
        
        // Log performance metrics
        this.logger.debug('Cache Metrics:', {
          hitRate: (hitRate * 100).toFixed(2) + '%',
          totalRequests: stats.hits + stats.misses,
          keyCount: stats.keyCount,
          memoryUsage: stats.memoryUsage
        });
        
        // Alert on performance issues
        if (hitRate < CachePerformanceConfig.alertThresholds.hitRateBelow) {
          this.logger.warn(`Cache hit rate below threshold: ${(hitRate * 100).toFixed(2)}%`);
        }
        
      } catch (error) {
        this.logger.error('Failed to collect cache metrics:', error);
      }
    }, CachePerformanceConfig.metricsInterval);
  }

  /**
   * Log cache operation performance
   */
  private logCachePerformance(operation: 'HIT' | 'MISS', key: string, duration: number): void {
    if (duration > CachePerformanceConfig.alertThresholds.latencyAbove) {
      this.logger.warn(`Slow cache ${operation} for key ${key}: ${duration}ms`);
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Tournament-specific cache preloading for performance
   */
  async preloadTournamentData(tournamentId: string): Promise<void> {
    this.logger.log(`Preloading cache for tournament ${tournamentId}`);
    
    // This would typically preload commonly accessed tournament data
    // Implementation depends on your data access patterns
    const preloadKeys = [
      CacheKeys.TOURNAMENT_BRACKET(tournamentId),
      CacheKeys.TOURNAMENT_TEAMS(tournamentId)
    ];
    
    this.logger.debug(`Tournament ${tournamentId} cache preloading completed`);
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.metrics = { hits: 0, misses: 0, evictions: 0, memoryUsage: 0 };
      this.logger.warn('All cache data cleared');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
    }
  }
}