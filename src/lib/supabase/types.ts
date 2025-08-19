// Database type definitions for Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'league-admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper' | 'spectator'
          age_group: 'youth' | 'teen' | 'adult' | null
          is_under_13: boolean
          has_parental_consent: boolean
          avatar_url: string | null
          phone_number: string | null
          date_of_birth: string | null
          created_at: string
          updated_at: string
          last_login_at: string | null
          is_active: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'league-admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper' | 'spectator'
          age_group?: 'youth' | 'teen' | 'adult' | null
          is_under_13?: boolean
          has_parental_consent?: boolean
          avatar_url?: string | null
          phone_number?: string | null
          date_of_birth?: string | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          is_active?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'league-admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper' | 'spectator'
          age_group?: 'youth' | 'teen' | 'adult' | null
          is_under_13?: boolean
          has_parental_consent?: boolean
          avatar_url?: string | null
          phone_number?: string | null
          date_of_birth?: string | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          is_active?: boolean
          metadata?: Json | null
        }
      }
      leagues: {
        Row: {
          id: string
          name: string
          description: string | null
          season: string
          age_group: 'youth' | 'teen' | 'adult'
          max_teams: number
          registration_fee: number
          start_date: string
          end_date: string
          status: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled'
          rules: Json | null
          contact_email: string
          contact_phone: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          season: string
          age_group: 'youth' | 'teen' | 'adult'
          max_teams: number
          registration_fee: number
          start_date: string
          end_date: string
          status?: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled'
          rules?: Json | null
          contact_email: string
          contact_phone?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          season?: string
          age_group?: 'youth' | 'teen' | 'adult'
          max_teams?: number
          registration_fee?: number
          start_date?: string
          end_date?: string
          status?: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled'
          rules?: Json | null
          contact_email?: string
          contact_phone?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          league_id: string
          name: string
          coach_id: string
          assistant_coach_ids: string[] | null
          division: string | null
          age_group: 'youth' | 'teen' | 'adult'
          home_venue: string | null
          team_color: string | null
          logo_url: string | null
          roster_size: number
          wins: number
          losses: number
          points_for: number
          points_against: number
          status: 'active' | 'inactive' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          name: string
          coach_id: string
          assistant_coach_ids?: string[] | null
          division?: string | null
          age_group: 'youth' | 'teen' | 'adult'
          home_venue?: string | null
          team_color?: string | null
          logo_url?: string | null
          roster_size?: number
          wins?: number
          losses?: number
          points_for?: number
          points_against?: number
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          name?: string
          coach_id?: string
          assistant_coach_ids?: string[] | null
          division?: string | null
          age_group?: 'youth' | 'teen' | 'adult'
          home_venue?: string | null
          team_color?: string | null
          logo_url?: string | null
          roster_size?: number
          wins?: number
          losses?: number
          points_for?: number
          points_against?: number
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      players: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          jersey_number: number | null
          position: 'PG' | 'SG' | 'SF' | 'PF' | 'C' | null
          height: string | null
          weight: number | null
          grade_level: string | null
          emergency_contact: Json | null
          medical_info: Json | null
          stats: Json | null
          status: 'active' | 'inactive' | 'injured' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          jersey_number?: number | null
          position?: 'PG' | 'SG' | 'SF' | 'PF' | 'C' | null
          height?: string | null
          weight?: number | null
          grade_level?: string | null
          emergency_contact?: Json | null
          medical_info?: Json | null
          stats?: Json | null
          status?: 'active' | 'inactive' | 'injured' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          jersey_number?: number | null
          position?: 'PG' | 'SG' | 'SF' | 'PF' | 'C' | null
          height?: string | null
          weight?: number | null
          grade_level?: string | null
          emergency_contact?: Json | null
          medical_info?: Json | null
          stats?: Json | null
          status?: 'active' | 'inactive' | 'injured' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: string
          league_id: string
          home_team_id: string
          away_team_id: string
          scheduled_at: string
          venue: string
          court: string | null
          game_type: 'regular' | 'playoff' | 'tournament' | 'scrimmage'
          status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed'
          period: number
          time_remaining: string | null
          home_score: number
          away_score: number
          home_fouls: number
          away_fouls: number
          home_timeouts: number
          away_timeouts: number
          officials: string[] | null
          scorekeeper_id: string | null
          box_score: Json | null
          play_by_play: Json | null
          weather_conditions: Json | null
          heat_index: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          home_team_id: string
          away_team_id: string
          scheduled_at: string
          venue: string
          court?: string | null
          game_type?: 'regular' | 'playoff' | 'tournament' | 'scrimmage'
          status?: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed'
          period?: number
          time_remaining?: string | null
          home_score?: number
          away_score?: number
          home_fouls?: number
          away_fouls?: number
          home_timeouts?: number
          away_timeouts?: number
          officials?: string[] | null
          scorekeeper_id?: string | null
          box_score?: Json | null
          play_by_play?: Json | null
          weather_conditions?: Json | null
          heat_index?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          home_team_id?: string
          away_team_id?: string
          scheduled_at?: string
          venue?: string
          court?: string | null
          game_type?: 'regular' | 'playoff' | 'tournament' | 'scrimmage'
          status?: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed'
          period?: number
          time_remaining?: string | null
          home_score?: number
          away_score?: number
          home_fouls?: number
          away_fouls?: number
          home_timeouts?: number
          away_timeouts?: number
          officials?: string[] | null
          scorekeeper_id?: string | null
          box_score?: Json | null
          play_by_play?: Json | null
          weather_conditions?: Json | null
          heat_index?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          league_id: string
          name: string
          description: string | null
          tournament_type: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss'
          max_teams: number
          entry_fee: number
          prize_pool: number | null
          start_date: string
          end_date: string
          registration_deadline: string
          venue: string
          rules: Json | null
          status: 'draft' | 'registration' | 'bracket_set' | 'in_progress' | 'completed' | 'cancelled'
          bracket_data: Json | null
          teams: string[] | null
          winners: Json | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          name: string
          description?: string | null
          tournament_type: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss'
          max_teams: number
          entry_fee: number
          prize_pool?: number | null
          start_date: string
          end_date: string
          registration_deadline: string
          venue: string
          rules?: Json | null
          status?: 'draft' | 'registration' | 'bracket_set' | 'in_progress' | 'completed' | 'cancelled'
          bracket_data?: Json | null
          teams?: string[] | null
          winners?: Json | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          name?: string
          description?: string | null
          tournament_type?: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss'
          max_teams?: number
          entry_fee?: number
          prize_pool?: number | null
          start_date?: string
          end_date?: string
          registration_deadline?: string
          venue?: string
          rules?: Json | null
          status?: 'draft' | 'registration' | 'bracket_set' | 'in_progress' | 'completed' | 'cancelled'
          bracket_data?: Json | null
          teams?: string[] | null
          winners?: Json | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          name: string
          description: string | null
          report_type: 'team_stats' | 'player_stats' | 'game_results' | 'attendance' | 'financial' | 'custom'
          league_id: string | null
          team_id: string | null
          parameters: Json | null
          schedule: Json | null
          format: 'pdf' | 'excel' | 'csv' | 'json'
          is_scheduled: boolean
          last_generated: string | null
          recipients: string[] | null
          status: 'active' | 'inactive' | 'failed'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          report_type: 'team_stats' | 'player_stats' | 'game_results' | 'attendance' | 'financial' | 'custom'
          league_id?: string | null
          team_id?: string | null
          parameters?: Json | null
          schedule?: Json | null
          format: 'pdf' | 'excel' | 'csv' | 'json'
          is_scheduled?: boolean
          last_generated?: string | null
          recipients?: string[] | null
          status?: 'active' | 'inactive' | 'failed'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          report_type?: 'team_stats' | 'player_stats' | 'game_results' | 'attendance' | 'financial' | 'custom'
          league_id?: string | null
          team_id?: string | null
          parameters?: Json | null
          schedule?: Json | null
          format?: 'pdf' | 'excel' | 'csv' | 'json'
          is_scheduled?: boolean
          last_generated?: string | null
          recipients?: string[] | null
          status?: 'active' | 'inactive' | 'failed'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          theme: 'light' | 'dark' | 'system'
          notifications_enabled: boolean
          email_notifications: boolean
          sms_notifications: boolean
          language: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: 'light' | 'dark' | 'system'
          notifications_enabled?: boolean
          email_notifications?: boolean
          sms_notifications?: boolean
          language?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: 'light' | 'dark' | 'system'
          notifications_enabled?: boolean
          email_notifications?: boolean
          sms_notifications?: boolean
          language?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      password_reset_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
          created_at: string
          used_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          expires_at: string
          created_at?: string
          used_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          expires_at?: string
          created_at?: string
          used_at?: string | null
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          token: string
          ip_address: string | null
          user_agent: string | null
          expires_at: string
          created_at: string
          last_activity: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          ip_address?: string | null
          user_agent?: string | null
          expires_at: string
          created_at?: string
          last_activity?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          ip_address?: string | null
          user_agent?: string | null
          expires_at?: string
          created_at?: string
          last_activity?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'league-admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper' | 'spectator'
      age_group: 'youth' | 'teen' | 'adult'
      theme_preference: 'light' | 'dark' | 'system'
      league_status: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled'
      team_status: 'active' | 'inactive' | 'suspended'
      player_status: 'active' | 'inactive' | 'injured' | 'suspended'
      player_position: 'PG' | 'SG' | 'SF' | 'PF' | 'C'
      game_type: 'regular' | 'playoff' | 'tournament' | 'scrimmage'
      game_status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed'
      tournament_type: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss'
      tournament_status: 'draft' | 'registration' | 'bracket_set' | 'in_progress' | 'completed' | 'cancelled'
      report_type: 'team_stats' | 'player_stats' | 'game_results' | 'attendance' | 'financial' | 'custom'
      report_format: 'pdf' | 'excel' | 'csv' | 'json'
      report_status: 'active' | 'inactive' | 'failed'
    }
  }
}

