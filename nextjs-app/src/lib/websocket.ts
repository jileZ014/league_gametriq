import { io, Socket } from 'socket.io-client'

// WebSocket connection for real-time game updates
class GameWebSocket {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(gameId?: string) {
    if (this.socket?.connected) {
      return this.socket
    }

    const socketUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://api.gametriq.com' 
      : 'ws://localhost:3001'

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 20000,
      forceNew: false,
    })

    this.socket.on('connect', () => {
      console.log('Connected to game server')
      this.reconnectAttempts = 0
      
      // Join game room if gameId provided
      if (gameId) {
        this.socket?.emit('join-game', { gameId })
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from game server:', reason)
      
      if (reason === 'io server disconnect') {
        // Server forced disconnect, manual reconnect needed
        this.socket?.connect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached')
      }
    })

    return this.socket
  }

  // Subscribe to live score updates
  onScoreUpdate(callback: (data: ScoreUpdate) => void) {
    this.socket?.on('score-update', callback)
  }

  // Subscribe to game status changes
  onGameStatusChange(callback: (data: GameStatusUpdate) => void) {
    this.socket?.on('game-status-change', callback)
  }

  // Subscribe to foul updates
  onFoulUpdate(callback: (data: FoulUpdate) => void) {
    this.socket?.on('foul-update', callback)
  }

  // Subscribe to timeout updates
  onTimeoutUpdate(callback: (data: TimeoutUpdate) => void) {
    this.socket?.on('timeout-update', callback)
  }

  // Join a specific game room
  joinGame(gameId: string) {
    this.socket?.emit('join-game', { gameId })
  }

  // Leave a specific game room
  leaveGame(gameId: string) {
    this.socket?.emit('leave-game', { gameId })
  }

  // Send score update (scorekeeper only)
  updateScore(gameId: string, scoreData: ScoreData) {
    this.socket?.emit('update-score', { gameId, ...scoreData })
  }

  // Disconnect from server
  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  // Get connection status
  get isConnected() {
    return this.socket?.connected || false
  }
}

// Types for basketball game events
export interface ScoreUpdate {
  gameId: string
  homeScore: number
  awayScore: number
  quarter: number
  timeRemaining: string
  lastScoredBy: 'home' | 'away'
  pointsScored: number
  timestamp: number
}

export interface GameStatusUpdate {
  gameId: string
  status: 'scheduled' | 'warmup' | 'live' | 'halftime' | 'timeout' | 'completed'
  quarter: number
  timeRemaining: string
  timestamp: number
}

export interface FoulUpdate {
  gameId: string
  teamId: string
  playerId?: string
  foulType: 'personal' | 'technical' | 'flagrant'
  quarter: number
  teamFouls: number
  playerFouls?: number
  inBonus: boolean
  timestamp: number
}

export interface TimeoutUpdate {
  gameId: string
  teamId: string
  timeoutsRemaining: number
  quarter: number
  timestamp: number
}

export interface ScoreData {
  homeScore: number
  awayScore: number
  quarter: number
  timeRemaining: string
  lastAction: {
    type: 'score' | 'foul' | 'timeout'
    team: 'home' | 'away'
    points?: number
    player?: string
  }
}

// Singleton instance
export const gameWebSocket = new GameWebSocket()

// React hook for WebSocket connection
export const useGameWebSocket = (gameId?: string) => {
  const socket = gameWebSocket.connect(gameId)
  
  return {
    socket,
    isConnected: gameWebSocket.isConnected,
    onScoreUpdate: gameWebSocket.onScoreUpdate.bind(gameWebSocket),
    onGameStatusChange: gameWebSocket.onGameStatusChange.bind(gameWebSocket),
    onFoulUpdate: gameWebSocket.onFoulUpdate.bind(gameWebSocket),
    onTimeoutUpdate: gameWebSocket.onTimeoutUpdate.bind(gameWebSocket),
    joinGame: gameWebSocket.joinGame.bind(gameWebSocket),
    leaveGame: gameWebSocket.leaveGame.bind(gameWebSocket),
    updateScore: gameWebSocket.updateScore.bind(gameWebSocket),
    disconnect: gameWebSocket.disconnect.bind(gameWebSocket),
  }
}