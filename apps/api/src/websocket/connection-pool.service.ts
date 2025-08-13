import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import { ConnectionInfo, ConnectionPoolConfig } from './websocket.types';

/**
 * Connection Pool Service
 * Manages WebSocket connection limits and pooling for optimal performance
 * 
 * Features:
 * - Per-organization connection limits
 * - Per-user connection limits
 * - Total connection limit enforcement
 * - Connection health monitoring
 * - Automatic cleanup of stale connections
 * - Load balancing across connections
 */
@Injectable()
export class ConnectionPoolService {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private server: Server;
  private config: ConnectionPoolConfig;
  
  // Connection tracking
  private connectionsByOrg = new Map<string, Set<string>>();
  private connectionsByUser = new Map<string, Set<string>>();
  private allConnections = new Map<string, ConnectionInfo>();
  private connectionHealth = new Map<string, { lastPing: Date; latency: number }>();
  
  // Health check interval
  private healthCheckInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.loadConfiguration();
  }

  /**
   * Load configuration from environment
   */
  private loadConfiguration() {
    this.config = {
      maxConnectionsPerOrg: this.configService.get<number>('WS_MAX_CONNECTIONS_PER_ORG', 100),
      maxConnectionsPerUser: this.configService.get<number>('WS_MAX_CONNECTIONS_PER_USER', 5),
      maxTotalConnections: this.configService.get<number>('WS_MAX_TOTAL_CONNECTIONS', 2000),
      connectionTimeout: this.configService.get<number>('WS_CONNECTION_TIMEOUT', 300000), // 5 minutes
      heartbeatInterval: this.configService.get<number>('WS_HEARTBEAT_INTERVAL', 30000), // 30 seconds
      reconnectAttempts: this.configService.get<number>('WS_RECONNECT_ATTEMPTS', 3),
      reconnectDelay: this.configService.get<number>('WS_RECONNECT_DELAY', 1000),
    };
  }

  /**
   * Initialize the connection pool
   */
  async initialize(server: Server) {
    this.server = server;
    this.startHealthChecks();
    this.setupConnectionLimitEnforcement();
    this.logger.log('Connection pool initialized');
  }

  /**
   * Check if a new connection can be accepted
   */
  canAcceptConnection(organizationId: string, userId?: string): boolean {
    // Check total connections limit
    if (this.allConnections.size >= this.config.maxTotalConnections) {
      this.logger.warn(`Total connection limit reached: ${this.allConnections.size}/${this.config.maxTotalConnections}`);
      return false;
    }

    // Check organization limit
    const orgConnections = this.connectionsByOrg.get(organizationId)?.size || 0;
    if (orgConnections >= this.config.maxConnectionsPerOrg) {
      this.logger.warn(`Organization connection limit reached for ${organizationId}: ${orgConnections}/${this.config.maxConnectionsPerOrg}`);
      return false;
    }

    // Check user limit if userId provided
    if (userId) {
      const userConnections = this.connectionsByUser.get(userId)?.size || 0;
      if (userConnections >= this.config.maxConnectionsPerUser) {
        this.logger.warn(`User connection limit reached for ${userId}: ${userConnections}/${this.config.maxConnectionsPerUser}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Add a new connection to the pool
   */
  addConnection(connectionInfo: ConnectionInfo): boolean {
    const { socketId, userId, organizationId } = connectionInfo;

    // Verify we can accept this connection
    if (!this.canAcceptConnection(organizationId, userId)) {
      return false;
    }

    // Add to all connections
    this.allConnections.set(socketId, connectionInfo);

    // Add to organization connections
    if (!this.connectionsByOrg.has(organizationId)) {
      this.connectionsByOrg.set(organizationId, new Set());
    }
    this.connectionsByOrg.get(organizationId)!.add(socketId);

    // Add to user connections
    if (!this.connectionsByUser.has(userId)) {
      this.connectionsByUser.set(userId, new Set());
    }
    this.connectionsByUser.get(userId)!.add(socketId);

    // Initialize health tracking
    this.connectionHealth.set(socketId, {
      lastPing: new Date(),
      latency: 0,
    });

    this.logger.debug(`Connection added to pool: ${socketId} (User: ${userId}, Org: ${organizationId})`);
    return true;
  }

  /**
   * Remove a connection from the pool
   */
  removeConnection(connectionInfo: ConnectionInfo): void {
    const { socketId, userId, organizationId } = connectionInfo;

    // Remove from all connections
    this.allConnections.delete(socketId);

    // Remove from organization connections
    const orgConnections = this.connectionsByOrg.get(organizationId);
    if (orgConnections) {
      orgConnections.delete(socketId);
      if (orgConnections.size === 0) {
        this.connectionsByOrg.delete(organizationId);
      }
    }

    // Remove from user connections
    const userConnections = this.connectionsByUser.get(userId);
    if (userConnections) {
      userConnections.delete(socketId);
      if (userConnections.size === 0) {
        this.connectionsByUser.delete(userId);
      }
    }

    // Remove health tracking
    this.connectionHealth.delete(socketId);

    this.logger.debug(`Connection removed from pool: ${socketId} (User: ${userId}, Org: ${organizationId})`);
  }

  /**
   * Get all connections for an organization
   */
  getOrganizationConnections(organizationId: string): ConnectionInfo[] {
    const socketIds = this.connectionsByOrg.get(organizationId);
    if (!socketIds) return [];

    return Array.from(socketIds)
      .map(id => this.allConnections.get(id))
      .filter(Boolean) as ConnectionInfo[];
  }

  /**
   * Get all connections for a user
   */
  getUserConnections(userId: string): ConnectionInfo[] {
    const socketIds = this.connectionsByUser.get(userId);
    if (!socketIds) return [];

    return Array.from(socketIds)
      .map(id => this.allConnections.get(id))
      .filter(Boolean) as ConnectionInfo[];
  }

  /**
   * Get connection statistics
   */
  getStatistics() {
    const stats = {
      total: this.allConnections.size,
      byOrganization: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      health: {
        healthy: 0,
        unhealthy: 0,
        avgLatency: 0,
      },
      limits: {
        maxTotal: this.config.maxTotalConnections,
        maxPerOrg: this.config.maxConnectionsPerOrg,
        maxPerUser: this.config.maxConnectionsPerUser,
      },
      utilization: {
        total: (this.allConnections.size / this.config.maxTotalConnections) * 100,
      },
    };

    // Count by organization
    for (const [orgId, connections] of this.connectionsByOrg) {
      stats.byOrganization[orgId] = connections.size;
    }

    // Count by user (top 10)
    const userCounts = Array.from(this.connectionsByUser.entries())
      .map(([userId, connections]) => ({ userId, count: connections.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    for (const { userId, count } of userCounts) {
      stats.byUser[userId] = count;
    }

    // Calculate health statistics
    let totalLatency = 0;
    const now = new Date();
    
    for (const [, health] of this.connectionHealth) {
      const timeSinceLastPing = now.getTime() - health.lastPing.getTime();
      
      if (timeSinceLastPing < this.config.heartbeatInterval * 2) {
        stats.health.healthy++;
      } else {
        stats.health.unhealthy++;
      }
      
      totalLatency += health.latency;
    }

    if (this.connectionHealth.size > 0) {
      stats.health.avgLatency = Math.round(totalLatency / this.connectionHealth.size);
    }

    return stats;
  }

  /**
   * Start health checks for all connections
   */
  private startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.heartbeatInterval);

    // Cleanup on shutdown
    process.on('SIGTERM', () => {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
    });
  }

  /**
   * Perform health check on all connections
   */
  private async performHealthCheck() {
    const now = new Date();
    const timeout = this.config.connectionTimeout;
    const staleConnections: string[] = [];

    for (const [socketId, health] of this.connectionHealth) {
      const timeSinceLastPing = now.getTime() - health.lastPing.getTime();
      
      // Check for stale connections
      if (timeSinceLastPing > timeout) {
        staleConnections.push(socketId);
        continue;
      }

      // Send ping to measure latency
      if (this.server) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          const pingStart = Date.now();
          
          socket.emit('ping', { timestamp: pingStart }, (response: any) => {
            const latency = Date.now() - pingStart;
            
            const healthData = this.connectionHealth.get(socketId);
            if (healthData) {
              healthData.lastPing = new Date();
              healthData.latency = latency;
            }
          });
        } else {
          // Socket not found, mark for removal
          staleConnections.push(socketId);
        }
      }
    }

    // Clean up stale connections
    for (const socketId of staleConnections) {
      const connectionInfo = this.allConnections.get(socketId);
      if (connectionInfo) {
        this.removeConnection(connectionInfo);
        this.logger.warn(`Removed stale connection: ${socketId}`);
      }
    }

    if (staleConnections.length > 0) {
      this.logger.log(`Cleaned up ${staleConnections.length} stale connections`);
    }
  }

  /**
   * Setup connection limit enforcement
   */
  private setupConnectionLimitEnforcement() {
    if (!this.server) return;

    // Monitor new connections
    this.server.on('connection', (socket) => {
      // Set up periodic check for this socket
      const checkInterval = setInterval(() => {
        if (!this.allConnections.has(socket.id)) {
          clearInterval(checkInterval);
          return;
        }

        // Additional connection-specific checks can be added here
      }, 60000); // Check every minute

      socket.on('disconnect', () => {
        clearInterval(checkInterval);
      });
    });
  }

  /**
   * Force disconnect oldest connections when limits are exceeded
   */
  async enforceConnectionLimits(organizationId: string, userId: string): Promise<void> {
    // Check organization limit
    const orgConnections = this.getOrganizationConnections(organizationId);
    if (orgConnections.length > this.config.maxConnectionsPerOrg) {
      const toDisconnect = orgConnections
        .sort((a, b) => a.connectedAt.getTime() - b.connectedAt.getTime())
        .slice(0, orgConnections.length - this.config.maxConnectionsPerOrg);
      
      for (const conn of toDisconnect) {
        await this.disconnectSocket(conn.socketId, 'Organization connection limit exceeded');
      }
    }

    // Check user limit
    const userConnections = this.getUserConnections(userId);
    if (userConnections.length > this.config.maxConnectionsPerUser) {
      const toDisconnect = userConnections
        .sort((a, b) => a.connectedAt.getTime() - b.connectedAt.getTime())
        .slice(0, userConnections.length - this.config.maxConnectionsPerUser);
      
      for (const conn of toDisconnect) {
        await this.disconnectSocket(conn.socketId, 'User connection limit exceeded');
      }
    }
  }

  /**
   * Disconnect a socket with a reason
   */
  private async disconnectSocket(socketId: string, reason: string): Promise<void> {
    if (this.server) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('force_disconnect', { reason });
        socket.disconnect(true);
        this.logger.log(`Force disconnected socket ${socketId}: ${reason}`);
      }
    }
  }

  /**
   * Get load balancing recommendation for new connection
   */
  getLoadBalancingRecommendation(): { 
    canAccept: boolean; 
    currentLoad: number; 
    recommendation: string 
  } {
    const currentLoad = (this.allConnections.size / this.config.maxTotalConnections) * 100;
    
    if (currentLoad >= 95) {
      return {
        canAccept: false,
        currentLoad,
        recommendation: 'Server at capacity, redirect to another instance',
      };
    } else if (currentLoad >= 80) {
      return {
        canAccept: true,
        currentLoad,
        recommendation: 'High load, consider scaling',
      };
    } else {
      return {
        canAccept: true,
        currentLoad,
        recommendation: 'Normal load',
      };
    }
  }

  /**
   * Gracefully shutdown all connections
   */
  async shutdown(): Promise<void> {
    this.logger.log('Shutting down connection pool...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Notify all connected clients
    if (this.server) {
      this.server.emit('server_shutdown', {
        message: 'Server is shutting down for maintenance',
        reconnectDelay: 5000,
      });
      
      // Give clients time to receive the message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Disconnect all sockets
      this.server.disconnectSockets(true);
    }

    this.allConnections.clear();
    this.connectionsByOrg.clear();
    this.connectionsByUser.clear();
    this.connectionHealth.clear();
    
    this.logger.log('Connection pool shutdown complete');
  }
}