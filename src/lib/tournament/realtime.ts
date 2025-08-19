/**
 * Real-time Tournament Updates System
 * Handles live bracket updates, score changes, and team advancement
 */

import { 
  Tournament, 
  Match, 
  Team, 
  TournamentUpdate, 
  WebSocketMessage,
  BracketStructure 
} from './types';

export type TournamentEventType = 
  | 'match_start' 
  | 'match_end' 
  | 'score_update' 
  | 'team_advance' 
  | 'tournament_complete'
  | 'match_schedule_change'
  | 'bracket_update';

export interface TournamentEvent {
  type: TournamentEventType;
  tournamentId: string;
  matchId?: string;
  teamId?: string;
  data: any;
  timestamp: Date;
  source: 'scorekeeper' | 'admin' | 'system';
}

export interface TournamentSubscriber {
  id: string;
  tournamentId: string;
  callback: (event: TournamentEvent) => void;
  filters?: TournamentEventType[];
}

/**
 * Real-time Tournament Manager
 * Manages WebSocket connections and event distribution
 */
export class TournamentRealtimeManager {
  private ws: WebSocket | null = null;
  private subscribers = new Map<string, TournamentSubscriber>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(private wsUrl: string) {
    this.connect();
  }

  /**
   * Establish WebSocket connection
   */
  private connect(): void {
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('Tournament WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.onConnect();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Tournament WebSocket disconnected');
        this.isConnected = false;
        this.stopHeartbeat();
        this.onDisconnect();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError(error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    const event: TournamentEvent = {
      ...message.payload,
      timestamp: new Date(message.payload.timestamp),
    };

    // Distribute event to subscribers
    this.subscribers.forEach((subscriber) => {
      if (subscriber.tournamentId === event.tournamentId) {
        if (!subscriber.filters || subscriber.filters.includes(event.type)) {
          try {
            subscriber.callback(event);
          } catch (error) {
            console.error('Error in subscriber callback:', error);
          }
        }
      }
    });
  }

  /**
   * Subscribe to tournament events
   */
  subscribe(
    tournamentId: string, 
    callback: (event: TournamentEvent) => void,
    filters?: TournamentEventType[]
  ): string {
    const subscriberId = `subscriber_${Date.now()}_${Math.random()}`;
    
    this.subscribers.set(subscriberId, {
      id: subscriberId,
      tournamentId,
      callback,
      filters,
    });

    // Join tournament room if connected
    if (this.isConnected && this.ws) {
      this.send({
        event: 'join_tournament',
        payload: { tournamentId },
        room: `tournament_${tournamentId}`,
      });
    }

    return subscriberId;
  }

  /**
   * Unsubscribe from tournament events
   */
  unsubscribe(subscriberId: string): void {
    const subscriber = this.subscribers.get(subscriberId);
    if (subscriber) {
      // Leave tournament room if connected
      if (this.isConnected && this.ws) {
        this.send({
          event: 'leave_tournament',
          payload: { tournamentId: subscriber.tournamentId },
          room: `tournament_${subscriber.tournamentId}`,
        });
      }
      
      this.subscribers.delete(subscriberId);
    }
  }

  /**
   * Send message through WebSocket
   */
  private send(message: WebSocketMessage): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Publish tournament event
   */
  publishEvent(event: TournamentEvent): void {
    if (this.isConnected && this.ws) {
      this.send({
        event: 'tournament_event',
        payload: event,
        room: `tournament_${event.tournamentId}`,
      });
    }
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.send({
          event: 'ping',
          payload: { timestamp: new Date() },
          room: 'system',
        });
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.onMaxReconnectAttemptsReached();
    }
  }

  /**
   * Connection event handlers
   */
  private onConnect(): void {
    // Re-join all tournament rooms
    this.subscribers.forEach((subscriber) => {
      this.send({
        event: 'join_tournament',
        payload: { tournamentId: subscriber.tournamentId },
        room: `tournament_${subscriber.tournamentId}`,
      });
    });
  }

