import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken, hasPermission } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const CreateTeamSchema = z.object({
  league_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  coach_id: z.string().uuid(),
  assistant_coach_ids: z.array(z.string().uuid()).optional(),
  division: z.string().optional(),
  age_group: z.enum(['youth', 'teen', 'adult']),
  home_venue: z.string().optional(),
  team_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  logo_url: z.string().url().optional(),
  roster_size: z.number().min(5).max(20).default(12),
})

const UpdateTeamSchema = CreateTeamSchema.partial().omit({ league_id: true })

const AddPlayerSchema = z.object({
  user_id: z.string().uuid(),
  jersey_number: z.number().min(0).max(99).optional(),
  position: z.enum(['PG', 'SG', 'SF', 'PF', 'C']).optional(),
  height: z.string().regex(/^\d+'\d+"$/).optional(), // Format: 6'2"
  weight: z.number().min(50).max(400).optional(),
  grade_level: z.string().optional(),
  emergency_contact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  }).optional(),
  medical_info: z.object({
    allergies: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional(),
    emergency_notes: z.string().optional(),
  }).optional(),
})

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  league_id: z.string().uuid().optional(),
  coach_id: z.string().uuid().optional(),
  age_group: z.enum(['youth', 'teen', 'adult']).optional(),
  division: z.string().optional(),
  search: z.string().optional(),
  include_players: z.coerce.boolean().default(false),
  sort_by: z.enum(['name', 'wins', 'losses', 'created_at']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
})

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, limit: number = 100): boolean {
  const now = Date.now()
  const userLimit = requestCounts.get(userId)
  
  if (userLimit && userLimit.resetTime > now) {
    if (userLimit.count >= limit) {
      return false
    }
    userLimit.count++
  } else {
    requestCounts.set(userId, { count: 1, resetTime: now + 60000 })
  }
  
  // Clean old entries
  if (requestCounts.size > 1000) {
    for (const [key, value] of requestCounts.entries()) {
      if (value.resetTime < now) {
        requestCounts.delete(key)
      }
    }
  }
  
  return true
}

// GET /api/teams - List teams with filtering
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = QuerySchema.parse(searchParams)
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Build base query
    let dbQuery = supabase
      .from('teams')
      .select(`
        *,
        coach:users!teams_coach_id_fkey(id, name, email),
        league:leagues(id, name, season)
        ${query.include_players ? ', players:players(*, user:users(id, name, email))' : ''}
      `, { count: 'exact' })
    
    // Apply filters
    if (query.league_id) {
      dbQuery = dbQuery.eq('league_id', query.league_id)
    }
    
    if (query.coach_id) {
      dbQuery = dbQuery.eq('coach_id', query.coach_id)
    }
    
    if (query.age_group) {
      dbQuery = dbQuery.eq('age_group', query.age_group)
    }
    
    if (query.division) {
      dbQuery = dbQuery.eq('division', query.division)
    }
    
    if (query.search) {
      dbQuery = dbQuery.or(`name.ilike.%${query.search}%,division.ilike.%${query.search}%`)
    }
    
    // Apply sorting
    dbQuery = dbQuery.order(query.sort_by, { ascending: query.sort_order === 'asc' })
    
    // Apply pagination
    const from = (query.page - 1) * query.limit
    const to = from + query.limit - 1
    dbQuery = dbQuery.range(from, to)
    
    // Execute query
    const { data: teams, error, count } = await dbQuery
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      )
    }
    
    // Calculate standings for each team
    const teamsWithStandings = teams?.map(team => ({
      ...team,
      win_percentage: team.wins + team.losses > 0 
        ? (team.wins / (team.wins + team.losses) * 100).toFixed(1)
        : '0.0',
      point_differential: team.points_for - team.points_against,
    }))
    
    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / query.limit)
    
    return NextResponse.json({
      teams: teamsWithStandings,
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

// POST /api/teams - Create new team
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
    if (!checkRateLimit(decodedToken.userId, 20)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }
    
    // Only league admins and coaches can create teams
    if (!hasPermission(decodedToken.role, ['league-admin', 'coach'])) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = CreateTeamSchema.parse(body)
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Check if league exists and is accepting teams
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', validatedData.league_id)
      .single()
    
    if (leagueError || !league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }
    
    if (league.status !== 'registration') {
      return NextResponse.json(
        { error: 'League is not accepting team registrations' },
        { status: 400 }
      )
    }
    
    // Check if league has reached max teams
    const { count: teamCount } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', validatedData.league_id)
    
    if (teamCount && teamCount >= league.max_teams) {
      return NextResponse.json(
        { error: 'League has reached maximum team capacity' },
        { status: 400 }
      )
    }
    
    // Check if coach exists and is eligible
    const { data: coach, error: coachError } = await supabase
      .from('users')
      .select('*')
      .eq('id', validatedData.coach_id)
      .single()
    
    if (coachError || !coach) {
      return NextResponse.json(
        { error: 'Coach not found' },
        { status: 404 }
      )
    }
    
    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        ...validatedData,
        wins: 0,
        losses: 0,
        points_for: 0,
        points_against: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (teamError) {
      console.error('Database error:', teamError)
      
      // Check for duplicate team name in league
      if (teamError.code === '23505') {
        return NextResponse.json(
          { error: 'A team with this name already exists in the league' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 500 }
      )
    }
    
    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: decodedToken.userId,
        action: 'team.created',
        resource_type: 'team',
        resource_id: team.id,
        details: {
          name: team.name,
          league_id: team.league_id,
          coach_id: team.coach_id,
        },
        created_at: new Date().toISOString(),
      })
    
    return NextResponse.json(team, { status: 201 })
    
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

// PATCH /api/teams - Update team
export async function PATCH(request: NextRequest) {
  try {
    // Get team ID from query
    const teamId = request.nextUrl.searchParams.get('id')
    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID required' },
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
    
    // Verify token
    const decodedToken = verifyToken(token)
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Check rate limit
    if (!checkRateLimit(decodedToken.userId, 50)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Get team to check permissions
    const { data: existingTeam, error: fetchError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()
    
    if (fetchError || !existingTeam) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }
    
    // Check permissions - league admin or team's coach can update
    const canUpdate = hasPermission(decodedToken.role, 'league-admin') ||
                     (decodedToken.role === 'coach' && existingTeam.coach_id === decodedToken.userId)
    
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdateTeamSchema.parse(body)
    
    // Update team
    const { data: team, error: updateError } = await supabase
      .from('teams')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Database error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update team' },
        { status: 500 }
      )
    }
    
    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: decodedToken.userId,
        action: 'team.updated',
        resource_type: 'team',
        resource_id: teamId,
        details: { changes: validatedData },
        created_at: new Date().toISOString(),
      })
    
    return NextResponse.json(team)
    
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

