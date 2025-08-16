import { supabase } from '../supabase'
import { offlineQueue, isOnline } from '../offline'

export interface TeamWithStats {
  id: string
  name: string
  division_id: string
  coach_id: string | null
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  win_percentage?: number
  point_differential?: number
  division_rank?: number
  logo_url?: string
  primary_color?: string
  secondary_color?: string
}

export interface TeamPlayer {
  id: string
  team_id: string
  player_id: string
  jersey_number: number
  position: string
  is_captain: boolean
  is_active: boolean
  player?: {
    full_name: string
    email: string
    date_of_birth: string
    avatar_url?: string
  }
}

// Get all teams in a division
export async function getTeamsByDivision(divisionId: string): Promise<TeamWithStats[]> {
  const { data, error } = await supabase
    .from('v_team_standings')
    .select('*')
    .eq('division_id', divisionId)
    .order('division_rank', { ascending: true })

  if (error) throw error
  return data || []
}

// Get a single team with full details
export async function getTeam(teamId: string) {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      division:divisions(
        id,
        name,
        age_group,
        skill_level,
        game_rules
      ),
      coach:profiles!teams_coach_id_fkey(
        id,
        full_name,
        email,
        phone
      ),
      assistant_coach:profiles!teams_assistant_coach_id_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq('id', teamId)
    .single()

  if (error) throw error
  return data
}

// Get team roster
export async function getTeamRoster(teamId: string): Promise<TeamPlayer[]> {
  const { data, error } = await supabase
    .from('team_players')
    .select(`
      *,
      player:profiles(
        id,
        full_name,
        email,
        date_of_birth,
        avatar_url
      )
    `)
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('jersey_number', { ascending: true })

  if (error) throw error
  return data || []
}

// Add player to team roster
export async function addPlayerToRoster(
  teamId: string,
  playerId: string,
  jerseyNumber: number,
  position?: string
) {
  const data = {
    team_id: teamId,
    player_id: playerId,
    jersey_number: jerseyNumber,
    position: position || null,
    is_active: true,
    medical_clearance: false,
    joined_at: new Date().toISOString()
  }

  if (!isOnline()) {
    await offlineQueue.addToQueue('INSERT', 'team_players', data)
    return { success: true, offline: true }
  }

  const { error } = await supabase
    .from('team_players')
    .insert(data)

  if (error) throw error
  return { success: true, offline: false }
}

// Remove player from roster
export async function removePlayerFromRoster(teamId: string, playerId: string) {
  const data = {
    is_active: false,
    left_at: new Date().toISOString()
  }

  if (!isOnline()) {
    await offlineQueue.addToQueue('UPDATE', 'team_players', {
      id: `${teamId}_${playerId}`,
      updates: data
    })
    return { success: true, offline: true }
  }

  const { error } = await supabase
    .from('team_players')
    .update(data)
    .eq('team_id', teamId)
    .eq('player_id', playerId)
    .eq('is_active', true)

  if (error) throw error
  return { success: true, offline: false }
}

// Update team details
export async function updateTeam(teamId: string, updates: Partial<{
  name: string
  home_venue: string
  logo_url: string
  primary_color: string
  secondary_color: string
}>) {
  if (!isOnline()) {
    await offlineQueue.addToQueue('UPDATE', 'teams', {
      id: teamId,
      updates
    })
    return { success: true, offline: true }
  }

  const { error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId)

  if (error) throw error
  return { success: true, offline: false }
}

// Get team schedule (upcoming games)
export async function getTeamSchedule(teamId: string, limit = 10) {
  const { data, error } = await supabase
    .from('v_games_with_teams')
    .select('*')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get team recent games
export async function getTeamRecentGames(teamId: string, limit = 5) {
  const { data, error } = await supabase
    .from('v_games_with_teams')
    .select('*')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get team statistics for a season
export async function getTeamSeasonStats(teamId: string) {
  // Get team basic stats
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single()

  if (teamError) throw teamError

  // Get aggregated game stats
  const { data: gameStats, error: statsError } = await supabase
    .from('team_game_stats')
    .select(`
      *,
      game:games(
        id,
        status,
        home_team_id,
        away_team_id,
        home_score,
        away_score
      )
    `)
    .eq('team_id', teamId)
    .eq('game.status', 'completed')

  if (statsError) throw statsError

  // Calculate averages
  const totalGames = gameStats?.length || 0
  const stats = gameStats?.reduce((acc, stat) => {
    acc.field_goals_made += stat.field_goals_made
    acc.field_goals_attempted += stat.field_goals_attempted
    acc.three_pointers_made += stat.three_pointers_made
    acc.three_pointers_attempted += stat.three_pointers_attempted
    acc.free_throws_made += stat.free_throws_made
    acc.free_throws_attempted += stat.free_throws_attempted
    acc.offensive_rebounds += stat.offensive_rebounds
    acc.defensive_rebounds += stat.defensive_rebounds
    acc.assists += stat.assists
    acc.steals += stat.steals
    acc.blocks += stat.blocks
    acc.turnovers += stat.turnovers
    return acc
  }, {
    field_goals_made: 0,
    field_goals_attempted: 0,
    three_pointers_made: 0,
    three_pointers_attempted: 0,
    free_throws_made: 0,
    free_throws_attempted: 0,
    offensive_rebounds: 0,
    defensive_rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0
  })

  return {
    ...team,
    games_played: totalGames,
    averages: totalGames > 0 ? {
      points_per_game: team.points_for / totalGames,
      points_against_per_game: team.points_against / totalGames,
      field_goal_percentage: stats.field_goals_attempted > 0 
        ? (stats.field_goals_made / stats.field_goals_attempted) * 100 
        : 0,
      three_point_percentage: stats.three_pointers_attempted > 0
        ? (stats.three_pointers_made / stats.three_pointers_attempted) * 100
        : 0,
      free_throw_percentage: stats.free_throws_attempted > 0
        ? (stats.free_throws_made / stats.free_throws_attempted) * 100
        : 0,
      rebounds_per_game: (stats.offensive_rebounds + stats.defensive_rebounds) / totalGames,
      assists_per_game: stats.assists / totalGames,
      steals_per_game: stats.steals / totalGames,
      blocks_per_game: stats.blocks / totalGames,
      turnovers_per_game: stats.turnovers / totalGames
    } : null
  }
}