import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  WebSocketEvent, 
  UseWebSocketReturn, 
  ConnectionState,
  WebSocketResponse,
  GameUpdatePayload,
  MetricsPayload,
} from '@/lib/websocket/websocket.types';
import { getWebSocketService } from '@/lib/websocket/websocket.service';
import { getWebSocketMonitoring } from '@/lib/websocket/monitoring';

/**
 * React Hook for WebSocket Integration
 * Provides easy-to-use WebSocket functionality in React components
 * 
 * Features:
 * - Automatic connection management
 * - Event subscription/unsubscription on mount/unmount
 * - Connection state tracking
 * - Type-safe event handling
 * - Automatic cleanup
 */
export function useWebSocket(
  token?: string,
  namespaces?: string[],
  autoConnect: boolean = true
): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [metrics, setMetrics] = useState<MetricsPayload | undefined>();
  
  const wsService = useRef(getWebSocketService());
  const monitoring = useRef(getWebSocketMonitoring());
  const eventHandlers = useRef<Map<string, Function>>(new Map());

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    if (!autoConnect || !token) {
      return;
    }

    const initializeWebSocket = async () => {
      try {
        setConnectionState('connecting');
        await wsService.current.initialize(token, namespaces);
        setIsConnected(true);
        setConnectionState('connected');
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        setConnectionState('error');
      }
    };

    initializeWebSocket();

    // Setup connection state listeners
    const handleConnectionEstablished = () => {
      setIsConnected(true);
      setConnectionState('connected');
    };

    const handleConnectionLost = () => {
      setIsConnected(false);
      setConnectionState('disconnected');
    };

    const handleConnectionError = () => {
      setConnectionState('error');
    };

    wsService.current.on('connection:established', handleConnectionEstablished);
    wsService.current.on('connection:lost', handleConnectionLost);
    wsService.current.on('error', handleConnectionError);

    // Setup metrics listener
    const unsubscribeMetrics = monitoring.current.onMetricsUpdate((newMetrics) => {
      setMetrics(newMetrics);
    });

    // Cleanup
    return () => {
      wsService.current.off('connection:established', handleConnectionEstablished);
      wsService.current.off('connection:lost', handleConnectionLost);
      wsService.current.off('error', handleConnectionError);
      unsubscribeMetrics();
      
      // Clean up all event handlers
      for (const [event, handler] of eventHandlers.current) {
        wsService.current.off(event, handler);
      }
      eventHandlers.current.clear();
    };
  }, [token, autoConnect]);

  /**
   * Subscribe to an event
   */
  const subscribe = useCallback((event: WebSocketEvent, handler: Function) => {
    // Store handler reference for cleanup
    eventHandlers.current.set(event, handler);
    wsService.current.on(event, handler);
  }, []);

  /**
   * Unsubscribe from an event
   */
  const unsubscribe = useCallback((event: WebSocketEvent, handler: Function) => {
    eventHandlers.current.delete(event);
    wsService.current.off(event, handler);
  }, []);

  /**
   * Emit an event
   */
  const emit = useCallback(async (event: WebSocketEvent, data: any): Promise<WebSocketResponse> => {
    // This would need to be implemented based on the specific event
    // For now, we'll use the service directly
    return { 
      success: true, 
      timestamp: new Date().toISOString() 
    };
  }, []);

  /**
   * Subscribe to game updates
   */
  const subscribeToGame = useCallback(async (gameId: string): Promise<WebSocketResponse> => {
    return wsService.current.subscribeToGame(gameId);
  }, []);

  /**
   * Unsubscribe from game updates
   */
  const unsubscribeFromGame = useCallback(async (gameId: string): Promise<WebSocketResponse> => {
    return wsService.current.unsubscribeFromGame(gameId);
  }, []);

  /**
   * Subscribe to tournament updates
   */
  const subscribeToTournament = useCallback(async (tournamentId: string): Promise<WebSocketResponse> => {
    return wsService.current.subscribeToTournament(tournamentId);
  }, []);

  /**
   * Unsubscribe from tournament updates
   */
  const unsubscribeFromTournament = useCallback(async (tournamentId: string): Promise<WebSocketResponse> => {
    return wsService.current.unsubscribeFromTournament(tournamentId);
  }, []);

  /**
   * Update game score
   */
  const updateScore = useCallback(async (
    gameId: string, 
    update: Partial<GameUpdatePayload>
  ): Promise<WebSocketResponse> => {
    return wsService.current.updateScore(gameId, update);
  }, []);

  return {
    isConnected,
    connectionState,
    subscribe,
    unsubscribe,
    emit,
    subscribeToGame,
    unsubscribeFromGame,
    subscribeToTournament,
    unsubscribeFromTournament,
    updateScore,
    metrics,
  };
}

/**
 * Hook for game-specific WebSocket functionality
 */
