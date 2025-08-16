import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { ConnectionInfo, MetricsPayload, WebSocketErrorCode } from './websocket.types';
import { RedisService } from './redis.service';

/**
 * WebSocket Metrics Service
 * Collects and provides real-time metrics for WebSocket connections and performance
 * 
 * Features:
 * - Connection tracking and statistics
 * - Message throughput monitoring
 * - Latency measurements (avg, p95, p99)
 * - Error tracking and reporting
 * - Performance metrics (CPU, memory, event loop)
 * - Room subscription analytics
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private server: Server;
  private metricsInterval: NodeJS.Timeout;

  // Metrics storage
  private metrics = {
    connections: new Map<string, ConnectionInfo>(),
    messages: {
      sent: 0,
      received: 0,
      latencies: [] as number[],
    },
    errors: [] as Array<{ timestamp: string; type: string; message: string }>,
    startTime: new Date(),
  };

  // Performance tracking
  private performanceMetrics = {
    eventLoopLag: 0,
    cpuUsage: 0,
    memoryUsage: 0,
  };

  constructor(private readonly redisService: RedisService) {}

  /**
   * Start collecting metrics
   */
  startCollection(server: Server) {
    this.server = server;
    this.setupMetricsCollection();
    this.setupPerformanceMonitoring();
    this.logger.log('Metrics collection started');
  }

  /**
   * Setup periodic metrics collection
   */
  private setupMetricsCollection() {
    // Collect metrics every 10 seconds
    this.metricsInterval = setInterval(async () => {
      const metrics = await this.collectMetrics();
      await this.redisService.storeMetrics('websocket', metrics);
      this.publishMetrics(metrics);
    }, 10000);

    // Cleanup on shutdown
    process.on('SIGTERM', () => {
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring() {
    // Monitor event loop lag
    let lastCheck = Date.now();
    setInterval(() => {
      const now = Date.now();
      const lag = now - lastCheck - 1000;
      this.performanceMetrics.eventLoopLag = Math.max(0, lag);
      lastCheck = now;
    }, 1000);

    // Monitor CPU and memory usage
    setInterval(() => {
      const usage = process.cpuUsage();
      const memUsage = process.memoryUsage();
      
      this.performanceMetrics.cpuUsage = (usage.user + usage.system) / 1000000; // Convert to seconds
      this.performanceMetrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // Convert to MB
    }, 5000);
  }

  /**
   * Record new connection
   */
  recordConnection(connectionInfo: ConnectionInfo) {
    this.metrics.connections.set(connectionInfo.socketId, connectionInfo);
    
    // Track connection event
    this.trackEvent('connection', {
      userId: connectionInfo.userId,
      organizationId: connectionInfo.organizationId,
      role: connectionInfo.role,
    });
  }

  /**
   * Record disconnection
   */
  recordDisconnection(connectionInfo: ConnectionInfo) {
    this.metrics.connections.delete(connectionInfo.socketId);
    
    // Calculate session duration
    const duration = Date.now() - connectionInfo.connectedAt.getTime();
    
    // Track disconnection event
    this.trackEvent('disconnection', {
      userId: connectionInfo.userId,
      organizationId: connectionInfo.organizationId,
      duration,
    });
  }

  /**
   * Record message sent
   */
  recordMessageSent(event: string, size: number) {
    this.metrics.messages.sent++;
    
    this.trackEvent('message_sent', {
      event,
      size,
    });
  }

  /**
   * Record message received
   */
  recordMessageReceived(event: string, size: number, latency?: number) {
    this.metrics.messages.received++;
    
    if (latency !== undefined && latency >= 0) {
      this.metrics.messages.latencies.push(latency);
      
      // Keep only last 1000 latency measurements
      if (this.metrics.messages.latencies.length > 1000) {
        this.metrics.messages.latencies.shift();
      }
    }
    
    this.trackEvent('message_received', {
      event,
      size,
      latency,
    });
  }

  /**
   * Record error
   */
  recordError(code: WebSocketErrorCode, message: string, details?: any) {
    const error = {
      timestamp: new Date().toISOString(),
      type: code,
      message,
      details,
    };
    
    this.metrics.errors.push(error);
    
    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
    
    this.logger.error(`WebSocket error: ${code} - ${message}`, details);
  }

  /**
   * Record custom event
   */
  recordEvent(eventName: string, data: any) {
    this.trackEvent(eventName, data);
  }

  /**
   * Track event for analytics
   */
  private trackEvent(eventName: string, data: any) {
    // Could integrate with analytics service here
    this.logger.debug(`Event tracked: ${eventName}`, data);
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<MetricsPayload> {
    const connections = await this.getConnectionStats();
    const messages = this.getMessageStats();
    const rooms = await this.getRoomStats();
    const performance = this.getPerformanceStats();
    const errors = this.getErrorStats();

    return {
      timestamp: new Date().toISOString(),
      connections,
      messages,
      rooms,
      performance,
      errors,
    };
  }

  /**
   * Get connection statistics
   */
  private async getConnectionStats() {
    const byNamespace: Record<string, number> = {};
    const byOrganization: Record<string, number> = {};
    const byRole: Record<string, number> = {};

    for (const [, info] of this.metrics.connections) {
      // Count by namespace
      byNamespace[info.namespace] = (byNamespace[info.namespace] || 0) + 1;
      
      // Count by organization
      byOrganization[info.organizationId] = (byOrganization[info.organizationId] || 0) + 1;
      
      // Count by role
      byRole[info.role] = (byRole[info.role] || 0) + 1;
    }

    return {
      total: this.metrics.connections.size,
      byNamespace,
      byOrganization,
      byRole,
    };
  }

  /**
   * Get message statistics
   */
  private getMessageStats() {
    const latencies = this.metrics.messages.latencies;
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    
    const averageLatency = latencies.length > 0
      ? latencies.reduce((sum, val) => sum + val, 0) / latencies.length
      : 0;
    
    const p95Latency = this.getPercentile(sortedLatencies, 0.95);
    const p99Latency = this.getPercentile(sortedLatencies, 0.99);

    return {
      sent: this.metrics.messages.sent,
      received: this.metrics.messages.received,
      averageLatency: Math.round(averageLatency),
      p95Latency: Math.round(p95Latency),
      p99Latency: Math.round(p99Latency),
    };
  }

  /**
   * Get room statistics
   */
  private async getRoomStats() {
    if (!this.server) {
      return {
        total: 0,
        byType: {},
        topRooms: [],
      };
    }

    const rooms = this.server.sockets.adapter.rooms;
    const byType: Record<string, number> = {};
    const roomSizes: Array<{ room: string; subscribers: number }> = [];

    for (const [roomName, socketIds] of rooms) {
      // Skip socket ID rooms (each socket automatically joins a room with its ID)
      if (!roomName.includes(':')) continue;

      const [type] = roomName.split(':');
      byType[type] = (byType[type] || 0) + 1;
      
      roomSizes.push({
        room: roomName,
        subscribers: socketIds.size,
      });
    }

    // Get top 10 rooms by subscriber count
    const topRooms = roomSizes
      .sort((a, b) => b.subscribers - a.subscribers)
      .slice(0, 10);

    return {
      total: roomSizes.length,
      byType,
      topRooms,
    };
  }

  /**
   * Get performance statistics
   */
  private getPerformanceStats() {
    return {
      cpuUsage: Math.round(this.performanceMetrics.cpuUsage * 100) / 100,
      memoryUsage: Math.round(this.performanceMetrics.memoryUsage * 100) / 100,
      eventLoopLag: this.performanceMetrics.eventLoopLag,
    };
  }

  /**
   * Get error statistics
   */
  private getErrorStats() {
    const byType: Record<string, number> = {};
    
    for (const error of this.metrics.errors) {
      byType[error.type] = (byType[error.type] || 0) + 1;
    }

    return {
      total: this.metrics.errors.length,
      byType,
      recentErrors: this.metrics.errors.slice(-10), // Last 10 errors
    };
  }

  /**
   * Calculate percentile value
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Publish metrics to admin namespace
   */
  private publishMetrics(metrics: MetricsPayload) {
    if (this.server) {
      this.server.of('/admin').emit('metrics_update', metrics);
    }
  }

  /**
   * Get current metrics snapshot
   */
  async getCurrentMetrics(): Promise<MetricsPayload> {
    return await this.collectMetrics();
  }

  /**
   * Get historical metrics from Redis
   */
  async getHistoricalMetrics(duration: number = 3600): Promise<MetricsPayload[]> {
    // This would fetch historical metrics from Redis or a time-series database
    // For now, return current metrics only
    const current = await this.getCurrentMetrics();
    return [current];
  }

  /**
   * Reset metrics (for testing purposes)
   */
  resetMetrics() {
    this.metrics.messages.sent = 0;
    this.metrics.messages.received = 0;
    this.metrics.messages.latencies = [];
    this.metrics.errors = [];
    this.logger.log('Metrics reset');
  }
}