// Auth types
export type UserRole = Database['public']['Enums']['user_role']
export type AgeGroup = Database['public']['Enums']['age_group']
export type ThemePreference = Database['public']['Enums']['theme_preference']

export interface User extends Database['public']['Tables']['users']['Row'] {
  preferences?: Database['public']['Tables']['user_preferences']['Row']
}

export interface Session {
  user: User
  access_token: string
  refresh_token?: string
  expires_at: number
}

export interface AuthError {
  message: string
  status?: number
  code?: string
}

export interface SignUpData {
  email: string
  password: string
  name: string
  role: UserRole
  phone_number?: string
  date_of_birth?: string
  parent_email?: string
  parent_name?: string
}

export interface SignInData {
  email: string
  password: string
  remember_me?: boolean
}

export interface ResetPasswordData {
  email: string
}

export interface UpdatePasswordData {
  token: string
  password: string
}

export interface UpdateProfileData {
  name?: string
  phone_number?: string
  avatar_url?: string
  date_of_birth?: string
}

export interface UpdatePreferencesData {
  theme?: ThemePreference
  notifications_enabled?: boolean
  email_notifications?: boolean
  sms_notifications?: boolean
  language?: string
  timezone?: string
}

// Entity types
export type League = Database['public']['Tables']['leagues']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Player = Database['public']['Tables']['players']['Row']
export type Game = Database['public']['Tables']['games']['Row']
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type Report = Database['public']['Tables']['reports']['Row']

