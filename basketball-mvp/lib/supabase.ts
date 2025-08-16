import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mgfpbqvkhqjlvgeqaclj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZnBicXZraHFqbHZnZXFhY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMDIzNDUsImV4cCI6MjA0OTg3ODM0NX0.G2v1cYDdpgXCJ9cJ_rtHJJfbKLEr0z6FCd3gRCqzSrc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Team {
  id: string
  name: string
  coach_id: string
  division: string
  created_at: string
  wins?: number
  losses?: number
  points?: number
}

export interface Player {
  id: string
  name: string
  team_id: string
  jersey_number: number
  position: string
  age: number
  verified: boolean
  stats?: PlayerStats
}

export interface PlayerStats {
  player_id: string
  games_played: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  fouls: number
  minutes: number
  field_goal_percentage: number
  three_point_percentage: number
  free_throw_percentage: number
}

export interface Game {
  id: string
  home_team_id: string
  away_team_id: string
  scheduled_at: string
  venue: string
  status: 'scheduled' | 'in_progress' | 'completed'
  home_score?: number
  away_score?: number
  quarter?: number
  time_remaining?: string
}

export interface User {
  id: string
  email: string
  role: 'admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper' | 'spectator'
  name: string
  verified: boolean
}