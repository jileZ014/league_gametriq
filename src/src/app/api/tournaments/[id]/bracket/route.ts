import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken, hasPermission } from '@/lib/auth'
import { z } from 'zod'

// Types for bracket structures
interface BracketNode {
  id: string
  round: number
  position: number
  match_id?: string
  team1?: {
    id: string
    name: string
    seed: number
    score?: number
  }
  team2?: {
    id: string
    name: string
    seed: number
    score?: number
  }
  winner?: string
  nextMatch?: string
  previousMatches?: string[]
}

interface Bracket {
  type: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss'
  rounds: number
  nodes: BracketNode[]
  teams: Array<{
    id: string
    name: string
    seed: number
  }>
}

// Validation schemas
const GenerateBracketSchema = z.object({
  tournament_id: z.string().uuid(),
  seed_method: z.enum(['random', 'ranking', 'manual']).default('random'),
  team_seeds: z.array(z.object({
    team_id: z.string().uuid(),
    seed: z.number().min(1),
  })).optional(),
})

const UpdateMatchSchema = z.object({
  match_id: z.string().uuid(),
  team1_score: z.number().min(0),
  team2_score: z.number().min(0),
  status: z.enum(['scheduled', 'in_progress', 'completed']),
  winner_id: z.string().uuid().optional(),
})

// Helper function to generate single elimination bracket
function generateSingleEliminationBracket(teams: any[]): Bracket {
  const numTeams = teams.length
  const rounds = Math.ceil(Math.log2(numTeams))
  const bracketSize = Math.pow(2, rounds)
  const nodes: BracketNode[] = []
  
  // Sort teams by seed
  teams.sort((a, b) => a.seed - b.seed)
  
  // Generate first round matches
  let matchId = 1
  const firstRoundMatches = bracketSize / 2
  
  for (let i = 0; i < firstRoundMatches; i++) {
    const team1Index = i
    const team2Index = bracketSize - 1 - i
    
    const node: BracketNode = {
      id: `match-${matchId}`,
      round: 1,
      position: i,
      match_id: `${matchId}`,
    }
    
    // Add teams if they exist (handle byes)
    if (team1Index < teams.length) {
      node.team1 = {
        id: teams[team1Index].id,
        name: teams[team1Index].name,
        seed: team1Index + 1,
      }
    }
    
    if (team2Index < teams.length) {
      node.team2 = {
        id: teams[team2Index].id,
        name: teams[team2Index].name,
        seed: team2Index + 1,
      }
    }
    
    // If there's a bye, advance the team automatically
    if (node.team1 && !node.team2) {
      node.winner = node.team1.id
    } else if (!node.team1 && node.team2) {
      node.winner = node.team2.id
    }
    
    nodes.push(node)
    matchId++
  }
  
  // Generate subsequent rounds
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round)
    const previousRoundMatches = nodes.filter(n => n.round === round - 1)
    
    for (let i = 0; i < matchesInRound; i++) {
      const node: BracketNode = {
        id: `match-${matchId}`,
        round: round,
        position: i,
        match_id: `${matchId}`,
        previousMatches: [
          previousRoundMatches[i * 2]?.id,
          previousRoundMatches[i * 2 + 1]?.id,
        ].filter(Boolean),
      }
      
      // Set next match references for previous round
      if (previousRoundMatches[i * 2]) {
        previousRoundMatches[i * 2].nextMatch = node.id
      }
      if (previousRoundMatches[i * 2 + 1]) {
        previousRoundMatches[i * 2 + 1].nextMatch = node.id
      }
      
      nodes.push(node)
      matchId++
    }
  }
  
  return {
    type: 'single_elimination',
    rounds,
    nodes,
    teams: teams.map(t => ({
      id: t.id,
      name: t.name,
      seed: t.seed,
    })),
  }
}

// Helper function to generate round robin schedule
function generateRoundRobinBracket(teams: any[]): Bracket {
  const numTeams = teams.length
  const isOdd = numTeams % 2 !== 0
  const totalTeams = isOdd ? numTeams + 1 : numTeams
  const rounds = totalTeams - 1
  const nodes: BracketNode[] = []
  
  // Create a copy of teams array and add a bye if odd number
  const scheduledTeams = [...teams]
  if (isOdd) {
    scheduledTeams.push({ id: 'bye', name: 'BYE', seed: totalTeams })
  }
  
  let matchId = 1
  
  // Generate round robin matches
  for (let round = 1; round <= rounds; round++) {
    const roundMatches: BracketNode[] = []
    
    for (let match = 0; match < totalTeams / 2; match++) {
      const home = (round + match) % totalTeams
      const away = (totalTeams - 1 - match + round) % totalTeams
      
      // Skip bye matches
      if (scheduledTeams[home].id === 'bye' || scheduledTeams[away].id === 'bye') {
        continue
      }
      
      const node: BracketNode = {
        id: `match-${matchId}`,
        round: round,
        position: match,
        match_id: `${matchId}`,
        team1: {
          id: scheduledTeams[home].id,
          name: scheduledTeams[home].name,
          seed: scheduledTeams[home].seed,
        },
        team2: {
          id: scheduledTeams[away].id,
          name: scheduledTeams[away].name,
          seed: scheduledTeams[away].seed,
        },
      }
      
      roundMatches.push(node)
      matchId++
    }
    
    nodes.push(...roundMatches)
  }
  
  return {
    type: 'round_robin',
    rounds,
    nodes,
    teams: teams.map(t => ({
      id: t.id,
      name: t.name,
      seed: t.seed,
    })),
  }
}

