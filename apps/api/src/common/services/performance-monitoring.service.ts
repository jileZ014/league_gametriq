/**
 * Performance Monitoring Service for Basketball League Platform
 * Tracks critical performance metrics and provides alerting
 * Target: Sub-100ms API responses, <50ms database queries
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { performance, PerformanceObserver } from 'perf_hooks';
import { CacheService } from './cache.service';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ApiPerformanceData {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  userAgent?: string;
  userId?: string;
  tenantId?: string;
}

interface DatabasePerformanceData {
  query: string;
  duration: number;
  timestamp: number;
  rowsAffected?: number;
  error?: string;
}

interface CachePerformanceData {
  key: string;
  operation: 'get' | 'set' | 'delete' | 'invalidate';
  hit: boolean;
  duration: number;
  timestamp: number;
}

@Injectable()
export class PerformanceMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private performanceObserver: PerformanceObserver;
  private metricsBuffer: PerformanceMetric[] = [];
  private readonly BUFFER_SIZE = 1000;
  private readonly ALERT_THRESHOLDS = {
    API_RESPONSE_TIME: 100, // 100ms
    DATABASE_QUERY_TIME: 50, // 50ms
    CACHE_OPERATION_TIME: 10, // 10ms
    ERROR_RATE_THRESHOLD: 0.05, // 5%
    MEMORY_USAGE_THRESHOLD: 0.85 // 85%
  };

  constructor(private cacheService?: CacheService) {}

  async onModuleInit() {
    this.initializePerformanceObserver();
    this.startMetricsCollection();
    this.logger.log('Performance monitoring service initialized');
  }

  /**
   * Initialize Node.js Performance Observer for automatic monitoring
   */
  private initializePerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.recordMetric({
          name: entry.name,
          duration: entry.duration,
          timestamp: Date.now(),
          metadata: {
            entryType: entry.entryType,
            startTime: entry.startTime
          }
        });
      });
    });

    // Observe specific performance entry types
    this.performanceObserver.observe({ 
      entryTypes: ['measure', 'navigation', 'resource'] 
    });
  }

  /**
   * Track API endpoint performance
   */
  trackApiResponse(data: ApiPerformanceData): void {
    this.recordMetric({
      name: 'api_response',
      duration: data.duration,
      timestamp: data.timestamp,
      metadata: data
    });

    // Alert on slow responses
    if (data.duration > this.ALERT_THRESHOLDS.API_RESPONSE_TIME) {
      this.logger.warn(
        `Slow API response: ${data.method} ${data.endpoint} - ${data.duration}ms`,
        { ...data }
      );
      this.sendSlowResponseAlert(data);
    }

    // Track API performance metrics in cache for dashboard
    this.updateApiMetricsCache(data);
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(data: DatabasePerformanceData): void {
    this.recordMetric({
      name: 'database_query',
      duration: data.duration,
      timestamp: data.timestamp,
      metadata: data
    });

    // Alert on slow queries
    if (data.duration > this.ALERT_THRESHOLDS.DATABASE_QUERY_TIME) {
      this.logger.warn(
        `Slow database query: ${data.query.substring(0, 100)}... - ${data.duration}ms`,
        { ...data }
      );
      this.sendSlowQueryAlert(data);
    }

    // Update database performance metrics
    this.updateDatabaseMetricsCache(data);
  }

  /**
   * Track cache operation performance
   */
  trackCacheOperation(data: CachePerformanceData): void {
    this.recordMetric({
      name: 'cache_operation',
      duration: data.duration,
      timestamp: data.timestamp,
      metadata: data
    });

    // Alert on slow cache operations
    if (data.duration > this.ALERT_THRESHOLDS.CACHE_OPERATION_TIME) {
      this.logger.warn(
        `Slow cache operation: ${data.operation} ${data.key} - ${data.duration}ms`,
        { ...data }
      );
    }

    // Update cache hit rate metrics
    this.updateCacheMetrics(data);
  }

  /**
   * Track WebSocket performance for real-time features
   */
  trackWebSocketPerformance(connectionCount: number, messageLatency: number): void {
    this.recordMetric({
      name: 'websocket_performance',
      duration: messageLatency,
      timestamp: Date.now(),
      metadata: {
        connectionCount,
        messageLatency
      }
    });

    // Alert on high connection count (tournament capacity)
    if (connectionCount > 1000) {
      this.logger.warn(`High WebSocket connection count: ${connectionCount}`);
    }

    // Alert on high message latency
    if (messageLatency > 50) {
      this.logger.warn(`High WebSocket latency: ${messageLatency}ms`);
    }
  }

  /**
   * Track tournament-specific performance metrics
   */
  trackTournamentPerformance(tournamentId: string, metrics: {
    activePlayers: number;
    concurrentGames: number;
    scoreUpdateLatency: number;
    bracketUpdateTime: number;
  }): void {
    this.recordMetric({
      name: 'tournament_performance',
      duration: metrics.scoreUpdateLatency,
      timestamp: Date.now(),
      metadata: {
        tournamentId,
        ...metrics
      }
    });

    // Tournament-specific alerts
    if (metrics.scoreUpdateLatency > 100) {
      this.logger.warn(`Slow score updates in tournament ${tournamentId}: ${metrics.scoreUpdateLatency}ms`);
    }

    if (metrics.bracketUpdateTime > 200) {
      this.logger.warn(`Slow bracket updates in tournament ${tournamentId}: ${metrics.bracketUpdateTime}ms`);
    }
  }

  /**
   * Get real-time performance statistics
   */
  async getPerformanceStats(timeRange: '1h' | '24h' | '7d' = '1h'): Promise<{
    apiResponseTime: { avg: number; p95: number; p99: number };
    databaseQueryTime: { avg: number; p95: number; p99: number };
    cacheHitRate: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
  }> {
    const now = Date.now();
    const timeRangeMs = this.getTimeRangeInMs(timeRange);
    const cutoff = now - timeRangeMs;

    // Filter metrics by time range
    const recentMetrics = this.metricsBuffer.filter(
      metric => metric.timestamp > cutoff
    );

    // Calculate API performance stats
    const apiMetrics = recentMetrics.filter(m => m.name === 'api_response');
    const apiDurations = apiMetrics.map(m => m.duration).sort((a, b) => a - b);
    
    // Calculate database performance stats
    const dbMetrics = recentMetrics.filter(m => m.name === 'database_query');
    const dbDurations = dbMetrics.map(m => m.duration).sort((a, b) => a - b);

    // Calculate cache metrics
    const cacheMetrics = recentMetrics.filter(m => m.name === 'cache_operation');
    const cacheHits = cacheMetrics.filter(m => m.metadata?.hit === true).length;
    const cacheTotal = cacheMetrics.length;

    // Calculate error rate
    const errorCount = apiMetrics.filter(m => 
      m.metadata?.statusCode && m.metadata.statusCode >= 400
    ).length;

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;

    return {
      apiResponseTime: {
        avg: this.calculateAverage(apiDurations),
        p95: this.calculatePercentile(apiDurations, 95),
        p99: this.calculatePercentile(apiDurations, 99)
      },
      databaseQueryTime: {
        avg: this.calculateAverage(dbDurations),
        p95: this.calculatePercentile(dbDurations, 95),
        p99: this.calculatePercentile(dbDurations, 99)
      },
      cacheHitRate: cacheTotal > 0 ? (cacheHits / cacheTotal) * 100 : 0,
      errorRate: apiMetrics.length > 0 ? (errorCount / apiMetrics.length) * 100 : 0,
      throughput: apiMetrics.length / (timeRangeMs / (1000 * 60)), // requests per minute
      memoryUsage: memoryUsagePercent * 100
    };
  }

  /**
   * Get tournament-specific performance metrics
   */
  async getTournamentPerformanceStats(tournamentId: string): Promise<{
    averageScoreUpdateLatency: number;
    averageBracketUpdateTime: number;
    peakConcurrentUsers: number;
    totalApiRequests: number;
    errorRate: number;
  }> {
    const tournamentMetrics = this.metricsBuffer.filter(
      m => m.metadata?.tournamentId === tournamentId
    );

    const scoreUpdates = tournamentMetrics.filter(m => m.name === 'tournament_performance');
    const apiRequests = tournamentMetrics.filter(m => m.name === 'api_response');
    const errors = apiRequests.filter(m => m.metadata?.statusCode >= 400);

    return {
      averageScoreUpdateLatency: this.calculateAverage(
        scoreUpdates.map(m => m.duration)
      ),
      averageBracketUpdateTime: this.calculateAverage(
        scoreUpdates.map(m => m.metadata?.bracketUpdateTime || 0)
      ),
      peakConcurrentUsers: Math.max(
        ...scoreUpdates.map(m => m.metadata?.activePlayers || 0)
      ),
      totalApiRequests: apiRequests.length,
      errorRate: apiRequests.length > 0 ? (errors.length / apiRequests.length) * 100 : 0
    };
  }

  /**
   * Health check endpoint data
   */
  async getHealthMetrics(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: string; latency?: number; message?: string }>;
  }> {
    const checks: Record<string, { status: string; latency?: number; message?: string }> = {};
    
    // API Performance Check
    const recentApiMetrics = this.metricsBuffer
      .filter(m => m.name === 'api_response' && m.timestamp > Date.now() - 60000)
      .map(m => m.duration);
    
    const avgApiResponse = this.calculateAverage(recentApiMetrics);
    checks.api = {
      status: avgApiResponse < 100 ? 'healthy' : avgApiResponse < 200 ? 'degraded' : 'unhealthy',
      latency: avgApiResponse,
      message: avgApiResponse > 100 ? `Average response time: ${avgApiResponse}ms` : undefined
    };

    // Database Performance Check
    const recentDbMetrics = this.metricsBuffer
      .filter(m => m.name === 'database_query' && m.timestamp > Date.now() - 60000)
      .map(m => m.duration);
    
    const avgDbResponse = this.calculateAverage(recentDbMetrics);
    checks.database = {
      status: avgDbResponse < 50 ? 'healthy' : avgDbResponse < 100 ? 'degraded' : 'unhealthy',
      latency: avgDbResponse,
      message: avgDbResponse > 50 ? `Average query time: ${avgDbResponse}ms` : undefined
    };

    // Memory Usage Check
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    checks.memory = {
      status: memoryUsagePercent < 70 ? 'healthy' : memoryUsagePercent < 85 ? 'degraded' : 'unhealthy',
      message: `Memory usage: ${memoryUsagePercent.toFixed(1)}%`
    };

    // Cache Performance Check
    if (this.cacheService) {
      const cacheHealth = await this.cacheService.healthCheck();
      checks.cache = {
        status: cacheHealth.status,
        latency: cacheHealth.latency,
        message: cacheHealth.error
      };
    }

    // Overall status
    const allStatuses = Object.values(checks).map(check => check.status);
    const overallStatus = allStatuses.includes('unhealthy') ? 'unhealthy' :
                         allStatuses.includes('degraded') ? 'degraded' : 'healthy';

    return { status: overallStatus, checks };
  }

  /**
   * Private helper methods
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metricsBuffer.push(metric);
    
    // Keep buffer size manageable
    if (this.metricsBuffer.length > this.BUFFER_SIZE) {
      this.metricsBuffer = this.metricsBuffer.slice(-this.BUFFER_SIZE);
    }
  }

  private async updateApiMetricsCache(data: ApiPerformanceData): Promise<void> {
    if (!this.cacheService) return;
    
    const key = `metrics:api:${data.endpoint}:${Math.floor(Date.now() / 60000)}`; // Per minute
    const existing = await this.cacheService.get<any>(key) || { count: 0, totalDuration: 0, errors: 0 };
    
    existing.count++;
    existing.totalDuration += data.duration;
    if (data.statusCode >= 400) existing.errors++;
    
    await this.cacheService.set(key, existing, 3600); // 1 hour TTL
  }

  private async updateDatabaseMetricsCache(data: DatabasePerformanceData): Promise<void> {
    if (!this.cacheService) return;
    
    const key = `metrics:db:${Math.floor(Date.now() / 60000)}`; // Per minute
    const existing = await this.cacheService.get<any>(key) || { count: 0, totalDuration: 0, errors: 0 };
    
    existing.count++;
    existing.totalDuration += data.duration;
    if (data.error) existing.errors++;
    
    await this.cacheService.set(key, existing, 3600); // 1 hour TTL
  }

  private async updateCacheMetrics(data: CachePerformanceData): Promise<void> {
    if (!this.cacheService) return;
    
    const key = `metrics:cache:${Math.floor(Date.now() / 60000)}`; // Per minute
    const existing = await this.cacheService.get<any>(key) || { hits: 0, misses: 0, totalDuration: 0 };
    
    if (data.hit) {
      existing.hits++;
    } else {
      existing.misses++;
    }
    existing.totalDuration += data.duration;
    
    await this.cacheService.set(key, existing, 3600); // 1 hour TTL
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  private getTimeRangeInMs(range: '1h' | '24h' | '7d'): number {
    switch (range) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private startMetricsCollection(): void {
    // Clear old metrics every hour
    setInterval(() => {
      const cutoff = Date.now() - (2 * 60 * 60 * 1000); // Keep 2 hours of data
      this.metricsBuffer = this.metricsBuffer.filter(m => m.timestamp > cutoff);
    }, 60 * 60 * 1000); // Run every hour
  }

  private sendSlowResponseAlert(data: ApiPerformanceData): void {
    // Implementation would depend on your alerting system
    // This could send to Slack, email, PagerDuty, etc.
    this.logger.warn('ALERT: Slow API Response', {
      endpoint: data.endpoint,
      duration: data.duration,
      threshold: this.ALERT_THRESHOLDS.API_RESPONSE_TIME
    });
  }

  private sendSlowQueryAlert(data: DatabasePerformanceData): void {
    // Implementation would depend on your alerting system
    this.logger.warn('ALERT: Slow Database Query', {
      query: data.query.substring(0, 100),
      duration: data.duration,
      threshold: this.ALERT_THRESHOLDS.DATABASE_QUERY_TIME
    });
  }
}