import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken, hasPermission } from '@/lib/auth'
import { z } from 'zod'
import { headers } from 'next/headers'

// WebSocket upgrade handling for real-time score updates
export const dynamic = 'force-dynamic'

// Types for live game updates
interface LiveGameState {
  gameId: string
  status: 'scheduled' | 'live' | 'halftime' | 'completed'
  period: number
  timeRemaining: string
  homeScore: number
  awayScore: number
  homeFouls: number
  awayFouls: number
  homeTimeouts: number
  awayTimeouts: number
  possession?: 'home' | 'away'
  lastUpdate: string
}

interface GameEvent {
  id: string
  timestamp: string
  period: number
  timeRemaining: string
  eventType: 'basket' | 'foul' | 'timeout' | 'substitution' | 'technical' | 'period_end' | 'game_end'
  teamId: string
  playerId?: string
  description: string
  points?: number
  homeScore: number
  awayScore: number
}

// Validation schemas
const UpdateScoreSchema = z.object({
  homeScore: z.number().min(0).optional(),
  awayScore: z.number().min(0).optional(),
  period: z.number().min(1).max(4).optional(),
  timeRemaining: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  status: z.enum(['scheduled', 'live', 'halftime', 'completed']).optional(),
})

const GameEventSchema = z.object({
  eventType: z.enum(['basket', 'foul', 'timeout', 'substitution', 'technical', 'period_end', 'game_end']),
  teamId: z.string().uuid(),
  playerId: z.string().uuid().optional(),
  description: z.string(),
  points: z.number().optional(),
  period: z.number().min(1).max(4),
  timeRemaining: z.string().regex(/^\d{1,2}:\d{2}$/),
})

const UpdateGameStatsSchema = z.object({
  homeFouls: z.number().min(0).optional(),
  awayFouls: z.number().min(0).optional(),
  homeTimeouts: z.number().min(0).optional(),
  awayTimeouts: z.number().min(0).optional(),
  possession: z.enum(['home', 'away']).optional(),
})

// Store for active WebSocket connections (in production, use Redis)
const activeConnections = new Map<string, Set<WebSocket>>()

// Rate limiting for updates
const updateRateLimit = new Map<string, { count: number; resetTime: number }>()

function checkUpdateRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = updateRateLimit.get(userId)
  
  if (limit && limit.resetTime > now) {
    if (limit.count >= 60) { // 60 updates per minute max
      return false
    }
    limit.count++
  } else {
    updateRateLimit.set(userId, { count: 1, resetTime: now + 60000 })
  }
  
  return true
}

// Broadcast update to all connected clients
function broadcastGameUpdate(gameId: string, update: any) {
  const connections = activeConnections.get(gameId)
  if (connections) {
    const message = JSON.stringify({
      type: 'game_update',
      gameId,
      data: update,
      timestamp: new Date().toISOString(),
    })
    
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    })
  }
}