  private onDisconnect(): void {
    // Handle disconnection (show offline indicator, etc.)
  }

  private onError(error: Event): void {
    // Handle connection errors
  }

  private onMaxReconnectAttemptsReached(): void {
    // Handle max reconnection attempts reached
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.subscribers.clear();
    this.isConnected = false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

/**
 * Tournament Event Emitter (for client-side only updates)
 */
export class TournamentEventEmitter {
  private listeners = new Map<TournamentEventType, Set<(event: TournamentEvent) => void>>();

  on(eventType: TournamentEventType, callback: (event: TournamentEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  emit(event: TournamentEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  off(eventType: TournamentEventType, callback?: (event: TournamentEvent) => void): void {
    if (callback) {
      this.listeners.get(eventType)?.delete(callback);
    } else {
      this.listeners.delete(eventType);
    }
  }
}

/**
 * Tournament State Manager with optimistic updates
 */
export class TournamentStateManager {
  private tournament: Tournament;
  private eventEmitter: TournamentEventEmitter;
  private realtimeManager: TournamentRealtimeManager | null = null;
  private subscriberId: string | null = null;

  constructor(tournament: Tournament) {
    this.tournament = tournament;
    this.eventEmitter = new TournamentEventEmitter();
  }

  /**
   * Connect to real-time updates
   */
  connectRealtime(wsUrl: string): void {
    this.realtimeManager = new TournamentRealtimeManager(wsUrl);
    this.subscriberId = this.realtimeManager.subscribe(
      this.tournament.id,
      (event) => this.handleRealtimeEvent(event)
    );
  }

  /**
   * Disconnect from real-time updates
   */
  disconnectRealtime(): void {
    if (this.realtimeManager && this.subscriberId) {
      this.realtimeManager.unsubscribe(this.subscriberId);
      this.realtimeManager.disconnect();
      this.realtimeManager = null;
      this.subscriberId = null;
    }
  }

  /**
   * Handle real-time events
   */
  private handleRealtimeEvent(event: TournamentEvent): void {
    switch (event.type) {
      case 'score_update':
        this.handleScoreUpdate(event);
        break;
      case 'team_advance':
        this.handleTeamAdvance(event);
        break;
      case 'match_start':
        this.handleMatchStart(event);
        break;
      case 'match_end':
        this.handleMatchEnd(event);
        break;
      case 'bracket_update':
        this.handleBracketUpdate(event);
        break;
    }

    // Emit to local listeners
    this.eventEmitter.emit(event);
  }

  /**
   * Update match score with optimistic UI update
   */
  updateMatchScore(
    matchId: string, 
    team1Score: number, 
    team2Score: number,
    source: 'local' | 'realtime' = 'local'
  ): void {
    const match = this.findMatch(matchId);
    if (!match) return;

    // Optimistic update
    match.score = { team1Score, team2Score };
    match.status = 'in_progress';

    const event: TournamentEvent = {
      type: 'score_update',
      tournamentId: this.tournament.id,
      matchId,
      data: { team1Score, team2Score },
      timestamp: new Date(),
      source: source === 'local' ? 'scorekeeper' : 'system',
    };

    // Publish to real-time if local update
    if (source === 'local' && this.realtimeManager) {
      this.realtimeManager.publishEvent(event);
    }

    this.eventEmitter.emit(event);
  }

  /**
   * Advance team to next round
   */
  advanceTeam(
    matchId: string, 
    winner: Team, 
    loser: Team,
    source: 'local' | 'realtime' = 'local'
  ): void {
    const match = this.findMatch(matchId);
    if (!match) return;

    // Optimistic update
    match.winner = winner;
    match.loser = loser;
    match.status = 'completed';

    // Find and update child matches
    this.updateChildMatches(match, winner);

    const event: TournamentEvent = {
      type: 'team_advance',
      tournamentId: this.tournament.id,
      matchId,
      teamId: winner.id,
      data: { winner, loser },
      timestamp: new Date(),
      source: source === 'local' ? 'scorekeeper' : 'system',
    };

    // Publish to real-time if local update
    if (source === 'local' && this.realtimeManager) {
      this.realtimeManager.publishEvent(event);
    }

    this.eventEmitter.emit(event);
  }

  /**
   * Start match
   */
  startMatch(matchId: string): void {
    const match = this.findMatch(matchId);
    if (!match) return;

    match.status = 'in_progress';

    const event: TournamentEvent = {
      type: 'match_start',
      tournamentId: this.tournament.id,
      matchId,
      data: { match },
      timestamp: new Date(),
      source: 'scorekeeper',
    };

    if (this.realtimeManager) {
      this.realtimeManager.publishEvent(event);
    }

    this.eventEmitter.emit(event);
  }

  /**
   * End match
   */
  endMatch(matchId: string): void {
    const match = this.findMatch(matchId);
    if (!match) return;

    match.status = 'completed';

    const event: TournamentEvent = {
      type: 'match_end',
      tournamentId: this.tournament.id,
      matchId,
      data: { match },
      timestamp: new Date(),
      source: 'scorekeeper',
    };

    if (this.realtimeManager) {
      this.realtimeManager.publishEvent(event);
    }

    this.eventEmitter.emit(event);
  }

  /**
   * Event handlers for real-time updates
   */
  private handleScoreUpdate(event: TournamentEvent): void {
    if (event.source !== 'system') return; // Avoid duplicate updates
    this.updateMatchScore(event.matchId!, event.data.team1Score, event.data.team2Score, 'realtime');
  }

  private handleTeamAdvance(event: TournamentEvent): void {
    if (event.source !== 'system') return;
    this.advanceTeam(event.matchId!, event.data.winner, event.data.loser, 'realtime');
  }

  private handleMatchStart(event: TournamentEvent): void {
    const match = this.findMatch(event.matchId!);
    if (match) {
      match.status = 'in_progress';
    }
  }

  private handleMatchEnd(event: TournamentEvent): void {
    const match = this.findMatch(event.matchId!);
    if (match) {
      match.status = 'completed';
    }
  }

  private handleBracketUpdate(event: TournamentEvent): void {
    // Handle full bracket updates
    this.tournament.bracket = event.data.bracket;
    this.tournament.matches = event.data.matches;
  }

  /**
   * Utility methods
   */
  private findMatch(matchId: string): Match | undefined {
    return this.tournament.matches?.find(match => match.id === matchId);
  }

  private updateChildMatches(parentMatch: Match, winner: Team): void {
    if (!parentMatch.childMatches) return;

    parentMatch.childMatches.forEach(childMatchId => {
      const childMatch = this.findMatch(childMatchId);
      if (childMatch) {
        if (!childMatch.team1) {
          childMatch.team1 = winner;
        } else if (!childMatch.team2) {
          childMatch.team2 = winner;
        }
      }
    });
  }

  /**
   * Subscribe to tournament events
   */
  on(eventType: TournamentEventType, callback: (event: TournamentEvent) => void): () => void {
    return this.eventEmitter.on(eventType, callback);
  }

  /**
   * Get current tournament state
   */
  getTournament(): Tournament {
    return this.tournament;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.realtimeManager?.getConnectionStatus() || false;
  }
}

// Global instance (for easier use across components)
let globalRealtimeManager: TournamentRealtimeManager | null = null;

export function getGlobalRealtimeManager(wsUrl?: string): TournamentRealtimeManager {
  if (!globalRealtimeManager && wsUrl) {
    globalRealtimeManager = new TournamentRealtimeManager(wsUrl);
  }
  return globalRealtimeManager!;
}

export function disconnectGlobalRealtime(): void {
  if (globalRealtimeManager) {
    globalRealtimeManager.disconnect();
    globalRealtimeManager = null;
  }
}