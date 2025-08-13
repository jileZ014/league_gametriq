import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { WsJwtGuard } from '../../websocket/guards/ws-jwt.guard';
import { WsThrottleGuard } from '../../websocket/guards/ws-throttle.guard';
import { TournamentService } from './tournament.service';
import { RedisService } from '../../websocket/redis.service';

export interface TournamentSubscription {
  tournamentId: string;
  userId: string;
  role: string;
  subscriptionType: 'viewer' | 'participant' | 'admin';
}

export interface LiveScoreUpdate {
  matchId: string;
  homeScore: number;
  awayScore: number;
  quarter?: number;
  timeRemaining?: string;
  gameEvent?: {
    type: 'score' | 'foul' | 'timeout' | 'substitution';
    team: 'home' | 'away';
    playerId?: string;
    details?: any;
  };
}

@Injectable()
@WebSocketGateway({
  namespace: '/tournaments',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
})
export class TournamentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TournamentGateway.name);
  private readonly subscriptions = new Map<string, Set<TournamentSubscription>>();
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly tournamentService: TournamentService,
    private readonly redisService: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const user = client.data.user;
      if (!user) {
        client.disconnect();
        return;
      }

      // Track user socket
      if (!this.userSockets.has(user.sub)) {
        this.userSockets.set(user.sub, new Set());
      }
      this.userSockets.get(user.sub).add(client.id);

      this.logger.log(`Tournament gateway connected: ${client.id} (User: ${user.sub})`);

      // Send connection confirmation
      client.emit('connected', {
        socketId: client.id,
        namespace: '/tournaments',
        features: ['live_scores', 'bracket_updates', 'match_notifications'],
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    
    // Clean up user socket tracking
    if (user && this.userSockets.has(user.sub)) {
      this.userSockets.get(user.sub).delete(client.id);
      if (this.userSockets.get(user.sub).size === 0) {
        this.userSockets.delete(user.sub);
      }
    }

    // Clean up tournament subscriptions
    this.subscriptions.forEach((subscribers, tournamentId) => {
      const toRemove = Array.from(subscribers).filter(sub => sub.userId === user?.sub);
      toRemove.forEach(sub => subscribers.delete(sub));
      
      if (subscribers.size === 0) {
        this.subscriptions.delete(tournamentId);
      }
    });

    this.logger.log(`Tournament gateway disconnected: ${client.id}`);
  }

  /**
   * Subscribe to tournament updates
   */
  @UseGuards(WsJwtGuard, WsThrottleGuard)
  @SubscribeMessage('subscribe_tournament')
  async handleSubscribeTournament(
    @MessageBody() data: { tournamentId: string; subscriptionType?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    const { tournamentId, subscriptionType = 'viewer' } = data;

    try {
      // Verify tournament exists and user has access
      const tournament = await this.tournamentService.findOne(
        tournamentId,
        user.organizationId
      );

      // Join tournament room
      await client.join(`tournament:${tournamentId}`);

      // Track subscription
      if (!this.subscriptions.has(tournamentId)) {
        this.subscriptions.set(tournamentId, new Set());
      }

      this.subscriptions.get(tournamentId).add({
        tournamentId,
        userId: user.sub,
        role: user.role,
        subscriptionType: subscriptionType as any,
      });

      // Send current tournament state
      const bracket = await this.tournamentService.getBracket(
        tournamentId,
        user.organizationId
      );

      client.emit('tournament_state', {
        tournamentId,
        tournament: tournament,
        bracket: bracket,
        subscriptionType,
      });

      this.logger.debug(`User ${user.sub} subscribed to tournament ${tournamentId}`);

      return { success: true, tournamentId };
    } catch (error) {
      throw new WsException(`Failed to subscribe to tournament: ${error.message}`);
    }
  }

  /**
   * Unsubscribe from tournament updates
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('unsubscribe_tournament')
  async handleUnsubscribeTournament(
    @MessageBody() data: { tournamentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    const { tournamentId } = data;

    // Leave tournament room
    await client.leave(`tournament:${tournamentId}`);

    // Remove subscription
    if (this.subscriptions.has(tournamentId)) {
      const subscribers = this.subscriptions.get(tournamentId);
      const toRemove = Array.from(subscribers).filter(sub => sub.userId === user.sub);
      toRemove.forEach(sub => subscribers.delete(sub));
    }

    this.logger.debug(`User ${user.sub} unsubscribed from tournament ${tournamentId}`);

    return { success: true, tournamentId };
  }

  /**
   * Subscribe to specific match updates
   */
  @UseGuards(WsJwtGuard, WsThrottleGuard)
  @SubscribeMessage('subscribe_match')
  async handleSubscribeMatch(
    @MessageBody() data: { matchId: string; tournamentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { matchId, tournamentId } = data;

    // Join match room
    await client.join(`match:${matchId}`);

    // Get current match state from Redis
    const matchState = await this.redisService.getGameState(matchId);
    if (matchState) {
      client.emit('match_state', matchState);
    }

    this.logger.debug(`Client ${client.id} subscribed to match ${matchId}`);

    return { success: true, matchId };
  }

  /**
   * Update live score (for authorized users)
   */
  @UseGuards(WsJwtGuard, WsThrottleGuard)
  @SubscribeMessage('update_live_score')
  async handleLiveScoreUpdate(
    @MessageBody() data: LiveScoreUpdate,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    // Verify user has permission to update scores
    if (!['admin', 'league_admin', 'scorekeeper', 'referee'].includes(user.role)) {
      throw new WsException('Unauthorized to update scores');
    }

    try {
      // Store update in Redis for persistence
      await this.redisService.storeGameUpdate({
        gameId: data.matchId,
        type: 'score',
        timestamp: new Date().toISOString(),
        data: {
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          quarter: data.quarter,
          timeRemaining: data.timeRemaining,
        },
        metadata: {
          updatedBy: user.sub,
          updateSource: user.role as any,
        },
      });

      // Broadcast to all subscribers of this match
      client.to(`match:${data.matchId}`).emit('live_score_update', {
        ...data,
        updatedBy: user.sub,
        timestamp: new Date().toISOString(),
      });

      // Also broadcast to tournament room
      const match = await this.getMatchTournament(data.matchId);
      if (match?.tournamentId) {
        client.to(`tournament:${match.tournamentId}`).emit('tournament_score_update', {
          tournamentId: match.tournamentId,
          matchId: data.matchId,
          ...data,
        });
      }

      this.logger.debug(`Live score updated for match ${data.matchId} by ${user.sub}`);

      return { success: true, processed: true };
    } catch (error) {
      throw new WsException(`Failed to update score: ${error.message}`);
    }
  }

  /**
   * Handle game events (fouls, timeouts, etc.)
   */
  @UseGuards(WsJwtGuard, WsThrottleGuard)
  @SubscribeMessage('game_event')
  async handleGameEvent(
    @MessageBody() data: {
      matchId: string;
      event: {
        type: string;
        team: 'home' | 'away';
        playerId?: string;
        details?: any;
      };
    },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    // Verify permissions
    if (!['admin', 'league_admin', 'scorekeeper', 'referee'].includes(user.role)) {
      throw new WsException('Unauthorized to report game events');
    }

    // Broadcast event to match subscribers
    client.to(`match:${data.matchId}`).emit('game_event', {
      matchId: data.matchId,
      event: data.event,
      reportedBy: user.sub,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Request bracket refresh
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('refresh_bracket')
  async handleRefreshBracket(
    @MessageBody() data: { tournamentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    try {
      const bracket = await this.tournamentService.getBracket(
        data.tournamentId,
        user.organizationId
      );

      client.emit('bracket_update', {
        tournamentId: data.tournamentId,
        bracket,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      throw new WsException(`Failed to refresh bracket: ${error.message}`);
    }
  }

  /**
   * Get tournament participants (for chat/presence features)
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get_participants')
  async handleGetParticipants(
    @MessageBody() data: { tournamentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const subscribers = this.subscriptions.get(data.tournamentId);
    
    if (!subscribers) {
      return { participants: [] };
    }

    const participants = Array.from(subscribers).map(sub => ({
      userId: sub.userId,
      role: sub.role,
      subscriptionType: sub.subscriptionType,
      online: this.userSockets.has(sub.userId),
    }));

    return { participants };
  }

  /**
   * Broadcast match completion
   */
  async broadcastMatchCompletion(
    tournamentId: string,
    matchId: string,
    result: {
      winnerId: string;
      loserId: string;
      homeScore: number;
      awayScore: number;
    }
  ) {
    // Emit to tournament room
    this.server.to(`tournament:${tournamentId}`).emit('match_completed', {
      tournamentId,
      matchId,
      result,
      timestamp: new Date().toISOString(),
    });

    // Emit to match room
    this.server.to(`match:${matchId}`).emit('match_final', {
      matchId,
      result,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasted match completion: ${matchId}`);
  }

  /**
   * Broadcast bracket advancement
   */
  async broadcastAdvancement(
    tournamentId: string,
    data: {
      teamId: string;
      fromMatch: string;
      toMatch: string;
      round: number;
    }
  ) {
    this.server.to(`tournament:${tournamentId}`).emit('team_advanced', {
      tournamentId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasted team advancement: ${data.teamId} to ${data.toMatch}`);
  }

  /**
   * Broadcast tournament status change
   */
  async broadcastStatusChange(
    tournamentId: string,
    status: string,
    additionalData?: any
  ) {
    this.server.to(`tournament:${tournamentId}`).emit('tournament_status_changed', {
      tournamentId,
      status,
      ...additionalData,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasted tournament status change: ${tournamentId} -> ${status}`);
  }

  /**
   * Send notification to specific teams
   */
  async notifyTeams(
    teamIds: string[],
    notification: {
      type: string;
      title: string;
      message: string;
      data?: any;
    }
  ) {
    // This would integrate with the notification system
    // to send push notifications to team members
    
    teamIds.forEach(teamId => {
      this.server.to(`team:${teamId}`).emit('team_notification', {
        ...notification,
        teamId,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Get tournament viewer count
   */
  async getTournamentViewerCount(tournamentId: string): Promise<number> {
    const subscribers = this.subscriptions.get(tournamentId);
    return subscribers?.size || 0;
  }

  /**
   * Get match viewer count
   */
  async getMatchViewerCount(matchId: string): Promise<number> {
    const room = this.server.sockets.adapter.rooms.get(`match:${matchId}`);
    return room?.size || 0;
  }

  // Helper methods

  private get server() {
    return (this as any).server;
  }

  private async getMatchTournament(matchId: string): Promise<any> {
    // This would fetch the match and its tournament from the database
    // For now, returning a placeholder
    return null;
  }
}