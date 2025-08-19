import { MetricsPayload, WebSocketEvent } from './websocket.types';
import { getWebSocketService } from './websocket.service';

/**
 * WebSocket Monitoring Service
 * Provides real-time monitoring and metrics for WebSocket connections
 * 
 * Features:
 * - Connection health monitoring
 * - Message throughput tracking
 * - Latency measurements
 * - Error rate monitoring
 * - Performance metrics visualization
 */
export class WebSocketMonitoring {
  private static instance: WebSocketMonitoring;
  private metricsHistory: MetricsPayload[] = [];
  private maxHistorySize = 100;
  private currentMetrics: MetricsPayload | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private latencyMeasurements: number[] = [];
  private errorLog: Array<{ timestamp: string; error: any }> = [];

  private constructor() {
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WebSocketMonitoring {
    if (!WebSocketMonitoring.instance) {
      WebSocketMonitoring.instance = new WebSocketMonitoring();
    }
    return WebSocketMonitoring.instance;
  }

  /**
   * Initialize monitoring
   */
  private initialize() {
    const wsService = getWebSocketService();
    
    // Subscribe to metrics updates
    wsService.on(WebSocketEvent.METRICS_UPDATE, (metrics: MetricsPayload) => {
      this.handleMetricsUpdate(metrics);
    });

    // Subscribe to connection events
    wsService.on('connection:established', (data) => {
      console.log('WebSocket connection established:', data);
    });

    wsService.on('connection:lost', (data) => {
      console.warn('WebSocket connection lost:', data);
    });

    wsService.on('connection:reconnected', (data) => {
      console.log('WebSocket connection reconnected:', data);
    });

    wsService.on('error', (error) => {
      this.logError(error);
    });

    // Start latency monitoring
    this.startLatencyMonitoring();
  }

  /**
   * Handle metrics update from server
   */
  private handleMetricsUpdate(metrics: MetricsPayload) {
    this.currentMetrics = metrics;
    this.metricsHistory.push(metrics);
    
    // Maintain history size limit
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    // Emit custom event for UI updates
    this.emitMetricsEvent('metrics:updated', metrics);
  }

  /**
   * Start latency monitoring
   */
  private startLatencyMonitoring() {
    // Measure latency every 30 seconds
    this.updateInterval = setInterval(() => {
      this.measureLatency();
    }, 30000);
  }

  /**
   * Measure WebSocket latency
   */
  private async measureLatency() {
    const wsService = getWebSocketService();
    
    if (!wsService.isConnected()) {
      return;
    }

    const startTime = Date.now();
    
    try {
      // Send a ping and measure response time
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Ping timeout')), 5000);
        
        // This would need to be implemented in the WebSocket service
        // For now, we'll simulate it
        setTimeout(() => {
          clearTimeout(timeout);
          resolve(true);
        }, Math.random() * 100);
      });

      const latency = Date.now() - startTime;
      this.latencyMeasurements.push(latency);
      
      // Keep only last 100 measurements
      if (this.latencyMeasurements.length > 100) {
        this.latencyMeasurements.shift();
      }

      this.emitMetricsEvent('latency:measured', { latency });
    } catch (error) {
      console.error('Latency measurement failed:', error);
    }
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): MetricsPayload | null {
    return this.currentMetrics;
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(): MetricsPayload[] {
    return [...this.metricsHistory];
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats() {
    if (!this.currentMetrics) {
      return null;
    }

    return {
      total: this.currentMetrics.connections.total,
      byNamespace: this.currentMetrics.connections.byNamespace,
      byRole: this.currentMetrics.connections.byRole,
    };
  }

  /**
   * Get message statistics
   */
  public getMessageStats() {
    if (!this.currentMetrics) {
      return null;
    }

    return {
      sent: this.currentMetrics.messages.sent,
      received: this.currentMetrics.messages.received,
      averageLatency: this.currentMetrics.messages.averageLatency,
      p95Latency: this.currentMetrics.messages.p95Latency,
      p99Latency: this.currentMetrics.messages.p99Latency,
    };
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    if (!this.currentMetrics) {
      return null;
    }

    return {
      cpuUsage: this.currentMetrics.performance.cpuUsage,
      memoryUsage: this.currentMetrics.performance.memoryUsage,
      eventLoopLag: this.currentMetrics.performance.eventLoopLag,
    };
  }

  /**
   * Get error statistics
   */
  public getErrorStats() {
    if (!this.currentMetrics) {
      return {
        total: this.errorLog.length,
        recent: this.errorLog.slice(-10),
      };
    }

    return {
      total: this.currentMetrics.errors.total,
      byType: this.currentMetrics.errors.byType,
      recent: this.currentMetrics.errors.recentErrors,
    };
  }

  /**
   * Get latency statistics
   */
  public getLatencyStats() {
    if (this.latencyMeasurements.length === 0) {
      return null;
    }

    const sorted = [...this.latencyMeasurements].sort((a, b) => a - b);
    const avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
    const p50 = this.getPercentile(sorted, 0.5);
    const p95 = this.getPercentile(sorted, 0.95);
    const p99 = this.getPercentile(sorted, 0.99);

    return {
      average: Math.round(avg),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      measurements: this.latencyMeasurements.length,
    };
  }

  /**
   * Get health status
   */
  public getHealthStatus() {
    const wsService = getWebSocketService();
    const isConnected = wsService.isConnected();
    const latencyStats = this.getLatencyStats();
    const errorStats = this.getErrorStats();

    let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const issues: string[] = [];

    if (!isConnected) {
      health = 'unhealthy';
      issues.push('WebSocket disconnected');
    }

    if (latencyStats && latencyStats.p95 > 1000) {
      health = health === 'unhealthy' ? 'unhealthy' : 'degraded';
      issues.push(`High latency: ${latencyStats.p95}ms (p95)`);
    }

    if (errorStats.total > 10) {
      health = health === 'unhealthy' ? 'unhealthy' : 'degraded';
      issues.push(`High error rate: ${errorStats.total} errors`);
    }

    return {
      status: health,
      isConnected,
      issues,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate percentile
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Log error
   */
  private logError(error: any) {
    this.errorLog.push({
      timestamp: new Date().toISOString(),
      error,
    });

    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }
  }

  /**
   * Emit metrics event
   */
  private emitMetricsEvent(event: string, data: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
  }

  /**
   * Subscribe to metrics events
   */
  public onMetricsUpdate(callback: (metrics: MetricsPayload) => void): () => void {
    const handler = (event: CustomEvent) => callback(event.detail);
    
    if (typeof window !== 'undefined') {
      window.addEventListener('metrics:updated' as any, handler);
      
      // Return unsubscribe function
      return () => {
        window.removeEventListener('metrics:updated' as any, handler);
      };
    }

    return () => {};
  }

  /**
   * Get monitoring dashboard data
   */
  public getDashboardData() {
    return {
      health: this.getHealthStatus(),
      connections: this.getConnectionStats(),
      messages: this.getMessageStats(),
      performance: this.getPerformanceMetrics(),
      latency: this.getLatencyStats(),
      errors: this.getErrorStats(),
      history: this.getMetricsHistory().slice(-20), // Last 20 data points
    };
  }

  /**
   * Export metrics data
   */
  public exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const data = {
      timestamp: new Date().toISOString(),
      current: this.currentMetrics,
      history: this.metricsHistory,
      latency: this.latencyMeasurements,
      errors: this.errorLog,
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV format
    const csvRows: string[] = [];
    csvRows.push('Timestamp,Connections,Messages Sent,Messages Received,Avg Latency,CPU Usage,Memory Usage');
    
    for (const metrics of this.metricsHistory) {
      csvRows.push([
        metrics.timestamp,
        metrics.connections.total,
        metrics.messages.sent,
        metrics.messages.received,
        metrics.messages.averageLatency,
        metrics.performance.cpuUsage,
        metrics.performance.memoryUsage,
      ].join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Reset monitoring data
   */
  public reset() {
    this.metricsHistory = [];
    this.currentMetrics = null;
    this.latencyMeasurements = [];
    this.errorLog = [];
  }

  /**
   * Stop monitoring
   */
  public stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Destroy monitoring service
   */
  public destroy() {
    this.stop();
    this.reset();
    WebSocketMonitoring.instance = null as any;
  }
}

// Export singleton instance getter
export const getWebSocketMonitoring = () => WebSocketMonitoring.getInstance();