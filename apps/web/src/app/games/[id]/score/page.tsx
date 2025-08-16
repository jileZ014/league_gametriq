'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Trophy,
  Play,
  Pause,
  Square,
  Plus,
  Minus,
  Clock,
  Users,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Save,
  Share2,
  Settings,
  Thermometer,
  Shield,
  Target,
  Activity,
  Star,
  Eye,
  Volume2,
  VolumeX,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database, Game, GameWithTeams, Team, Player, BoxScore, PlayByPlayEvent } from '@/lib/supabase/types'

interface GamePageProps {
  params: {
    id: string
  }
}

interface ScoreboardState {
  homeScore: number
  awayScore: number
  period: number
  timeRemaining: string
  isRunning: boolean
  homeFouls: number
  awayFouls: number
  homeTimeouts: number
  awayTimeouts: number
}

interface GameAction {
  type: 'score' | 'foul' | 'timeout' | 'substitution' | 'technical' | 'period_change'
  team: 'home' | 'away'
  player?: Player
  points?: number
  description: string
}

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-4">
      <Trophy className="h-12 w-12 mx-auto text-basketball-orange-500 animate-spin" />
      <p className="text-muted-foreground">Loading game...</p>
    </div>
  </div>
)

export default function LiveScoringPage({ params }: GamePageProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [game, setGame] = useState<GameWithTeams | null>(null)
  const [scoreboardState, setScoreboardState] = useState<ScoreboardState>({
    homeScore: 0,
    awayScore: 0,
    period: 1,
    timeRemaining: '12:00',
    isRunning: false,
    homeFouls: 0,
    awayFouls: 0,
    homeTimeouts: 3,
    awayTimeouts: 3,
  })
  const [playByPlay, setPlayByPlay] = useState<PlayByPlayEvent[]>([])
  const [boxScore, setBoxScore] = useState<{ [playerId: string]: BoxScore }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [pendingActions, setPendingActions] = useState<GameAction[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [heatIndex, setHeatIndex] = useState(110)

  const supabase = createClientComponentClient<Database>()

  // WebSocket for real-time updates
  const { isConnected, sendMessage } = useWebSocket(
    `wss://your-websocket-url/games/${params.id}`,
    {
      onMessage: (data) => {
        if (data.type === 'score_update') {
          setScoreboardState(data.scoreboard)
        } else if (data.type === 'play_by_play') {
          setPlayByPlay(prev => [data.event, ...prev])
        }
      }
    }
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && params.id) {
      fetchGameData()
    }
  }, [user, params.id])

  // Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      syncPendingActions()
    }
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Game clock
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (scoreboardState.isRunning && scoreboardState.timeRemaining !== '00:00') {
      interval = setInterval(() => {
        setScoreboardState(prev => {
          const [minutes, seconds] = prev.timeRemaining.split(':').map(Number)
          const totalSeconds = minutes * 60 + seconds - 1
          
          if (totalSeconds <= 0) {
            return { ...prev, timeRemaining: '00:00', isRunning: false }
          }
          
          const newMinutes = Math.floor(totalSeconds / 60)
          const newSeconds = totalSeconds % 60
          return {
            ...prev,
            timeRemaining: `${newMinutes.toString().padStart(2, '0')}:${newSeconds.toString().padStart(2, '0')}`
          }
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [scoreboardState.isRunning, scoreboardState.timeRemaining])

  // Phoenix heat monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      setHeatIndex(prev => Math.max(95, Math.min(125, prev + Math.floor(Math.random() * 6) - 3)))
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchGameData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          home_team:home_team_id(*),
          away_team:away_team_id(*)
        `)
        .eq('id', params.id)
        .single()

      if (gameError) throw gameError
      if (!gameData) throw new Error('Game not found')

      setGame(gameData)
      setScoreboardState({
        homeScore: gameData.home_score,
        awayScore: gameData.away_score,
        period: gameData.period,
        timeRemaining: gameData.time_remaining || '12:00',
        isRunning: gameData.status === 'live',
        homeFouls: gameData.home_fouls,
        awayFouls: gameData.away_fouls,
        homeTimeouts: gameData.home_timeouts,
        awayTimeouts: gameData.away_timeouts,
      })

      // Load play-by-play if available
      if (gameData.play_by_play) {
        setPlayByPlay(gameData.play_by_play as PlayByPlayEvent[])
      }

      // Load box score if available
      if (gameData.box_score) {
        setBoxScore(gameData.box_score as { [playerId: string]: BoxScore })
      }
    } catch (error: any) {
      console.error('Error fetching game data:', error)
      setError(error.message || 'Failed to load game')
    } finally {
      setLoading(false)
    }
  }

  const syncPendingActions = async () => {
    if (pendingActions.length === 0) return

    try {
      // Sync pending actions to server
      for (const action of pendingActions) {
        await processGameAction(action, false)
      }
      setPendingActions([])
    } catch (error) {
      console.error('Error syncing pending actions:', error)
    }
  }

  const processGameAction = async (action: GameAction, addToPending = true) => {
    if (isOffline && addToPending) {
      setPendingActions(prev => [...prev, action])
      return
    }

    try {
      // Update local state immediately for optimistic UI
      switch (action.type) {
        case 'score':
          setScoreboardState(prev => ({
            ...prev,
            homeScore: action.team === 'home' ? prev.homeScore + (action.points || 0) : prev.homeScore,
            awayScore: action.team === 'away' ? prev.awayScore + (action.points || 0) : prev.awayScore,
          }))
          break
        case 'foul':
          setScoreboardState(prev => ({
            ...prev,
            homeFouls: action.team === 'home' ? prev.homeFouls + 1 : prev.homeFouls,
            awayFouls: action.team === 'away' ? prev.awayFouls + 1 : prev.awayFouls,
          }))
          break
        case 'timeout':
          setScoreboardState(prev => ({
            ...prev,
            homeTimeouts: action.team === 'home' ? Math.max(0, prev.homeTimeouts - 1) : prev.homeTimeouts,
            awayTimeouts: action.team === 'away' ? Math.max(0, prev.awayTimeouts - 1) : prev.awayTimeouts,
          }))
          break
      }

      // Add to play-by-play
      const playEvent: PlayByPlayEvent = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        period: scoreboardState.period,
        time_remaining: scoreboardState.timeRemaining,
        event_type: action.type as any,
        team_id: action.team === 'home' ? game?.home_team_id || '' : game?.away_team_id || '',
        player_id: action.player?.id,
        description: action.description,
        points: action.points,
        home_score: action.team === 'home' ? scoreboardState.homeScore + (action.points || 0) : scoreboardState.homeScore,
        away_score: action.team === 'away' ? scoreboardState.awayScore + (action.points || 0) : scoreboardState.awayScore,
      }

      setPlayByPlay(prev => [playEvent, ...prev])

      // Play sound if enabled
      if (soundEnabled && action.type === 'score') {
        new Audio('/sounds/score.mp3').play().catch(() => {})
      }

      // Sync to server if online
      if (!isOffline) {
        await supabase
          .from('games')
          .update({
            home_score: scoreboardState.homeScore,
            away_score: scoreboardState.awayScore,
            period: scoreboardState.period,
            time_remaining: scoreboardState.timeRemaining,
            home_fouls: scoreboardState.homeFouls,
            away_fouls: scoreboardState.awayFouls,
            home_timeouts: scoreboardState.homeTimeouts,
            away_timeouts: scoreboardState.awayTimeouts,
            play_by_play: playByPlay,
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id)

        // Send WebSocket update
        if (isConnected) {
          sendMessage({
            type: 'game_action',
            action,
            scoreboard: scoreboardState,
            playEvent,
          })
        }
      }
    } catch (error) {
      console.error('Error processing game action:', error)
    }
  }

  const addScore = (team: 'home' | 'away', points: number, player?: Player) => {
    const action: GameAction = {
      type: 'score',
      team,
      player,
      points,
      description: `${points} point${points !== 1 ? 's' : ''} by ${player?.user?.name || 'Unknown'}`,
    }
    processGameAction(action)
  }

  const addFoul = (team: 'home' | 'away', player?: Player) => {
    const action: GameAction = {
      type: 'foul',
      team,
      player,
      description: `Foul by ${player?.user?.name || 'Unknown'}`,
    }
    processGameAction(action)
  }

  const addTimeout = (team: 'home' | 'away') => {
    const action: GameAction = {
      type: 'timeout',
      team,
      description: `Timeout called by ${team === 'home' ? game?.home_team?.name : game?.away_team?.name}`,
    }
    processGameAction(action)
  }

  const toggleClock = () => {
    setScoreboardState(prev => ({ ...prev, isRunning: !prev.isRunning }))
  }

  const changePeriod = (newPeriod: number) => {
    setScoreboardState(prev => ({
      ...prev,
      period: newPeriod,
      timeRemaining: '12:00',
      isRunning: false,
    }))
  }

  const getHeatSafetyLevel = (heatIndex: number) => {
    if (heatIndex < 90) return { level: 'safe', color: 'text-green-600', bg: 'bg-green-100' }
    if (heatIndex < 100) return { level: 'caution', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (heatIndex < 110) return { level: 'warning', color: 'text-orange-600', bg: 'bg-orange-100' }
    return { level: 'danger', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const heatSafety = getHeatSafetyLevel(heatIndex)

  const canScore = () => {
    return user?.role === 'scorekeeper' || user?.role === 'referee' || user?.role === 'league-admin'
  }

  if (authLoading || loading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
          <h1 className="text-xl font-semibold">Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Trophy className="h-12 w-12 mx-auto text-gray-400" />
          <h1 className="text-xl font-semibold">Game Not Found</h1>
          <p className="text-muted-foreground">The game you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!canScore()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 mx-auto text-red-500" />
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">You don&apos;t have permission to score this game.</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Live Scoring</h1>
                <p className="text-sm text-gray-600">{game.venue} • {game.court}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <Badge variant={isOffline ? 'destructive' : isConnected ? 'default' : 'secondary'}>
                {isOffline ? (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Offline
                  </>
                ) : isConnected ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  'Connecting...'
                )}
              </Badge>

              {/* Pending Actions */}
              {pendingActions.length > 0 && (
                <Badge variant="outline">
                  {pendingActions.length} pending
                </Badge>
              )}

              {/* Heat Safety */}
              <Badge className={cn('text-xs', heatSafety.bg, heatSafety.color)}>
                <Thermometer className="h-3 w-3 mr-1" />
                {heatIndex}°F
              </Badge>

              {/* Sound Toggle */}
              <Button variant="outline" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>

              {/* Share */}
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Scoreboard */}
          <Card className="bg-gradient-to-r from-basketball-orange-500 to-basketball-green-500 text-white">
            <CardContent className="p-8">
              <div className="grid grid-cols-3 gap-8 items-center">
                {/* Home Team */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">{game.home_team?.name}</h2>
                  <div className="text-6xl font-bold mb-4">{scoreboardState.homeScore}</div>
                  <div className="flex justify-center space-x-4 text-sm">
                    <span>Fouls: {scoreboardState.homeFouls}</span>
                    <span>TO: {scoreboardState.homeTimeouts}</span>
                  </div>
                </div>

                {/* Game Clock */}
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{scoreboardState.timeRemaining}</div>
                  <div className="text-lg mb-4">Period {scoreboardState.period}</div>
                  <div className="flex justify-center space-x-2">
                    <Button
                      variant={scoreboardState.isRunning ? 'secondary' : 'default'}
                      size="sm"
                      onClick={toggleClock}
                      className="bg-white text-gray-900 hover:bg-gray-100"
                    >
                      {scoreboardState.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => changePeriod(scoreboardState.period + 1)}
                      className="bg-white text-gray-900 hover:bg-gray-100"
                    >
                      Next Period
                    </Button>
                  </div>
                </div>

                {/* Away Team */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">{game.away_team?.name}</h2>
                  <div className="text-6xl font-bold mb-4">{scoreboardState.awayScore}</div>
                  <div className="flex justify-center space-x-4 text-sm">
                    <span>Fouls: {scoreboardState.awayFouls}</span>
                    <span>TO: {scoreboardState.awayTimeouts}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Heat Safety Alert */}
          {heatSafety.level === 'danger' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn('p-4 rounded-lg border', heatSafety.bg, 'border-red-200')}
            >
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">Heat Warning - Dangerous Conditions</p>
                  <p className="text-sm text-red-700">
                    Heat index {heatIndex}°F. Implement mandatory water breaks every 6 minutes and consider shortened periods.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Scoring Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Home Team Scoring */}
            <ScoringPanel
              team="home"
              teamData={game.home_team!}
              onScore={(points, player) => addScore('home', points, player)}
              onFoul={(player) => addFoul('home', player)}
              onTimeout={() => addTimeout('home')}
              timeoutsRemaining={scoreboardState.homeTimeouts}
            />

            {/* Away Team Scoring */}
            <ScoringPanel
              team="away"
              teamData={game.away_team!}
              onScore={(points, player) => addScore('away', points, player)}
              onFoul={(player) => addFoul('away', player)}
              onTimeout={() => addTimeout('away')}
              timeoutsRemaining={scoreboardState.awayTimeouts}
            />
          </div>

          {/* Game Tabs */}
          <Tabs defaultValue="playbyplay" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="playbyplay">Play by Play</TabsTrigger>
              <TabsTrigger value="boxscore">Box Score</TabsTrigger>
              <TabsTrigger value="stats">Game Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="playbyplay">
              <PlayByPlayView events={playByPlay} />
            </TabsContent>

            <TabsContent value="boxscore">
              <BoxScoreView 
                homeTeam={game.home_team!}
                awayTeam={game.away_team!}
                boxScore={boxScore}
              />
            </TabsContent>

            <TabsContent value="stats">
              <GameStatsView game={game} scoreboard={scoreboardState} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  )
}

interface ScoringPanelProps {
  team: 'home' | 'away'
  teamData: Team
  onScore: (points: number, player?: Player) => void
  onFoul: (player?: Player) => void
  onTimeout: () => void
  timeoutsRemaining: number
}

function ScoringPanel({ team, teamData, onScore, onFoul, onTimeout, timeoutsRemaining }: ScoringPanelProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | undefined>()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{teamData.name}</span>
          <Badge variant={team === 'home' ? 'default' : 'secondary'}>
            {team === 'home' ? 'Home' : 'Away'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Player Selection */}
        <div className="space-y-2">
          <Label>Selected Player</Label>
          <Select value={selectedPlayer?.id} onValueChange={(playerId) => {
            // Find player by ID (mock for now)
            setSelectedPlayer(undefined)
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a player" />
            </SelectTrigger>
            <SelectContent>
              {/* Mock players */}
              <SelectItem value="player1">Player 1</SelectItem>
              <SelectItem value="player2">Player 2</SelectItem>
              <SelectItem value="player3">Player 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scoring Buttons */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Scoring</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                className="h-16 text-lg font-semibold"
                onClick={() => onScore(1, selectedPlayer)}
              >
                +1
              </Button>
              <Button 
                variant="outline" 
                className="h-16 text-lg font-semibold"
                onClick={() => onScore(2, selectedPlayer)}
              >
                +2
              </Button>
              <Button 
                variant="outline" 
                className="h-16 text-lg font-semibold"
                onClick={() => onScore(3, selectedPlayer)}
              >
                +3
              </Button>
            </div>
          </div>

          {/* Fouls and Timeouts */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="destructive" 
              className="h-12"
              onClick={() => onFoul(selectedPlayer)}
            >
              Foul
            </Button>
            <Button 
              variant="secondary" 
              className="h-12"
              onClick={onTimeout}
              disabled={timeoutsRemaining === 0}
            >
              Timeout ({timeoutsRemaining})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PlayByPlayView({ events }: { events: PlayByPlayEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Play by Play</CardTitle>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        <div className="space-y-2">
          <AnimatePresence>
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-xs">
                    Q{event.period} {event.time_remaining}
                  </Badge>
                  <span className="text-sm">{event.description}</span>
                </div>
                <div className="text-sm font-semibold">
                  {event.home_score} - {event.away_score}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {events.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No events recorded yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function BoxScoreView({ homeTeam, awayTeam, boxScore }: { 
  homeTeam: Team, 
  awayTeam: Team, 
  boxScore: { [playerId: string]: BoxScore } 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Box Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Box score will be available during the game</p>
        </div>
      </CardContent>
    </Card>
  )
}

function GameStatsView({ game, scoreboard }: { 
  game: GameWithTeams, 
  scoreboard: ScoreboardState 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold">{game.home_team?.name}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Points:</span>
                <span className="font-semibold">{scoreboard.homeScore}</span>
              </div>
              <div className="flex justify-between">
                <span>Team Fouls:</span>
                <span className="font-semibold">{scoreboard.homeFouls}</span>
              </div>
              <div className="flex justify-between">
                <span>Timeouts Remaining:</span>
                <span className="font-semibold">{scoreboard.homeTimeouts}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">{game.away_team?.name}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Points:</span>
                <span className="font-semibold">{scoreboard.awayScore}</span>
              </div>
              <div className="flex justify-between">
                <span>Team Fouls:</span>
                <span className="font-semibold">{scoreboard.awayFouls}</span>
              </div>
              <div className="flex justify-between">
                <span>Timeouts Remaining:</span>
                <span className="font-semibold">{scoreboard.awayTimeouts}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}