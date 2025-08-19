/**
 * Performance Monitor for AI Analytics
 * Monitors and optimizes AI system performance
 */

export interface PerformanceMetrics {
  operationType: string;
  duration: number;
  success: boolean;
  cacheHit?: boolean;
  timestamp: Date;
  memoryUsage?: number;
  dataSize?: number;
}

export class AIPerformanceMonitor {
  private static instance: AIPerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsSize = 1000;
  private performanceThresholds = {
    prediction: 2000, // 2 seconds
    embedding: 1000,  // 1 second
    search: 500,      // 0.5 seconds
    optimization: 3000 // 3 seconds
  };

  static getInstance(): AIPerformanceMonitor {
    if (!AIPerformanceMonitor.instance) {
      AIPerformanceMonitor.instance = new AIPerformanceMonitor();
    }
    return AIPerformanceMonitor.instance;
  }

  /**
   * Track operation performance
   */
  async trackOperation<T>(
    operationType: string,
    operation: () => Promise<T>,
    dataSize?: number
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    let success = false;
    let result: T;

    try {
      result = await operation();
      success = true;
      return result;
    } catch (error) {
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      const endMemory = this.getMemoryUsage();
      
      this.recordMetric({
        operationType,
        duration,
        success,
        timestamp: new Date(),
        memoryUsage: endMemory - startMemory,
        dataSize
      });

      // Check for performance issues
      this.checkPerformanceThreshold(operationType, duration);
    }
  }

  /**
   * Record performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Maintain metrics size
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
  }

  /**
   * Get memory usage (if available)
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Check if operation exceeded performance threshold
   */
  private checkPerformanceThreshold(operationType: string, duration: number): void {
    const threshold = this.performanceThresholds[operationType as keyof typeof this.performanceThresholds];
    
    if (threshold && duration > threshold) {
      console.warn(`AI operation '${operationType}' took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
      
      // Emit performance warning event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ai:performance_warning', {
          detail: {
            operationType,
            duration,
            threshold,
            timestamp: new Date()
          }
        }));
      }
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    cacheHitRate: number;
    operationStats: Record<string, {
      count: number;
      avgDuration: number;
      successRate: number;
      p95Duration: number;
    }>;
    memoryTrend: number[];
    recentSlowOperations: Array<{
      operationType: string;
      duration: number;
      timestamp: Date;
    }>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0,
        cacheHitRate: 0,
        operationStats: {},
        memoryTrend: [],
        recentSlowOperations: []
      };
    }

    const totalOperations = this.metrics.length;
    const averageDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;
    const successRate = this.metrics.filter(m => m.success).length / totalOperations;
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const cacheHitRate = cacheHits / totalOperations;

    // Operation-specific stats
    const operationStats: Record<string, any> = {};
    const operationGroups = this.groupBy(this.metrics, 'operationType');

    for (const [operationType, operations] of Object.entries(operationGroups)) {
      const durations = operations.map(op => op.duration).sort((a, b) => a - b);
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const successRate = operations.filter(op => op.success).length / operations.length;
      const p95Index = Math.floor(durations.length * 0.95);
      const p95Duration = durations[p95Index] || 0;

      operationStats[operationType] = {
        count: operations.length,
        avgDuration,
        successRate,
        p95Duration
      };
    }

    // Memory trend (last 20 operations)
    const memoryTrend = this.metrics
      .slice(-20)
      .map(m => m.memoryUsage || 0);

    // Recent slow operations
    const recentSlowOperations = this.metrics
      .filter(m => {
        const threshold = this.performanceThresholds[m.operationType as keyof typeof this.performanceThresholds];
        return threshold && m.duration > threshold;
      })
      .slice(-10)
      .map(m => ({
        operationType: m.operationType,
        duration: m.duration,
        timestamp: m.timestamp
      }));

    return {
      totalOperations,
      averageDuration,
      successRate,
      cacheHitRate,
      operationStats,
      memoryTrend,
      recentSlowOperations
    };
  }

  /**
   * Get real-time performance metrics
   */
  getRealTimeMetrics(): {
    currentOperations: number;
    avgResponseTime: number;
    errorRate: number;
    memoryUsage: number;
  } {
    const recentMetrics = this.metrics.slice(-50); // Last 50 operations
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const currentOperations = recentMetrics.filter(
      m => m.timestamp.getTime() > oneMinuteAgo
    ).length;

    const avgResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

    const errorRate = recentMetrics.length > 0
      ? recentMetrics.filter(m => !m.success).length / recentMetrics.length
      : 0;

    const memoryUsage = this.getMemoryUsage();

    return {
      currentOperations,
      avgResponseTime,
      errorRate,
      memoryUsage
    };
  }

  /**
   * Optimize performance based on metrics
   */
  getPerformanceRecommendations(): string[] {
    const stats = this.getPerformanceStats();
    const recommendations: string[] = [];

    // Check overall performance
    if (stats.averageDuration > 2000) {
      recommendations.push('Consider implementing more aggressive caching strategies');
    }

    if (stats.cacheHitRate < 0.5) {
      recommendations.push('Increase cache TTL or cache size to improve hit rate');
    }

    if (stats.successRate < 0.95) {
      recommendations.push('Investigate and fix frequent operation failures');
    }

    // Check operation-specific performance
    for (const [operationType, opStats] of Object.entries(stats.operationStats)) {
      if (opStats.p95Duration > (this.performanceThresholds[operationType as keyof typeof this.performanceThresholds] || 5000)) {
        recommendations.push(`Optimize ${operationType} operations - 95th percentile too slow`);
      }
    }

    // Check memory usage trend
    if (stats.memoryTrend.length > 10) {
      const memoryIncrease = stats.memoryTrend[stats.memoryTrend.length - 1] - stats.memoryTrend[0];
      if (memoryIncrease > 10000000) { // 10MB increase
        recommendations.push('Memory usage trending upward - check for memory leaks');
      }
    }

    return recommendations;
  }

  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Group array by property
   */
  private groupBy<T>(array: T[], property: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = String(item[property]);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Set performance thresholds
   */
  setThresholds(thresholds: Partial<typeof this.performanceThresholds>): void {
    this.performanceThresholds = { ...this.performanceThresholds, ...thresholds };
  }
}

/**
 * Decorator for tracking method performance
 */
export function trackPerformance(operationType: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const monitor = AIPerformanceMonitor.getInstance();
      return monitor.trackOperation(operationType, () => method.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Performance-aware cache implementation
 */
export class PerformanceCache<T> {
  private cache = new Map<string, { data: T; expires: Date; hits: number; }>();
  private monitor = AIPerformanceMonitor.getInstance();

  async get(key: string): Promise<T | null> {
    return this.monitor.trackOperation('cache_get', async () => {
      const entry = this.cache.get(key);
      
      if (!entry || entry.expires < new Date()) {
        this.cache.delete(key);
        return null;
      }

      entry.hits++;
      return entry.data;
    });
  }

  async set(key: string, data: T, ttlMs: number = 300000): Promise<void> {
    return this.monitor.trackOperation('cache_set', async () => {
      const expires = new Date(Date.now() + ttlMs);
      this.cache.set(key, { data, expires, hits: 0 });
    });
  }

  getStats(): { size: number; hitRate: number; } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const hitRate = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      hitRate
    };
  }

  clear(): void {
    this.cache.clear();
  }
}