import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { WsThrottleGuard } from './guards/ws-throttle.guard';
import { MetricsService } from './metrics.service';
import { ConnectionPoolService } from './connection-pool.service';
import {
  WebSocketEvent,
  WebSocketNamespace,
  GameUpdatePayload,
  TournamentUpdatePayload,
  NotificationPayload,
  MetricsPayload,
  ConnectionInfo,
  WebSocketRoom,
} from './websocket.types';

/**
 * Main WebSocket Gateway for Real-time Communications
 * Handles all WebSocket connections and real-time updates for the basketball platform
 * 
 * Architecture:
 * - Namespace-based organization for different feature areas
 * - Room-based broadcasting for efficient message distribution
 * - Redis adapter for horizontal scaling across multiple servers
 * - JWT-based authentication with connection-level authorization
 * - Built-in rate limiting and connection pooling
 * 
 * Performance targets:
 * - < 500ms latency for score updates
 * - Support for 1000+ concurrent connections
 * - Automatic failover and reconnection handling
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e6, // 1MB
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: false,
  },
})
export class WebSocketGatewayService implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(WebSocketGatewayService.name);
  private readonly connections = new Map<string, ConnectionInfo>();
  private readonly roomSubscriptions = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly metricsService: MetricsService,
    private readonly connectionPoolService: ConnectionPoolService,
  ) {}

  /**
   * Initialize the WebSocket server with Redis adapter for scaling
   */
  async afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    
    // Setup Redis adapter for horizontal scaling
    const redisAdapter = await this.redisService.createAdapter();
    server.adapter(redisAdapter);

    // Setup namespaces
    this.setupNamespaces(server);

    // Start metrics collection
    this.metricsService.startCollection(server);

    // Initialize connection pool
    await this.connectionPoolService.initialize(server);

    this.logger.log('WebSocket server fully initialized with Redis adapter');
  }

  /**
   * Handle new WebSocket connections
   */
  async handleConnection(socket: Socket) {
    try {
      // Extract and verify JWT token
      const token = this.extractToken(socket);
      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = await this.verifyToken(token);
      if (!payload) {
        socket.disconnect();
        return;
      }

      // Check connection pool limits
      if (!this.connectionPoolService.canAcceptConnection(payload.organizationId)) {
        socket.emit('error', { message: 'Connection limit reached for organization' });
        socket.disconnect();
        return;
      }

      // Store connection info
      const connectionInfo: ConnectionInfo = {
        socketId: socket.id,
        userId: payload.sub,
        organizationId: payload.organizationId,
        role: payload.role,
        connectedAt: new Date(),
        namespace: socket.nsp.name,
        rooms: new Set(),
        metadata: {
          userAgent: socket.handshake.headers['user-agent'] || 'unknown',
          ip: socket.handshake.address,
        },
      };

      this.connections.set(socket.id, connectionInfo);
      this.connectionPoolService.addConnection(connectionInfo);

      // Join organization room
      await socket.join(`org:${payload.organizationId}`);
      
      // Join role-specific room
      await socket.join(`role:${payload.role}`);

      // Track metrics
      this.metricsService.recordConnection(connectionInfo);

      // Send connection acknowledgment
      socket.emit('connected', {
        socketId: socket.id,
        serverTime: new Date().toISOString(),
        features: this.getEnabledFeatures(payload.role),
      });

      this.logger.log(`Client connected: ${socket.id} (User: ${payload.sub}, Org: ${payload.organizationId})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`, error.stack);
      socket.emit('error', { message: 'Authentication failed' });
      socket.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnections
   */
  async handleDisconnect(socket: Socket) {
    const connectionInfo = this.connections.get(socket.id);
    
    if (connectionInfo) {
      // Clean up connection tracking
      this.connections.delete(socket.id);
      this.connectionPoolService.removeConnection(connectionInfo);

      // Clean up room subscriptions
      for (const room of connectionInfo.rooms) {
        const subscribers = this.roomSubscriptions.get(room);
        if (subscribers) {
          subscribers.delete(socket.id);
          if (subscribers.size === 0) {
            this.roomSubscriptions.delete(room);
          }
        }
      }

      // Track metrics
      this.metricsService.recordDisconnection(connectionInfo);

      this.logger.log(`Client disconnected: ${socket.id} (User: ${connectionInfo.userId})`);
    }
  }

  /**
   * Subscribe to game updates
   */
  @UseGuards(WsJwtGuard, WsThrottleGuard)
  @SubscribeMessage(WebSocketEvent.SUBSCRIBE_GAME)
  async handleSubscribeGame(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const room = `${WebSocketRoom.GAME}:${data.gameId}`;
    await this.subscribeToRoom(socket, room);
    
    // Send current game state
    const gameState = await this.getGameState(data.gameId);
    if (gameState) {
      socket.emit(WebSocketEvent.GAME_UPDATE, gameState);
    }

    return { success: true, room };
  }

  /**
   * Unsubscribe from game updates
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage(WebSocketEvent.UNSUBSCRIBE_GAME)
  async handleUnsubscribeGame(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const room = `${WebSocketRoom.GAME}:${data.gameId}`;
    await this.unsubscribeFromRoom(socket, room);
    return { success: true, room };
  }

  /**
   * Subscribe to tournament updates
   */
  @UseGuards(WsJwtGuard, WsThrottleGuard)
  @SubscribeMessage(WebSocketEvent.SUBSCRIBE_TOURNAMENT)
  async handleSubscribeTournament(
    @MessageBody() data: { tournamentId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const room = `${WebSocketRoom.TOURNAMENT}:${data.tournamentId}`;
    await this.subscribeToRoom(socket, room);
    
    // Send current tournament state
    const tournamentState = await this.getTournamentState(data.tournamentId);
    if (tournamentState) {
      socket.emit(WebSocketEvent.TOURNAMENT_UPDATE, tournamentState);
    }

    return { success: true, room };
  }

  /**
   * Handle score updates from scorekeepers
   */
  @UseGuards(WsJwtGuard, WsThrottleGuard)
  @SubscribeMessage(WebSocketEvent.UPDATE_SCORE)
  async handleScoreUpdate(
    @MessageBody() data: GameUpdatePayload,
    @ConnectedSocket() socket: Socket,
  ) {
    const connectionInfo = this.connections.get(socket.id);
    
    // Verify scorekeeper role
    if (!['scorekeeper', 'admin'].includes(connectionInfo?.role)) {
      throw new WsException('Unauthorized to update scores');
    }

    // Validate and process score update
    const validatedUpdate = await this.validateScoreUpdate(data);
    
    // Store in Redis for persistence
    await this.redisService.storeGameUpdate(validatedUpdate);

    // Broadcast to all subscribers of this game
    const room = `${WebSocketRoom.GAME}:${data.gameId}`;
    this.server.to(room).emit(WebSocketEvent.GAME_UPDATE, {
      ...validatedUpdate,
      timestamp: new Date().toISOString(),
      updatedBy: connectionInfo.userId,
    });

    // Track metrics
    this.metricsService.recordEvent('score_update', {
      gameId: data.gameId,
      userId: connectionInfo.userId,
      latency: Date.now() - data.clientTimestamp,
    });

    return { success: true, processed: true };
  }

  /**
   * Broadcast system-wide announcements
   */
  async broadcastAnnouncement(announcement: NotificationPayload) {
    this.server.emit(WebSocketEvent.SYSTEM_ANNOUNCEMENT, announcement);
    
    // Track metrics
    this.metricsService.recordEvent('announcement_broadcast', {
      type: announcement.type,
      recipientCount: this.server.sockets.sockets.size,
    });
  }

  /**
   * Send targeted notifications
   */
  async sendNotification(userId: string, notification: NotificationPayload) {
    const userSockets = await this.getUserSockets(userId);
    
    for (const socketId of userSockets) {
      this.server.to(socketId).emit(WebSocketEvent.NOTIFICATION, notification);
    }

    // Store in Redis for offline delivery
    if (userSockets.length === 0) {
      await this.redisService.queueOfflineNotification(userId, notification);
    }
  }

  /**
   * Broadcast tournament bracket updates
   */
  async broadcastTournamentUpdate(tournamentId: string, update: TournamentUpdatePayload) {
    const room = `${WebSocketRoom.TOURNAMENT}:${tournamentId}`;
    
    this.server.to(room).emit(WebSocketEvent.TOURNAMENT_UPDATE, {
      ...update,
      timestamp: new Date().toISOString(),
    });

    // Track metrics
    const roomSize = await this.getRoomSize(room);
    this.metricsService.recordEvent('tournament_update', {
      tournamentId,
      type: update.type,
      recipientCount: roomSize,
    });
  }

  /**
   * Get current connection metrics
   */
  async getMetrics(): Promise<MetricsPayload> {
    return this.metricsService.getCurrentMetrics();
  }

  // Private helper methods

  private setupNamespaces(server: Server) {
    // Games namespace for live score updates
    const gamesNamespace = server.of(WebSocketNamespace.GAMES);
    gamesNamespace.use(this.authMiddleware.bind(this));

    // Tournaments namespace for bracket updates
    const tournamentsNamespace = server.of(WebSocketNamespace.TOURNAMENTS);
    tournamentsNamespace.use(this.authMiddleware.bind(this));

    // Admin namespace for dashboard metrics
    const adminNamespace = server.of(WebSocketNamespace.ADMIN);
    adminNamespace.use(this.authMiddleware.bind(this));
    adminNamespace.use(this.adminAuthMiddleware.bind(this));

    // Notifications namespace
    const notificationsNamespace = server.of(WebSocketNamespace.NOTIFICATIONS);
    notificationsNamespace.use(this.authMiddleware.bind(this));
  }

  private async authMiddleware(socket: Socket, next: Function) {
    try {
      const token = this.extractToken(socket);
      const payload = await this.verifyToken(token);
      
      if (payload) {
        socket.data.user = payload;
        next();
      } else {
        next(new Error('Authentication failed'));
      }
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  }

  private async adminAuthMiddleware(socket: Socket, next: Function) {
    if (socket.data.user?.role === 'admin') {
      next();
    } else {
      next(new Error('Admin access required'));
    }
  }

  private extractToken(socket: Socket): string | null {
    const auth = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    
    if (auth?.startsWith('Bearer ')) {
      return auth.substring(7);
    }
    
    return auth || null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  private async subscribeToRoom(socket: Socket, room: string) {
    await socket.join(room);
    
    const connectionInfo = this.connections.get(socket.id);
    if (connectionInfo) {
      connectionInfo.rooms.add(room);
    }

    let subscribers = this.roomSubscriptions.get(room);
    if (!subscribers) {
      subscribers = new Set();
      this.roomSubscriptions.set(room, subscribers);
    }
    subscribers.add(socket.id);

    this.logger.debug(`Socket ${socket.id} subscribed to room ${room}`);
  }

  private async unsubscribeFromRoom(socket: Socket, room: string) {
    await socket.leave(room);
    
    const connectionInfo = this.connections.get(socket.id);
    if (connectionInfo) {
      connectionInfo.rooms.delete(room);
    }

    const subscribers = this.roomSubscriptions.get(room);
    if (subscribers) {
      subscribers.delete(socket.id);
      if (subscribers.size === 0) {
        this.roomSubscriptions.delete(room);
      }
    }

    this.logger.debug(`Socket ${socket.id} unsubscribed from room ${room}`);
  }

  private async getUserSockets(userId: string): Promise<string[]> {
    const sockets: string[] = [];
    
    for (const [socketId, info] of this.connections) {
      if (info.userId === userId) {
        sockets.push(socketId);
      }
    }
    
    return sockets;
  }

  private async getRoomSize(room: string): Promise<number> {
    const roomSockets = await this.server.in(room).fetchSockets();
    return roomSockets.length;
  }

  private getEnabledFeatures(role: string): string[] {
    const features = ['live_scores', 'notifications'];
    
    if (['admin', 'league_admin'].includes(role)) {
      features.push('admin_dashboard', 'tournament_management');
    }
    
    if (['scorekeeper', 'referee'].includes(role)) {
      features.push('score_updates', 'game_management');
    }
    
    if (role === 'coach') {
      features.push('team_management', 'roster_updates');
    }
    
    return features;
  }

  private async validateScoreUpdate(data: GameUpdatePayload): Promise<GameUpdatePayload> {
    // Add validation logic here
    return data;
  }

  private async getGameState(gameId: string): Promise<any> {
    return await this.redisService.getGameState(gameId);
  }

  private async getTournamentState(tournamentId: string): Promise<any> {
    return await this.redisService.getTournamentState(tournamentId);
  }
}