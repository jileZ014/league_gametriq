import { io, Socket } from 'socket.io-client';
import { 
  WebSocketEvent, 
  WebSocketNamespace,
  GameUpdatePayload,
  TournamentUpdatePayload,
  NotificationPayload,
  MetricsPayload,
  WebSocketClientConfig,
  WebSocketResponse,
  QueuedMessage,
} from './websocket.types';

/**
 * WebSocket Client Service
 * Singleton service for managing WebSocket connections in the web application
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Event-driven architecture with TypeScript types
 * - Message queuing for offline scenarios
 * - Optimistic UI updates
 * - Multiple namespace support
 * - Connection state management
 */
export class WebSocketService {
  private static instance: WebSocketService;
  private sockets: Map<string, Socket> = new Map();
  private config: WebSocketClientConfig;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private isOnline: boolean = true;
  private reconnectAttempts: Map<string, number> = new Map();
  private connectionState: Map<string, 'connecting' | 'connected' | 'disconnected'> = new Map();

  private constructor() {
    this.setupOnlineListener();
    this.loadConfiguration();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Load configuration
   */
  private loadConfiguration() {
    this.config = {
      url: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000',
      namespaces: [
        WebSocketNamespace.DEFAULT,
        WebSocketNamespace.GAMES,
        WebSocketNamespace.TOURNAMENTS,
        WebSocketNamespace.NOTIFICATIONS,
      ],
      auth: {
        token: '', // Will be set during initialization
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    };
  }

  /**
   * Initialize WebSocket connections
   */
  public async initialize(token: string, namespaces?: string[]): Promise<void> {
    this.config.auth.token = token;
    
    const namespacesToConnect = namespaces || this.config.namespaces;
    
    for (const namespace of namespacesToConnect) {
      await this.connectToNamespace(namespace);
    }
  }

  /**
   * Connect to a specific namespace
   */
  private async connectToNamespace(namespace: string): Promise<void> {
    if (this.sockets.has(namespace)) {
      console.log(`Already connected to namespace: ${namespace}`);
      return;
    }

    const url = namespace === '/' 
      ? this.config.url 
      : `${this.config.url}${namespace}`;

    const socket = io(url, {
      auth: this.config.auth,
      reconnection: this.config.reconnection,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      reconnectionDelayMax: this.config.reconnectionDelayMax,
      timeout: this.config.timeout,
      transports: this.config.transports,
      autoConnect: this.config.autoConnect,
    });

    this.setupSocketEventHandlers(socket, namespace);
    this.sockets.set(namespace, socket);
    this.connectionState.set(namespace, 'connecting');
    
    // Connect manually if autoConnect is false
    if (!this.config.autoConnect) {
      socket.connect();
    }
  }

  /**
   * Setup event handlers for a socket
   */
  private setupSocketEventHandlers(socket: Socket, namespace: string) {
    // Connection events
    socket.on('connect', () => {
      console.log(`Connected to namespace: ${namespace}`);
      this.connectionState.set(namespace, 'connected');
      this.reconnectAttempts.set(namespace, 0);
      this.flushMessageQueue(namespace);
      this.emit('connection:established', { namespace });
    });

    socket.on('disconnect', (reason) => {
      console.log(`Disconnected from namespace: ${namespace}, reason: ${reason}`);
      this.connectionState.set(namespace, 'disconnected');
      this.emit('connection:lost', { namespace, reason });
    });

    socket.on('connect_error', (error) => {
      console.error(`Connection error for namespace ${namespace}:`, error);
      this.handleReconnection(namespace);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for namespace ${namespace}:`, error);
      this.emit('error', { namespace, error });
    });

    // Reconnection events
    socket.io.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected to namespace ${namespace} after ${attemptNumber} attempts`);
      this.emit('connection:reconnected', { namespace, attemptNumber });
    });

    socket.io.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber} for namespace ${namespace}`);
      this.reconnectAttempts.set(namespace, attemptNumber);
    });

    socket.io.on('reconnect_failed', () => {
      console.error(`Failed to reconnect to namespace ${namespace}`);
      this.emit('connection:failed', { namespace });
    });

    // Custom events based on namespace
    this.setupNamespaceSpecificHandlers(socket, namespace);
  }

  /**
   * Setup namespace-specific event handlers
   */
  private setupNamespaceSpecificHandlers(socket: Socket, namespace: string) {
    switch (namespace) {
      case WebSocketNamespace.GAMES:
        this.setupGameHandlers(socket);
        break;
      case WebSocketNamespace.TOURNAMENTS:
        this.setupTournamentHandlers(socket);
        break;
      case WebSocketNamespace.NOTIFICATIONS:
        this.setupNotificationHandlers(socket);
        break;
      case WebSocketNamespace.ADMIN:
        this.setupAdminHandlers(socket);
        break;
      default:
        this.setupDefaultHandlers(socket);
    }
  }

  /**
   * Setup game-specific handlers
   */
  private setupGameHandlers(socket: Socket) {
    socket.on(WebSocketEvent.GAME_UPDATE, (data: GameUpdatePayload) => {
      this.emit(WebSocketEvent.GAME_UPDATE, data);
    });

    socket.on(WebSocketEvent.GAME_START, (data) => {
      this.emit(WebSocketEvent.GAME_START, data);
    });

    socket.on(WebSocketEvent.GAME_END, (data) => {
      this.emit(WebSocketEvent.GAME_END, data);
    });

    socket.on(WebSocketEvent.QUARTER_START, (data) => {
      this.emit(WebSocketEvent.QUARTER_START, data);
    });

    socket.on(WebSocketEvent.QUARTER_END, (data) => {
      this.emit(WebSocketEvent.QUARTER_END, data);
    });
  }

  /**
   * Setup tournament-specific handlers
   */
  private setupTournamentHandlers(socket: Socket) {
    socket.on(WebSocketEvent.TOURNAMENT_UPDATE, (data: TournamentUpdatePayload) => {
      this.emit(WebSocketEvent.TOURNAMENT_UPDATE, data);
    });

    socket.on(WebSocketEvent.BRACKET_UPDATE, (data) => {
      this.emit(WebSocketEvent.BRACKET_UPDATE, data);
    });

    socket.on(WebSocketEvent.MATCH_COMPLETE, (data) => {
      this.emit(WebSocketEvent.MATCH_COMPLETE, data);
    });
  }

  /**
   * Setup notification handlers
   */
  private setupNotificationHandlers(socket: Socket) {
    socket.on(WebSocketEvent.NOTIFICATION, (data: NotificationPayload) => {
      this.emit(WebSocketEvent.NOTIFICATION, data);
    });

    socket.on(WebSocketEvent.SYSTEM_ANNOUNCEMENT, (data: NotificationPayload) => {
      this.emit(WebSocketEvent.SYSTEM_ANNOUNCEMENT, data);
    });

    socket.on(WebSocketEvent.REFEREE_ASSIGNMENT, (data) => {
      this.emit(WebSocketEvent.REFEREE_ASSIGNMENT, data);
    });

    socket.on(WebSocketEvent.GAME_REMINDER, (data) => {
      this.emit(WebSocketEvent.GAME_REMINDER, data);
    });
  }

  /**
   * Setup admin handlers
   */
  private setupAdminHandlers(socket: Socket) {
    socket.on(WebSocketEvent.METRICS_UPDATE, (data: MetricsPayload) => {
      this.emit(WebSocketEvent.METRICS_UPDATE, data);
    });

    socket.on(WebSocketEvent.SYSTEM_STATUS, (data) => {
      this.emit(WebSocketEvent.SYSTEM_STATUS, data);
    });

    socket.on(WebSocketEvent.CONNECTION_STATS, (data) => {
      this.emit(WebSocketEvent.CONNECTION_STATS, data);
    });
  }

  /**
   * Setup default handlers
   */
  private setupDefaultHandlers(socket: Socket) {
    // Ping/pong for latency measurement
    socket.on('ping', (data, callback) => {
      if (callback) {
        callback({ timestamp: Date.now() });
      }
    });

    // Server messages
    socket.on('server_message', (data) => {
      console.log('Server message:', data);
      this.emit('server_message', data);
    });

    // Force disconnect
    socket.on('force_disconnect', (data) => {
      console.warn('Force disconnect:', data);
      this.disconnect();
    });
  }

  /**
   * Subscribe to game updates
   */
  public subscribeToGame(gameId: string): Promise<WebSocketResponse> {
    return this.emitWithAck(WebSocketNamespace.GAMES, WebSocketEvent.SUBSCRIBE_GAME, { gameId });
  }

  /**
   * Unsubscribe from game updates
   */
  public unsubscribeFromGame(gameId: string): Promise<WebSocketResponse> {
    return this.emitWithAck(WebSocketNamespace.GAMES, WebSocketEvent.UNSUBSCRIBE_GAME, { gameId });
  }

  /**
   * Subscribe to tournament updates
   */
  public subscribeToTournament(tournamentId: string): Promise<WebSocketResponse> {
    return this.emitWithAck(WebSocketNamespace.TOURNAMENTS, WebSocketEvent.SUBSCRIBE_TOURNAMENT, { tournamentId });
  }

  /**
   * Unsubscribe from tournament updates
   */
  public unsubscribeFromTournament(tournamentId: string): Promise<WebSocketResponse> {
    return this.emitWithAck(WebSocketNamespace.TOURNAMENTS, WebSocketEvent.UNSUBSCRIBE_TOURNAMENT, { tournamentId });
  }

  /**
   * Update game score (for scorekeepers)
   */
  public updateScore(gameId: string, update: Partial<GameUpdatePayload>): Promise<WebSocketResponse> {
    const payload: GameUpdatePayload = {
      gameId,
      type: 'score',
      timestamp: new Date().toISOString(),
      clientTimestamp: Date.now(),
      ...update,
    } as GameUpdatePayload;

    return this.emitWithAck(WebSocketNamespace.GAMES, WebSocketEvent.UPDATE_SCORE, payload);
  }

  /**
   * Emit event with acknowledgment
   */
  private emitWithAck(namespace: string, event: string, data: any): Promise<WebSocketResponse> {
    return new Promise((resolve, reject) => {
      const socket = this.sockets.get(namespace);
      
      if (!socket || !socket.connected) {
        // Queue message if offline
        if (!this.isOnline) {
          this.queueMessage(namespace, event, data);
          resolve({
            success: false,
            error: {
              code: 'OFFLINE',
              message: 'Message queued for sending when online',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        
        reject(new Error(`Not connected to namespace: ${namespace}`));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      socket.emit(event, data, (response: WebSocketResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  /**
   * Register event handler
   */
  public on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unregister event handler
   */
  public off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Queue message for offline sending
   */
  private queueMessage(namespace: string, event: string, data: any): void {
    const message: QueuedMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: '', // Will be filled from auth
      event: event as WebSocketEvent,
      payload: data,
      timestamp: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
    };

    this.messageQueue.push(message);
    
    // Store in localStorage for persistence
    this.persistMessageQueue();
  }

  /**
   * Flush message queue when connection is restored
   */
  private async flushMessageQueue(namespace: string): Promise<void> {
    const messages = this.messageQueue.filter(msg => {
      // Filter messages for this namespace
      return true; // Implement namespace filtering logic
    });

    for (const message of messages) {
      try {
        await this.emitWithAck(namespace, message.event, message.payload);
        // Remove from queue on success
        this.messageQueue = this.messageQueue.filter(m => m.id !== message.id);
      } catch (error) {
        console.error(`Failed to send queued message: ${message.id}`, error);
        message.attempts++;
        
        if (message.attempts >= message.maxAttempts) {
          // Remove from queue after max attempts
          this.messageQueue = this.messageQueue.filter(m => m.id !== message.id);
        }
      }
    }

    this.persistMessageQueue();
  }

  /**
   * Persist message queue to localStorage
   */
  private persistMessageQueue(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ws_message_queue', JSON.stringify(this.messageQueue));
    }
  }

  /**
   * Load message queue from localStorage
   */
  private loadMessageQueue(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ws_message_queue');
      if (stored) {
        try {
          this.messageQueue = JSON.parse(stored);
        } catch (error) {
          console.error('Failed to load message queue:', error);
          this.messageQueue = [];
        }
      }
    }
  }

  /**
   * Setup online/offline listener
   */
  private setupOnlineListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.reconnectAll();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });

      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection(namespace: string): void {
    const attempts = this.reconnectAttempts.get(namespace) || 0;
    
    if (attempts >= this.config.reconnectionAttempts) {
      console.error(`Max reconnection attempts reached for namespace: ${namespace}`);
      this.emit('connection:failed', { namespace });
      return;
    }

    const delay = Math.min(
      this.config.reconnectionDelay * Math.pow(2, attempts),
      this.config.reconnectionDelayMax
    );

    setTimeout(() => {
      const socket = this.sockets.get(namespace);
      if (socket && !socket.connected) {
        socket.connect();
      }
    }, delay);
  }

  /**
   * Reconnect all namespaces
   */
  private reconnectAll(): void {
    for (const [namespace, socket] of this.sockets) {
      if (!socket.connected) {
        socket.connect();
      }
    }
  }

  /**
   * Get connection state for a namespace
   */
  public getConnectionState(namespace: string = '/'): 'connecting' | 'connected' | 'disconnected' {
    return this.connectionState.get(namespace) || 'disconnected';
  }

  /**
   * Check if connected to a namespace
   */
  public isConnected(namespace: string = '/'): boolean {
    const socket = this.sockets.get(namespace);
    return socket?.connected || false;
  }

  /**
   * Disconnect from all namespaces
   */
  public disconnect(): void {
    for (const [namespace, socket] of this.sockets) {
      socket.disconnect();
      this.sockets.delete(namespace);
      this.connectionState.delete(namespace);
    }
  }

  /**
   * Cleanup and destroy service
   */
  public destroy(): void {
    this.disconnect();
    this.eventHandlers.clear();
    this.messageQueue = [];
    WebSocketService.instance = null as any;
  }
}

// Export singleton instance getter
export const getWebSocketService = () => WebSocketService.getInstance();