// DELETE /api/teams - Delete team
export async function DELETE(request: NextRequest) {
  try {
    // Get team ID from query
    const teamId = request.nextUrl.searchParams.get('id')
    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID required' },
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
    
    // Only league admins can delete teams
    if (!hasPermission(decodedToken.role, 'league-admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Check if team exists
    const { data: team, error: fetchError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()
    
    if (fetchError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }
    
    // Check if team has played any games
    const { count: gameCount } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    
    if (gameCount && gameCount > 0) {
      // Soft delete - mark as inactive
      await supabase
        .from('teams')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', teamId)
      
      return NextResponse.json({
        message: 'Team marked as inactive (has game history)',
        status: 'inactive',
      })
    }
    
    // Hard delete if no games played
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)
    
    if (deleteError) {
      console.error('Database error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete team' },
        { status: 500 }
      )
    }
    
    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: decodedToken.userId,
        action: 'team.deleted',
        resource_type: 'team',
        resource_id: teamId,
        details: { name: team.name },
        created_at: new Date().toISOString(),
      })
    
    return NextResponse.json({ message: 'Team deleted successfully' })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/teams/[id]/players - Add player to team
export async function POST_PLAYER(request: NextRequest) {
  try {
    // Get team ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const teamIdIndex = pathParts.indexOf('teams') + 1
    const teamId = pathParts[teamIdIndex]
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID required' },
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
    
    // Verify token
    const decodedToken = verifyToken(token)
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Get team to check permissions and roster size
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()
    
    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }
    
    // Check permissions - league admin or team's coach can add players
    const canAddPlayer = hasPermission(decodedToken.role, 'league-admin') ||
                        (decodedToken.role === 'coach' && team.coach_id === decodedToken.userId)
    
    if (!canAddPlayer) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Check current roster size
    const { count: currentPlayers } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'active')
    
    if (currentPlayers && currentPlayers >= team.roster_size) {
      return NextResponse.json(
        { error: `Team roster is full (${team.roster_size} players max)` },
        { status: 400 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = AddPlayerSchema.parse(body)
    
    // Check if player already on a team in this league
    const { data: existingPlayer } = await supabase
      .from('players')
      .select(`
        *,
        team:teams(league_id)
      `)
      .eq('user_id', validatedData.user_id)
      .eq('team.league_id', team.league_id)
      .single()
    
    if (existingPlayer) {
      return NextResponse.json(
        { error: 'Player is already on a team in this league' },
        { status: 409 }
      )
    }
    
    // Check if jersey number is available
    if (validatedData.jersey_number) {
      const { data: jerseyCheck } = await supabase
        .from('players')
        .select('jersey_number')
        .eq('team_id', teamId)
        .eq('jersey_number', validatedData.jersey_number)
        .single()
      
      if (jerseyCheck) {
        return NextResponse.json(
          { error: `Jersey number ${validatedData.jersey_number} is already taken` },
          { status: 409 }
        )
      }
    }
    
    // Add player to team
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        ...validatedData,
        team_id: teamId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        user:users(id, name, email)
      `)
      .single()
    
    if (playerError) {
      console.error('Database error:', playerError)
      return NextResponse.json(
        { error: 'Failed to add player to team' },
        { status: 500 }
      )
    }
    
    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: decodedToken.userId,
        action: 'player.added_to_team',
        resource_type: 'player',
        resource_id: player.id,
        details: {
          team_id: teamId,
          team_name: team.name,
          player_name: player.user?.name,
        },
        created_at: new Date().toISOString(),
      })
    
    return NextResponse.json(player, { status: 201 })
    
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