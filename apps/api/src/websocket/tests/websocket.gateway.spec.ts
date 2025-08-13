import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket, Server } from 'socket.io';
import { WsException } from '@nestjs/websockets';

import { WebSocketGateway } from '../websocket.gateway';
import { RedisService } from '../redis.service';
import { MetricsService } from '../metrics.service';
import { ConnectionPoolService } from '../connection-pool.service';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { WsThrottleGuard } from '../guards/ws-throttle.guard';
import {
  WebSocketEvent,
  WebSocketNamespace,
  GameUpdatePayload,
  TournamentUpdatePayload,
  NotificationPayload,
  ConnectionInfo,
} from '../websocket.types';

import { WebSocketTestUtils, TestPerformanceMonitor } from '../../test/setup';

describe('WebSocketGateway', () => {
  let gateway: WebSocketGateway;
  let redisService: jest.Mocked<RedisService>;
  let metricsService: jest.Mocked<MetricsService>;
  let connectionPool: jest.Mocked<ConnectionPoolService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let mockServer: any;
  let mockSocket: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketGateway,
        {
          provide: RedisService,
          useFactory: () => ({
            publish: jest.fn(),
            subscribe: jest.fn(),
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            setex: jest.fn(),
          }),
        },
        {
          provide: MetricsService,
          useFactory: () => ({
            incrementConnectionCount: jest.fn(),
            decrementConnectionCount: jest.fn(),
            recordMessageSent: jest.fn(),
            recordMessageReceived: jest.fn(),
            recordLatency: jest.fn(),
            getConnectionMetrics: jest.fn(),
          }),
        },
        {
          provide: ConnectionPoolService,
          useFactory: () => ({
            addConnection: jest.fn(),
            removeConnection: jest.fn(),
            getConnection: jest.fn(),
            getConnectionsByUser: jest.fn(),
            getConnectionsByRoom: jest.fn(),
            getAllConnections: jest.fn(),
            cleanupStaleConnections: jest.fn(),
          }),
        },
        {
          provide: JwtService,
          useFactory: () => ({
            verify: jest.fn(),
            decode: jest.fn(),
          }),
        },
        {
          provide: ConfigService,
          useFactory: () => ({
            get: jest.fn(),
          }),
        },
      ],
    }).compile();

    gateway = module.get<WebSocketGateway>(WebSocketGateway);
    redisService = module.get(RedisService);
    metricsService = module.get(MetricsService);
    connectionPool = module.get(ConnectionPoolService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    mockServer = WebSocketTestUtils.createMockServer();
    mockSocket = WebSocketTestUtils.createMockSocket();
    
    gateway.server = mockServer;

    // Setup default config
    configService.get.mockImplementation((key: string) => {
      const configMap = {
        'jwt.secret': 'test-secret',
        'redis.host': 'localhost',
        'redis.port': 6379,
        'websocket.rateLimitWindow': 60000,
        'websocket.rateLimitMax': 100,
      };
      return configMap[key];
    });

    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should handle client connections properly', async () => {
      const mockJwtPayload = {
        sub: 'user-1',
        organizationId: 'org-1',
        roles: ['coach'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jwtService.verify.mockReturnValue(mockJwtPayload);
      connectionPool.addConnection.mockResolvedValue(undefined);

      await gateway.handleConnection(mockSocket);

      expect(jwtService.verify).toHaveBeenCalledWith('test-token');
      expect(connectionPool.addConnection).toHaveBeenCalledWith(
        mockSocket.id,
        expect.objectContaining({
          userId: 'user-1',
          organizationId: 'org-1',
          roles: ['coach'],
          connectedAt: expect.any(Date),
        })
      );
      expect(metricsService.incrementConnectionCount).toHaveBeenCalled();
      expect(mockSocket.join).toHaveBeenCalledWith('org:org-1');
    });

    it('should reject connections with invalid tokens', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect(connectionPool.addConnection).not.toHaveBeenCalled();
      expect(metricsService.incrementConnectionCount).not.toHaveBeenCalled();
    });

    it('should handle client disconnections gracefully', async () => {
      const connectionInfo: ConnectionInfo = {
        socketId: mockSocket.id,
        userId: 'user-1',
        organizationId: 'org-1',
        roles: ['coach'],
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscriptions: new Set(['tournament:1', 'game:1']),
      };

      connectionPool.getConnection.mockResolvedValue(connectionInfo);
      connectionPool.removeConnection.mockResolvedValue(undefined);

      await gateway.handleDisconnect(mockSocket);

      expect(connectionPool.removeConnection).toHaveBeenCalledWith(mockSocket.id);
      expect(metricsService.decrementConnectionCount).toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalledWith(`connection:${mockSocket.id}`);
    });

    it('should authenticate scorekeeper permissions', async () => {
      const mockScorekeeper = WebSocketTestUtils.createMockSocket();
      mockScorekeeper.userId = 'user-scorekeeper';
      mockScorekeeper.roles = ['scorekeeper'];

      const connectionInfo: ConnectionInfo = {
        socketId: mockScorekeeper.id,
        userId: 'user-scorekeeper',
        organizationId: 'org-1',
        roles: ['scorekeeper'],
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscriptions: new Set(),
      };

      connectionPool.getConnection.mockResolvedValue(connectionInfo);

      const canUpdateScore = gateway.hasPermission(connectionInfo, 'update:score');
      expect(canUpdateScore).toBe(true);

      const canManageTournament = gateway.hasPermission(connectionInfo, 'manage:tournament');
      expect(canManageTournament).toBe(false);
    });

    it('should rate limit update frequency', async () => {
      const connectionInfo: ConnectionInfo = {
        socketId: mockSocket.id,
        userId: 'user-1',
        organizationId: 'org-1',
        roles: ['scorekeeper'],
        connectedAt: new Date(),
        lastActivity: new Date(Date.now() - 1000), // 1 second ago
        subscriptions: new Set(),
      };

      connectionPool.getConnection.mockResolvedValue(connectionInfo);

      // First update should pass
      let result = gateway.checkRateLimit(connectionInfo, 'score_update');
      expect(result.allowed).toBe(true);

      // Immediate second update should be rate limited (< 1 second)
      connectionInfo.lastActivity = new Date();
      result = gateway.checkRateLimit(connectionInfo, 'score_update');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should handle multiple simultaneous connections from same user', async () => {
      const connections = Array.from({ length: 3 }, (_, i) => ({
        socketId: `socket-${i}`,
        userId: 'user-1',
        organizationId: 'org-1',
        roles: ['coach'],
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscriptions: new Set(),
      }));

      connectionPool.getConnectionsByUser.mockResolvedValue(connections);

      const userConnections = await gateway.getUserConnections('user-1');

      expect(userConnections).toHaveLength(3);
      expect(connectionPool.getConnectionsByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('Live Score Updates', () => {
    it('should broadcast score updates to all connected clients', async () => {
      const scoreUpdate: GameUpdatePayload = {
        gameId: 'game-1',
        tournamentId: 'tournament-1',
        homeScore: 75,
        awayScore: 68,
        period: 4,
        timeRemaining: '2:30',
        lastScoredBy: 'team-1',
        gameStatus: 'in_progress',
        timestamp: new Date(),
      };

      const subscribedConnections = [
        { socketId: 'socket-1', userId: 'user-1' },
        { socketId: 'socket-2', userId: 'user-2' },
        { socketId: 'socket-3', userId: 'user-3' },
      ];

      connectionPool.getConnectionsByRoom.mockResolvedValue(subscribedConnections as any);
      redisService.publish.mockResolvedValue(1);

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        await gateway.broadcastGameUpdate(scoreUpdate);
      });

      expect(duration).toMatchPerformanceThreshold(500); // Should complete within 500ms
      expect(mockServer.to).toHaveBeenCalledWith('game:game-1');
      expect(mockServer.emit).toHaveBeenCalledWith(WebSocketEvent.GAME_UPDATE, scoreUpdate);
      expect(redisService.publish).toHaveBeenCalledWith(
        'game:game-1',
        JSON.stringify({
          event: WebSocketEvent.GAME_UPDATE,
          data: scoreUpdate,
        })
      );
      expect(metricsService.recordMessageSent).toHaveBeenCalled();
    });

    it('should handle 1000+ concurrent score update broadcasts', async () => {
      const scoreUpdates = Array.from({ length: 1000 }, (_, i) => ({
        gameId: `game-${i}`,
        tournamentId: 'tournament-1',
        homeScore: Math.floor(Math.random() * 100),
        awayScore: Math.floor(Math.random() * 100),
        period: 4,
        timeRemaining: '2:30',
        gameStatus: 'in_progress' as const,
        timestamp: new Date(),
      }));

      connectionPool.getConnectionsByRoom.mockResolvedValue([]);
      redisService.publish.mockResolvedValue(1);

      const promises = scoreUpdates.map(update => 
        gateway.broadcastGameUpdate(update)
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        await Promise.all(promises);
      });

      expect(duration).toMatchPerformanceThreshold(5000); // Should handle 1000 updates within 5 seconds
      expect(mockServer.emit).toHaveBeenCalledTimes(1000);
    });

    it('should validate score update permissions', async () => {
      const unauthorizedSocket = WebSocketTestUtils.createMockSocket();
      unauthorizedSocket.userId = 'user-spectator';
      unauthorizedSocket.roles = ['spectator'];

      const connectionInfo: ConnectionInfo = {
        socketId: unauthorizedSocket.id,
        userId: 'user-spectator',
        organizationId: 'org-1',
        roles: ['spectator'],
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscriptions: new Set(),
      };

      connectionPool.getConnection.mockResolvedValue(connectionInfo);

      const scoreUpdateData = {
        gameId: 'game-1',
        homeScore: 75,
        awayScore: 68,
        period: 4,
        timeRemaining: '2:30',
      };

      await expect(
        gateway.handleScoreUpdate(unauthorizedSocket, scoreUpdateData)
      ).rejects.toThrow(WsException);

      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should handle network failures gracefully', async () => {
      const scoreUpdate: GameUpdatePayload = {
        gameId: 'game-1',
        tournamentId: 'tournament-1',
        homeScore: 75,
        awayScore: 68,
        period: 4,
        timeRemaining: '2:30',
        gameStatus: 'in_progress',
        timestamp: new Date(),
      };

      redisService.publish.mockRejectedValue(new Error('Redis connection failed'));
      
      // Should not throw error, but should log and continue with local broadcast
      await expect(gateway.broadcastGameUpdate(scoreUpdate)).resolves.not.toThrow();
      
      expect(mockServer.to).toHaveBeenCalledWith('game:game-1');
      expect(mockServer.emit).toHaveBeenCalledWith(WebSocketEvent.GAME_UPDATE, scoreUpdate);
    });

    it('should track message latency', async () => {
      const scoreUpdate: GameUpdatePayload = {
        gameId: 'game-1',
        tournamentId: 'tournament-1',
        homeScore: 75,
        awayScore: 68,
        period: 4,
        timeRemaining: '2:30',
        gameStatus: 'in_progress',
        timestamp: new Date(Date.now() - 100), // Message created 100ms ago
      };

      await gateway.broadcastGameUpdate(scoreUpdate);

      expect(metricsService.recordLatency).toHaveBeenCalledWith(
        'score_update',
        expect.any(Number)
      );
    });
  });

  describe('Tournament Bracket Updates', () => {
    it('should update bracket in real-time when match completes', async () => {
      const tournamentUpdate: TournamentUpdatePayload = {
        tournamentId: 'tournament-1',
        type: 'match_result',
        data: {
          matchId: 'match-1',
          matchResult: {
            winnerId: 'team-1',
            loserId: 'team-2',
            homeScore: 75,
            awayScore: 68,
          },
          advancement: {
            teamId: 'team-1',
            toMatch: 'match-5',
            round: 2,
          },
        },
        timestamp: new Date(),
      };

      connectionPool.getConnectionsByRoom.mockResolvedValue([]);
      redisService.publish.mockResolvedValue(1);

      await gateway.broadcastTournamentUpdate('tournament-1', tournamentUpdate);

      expect(mockServer.to).toHaveBeenCalledWith('tournament:tournament-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        WebSocketEvent.TOURNAMENT_UPDATE,
        tournamentUpdate
      );
      expect(redisService.publish).toHaveBeenCalledWith(
        'tournament:tournament-1',
        JSON.stringify({
          event: WebSocketEvent.TOURNAMENT_UPDATE,
          data: tournamentUpdate,
        })
      );
    });

    it('should notify subscribers of bracket changes', async () => {
      const bracketUpdate: TournamentUpdatePayload = {
        tournamentId: 'tournament-1',
        type: 'bracket',
        data: {
          bracket: {
            rounds: [
              {
                round: 1,
                matches: [
                  { id: 'match-1', homeTeam: 'Team A', awayTeam: 'Team B', homeScore: 75, awayScore: 68 },
                  { id: 'match-2', homeTeam: 'Team C', awayTeam: 'Team D', homeScore: null, awayScore: null },
                ],
              },
            ],
          },
          totalRounds: 4,
        },
        timestamp: new Date(),
      };

      const subscribedUsers = [
        { socketId: 'socket-1', userId: 'coach-1', subscriptions: new Set(['tournament:tournament-1']) },
        { socketId: 'socket-2', userId: 'parent-1', subscriptions: new Set(['tournament:tournament-1']) },
        { socketId: 'socket-3', userId: 'spectator-1', subscriptions: new Set(['tournament:tournament-1']) },
      ];

      connectionPool.getConnectionsByRoom.mockResolvedValue(subscribedUsers as any);

      await gateway.broadcastTournamentUpdate('tournament-1', bracketUpdate);

      expect(mockServer.to).toHaveBeenCalledWith('tournament:tournament-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        WebSocketEvent.TOURNAMENT_UPDATE,
        bracketUpdate
      );
      expect(metricsService.recordMessageSent).toHaveBeenCalledWith('tournament_update', subscribedUsers.length);
    });

    it('should handle multiple tournament subscriptions', async () => {
      const multiTournamentSocket = WebSocketTestUtils.createMockSocket();
      multiTournamentSocket.userId = 'admin-1';

      const connectionInfo: ConnectionInfo = {
        socketId: multiTournamentSocket.id,
        userId: 'admin-1',
        organizationId: 'org-1',
        roles: ['admin'],
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscriptions: new Set(['tournament:tournament-1', 'tournament:tournament-2', 'tournament:tournament-3']),
      };

      connectionPool.getConnection.mockResolvedValue(connectionInfo);

      const subscriptionData = {
        tournaments: ['tournament-1', 'tournament-2', 'tournament-3'],
      };

      await gateway.handleSubscribe(multiTournamentSocket, subscriptionData);

      expect(multiTournamentSocket.join).toHaveBeenCalledTimes(3);
      expect(multiTournamentSocket.join).toHaveBeenCalledWith('tournament:tournament-1');
      expect(multiTournamentSocket.join).toHaveBeenCalledWith('tournament:tournament-2');
      expect(multiTournamentSocket.join).toHaveBeenCalledWith('tournament:tournament-3');
    });
  });

  describe('Real-time Notifications', () => {
    it('should send targeted notifications to specific users', async () => {
      const notification: NotificationPayload = {
        id: 'notification-1',
        userId: 'user-1',
        type: 'game_reminder',
        title: 'Game Starting Soon',
        message: 'Your game against Team B starts in 15 minutes',
        data: {
          gameId: 'game-1',
          tournamentId: 'tournament-1',
          startTime: new Date(Date.now() + 15 * 60 * 1000),
        },
        timestamp: new Date(),
        priority: 'high',
      };

      const userConnections = [
        { socketId: 'socket-1', userId: 'user-1' },
        { socketId: 'socket-2', userId: 'user-1' }, // Multiple connections for same user
      ];

      connectionPool.getConnectionsByUser.mockResolvedValue(userConnections as any);

      await gateway.sendNotificationToUser('user-1', notification);

      expect(mockServer.to).toHaveBeenCalledWith('socket-1');
      expect(mockServer.to).toHaveBeenCalledWith('socket-2');
      expect(mockServer.emit).toHaveBeenCalledWith(WebSocketEvent.NOTIFICATION, notification);
      expect(redisService.publish).toHaveBeenCalledWith(
        'user:user-1',
        JSON.stringify({
          event: WebSocketEvent.NOTIFICATION,
          data: notification,
        })
      );
    });

    it('should broadcast organization-wide announcements', async () => {
      const announcement: NotificationPayload = {
        id: 'announcement-1',
        organizationId: 'org-1',
        type: 'announcement',
        title: 'Tournament Schedule Updated',
        message: 'Please check the updated schedule for tomorrow\'s games',
        timestamp: new Date(),
        priority: 'medium',
      };

      const orgConnections = Array.from({ length: 50 }, (_, i) => ({
        socketId: `socket-${i}`,
        userId: `user-${i}`,
        organizationId: 'org-1',
      }));

      connectionPool.getConnectionsByRoom.mockResolvedValue(orgConnections as any);

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        await gateway.broadcastToOrganization('org-1', announcement);
      });

      expect(duration).toMatchPerformanceThreshold(1000); // Should complete within 1 second
      expect(mockServer.to).toHaveBeenCalledWith('org:org-1');
      expect(mockServer.emit).toHaveBeenCalledWith(WebSocketEvent.NOTIFICATION, announcement);
    });

    it('should handle notification delivery failures', async () => {
      const notification: NotificationPayload = {
        id: 'notification-1',
        userId: 'user-offline',
        type: 'game_result',
        title: 'Game Completed',
        message: 'Your team won 75-68!',
        timestamp: new Date(),
        priority: 'low',
      };

      connectionPool.getConnectionsByUser.mockResolvedValue([]); // User not connected
      redisService.publish.mockRejectedValue(new Error('Redis unavailable'));

      // Should not throw error but should store notification for later delivery
      await expect(gateway.sendNotificationToUser('user-offline', notification)).resolves.not.toThrow();

      expect(redisService.set).toHaveBeenCalledWith(
        `offline_notification:user-offline:${notification.id}`,
        JSON.stringify(notification),
        'EX',
        86400 // 24 hours
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track connection metrics', async () => {
      const mockMetrics = {
        totalConnections: 150,
        connectionsPerOrganization: {
          'org-1': 75,
          'org-2': 50,
          'org-3': 25,
        },
        messagesPerSecond: 25.5,
        averageLatency: 85,
        errorRate: 0.02,
      };

      metricsService.getConnectionMetrics.mockResolvedValue(mockMetrics);

      const metrics = await gateway.getMetrics();

      expect(metrics).toEqual(mockMetrics);
      expect(metricsService.getConnectionMetrics).toHaveBeenCalled();
    });

    it('should clean up stale connections', async () => {
      const staleConnections = [
        { socketId: 'socket-stale-1', userId: 'user-1', lastActivity: new Date(Date.now() - 3600000) },
        { socketId: 'socket-stale-2', userId: 'user-2', lastActivity: new Date(Date.now() - 3600000) },
      ];

      connectionPool.cleanupStaleConnections.mockResolvedValue(staleConnections as any);

      const cleanedUp = await gateway.cleanupStaleConnections();

      expect(cleanedUp).toHaveLength(2);
      expect(connectionPool.cleanupStaleConnections).toHaveBeenCalledWith(
        expect.any(Number) // Stale threshold in milliseconds
      );
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate high memory usage
      const mockMemoryUsage = {
        rss: 1024 * 1024 * 1024, // 1GB
        heapUsed: 800 * 1024 * 1024, // 800MB
        heapTotal: 900 * 1024 * 1024, // 900MB
        external: 50 * 1024 * 1024, // 50MB
      };

      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage as any);

      // Should trigger connection throttling
      const shouldThrottle = gateway.shouldThrottleConnections();
      expect(shouldThrottle).toBe(true);

      // Should reject new connections when under memory pressure
      const newSocket = WebSocketTestUtils.createMockSocket();
      await gateway.handleConnection(newSocket);

      expect(newSocket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Redis disconnection gracefully', async () => {
      redisService.publish.mockRejectedValue(new Error('Connection lost'));
      redisService.set.mockRejectedValue(new Error('Connection lost'));

      const scoreUpdate: GameUpdatePayload = {
        gameId: 'game-1',
        tournamentId: 'tournament-1',
        homeScore: 75,
        awayScore: 68,
        period: 4,
        timeRemaining: '2:30',
        gameStatus: 'in_progress',
        timestamp: new Date(),
      };

      // Should continue with local broadcast despite Redis failure
      await expect(gateway.broadcastGameUpdate(scoreUpdate)).resolves.not.toThrow();

      expect(mockServer.to).toHaveBeenCalledWith('game:game-1');
      expect(mockServer.emit).toHaveBeenCalledWith(WebSocketEvent.GAME_UPDATE, scoreUpdate);
    });

    it('should implement automatic reconnection logic', async () => {
      const reconnectingSocket = WebSocketTestUtils.createMockSocket();
      reconnectingSocket.handshake.auth.reconnect = true;
      reconnectingSocket.handshake.auth.previousConnectionId = 'socket-previous';

      const previousConnectionInfo: ConnectionInfo = {
        socketId: 'socket-previous',
        userId: 'user-1',
        organizationId: 'org-1',
        roles: ['coach'],
        connectedAt: new Date(Date.now() - 30000), // 30 seconds ago
        lastActivity: new Date(Date.now() - 5000), // 5 seconds ago
        subscriptions: new Set(['tournament:tournament-1', 'game:game-1']),
      };

      connectionPool.getConnection.mockResolvedValue(previousConnectionInfo);
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        organizationId: 'org-1',
        roles: ['coach'],
      });

      await gateway.handleConnection(reconnectingSocket);

      // Should restore previous subscriptions
      expect(reconnectingSocket.join).toHaveBeenCalledWith('tournament:tournament-1');
      expect(reconnectingSocket.join).toHaveBeenCalledWith('game:game-1');
      expect(connectionPool.removeConnection).toHaveBeenCalledWith('socket-previous');
      expect(connectionPool.addConnection).toHaveBeenCalledWith(
        reconnectingSocket.id,
        expect.objectContaining({
          userId: 'user-1',
          subscriptions: previousConnectionInfo.subscriptions,
        })
      );
    });

    it('should handle malformed message payloads', async () => {
      const malformedSocket = WebSocketTestUtils.createMockSocket();
      const connectionInfo: ConnectionInfo = {
        socketId: malformedSocket.id,
        userId: 'user-1',
        organizationId: 'org-1',
        roles: ['scorekeeper'],
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscriptions: new Set(),
      };

      connectionPool.getConnection.mockResolvedValue(connectionInfo);

      const malformedData = {
        gameId: null, // Invalid
        homeScore: 'not-a-number', // Invalid
        awayScore: 75,
      };

      await expect(
        gateway.handleScoreUpdate(malformedSocket, malformedData)
      ).rejects.toThrow(WsException);

      expect(mockServer.emit).not.toHaveBeenCalled();
      expect(metricsService.recordMessageSent).not.toHaveBeenCalled();
    });
  });
});