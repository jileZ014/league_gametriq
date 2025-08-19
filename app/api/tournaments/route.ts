import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken, hasPermission } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const CreateTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  tournament_type: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'swiss']),
  league_id: z.string().uuid(),
  max_teams: z.number().min(4).max(128),
  entry_fee: z.number().min(0).max(10000),
  prize_pool: z.number().optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  registration_deadline: z.string().datetime(),
  venue: z.string().min(3).max(200),
  rules: z.object({
    game_duration: z.number().optional(),
    overtime_rules: z.string().optional(),
    tiebreaker_rules: z.string().optional(),
    minimum_players: z.number().optional(),
    maximum_fouls: z.number().optional(),
  }).optional(),
})

const UpdateTournamentSchema = CreateTournamentSchema.partial()

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['draft', 'registration', 'bracket_set', 'in_progress', 'completed', 'cancelled']).optional(),
  league_id: z.string().uuid().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['start_date', 'created_at', 'name', 'entry_fee']).default('start_date'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
})

// Rate limiting (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = requestCounts.get(userId)
  
  if (userLimit && userLimit.resetTime > now) {
    if (userLimit.count >= 100) { // 100 requests per minute
      return false
    }
    userLimit.count++
  } else {
    requestCounts.set(userId, { count: 1, resetTime: now + 60000 })
  }
  
  return true
}

// GET /api/tournaments - List tournaments with filtering
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = QuerySchema.parse(searchParams)
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Build query
    let dbQuery = supabase
      .from('tournaments')
      .select(`
        *,
        league:leagues(id, name),
        teams:tournament_teams(count),
        matches:tournament_matches(count)
      `, { count: 'exact' })
    
    // Apply filters
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }
    
    if (query.league_id) {
      dbQuery = dbQuery.eq('league_id', query.league_id)
    }
    
    if (query.search) {
      dbQuery = dbQuery.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`)
    }
    
    // Apply sorting
    dbQuery = dbQuery.order(query.sort_by, { ascending: query.sort_order === 'asc' })
    
    // Apply pagination
    const from = (query.page - 1) * query.limit
    const to = from + query.limit - 1
    dbQuery = dbQuery.range(from, to)
    
    // Execute query
    const { data: tournaments, error, count } = await dbQuery
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tournaments' },
        { status: 500 }
      )
    }
    
    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / query.limit)
    
    return NextResponse.json({
      tournaments,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count,
        totalPages,
        hasMore: query.page < totalPages,
      },
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
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

// POST /api/tournaments - Create new tournament
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Verify token and check permissions
    const decodedToken = verifyToken(token)
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Check rate limit
    if (!checkRateLimit(decodedToken.userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }
    
    // Only league admins can create tournaments
    if (!hasPermission(decodedToken.role, 'league-admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = CreateTournamentSchema.parse(body)
    
    // Validate dates
    const startDate = new Date(validatedData.start_date)
    const endDate = new Date(validatedData.end_date)
    const registrationDeadline = new Date(validatedData.registration_deadline)
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }
    
    if (registrationDeadline >= startDate) {
      return NextResponse.json(
        { error: 'Registration deadline must be before start date' },
        { status: 400 }
      )
    }
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Check if league exists and user has access
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, created_by')
      .eq('id', validatedData.league_id)
      .single()
    
    if (leagueError || !league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }
    
    // Create tournament
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        ...validatedData,
        status: 'draft',
        created_by: decodedToken.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create tournament' },
        { status: 500 }
      )
    }
    
    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: decodedToken.userId,
        action: 'tournament.created',
        resource_type: 'tournament',
        resource_id: tournament.id,
        details: { name: tournament.name },
        created_at: new Date().toISOString(),
      })
    
    return NextResponse.json(tournament, { status: 201 })
    
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

// PATCH /api/tournaments - Update tournament
export async function PATCH(request: NextRequest) {
  try {
    // Get tournament ID from query
    const tournamentId = request.nextUrl.searchParams.get('id')
    if (!tournamentId) {
      return NextResponse.json(
        { error: 'Tournament ID required' },
        { status: 400 }
      )
    }
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Verify token and check permissions
    const decodedToken = verifyToken(token)
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Check rate limit
    if (!checkRateLimit(decodedToken.userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }
    
    // Only league admins can update tournaments
    if (!hasPermission(decodedToken.role, 'league-admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdateTournamentSchema.parse(body)
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Check if tournament exists
    const { data: existingTournament, error: fetchError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()
    
    if (fetchError || !existingTournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }
    
    // Don't allow updates to tournaments that have started
    if (['in_progress', 'completed'].includes(existingTournament.status)) {
      return NextResponse.json(
        { error: 'Cannot update tournament after it has started' },
        { status: 400 }
      )
    }
    
    // Update tournament
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tournamentId)
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update tournament' },
        { status: 500 }
      )
    }
    
    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: decodedToken.userId,
        action: 'tournament.updated',
        resource_type: 'tournament',
        resource_id: tournament.id,
        details: { changes: validatedData },
        created_at: new Date().toISOString(),
      })
    
    return NextResponse.json(tournament)
    
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

// DELETE /api/tournaments - Delete tournament
export async function DELETE(request: NextRequest) {
  try {
    // Get tournament ID from query
    const tournamentId = request.nextUrl.searchParams.get('id')
    if (!tournamentId) {
      return NextResponse.json(
        { error: 'Tournament ID required' },
        { status: 400 }
      )
    }
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Verify token and check permissions
    const decodedToken = verifyToken(token)
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Only league admins can delete tournaments
    if (!hasPermission(decodedToken.role, 'league-admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Check if tournament exists and can be deleted
    const { data: tournament, error: fetchError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()
    
    if (fetchError || !tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }
    
    // Don't allow deletion of tournaments that have started
    if (['in_progress', 'completed'].includes(tournament.status)) {
      return NextResponse.json(
        { error: 'Cannot delete tournament after it has started' },
        { status: 400 }
      )
    }
    
    // Soft delete by updating status to cancelled
    const { error } = await supabase
      .from('tournaments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tournamentId)
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to delete tournament' },
        { status: 500 }
      )
    }
    
    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: decodedToken.userId,
        action: 'tournament.deleted',
        resource_type: 'tournament',
        resource_id: tournamentId,
        details: { name: tournament.name },
        created_at: new Date().toISOString(),
      })
    
    return NextResponse.json({ message: 'Tournament deleted successfully' })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}