// GET /api/tournaments/[id]/bracket - Get tournament bracket
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Get tournament with teams
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select(`
        *,
        tournament_teams (
          team:teams (
            id,
            name,
            wins,
            losses
          ),
          seed,
          eliminated
        )
      `)
      .eq('id', tournamentId)
      .single()
    
    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }
    
    // Get tournament matches
    const { data: matches, error: matchesError } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        team1:teams!tournament_matches_team1_id_fkey(id, name),
        team2:teams!tournament_matches_team2_id_fkey(id, name)
      `)
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('position', { ascending: true })
    
    if (matchesError) {
      console.error('Database error:', matchesError)
      return NextResponse.json(
        { error: 'Failed to fetch tournament matches' },
        { status: 500 }
      )
    }
    
    // Return existing bracket if it exists
    if (tournament.bracket_data) {
      return NextResponse.json({
        tournament: {
          id: tournament.id,
          name: tournament.name,
          type: tournament.tournament_type,
          status: tournament.status,
        },
        bracket: tournament.bracket_data,
        matches,
      })
    }
    
    // Return empty bracket structure if not generated yet
    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        type: tournament.tournament_type,
        status: tournament.status,
      },
      bracket: null,
      matches: [],
      message: 'Bracket not yet generated',
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tournaments/[id]/bracket - Generate tournament bracket
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id
    
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
    
    // Only league admins can generate brackets
    if (!hasPermission(decodedToken.role, 'league-admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    const { seed_method, team_seeds } = GenerateBracketSchema.parse({
      ...body,
      tournament_id: tournamentId,
    })
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Get tournament with registered teams
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select(`
        *,
        tournament_teams (
          team_id,
          team:teams (
            id,
            name,
            wins,
            losses
          )
        )
      `)
      .eq('id', tournamentId)
      .single()
    
    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }
    
    // Check tournament status
    if (tournament.status !== 'registration') {
      return NextResponse.json(
        { error: 'Bracket can only be generated during registration phase' },
        { status: 400 }
      )
    }
    
    // Check if enough teams are registered
    if (!tournament.tournament_teams || tournament.tournament_teams.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 teams required to generate bracket' },
        { status: 400 }
      )
    }
    
    // Prepare teams with seeds
    let teams = tournament.tournament_teams.map((tt: any, index: number) => ({
      id: tt.team_id,
      name: tt.team.name,
      seed: index + 1,
      wins: tt.team.wins || 0,
      losses: tt.team.losses || 0,
    }))
    
    // Apply seeding method
    if (seed_method === 'ranking') {
      // Sort by win percentage
      teams.sort((a: any, b: any) => {
        const aWinPct = a.wins / (a.wins + a.losses || 1)
        const bWinPct = b.wins / (b.wins + b.losses || 1)
        return bWinPct - aWinPct
      })
      teams = teams.map((t: any, i: number) => ({ ...t, seed: i + 1 }))
    } else if (seed_method === 'manual' && team_seeds) {
      // Apply manual seeds
      const seedMap = new Map(team_seeds.map(ts => [ts.team_id, ts.seed]))
      teams = teams.map((t: any) => ({
        ...t,
        seed: seedMap.get(t.id) || t.seed,
      }))
      teams.sort((a: any, b: any) => a.seed - b.seed)
    } else {
      // Random seeding
      teams = teams
        .map((t: any) => ({ ...t, sort: Math.random() }))
        .sort((a: any, b: any) => a.sort - b.sort)
        .map((t: any, i: number) => ({ ...t, seed: i + 1 }))
    }
    
    // Generate bracket based on tournament type
    let bracket: Bracket
    
    switch (tournament.tournament_type) {
      case 'single_elimination':
        bracket = generateSingleEliminationBracket(teams)
        break
      case 'round_robin':
        bracket = generateRoundRobinBracket(teams)
        break
      default:
        return NextResponse.json(
          { error: `Bracket generation for ${tournament.tournament_type} not yet implemented` },
          { status: 501 }
        )
    }
    
    // Start a transaction to update tournament and create matches
    const { error: updateError } = await supabase.rpc('generate_tournament_bracket', {
      p_tournament_id: tournamentId,
      p_bracket_data: bracket,
      p_teams: teams,
    })
    
    if (updateError) {
      // Fallback to manual updates if stored procedure doesn't exist
      // Update tournament with bracket data
      const { error: tournamentUpdateError } = await supabase
        .from('tournaments')
        .update({
          bracket_data: bracket,
          status: 'bracket_set',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tournamentId)
      
      if (tournamentUpdateError) {
        console.error('Database error:', tournamentUpdateError)
        return NextResponse.json(
          { error: 'Failed to save bracket' },
          { status: 500 }
        )
      }
      
      // Create tournament matches
      const matches = bracket.nodes.map(node => ({
        tournament_id: tournamentId,
        match_id: node.match_id,
        round: node.round,
        position: node.position,
        team1_id: node.team1?.id,
        team2_id: node.team2?.id,
        status: 'scheduled',
        created_at: new Date().toISOString(),
      })).filter(m => m.team1_id || m.team2_id)
      
      if (matches.length > 0) {
        const { error: matchesError } = await supabase
          .from('tournament_matches')
          .insert(matches)
        
        if (matchesError) {
          console.error('Database error:', matchesError)
        }
      }
    }
    
    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: decodedToken.userId,
        action: 'bracket.generated',
        resource_type: 'tournament',
        resource_id: tournamentId,
        details: {
          tournament_name: tournament.name,
          bracket_type: tournament.tournament_type,
          num_teams: teams.length,
          seed_method,
        },
        created_at: new Date().toISOString(),
      })
    
    return NextResponse.json({
      message: 'Bracket generated successfully',
      bracket,
      teams,
    }, { status: 201 })
    
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

// PATCH /api/tournaments/[id]/bracket - Update match results
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id
    
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
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdateMatchSchema.parse(body)
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Update match result
    const { data: match, error: matchError } = await supabase
      .from('tournament_matches')
      .update({
        team1_score: validatedData.team1_score,
        team2_score: validatedData.team2_score,
        status: validatedData.status,
        winner_id: validatedData.winner_id,
        updated_at: new Date().toISOString(),
      })
      .eq('tournament_id', tournamentId)
      .eq('match_id', validatedData.match_id)
      .select()
      .single()
    
    if (matchError) {
      console.error('Database error:', matchError)
      return NextResponse.json(
        { error: 'Failed to update match' },
        { status: 500 }
      )
    }
    
    // If match is completed, update bracket and advance winner
    if (validatedData.status === 'completed' && validatedData.winner_id) {
      // Get tournament bracket
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('bracket_data')
        .eq('id', tournamentId)
        .single()
      
      if (tournament?.bracket_data) {
        const bracket = tournament.bracket_data as Bracket
        const currentNode = bracket.nodes.find(n => n.match_id === validatedData.match_id)
        
        if (currentNode) {
          // Update current match node
          currentNode.winner = validatedData.winner_id
          if (currentNode.team1?.id === validatedData.winner_id) {
            currentNode.team1.score = validatedData.team1_score
            currentNode.team2!.score = validatedData.team2_score
          } else {
            currentNode.team1!.score = validatedData.team1_score
            currentNode.team2!.score = validatedData.team2_score
          }
          
          // Advance winner to next match if exists
          if (currentNode.nextMatch) {
            const nextNode = bracket.nodes.find(n => n.id === currentNode.nextMatch)
            if (nextNode) {
              const winnerTeam = currentNode.team1?.id === validatedData.winner_id
                ? currentNode.team1
                : currentNode.team2
              
              // Determine if winner goes to team1 or team2 slot
              if (!nextNode.team1) {
                nextNode.team1 = winnerTeam
              } else if (!nextNode.team2) {
                nextNode.team2 = winnerTeam
              }
            }
          }
          
          // Update bracket in database
          await supabase
            .from('tournaments')
            .update({
              bracket_data: bracket,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tournamentId)
        }
      }
    }
    
    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: decodedToken.userId,
        action: 'match.updated',
        resource_type: 'tournament_match',
        resource_id: validatedData.match_id,
        details: {
          tournament_id: tournamentId,
          scores: {
            team1: validatedData.team1_score,
            team2: validatedData.team2_score,
          },
          winner_id: validatedData.winner_id,
          status: validatedData.status,
        },
        created_at: new Date().toISOString(),
      })
    
    return NextResponse.json({
      message: 'Match updated successfully',
      match,
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