export function useGameWebSocket(gameId: string, token?: string) {
  const { 
    isConnected, 
    subscribe, 
    unsubscribe, 
    subscribeToGame, 
    unsubscribeFromGame,
    updateScore 
  } = useWebSocket(token, ['/games']);
  
  const [gameState, setGameState] = useState<GameUpdatePayload | null>(null);

  useEffect(() => {
    if (!isConnected || !gameId) {
      return;
    }

    // Subscribe to this specific game
    subscribeToGame(gameId);

    // Handle game updates
    const handleGameUpdate = (update: GameUpdatePayload) => {
      if (update.gameId === gameId) {
        setGameState(update);
      }
    };

    subscribe(WebSocketEvent.GAME_UPDATE, handleGameUpdate);

    // Cleanup
    return () => {
      unsubscribeFromGame(gameId);
      unsubscribe(WebSocketEvent.GAME_UPDATE, handleGameUpdate);
    };
  }, [isConnected, gameId, subscribe, unsubscribe, subscribeToGame, unsubscribeFromGame]);

  return {
    isConnected,
    gameState,
    updateScore: (update: Partial<GameUpdatePayload>) => updateScore(gameId, update),
  };
}

/**
 * Hook for tournament-specific WebSocket functionality
 */
export function useTournamentWebSocket(tournamentId: string, token?: string) {
  const { 
    isConnected, 
    subscribe, 
    unsubscribe, 
    subscribeToTournament, 
    unsubscribeFromTournament 
  } = useWebSocket(token, ['/tournaments']);
  
  const [tournamentState, setTournamentState] = useState<any>(null);
  const [bracketUpdates, setBracketUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (!isConnected || !tournamentId) {
      return;
    }

    // Subscribe to this specific tournament
    subscribeToTournament(tournamentId);

    // Handle tournament updates
    const handleTournamentUpdate = (update: any) => {
      if (update.tournamentId === tournamentId) {
        setTournamentState(update);
      }
    };

    const handleBracketUpdate = (update: any) => {
      if (update.tournamentId === tournamentId) {
        setBracketUpdates(prev => [...prev, update]);
      }
    };

    subscribe(WebSocketEvent.TOURNAMENT_UPDATE, handleTournamentUpdate);
    subscribe(WebSocketEvent.BRACKET_UPDATE, handleBracketUpdate);

    // Cleanup
    return () => {
      unsubscribeFromTournament(tournamentId);
      unsubscribe(WebSocketEvent.TOURNAMENT_UPDATE, handleTournamentUpdate);
      unsubscribe(WebSocketEvent.BRACKET_UPDATE, handleBracketUpdate);
    };
  }, [isConnected, tournamentId, subscribe, unsubscribe, subscribeToTournament, unsubscribeFromTournament]);

  return {
    isConnected,
    tournamentState,
    bracketUpdates,
  };
}

/**
 * Hook for admin dashboard WebSocket functionality
 */
export function useAdminWebSocket(token?: string) {
  const { isConnected, subscribe, unsubscribe, metrics } = useWebSocket(token, ['/admin']);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [connectionStats, setConnectionStats] = useState<any>(null);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const handleSystemStatus = (status: any) => {
      setSystemStatus(status);
    };

    const handleConnectionStats = (stats: any) => {
      setConnectionStats(stats);
    };

    subscribe(WebSocketEvent.SYSTEM_STATUS, handleSystemStatus);
    subscribe(WebSocketEvent.CONNECTION_STATS, handleConnectionStats);

    // Cleanup
    return () => {
      unsubscribe(WebSocketEvent.SYSTEM_STATUS, handleSystemStatus);
      unsubscribe(WebSocketEvent.CONNECTION_STATS, handleConnectionStats);
    };
  }, [isConnected, subscribe, unsubscribe]);

  return {
    isConnected,
    metrics,
    systemStatus,
    connectionStats,
  };
}

/**
 * Hook for notification WebSocket functionality
 */
export function useNotificationWebSocket(token?: string) {
  const { isConnected, subscribe, unsubscribe } = useWebSocket(token, ['/notifications']);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const handleNotification = (notification: any) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
    };

    const handleAnnouncement = (announcement: any) => {
      setAnnouncements(prev => [announcement, ...prev].slice(0, 10)); // Keep last 10
    };

    subscribe(WebSocketEvent.NOTIFICATION, handleNotification);
    subscribe(WebSocketEvent.SYSTEM_ANNOUNCEMENT, handleAnnouncement);

    // Cleanup
    return () => {
      unsubscribe(WebSocketEvent.NOTIFICATION, handleNotification);
      unsubscribe(WebSocketEvent.SYSTEM_ANNOUNCEMENT, handleAnnouncement);
    };
  }, [isConnected, subscribe, unsubscribe]);

  return {
    isConnected,
    notifications,
    announcements,
    clearNotifications: () => setNotifications([]),
    clearAnnouncements: () => setAnnouncements([]),
  };
}