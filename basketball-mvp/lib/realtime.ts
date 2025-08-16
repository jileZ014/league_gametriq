import { supabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface GameUpdate {
  id: string
  home_score: number
  away_score: number
  quarter: number
  time_remaining: string
  status: 'scheduled' | 'live' | 'completed'
}

export interface GameEvent {
  id: string
  game_id: string
  event_type: string
  player_id?: string
  points?: number
  timestamp: string
}

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()

  subscribeToGame(gameId: string, onUpdate: (update: GameUpdate) => void) {
    const channelName = `game-${gameId}`
    
    // Clean up existing subscription
    this.unsubscribe(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          onUpdate(payload.new as GameUpdate)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  subscribeToLiveGames(onUpdate: (games: GameUpdate[]) => void) {
    const channelName = 'live-games'
    
    // Clean up existing subscription
    this.unsubscribe(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: 'status=eq.live'
        },
        async () => {
          // Fetch all live games
          const { data } = await supabase
            .from('games')
            .select('*')
            .eq('status', 'live')
          
          if (data) {
            onUpdate(data as GameUpdate[])
          }
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  subscribeToGameEvents(gameId: string, onEvent: (event: GameEvent) => void) {
    const channelName = `game-events-${gameId}`
    
    // Clean up existing subscription
    this.unsubscribe(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          onEvent(payload.new as GameEvent)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  broadcastScore(gameId: string, update: Partial<GameUpdate>) {
    const channel = this.channels.get(`game-${gameId}`)
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'score_update',
        payload: update
      })
    }
  }

  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName)
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  unsubscribeAll() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
  }
}

export const realtime = new RealtimeManager()