// GET /api/games/[id]/live - Get live game state or establish WebSocket connection
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id
    
    // Check if this is a WebSocket upgrade request
    const upgrade = request.headers.get('upgrade')
    
    if (upgrade === 'websocket') {
      // Handle WebSocket connection for real-time updates
      const webSocketPair = new WebSocketPair()
      const [client, server] = Object.values(webSocketPair)
      
      // Accept the WebSocket connection
      server.accept()
      
      // Add to active connections
      if (!activeConnections.has(gameId)) {
        activeConnections.set(gameId, new Set())
      }
      activeConnections.get(gameId)!.add(server)
      
      // Handle WebSocket events
      server.addEventListener('message', async (event) => {
        try {
          const message = JSON.parse(event.data as string)
          
          // Handle different message types
          switch (message.type) {
            case 'ping':
              server.send(JSON.stringify({ type: 'pong' }))
              break
            
            case 'subscribe':
              // Client is subscribing to game updates
              server.send(JSON.stringify({
                type: 'subscribed',
                gameId,
                timestamp: new Date().toISOString(),
              }))
              break
            
            default:
              server.send(JSON.stringify({
                type: 'error',
                message: 'Unknown message type',
              }))
          }
        } catch (error) {
          server.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          }))
        }
      })
      
      // Handle disconnection
      server.addEventListener('close', () => {
        const connections = activeConnections.get(gameId)
        if (connections) {
          connections.delete(server)
          if (connections.size === 0) {
            activeConnections.delete(gameId)
          }
        }
      })
      
      return new Response(null, {
        status: 101,
        webSocket: client,
      } as any)
    }
    
    // Regular HTTP GET request - return current game state
    const supabase = createClient()
    
    const { data: game, error } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name),
        league:leagues(id, name)
      `)
      .eq('id', gameId)
      .single()
    
    if (error || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }
    
    // Get recent play-by-play events
    const { data: events } = await supabase
      .from('game_events')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    const liveState: LiveGameState = {
      gameId: game.id,
      status: game.status,
      period: game.period,
      timeRemaining: game.time_remaining || '12:00',
      homeScore: game.home_score,
      awayScore: game.away_score,
      homeFouls: game.home_fouls,
      awayFouls: game.away_fouls,
      homeTimeouts: game.home_timeouts,
      awayTimeouts: game.away_timeouts,
      possession: game.possession,
      lastUpdate: game.updated_at,
    }
    
    return NextResponse.json({
      game: {
        id: game.id,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        league: game.league,
        venue: game.venue,
        scheduledAt: game.scheduled_at,
      },
      liveState,
      recentEvents: events || [],
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/games/[id]/live - Update live game score
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Verify token
    const decodedToken = verifyToken(token)
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Check rate limit
    if (!checkUpdateRateLimit(decodedToken.userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }
    
    // Only scorekeepers, referees, and league admins can update live scores
    if (!hasPermission(decodedToken.role, ['scorekeeper', 'referee', 'league-admin'])) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdateScoreSchema.parse(body)
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Get current game state
    const { data: currentGame, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()
    
    if (fetchError || !currentGame) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }
    
    // Validate game can be updated
    if (currentGame.status === 'completed' || currentGame.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot update completed or cancelled game' },
        { status: 400 }
      )
    }
    
    // Update game scores
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    }
    
    // If marking game as live, set start time
    if (validatedData.status === 'live' && currentGame.status === 'scheduled') {
      updateData.started_at = new Date().toISOString()
    }
    
    // If marking game as completed, set end time
    if (validatedData.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }
    
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Database error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update game' },
        { status: 500 }
      )
    }
    
    // Log the update as an event
    await supabase
      .from('game_events')
      .insert({
        game_id: gameId,
        event_type: 'score_update',
        period: updatedGame.period,
        time_remaining: updatedGame.time_remaining,
        description: `Score updated: Home ${updatedGame.home_score} - Away ${updatedGame.away_score}`,
        home_score: updatedGame.home_score,
        away_score: updatedGame.away_score,
        created_by: decodedToken.userId,
        created_at: new Date().toISOString(),
      })
    
    // Broadcast update to WebSocket clients
    broadcastGameUpdate(gameId, {
      type: 'score_update',
      ...updateData,
    })
    
    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: decodedToken.userId,
        action: 'game.score_updated',
        resource_type: 'game',
        resource_id: gameId,
        details: validatedData,
        created_at: new Date().toISOString(),
      })
    
    return NextResponse.json({
      message: 'Game updated successfully',
      game: updatedGame,
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/games/[id]/live - Add game event
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Verify token
    const decodedToken = verifyToken(token)
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Check rate limit
    if (!checkUpdateRateLimit(decodedToken.userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }
    
    // Only scorekeepers, referees, and league admins can add game events
    if (!hasPermission(decodedToken.role, ['scorekeeper', 'referee', 'league-admin'])) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedEvent = GameEventSchema.parse(body)
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Get current game state
    const { data: game, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()
    
    if (fetchError || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }
    
    // Validate game is live
    if (game.status !== 'live') {
      return NextResponse.json(
        { error: 'Game must be live to add events' },
        { status: 400 }
      )
    }
    
    // Calculate new scores based on event
    let homeScore = game.home_score
    let awayScore = game.away_score
    
    if (validatedEvent.eventType === 'basket' && validatedEvent.points) {
      if (validatedEvent.teamId === game.home_team_id) {
        homeScore += validatedEvent.points
      } else if (validatedEvent.teamId === game.away_team_id) {
        awayScore += validatedEvent.points
      }
    }
    
    // Create game event
    const eventData: GameEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      period: validatedEvent.period,
      timeRemaining: validatedEvent.timeRemaining,
      eventType: validatedEvent.eventType,
      teamId: validatedEvent.teamId,
      playerId: validatedEvent.playerId,
      description: validatedEvent.description,
      points: validatedEvent.points,
      homeScore,
      awayScore,
    }
    
    // Insert event into database
    const { error: eventError } = await supabase
      .from('game_events')
      .insert({
        game_id: gameId,
        ...eventData,
        created_by: decodedToken.userId,
        created_at: new Date().toISOString(),
      })
    
    if (eventError) {
      console.error('Database error:', eventError)
      return NextResponse.json(
        { error: 'Failed to add game event' },
        { status: 500 }
      )
    }
    
    // Update game scores if changed
    if (homeScore !== game.home_score || awayScore !== game.away_score) {
      await supabase
        .from('games')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          period: validatedEvent.period,
          time_remaining: validatedEvent.timeRemaining,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
    }
    
    // Update player statistics if applicable
    if (validatedEvent.playerId && validatedEvent.eventType === 'basket') {
      await supabase.rpc('update_player_stats', {
        p_player_id: validatedEvent.playerId,
        p_points: validatedEvent.points || 0,
        p_game_id: gameId,
      })
    }
    
    // Broadcast event to WebSocket clients
    broadcastGameUpdate(gameId, {
      type: 'game_event',
      event: eventData,
    })
    
    return NextResponse.json({
      message: 'Game event added successfully',
      event: eventData,
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/games/[id]/live - Update game stats (fouls, timeouts, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Verify token
    const decodedToken = verifyToken(token)
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Only scorekeepers, referees, and league admins can update game stats
    if (!hasPermission(decodedToken.role, ['scorekeeper', 'referee', 'league-admin'])) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdateGameStatsSchema.parse(body)
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Update game stats
    const { data: updatedGame, error } = await supabase
      .from('games')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update game stats' },
        { status: 500 }
      )
    }
    
    // Broadcast update to WebSocket clients
    broadcastGameUpdate(gameId, {
      type: 'stats_update',
      ...validatedData,
    })
    
    return NextResponse.json({
      message: 'Game stats updated successfully',
      game: updatedGame,
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}