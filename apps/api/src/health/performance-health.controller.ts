/**
 * Performance Health Check Controller
 * Provides detailed performance metrics and health status
 * Critical for monitoring tournament day operations
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PerformanceMonitoringService } from '../common/services/performance-monitoring.service';
import { CacheService } from '../common/services/cache.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health & Performance')
@Controller('health')
@Public()
export class PerformanceHealthController {
  constructor(
    private performanceService: PerformanceMonitoringService,
    private cacheService: CacheService
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Overall system health check',
    description: 'Returns comprehensive health status for all system components'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'System health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string' },
        version: { type: 'string' },
        uptime: { type: 'number' },
        checks: {
          type: 'object',
          properties: {
            api: { 
              type: 'object',
              properties: {
                status: { type: 'string' },
                latency: { type: 'number' },
                message: { type: 'string' }
              }
            },
            database: { 
              type: 'object',
              properties: {
                status: { type: 'string' },
                latency: { type: 'number' },
                message: { type: 'string' }
              }
            },
            cache: { 
              type: 'object',
              properties: {
                status: { type: 'string' },
                latency: { type: 'number' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  async getHealthStatus() {
    const healthMetrics = await this.performanceService.getHealthMetrics();
    
    return {
      ...healthMetrics,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  @Get('performance')
  @ApiOperation({ 
    summary: 'Detailed performance metrics',
    description: 'Returns comprehensive performance statistics for monitoring dashboard'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Performance metrics',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string' },
        apiResponseTime: {
          type: 'object',
          properties: {
            avg: { type: 'number' },
            p95: { type: 'number' },
            p99: { type: 'number' }
          }
        },
        databaseQueryTime: {
          type: 'object',
          properties: {
            avg: { type: 'number' },
            p95: { type: 'number' },
            p99: { type: 'number' }
          }
        },
        cacheHitRate: { type: 'number' },
        errorRate: { type: 'number' },
        throughput: { type: 'number' },
        memoryUsage: { type: 'number' }
      }
    }
  })
  async getPerformanceMetrics() {
    const [hourMetrics, dayMetrics] = await Promise.all([
      this.performanceService.getPerformanceStats('1h'),
      this.performanceService.getPerformanceStats('24h')
    ]);

    const systemMetrics = this.getSystemMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      current: hourMetrics,
      daily: dayMetrics,
      system: systemMetrics,
      alerts: await this.checkPerformanceAlerts(hourMetrics)
    };
  }

  @Get('cache')
  @ApiOperation({ 
    summary: 'Cache performance metrics',
    description: 'Returns detailed cache statistics and health information'
  })
  @ApiResponse({ status: 200, description: 'Cache performance data' })
  async getCacheMetrics() {
    const cacheStats = await this.cacheService.getStats();
    const cacheHealth = await this.cacheService.healthCheck();
    
    return {
      timestamp: new Date().toISOString(),
      health: cacheHealth,
      statistics: cacheStats,
      recommendations: this.generateCacheRecommendations(cacheStats)
    };
  }

  @Get('tournament/:tournamentId')
  @ApiOperation({ 
    summary: 'Tournament-specific performance metrics',
    description: 'Returns performance data for a specific tournament'
  })
  @ApiResponse({ status: 200, description: 'Tournament performance data' })
  async getTournamentPerformance(tournamentId: string) {
    const tournamentStats = await this.performanceService.getTournamentPerformanceStats(tournamentId);
    
    return {
      timestamp: new Date().toISOString(),
      tournamentId,
      performance: tournamentStats,
      recommendations: this.generateTournamentRecommendations(tournamentStats)
    };
  }

  @Get('ready')
  @ApiOperation({ 
    summary: 'Readiness probe for load balancer',
    description: 'Returns 200 if service is ready to accept traffic'
  })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async getReadinessProbe() {
    const health = await this.performanceService.getHealthMetrics();
    
    // Return 503 if any critical system is unhealthy
    if (health.checks.database?.status === 'unhealthy' || 
        health.checks.cache?.status === 'unhealthy') {
      throw new Error('Service not ready');
    }
    
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Get('live')
  @ApiOperation({ 
    summary: 'Liveness probe for container orchestration',
    description: 'Returns 200 if service is alive'
  })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async getLivenessProbe() {
    return { 
      status: 'alive', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid
    };
  }

  /**
   * Get system-level performance metrics
   */
  private getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        usagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        total: cpuUsage.user + cpuUsage.system
      },
      uptime: process.uptime(),
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  /**
   * Check for performance alerts based on thresholds
   */
  private async checkPerformanceAlerts(metrics: any): Promise<any[]> {
    const alerts = [];

    // API Response Time Alert
    if (metrics.apiResponseTime.p95 > 100) {
      alerts.push({
        type: 'warning',
        metric: 'api_response_time',
        threshold: 100,
        actual: metrics.apiResponseTime.p95,
        message: `P95 API response time (${metrics.apiResponseTime.p95}ms) exceeds target of 100ms`
      });
    }

    // Database Query Time Alert  
    if (metrics.databaseQueryTime.avg > 50) {
      alerts.push({
        type: 'warning',
        metric: 'database_query_time',
        threshold: 50,
        actual: metrics.databaseQueryTime.avg,
        message: `Average database query time (${metrics.databaseQueryTime.avg}ms) exceeds target of 50ms`
      });
    }

    // Cache Hit Rate Alert
    if (metrics.cacheHitRate < 85) {
      alerts.push({
        type: 'warning',
        metric: 'cache_hit_rate',
        threshold: 85,
        actual: metrics.cacheHitRate,
        message: `Cache hit rate (${metrics.cacheHitRate}%) below target of 85%`
      });
    }

    // Error Rate Alert
    if (metrics.errorRate > 1) {
      alerts.push({
        type: 'error',
        metric: 'error_rate',
        threshold: 1,
        actual: metrics.errorRate,
        message: `Error rate (${metrics.errorRate}%) exceeds maximum of 1%`
      });
    }

    // Memory Usage Alert
    if (metrics.memoryUsage > 85) {
      alerts.push({
        type: 'warning',
        metric: 'memory_usage',
        threshold: 85,
        actual: metrics.memoryUsage,
        message: `Memory usage (${metrics.memoryUsage}%) exceeds safe threshold of 85%`
      });
    }

    return alerts;
  }

  /**
   * Generate cache optimization recommendations
   */
  private generateCacheRecommendations(cacheStats: any): string[] {
    const recommendations = [];
    
    const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100;
    
    if (hitRate < 80) {
      recommendations.push('Consider increasing cache TTL for frequently accessed data');
      recommendations.push('Review cache keys to ensure optimal data is being cached');
    }
    
    if (cacheStats.evictions > cacheStats.hits * 0.1) {
      recommendations.push('Consider increasing cache memory allocation');
      recommendations.push('Review cache eviction policy (currently LRU)');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal');
    }
    
    return recommendations;
  }

  /**
   * Generate tournament-specific performance recommendations
   */
  private generateTournamentRecommendations(tournamentStats: any): string[] {
    const recommendations = [];
    
    if (tournamentStats.averageScoreUpdateLatency > 100) {
      recommendations.push('Consider optimizing score update queries or adding database indexes');
    }
    
    if (tournamentStats.averageBracketUpdateTime > 200) {
      recommendations.push('Consider caching tournament bracket data or optimizing bracket calculations');
    }
    
    if (tournamentStats.errorRate > 2) {
      recommendations.push('High error rate detected - review application logs for tournament-specific issues');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Tournament performance is within optimal parameters');
    }
    
    return recommendations;
  }
}