// Status and enum types
export type LeagueStatus = Database['public']['Enums']['league_status']
export type TeamStatus = Database['public']['Enums']['team_status']
export type PlayerStatus = Database['public']['Enums']['player_status']
export type PlayerPosition = Database['public']['Enums']['player_position']
export type GameType = Database['public']['Enums']['game_type']
export type GameStatus = Database['public']['Enums']['game_status']
export type TournamentType = Database['public']['Enums']['tournament_type']
export type TournamentStatus = Database['public']['Enums']['tournament_status']
export type ReportType = Database['public']['Enums']['report_type']
export type ReportFormat = Database['public']['Enums']['report_format']
export type ReportStatus = Database['public']['Enums']['report_status']

// Extended types with relations
export interface TeamWithPlayers extends Team {
  players?: Player[]
  coach?: User
  league?: League
}

export interface GameWithTeams extends Game {
  home_team?: Team
  away_team?: Team
  league?: League
}

export interface TournamentWithTeams extends Tournament {
  participating_teams?: Team[]
  league?: League
}

export interface PlayerWithTeam extends Player {
  team?: Team
  user?: User
}

export interface BoxScore {
  player_id: string
  minutes: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fouls: number
  field_goals_made: number
  field_goals_attempted: number
  three_pointers_made: number
  three_pointers_attempted: number
  free_throws_made: number
  free_throws_attempted: number
}

export interface PlayByPlayEvent {
  id: string
  timestamp: string
  period: number
  time_remaining: string
  event_type: 'basket' | 'foul' | 'timeout' | 'substitution' | 'technical' | 'period_end' | 'game_end'
  team_id: string
  player_id?: string
  description: string
  points?: number
  home_score: number
  away_score: number
}

export interface WeatherConditions {
  temperature: number
  heat_index: number
  humidity: number
  wind_speed: number
  air_quality_index: number
  uv_index: number
  heat_advisory: boolean
  last_updated: string
}