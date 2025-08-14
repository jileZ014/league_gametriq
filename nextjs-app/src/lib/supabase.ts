import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

export type Database = {
  public: {
    Tables: {
      leagues: {
        Row: {
          id: string
          name: string
          description: string | null
          season: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          season: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          season?: string
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          league_id: string
          name: string
          coach_name: string
          division: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          name: string
          coach_name: string
          division: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          name?: string
          coach_name?: string
          division?: string
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
          status: 'scheduled' | 'live' | 'completed'
          home_score: number | null
          away_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          home_team_id: string
          away_team_id: string
          scheduled_at: string
          status?: 'scheduled' | 'live' | 'completed'
          home_score?: number | null
          away_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          home_team_id?: string
          away_team_id?: string
          scheduled_at?: string
          status?: 'scheduled' | 'live' | 'completed'
          home_score?: number | null
          away_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}