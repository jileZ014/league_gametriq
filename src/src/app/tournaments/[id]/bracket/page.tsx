'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Button } from '@/components/simple-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/simple-ui'
import { Badge } from '@/components/simple-ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/simple-ui'
import { Separator } from '@/components/simple-ui'
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  Share2,
  Download,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Target,
  Star,
  Award,
  CheckCircle,
  AlertCircle,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database, Tournament, TournamentWithTeams, Team, Game, GameWithTeams } from '@/lib/supabase/types'

interface TournamentPageProps {
  params: {
    id: string
  }
}

interface BracketMatch {
  id: string
  round: number
  position: number
  team1?: Team
  team2?: Team
  winner?: Team
  score1?: number
  score2?: number
  status: 'upcoming' | 'live' | 'completed'
  game_id?: string
  scheduled_at?: string
}

interface BracketData {
  matches: BracketMatch[]
  rounds: number
  type: 'single_elimination' | 'double_elimination' | 'round_robin'
}

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-4">
      <Trophy className="h-12 w-12 mx-auto text-basketball-orange-500 animate-spin" />
      <p className="text-muted-foreground">Loading tournament...</p>
    </div>
  </div>
)

export default function TournamentBracketPage({ params }: TournamentPageProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tournament, setTournament] = useState<TournamentWithTeams | null>(null)
  const [bracketData, setBracketData] = useState<BracketData | null>(null)
  const [liveGames, setLiveGames] = useState<GameWithTeams[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient<Database>()

  // WebSocket for real-time updates
  const { isConnected, lastMessage } = useWebSocket(
    `wss://your-websocket-url/tournaments/${params.id}`,
    {
      onMessage: (data) => {
        if (data.type === 'bracket_update') {
          setBracketData(data.bracket)
        } else if (data.type === 'game_update') {
          setLiveGames(prev => prev.map(game => 
            game.id === data.game.id ? data.game : game
          ))
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
      fetchTournamentData()
    }
  }, [user, params.id])

  const fetchTournamentData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          *,
          league:league_id(name, age_group),
          participating_teams:teams(*)
        `)
        .eq('id', params.id)
        .single()

      if (tournamentError) throw tournamentError
      if (!tournamentData) throw new Error('Tournament not found')

      setTournament(tournamentData)

      // Fetch bracket data and games
      const [bracketResult, gamesResult] = await Promise.all([
        fetchBracketData(tournamentData),
        fetchLiveGames(tournamentData.id)
      ])

      setBracketData(bracketResult)
      setLiveGames(gamesResult)
    } catch (error: any) {
      console.error('Error fetching tournament data:', error)
      setError(error.message || 'Failed to load tournament')
    } finally {
      setLoading(false)
    }
  }

  const fetchBracketData = async (tournament: Tournament): Promise<BracketData> => {
    // Mock bracket generation based on tournament type
    const teams = tournament.teams || []
    const bracketType = tournament.tournament_type

    if (bracketType === 'single_elimination') {
      return generateSingleEliminationBracket(teams, tournament.bracket_data)
    } else if (bracketType === 'round_robin') {
      return generateRoundRobinBracket(teams, tournament.bracket_data)
    }
    
    // Default single elimination
    return generateSingleEliminationBracket(teams, tournament.bracket_data)
  }

  const fetchLiveGames = async (tournamentId: string): Promise<GameWithTeams[]> => {
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        home_team:home_team_id(*),
        away_team:away_team_id(*)
      `)
      .eq('status', 'live')
      .eq('game_type', 'tournament')
      // Add tournament filter when available
      .order('scheduled_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  const generateSingleEliminationBracket = (teamIds: string[], bracketJson: any): BracketData => {
    const teams = tournament?.participating_teams || []
    const numTeams = teams.length
    const rounds = Math.ceil(Math.log2(numTeams))
    const matches: BracketMatch[] = []

    // Generate matches for each round
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round)
      
      for (let position = 0; position < matchesInRound; position++) {
        const match: BracketMatch = {
          id: `round-${round}-match-${position}`,
          round,
          position,
          status: round === 1 ? 'upcoming' : 'upcoming',
        }

        // First round: assign teams
        if (round === 1) {
          const team1Index = position * 2
          const team2Index = position * 2 + 1
          
          if (team1Index < teams.length) {
            match.team1 = teams[team1Index]
          }
          if (team2Index < teams.length) {
            match.team2 = teams[team2Index]
          }
        }

        matches.push(match)
      }
    }

    return {
      matches,
      rounds,
      type: 'single_elimination'
    }
  }

  const generateRoundRobinBracket = (teamIds: string[], bracketJson: any): BracketData => {
    const teams = tournament?.participating_teams || []
    const matches: BracketMatch[] = []
    let matchId = 0

    // Generate all possible team combinations
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: `match-${matchId++}`,
          round: 1, // Round robin has only one "round" conceptually
          position: matchId,
          team1: teams[i],
          team2: teams[j],
          status: 'upcoming'
        })
      }
    }

    return {
      matches,
      rounds: 1,
      type: 'round_robin'
    }
  }

  const getMatchStatus = (match: BracketMatch) => {
    switch (match.status) {
      case 'live':
        return <Badge className="bg-green-100 text-green-600">Live</Badge>
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-600">Final</Badge>
      default:
        return <Badge variant="outline">Upcoming</Badge>
    }
  }

  const canManageTournament = () => {
    return user?.role === 'league-admin' || tournament?.created_by === user?.id
  }

  if (authLoading || loading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
          <h1 className="text-xl font-semibold">Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/tournaments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournaments
          </Button>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Trophy className="h-12 w-12 mx-auto text-gray-400" />
          <h1 className="text-xl font-semibold">Tournament Not Found</h1>
          <p className="text-muted-foreground">The tournament you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/tournaments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournaments
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push('/tournaments')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <Badge className={cn(
                    'text-xs',
                    tournament.status === 'in_progress' ? 'bg-green-100 text-green-600' :
                    tournament.status === 'completed' ? 'bg-purple-100 text-purple-600' :
                    'bg-blue-100 text-blue-600'
                  )}>
                    {tournament.status === 'in_progress' && <Zap className="h-3 w-3 mr-1" />}
                    {tournament.status === 'completed' && <Trophy className="h-3 w-3 mr-1" />}
                    {tournament.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {tournament.tournament_type.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                  {isConnected && (
                    <Badge variant="outline" className="text-xs">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                      Live Updates
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              {canManageTournament() && (
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Tournament Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Tournament Dates</p>
                    <p className="text-sm text-gray-600">
                      {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Venue</p>
                    <p className="text-sm text-gray-600">{tournament.venue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Teams</p>
                    <p className="text-sm text-gray-600">
                      {tournament.teams?.length || 0} / {tournament.max_teams} registered
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Games */}
          {liveGames.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Play className="h-5 w-5 text-green-600" />
                  <span>Live Games</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {liveGames.map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="font-semibold">{game.home_team?.name}</p>
                          <p className="text-2xl font-bold">{game.home_score}</p>
                        </div>
                        <div className="text-center">
                          <Badge className="bg-green-500 text-white">
                            Q{game.period} {game.time_remaining}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{game.away_team?.name}</p>
                          <p className="text-2xl font-bold">{game.away_score}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/games/${game.id}/score`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Watch
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tournament Tabs */}
          <Tabs defaultValue="bracket" className="space-y-6">
            <TabsList>
              <TabsTrigger value="bracket">Bracket</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="bracket" className="space-y-6">
              <BracketView bracketData={bracketData} tournament={tournament} />
            </TabsContent>

            <TabsContent value="teams" className="space-y-6">
              <TeamsView teams={tournament.participating_teams || []} />
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <ScheduleView tournamentId={tournament.id} />
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <ResultsView tournamentId={tournament.id} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  )
}

// Bracket View Component
function BracketView({ bracketData, tournament }: { bracketData: BracketData | null, tournament: Tournament }) {
  if (!bracketData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Target className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Bracket Not Ready</h3>
          <p className="text-gray-600">The tournament bracket will be available once registration closes.</p>
        </CardContent>
      </Card>
    )
  }

  if (bracketData.type === 'round_robin') {
    return <RoundRobinView matches={bracketData.matches} />
  }

  return <SingleEliminationView matches={bracketData.matches} rounds={bracketData.rounds} />
}

// Single Elimination Bracket Component
function SingleEliminationView({ matches, rounds }: { matches: BracketMatch[], rounds: number }) {
  const getMatchesByRound = (round: number) => {
    return matches.filter(match => match.round === round)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Single Elimination Bracket</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex space-x-8 min-w-max p-4">
            {Array.from({ length: rounds }, (_, roundIndex) => {
              const round = roundIndex + 1
              const roundMatches = getMatchesByRound(round)
              
              return (
                <div key={round} className="space-y-6">
                  <h3 className="text-center font-semibold text-gray-900">
                    {round === rounds ? 'Final' : round === rounds - 1 ? 'Semi-Final' : `Round ${round}`}
                  </h3>
                  <div className="space-y-8">
                    {roundMatches.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Round Robin View Component
function RoundRobinView({ matches }: { matches: BracketMatch[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Round Robin Matches</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Match Card Component
function MatchCard({ match }: { match: BracketMatch }) {
  const getStatusBadge = () => {
    switch (match.status) {
      case 'live':
        return <Badge className="bg-green-100 text-green-600">Live</Badge>
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-600">Final</Badge>
      default:
        return <Badge variant="outline">Upcoming</Badge>
    }
  }

  return (
    <Card className="w-64">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            {getStatusBadge()}
            {match.scheduled_at && (
              <span className="text-xs text-gray-500">
                {new Date(match.scheduled_at).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            <div className={cn(
              "flex items-center justify-between p-2 rounded",
              match.winner?.id === match.team1?.id ? "bg-green-50 border border-green-200" : "bg-gray-50"
            )}>
              <span className="font-medium">
                {match.team1?.name || 'TBD'}
              </span>
              {match.status === 'completed' && (
                <span className="font-bold">{match.score1}</span>
              )}
            </div>
            
            <div className={cn(
              "flex items-center justify-between p-2 rounded",
              match.winner?.id === match.team2?.id ? "bg-green-50 border border-green-200" : "bg-gray-50"
            )}>
              <span className="font-medium">
                {match.team2?.name || 'TBD'}
              </span>
              {match.status === 'completed' && (
                <span className="font-bold">{match.score2}</span>
              )}
            </div>
          </div>
          
          {match.game_id && (
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={`/games/${match.game_id}/score`}>
                <Eye className="mr-2 h-4 w-4" />
                View Game
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Teams View Component
function TeamsView({ teams }: { teams: Team[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Participating Teams</CardTitle>
        <CardDescription>Teams registered for this tournament</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
                    team.team_color || "bg-basketball-orange-500"
                  )}>
                    {team.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{team.name}</p>
                    <p className="text-sm text-gray-600">
                      {team.wins}-{team.losses} record
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Schedule View Component
function ScheduleView({ tournamentId }: { tournamentId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Schedule</CardTitle>
        <CardDescription>Upcoming and completed matches</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Schedule will be available once the bracket is set</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Results View Component
function ResultsView({ tournamentId }: { tournamentId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Results</CardTitle>
        <CardDescription>Match results and standings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <Award className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Results will appear as matches are completed</p>
        </div>
      </CardContent>
    </Card>
  )
}