'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/simple-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/simple-ui'
import { Badge } from '@/components/simple-ui'
import { Input } from '@/components/simple-ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/simple-ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/simple-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/simple-ui'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/simple-ui'
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Trophy,
  BarChart3,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Star,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Activity,
  RefreshCw,
  Download,
  Settings,
  Shield,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database, Team, TeamWithPlayers, Player, PlayerWithTeam, League, User, AgeGroup } from '@/lib/supabase/types'

interface TeamFilters {
  league: string
  ageGroup: AgeGroup | 'all'
  search: string
  status: 'all' | 'active' | 'inactive' | 'suspended'
}

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-4">
      <Users className="h-12 w-12 mx-auto text-basketball-orange-500 animate-spin" />
      <p className="text-muted-foreground">Loading teams...</p>
    </div>
  </div>
)

export default function TeamsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [teams, setTeams] = useState<TeamWithPlayers[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedTeam, setSelectedTeam] = useState<TeamWithPlayers | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TeamFilters>({
    league: 'all',
    ageGroup: 'all',
    search: '',
    status: 'all'
  })

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchTeamsAndLeagues()
    }
  }, [user, filters])

  const fetchTeamsAndLeagues = async () => {
    try {
      setLoading(true)
      
      // Fetch leagues first
      const { data: leaguesData, error: leaguesError } = await supabase
        .from('leagues')
        .select('*')
        .order('name')

      if (leaguesError) throw leaguesError
      setLeagues(leaguesData || [])

      // Build teams query
      let teamsQuery = supabase
        .from('teams')
        .select(`
          *,
          coach:coach_id(name, email, phone_number),
          league:league_id(name, age_group),
          players:players(
            *,
            user:user_id(name, email)
          )
        `)
        .order('name')

      // Apply filters
      if (filters.league !== 'all') {
        teamsQuery = teamsQuery.eq('league_id', filters.league)
      }
      
      if (filters.ageGroup !== 'all') {
        teamsQuery = teamsQuery.eq('age_group', filters.ageGroup)
      }

      if (filters.status !== 'all') {
        teamsQuery = teamsQuery.eq('status', filters.status)
      }

      if (filters.search) {
        teamsQuery = teamsQuery.ilike('name', `%${filters.search}%`)
      }

      // Filter by user role
      if (user.role === 'coach') {
        teamsQuery = teamsQuery.eq('coach_id', user.id)
      } else if (user.role === 'parent' || user.role === 'player') {
        // Show teams the user is associated with
        const { data: userTeams } = await supabase
          .from('players')
          .select('team_id')
          .eq('user_id', user.id)
        
        if (userTeams && userTeams.length > 0) {
          teamsQuery = teamsQuery.in('id', userTeams.map(ut => ut.team_id).filter(Boolean))
        }
      }

      const { data: teamsData, error: teamsError } = await teamsQuery

      if (teamsError) throw teamsError
      setTeams(teamsData || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTeamStats = (team: TeamWithPlayers) => {
    const totalGames = team.wins + team.losses
    const winPercentage = totalGames > 0 ? (team.wins / totalGames * 100).toFixed(1) : '0.0'
    const pointDiff = team.points_for - team.points_against
    
    return {
      totalGames,
      winPercentage,
      pointDiff,
      avgPointsFor: totalGames > 0 ? (team.points_for / totalGames).toFixed(1) : '0.0',
      avgPointsAgainst: totalGames > 0 ? (team.points_against / totalGames).toFixed(1) : '0.0'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-600'
      case 'inactive':
        return 'bg-gray-100 text-gray-600'
      case 'suspended':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const canManageTeam = (team: Team) => {
    return user?.role === 'league-admin' || team.coach_id === user?.id
  }

  const canViewDetails = (team: Team) => {
    if (user?.role === 'league-admin' || user?.role === 'referee' || user?.role === 'scorekeeper') {
      return true
    }
    if (team.coach_id === user?.id) {
      return true
    }
    // Check if user is a player on this team
    return team.players?.some(player => player.user_id === user?.id)
  }

  if (authLoading || loading) {
    return <Loading />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
          <h1 className="text-xl font-semibold">Access Required</h1>
          <p className="text-muted-foreground">Please sign in to view teams.</p>
          <Button onClick={() => router.push('/login')}>Sign In</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
              <p className="mt-2 text-gray-600">
                Manage basketball teams and rosters
              </p>
            </div>
            
            {(user.role === 'league-admin' || user.role === 'coach') && (
              <Button asChild>
                <Link href="/teams/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Team
                </Link>
              </Button>
            )}
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
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search teams..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">League</label>
                  <Select
                    value={filters.league}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, league: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leagues</SelectItem>
                      {leagues.map((league) => (
                        <SelectItem key={league.id} value={league.id}>
                          {league.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Age Group</label>
                  <Select
                    value={filters.ageGroup}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, ageGroup: value as AgeGroup | 'all' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ages</SelectItem>
                      <SelectItem value="youth">Youth</SelectItem>
                      <SelectItem value="teen">Teen</SelectItem>
                      <SelectItem value="adult">Adult</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Actions</label>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon" onClick={fetchTeamsAndLeagues}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard 
                key={team.id} 
                team={team} 
                canManage={canManageTeam(team)}
                canView={canViewDetails(team)}
                onViewDetails={() => setSelectedTeam(team)}
              />
            ))}
          </div>

          {/* Empty State */}
          {teams.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No teams found</h3>
              <p className="text-gray-600 mb-6">
                {filters.search || filters.league !== 'all' || filters.ageGroup !== 'all' || filters.status !== 'all'
                  ? "Try adjusting your filters to see more teams"
                  : "Create your first team to get started"
                }
              </p>
              {(user.role === 'league-admin' || user.role === 'coach') && (
                <Button asChild>
                  <Link href="/teams/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Team
                  </Link>
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </main>

      {/* Team Details Modal */}
      <TeamDetailsModal 
        team={selectedTeam} 
        isOpen={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
        canManage={selectedTeam ? canManageTeam(selectedTeam) : false}
      />
    </div>
  )
}

interface TeamCardProps {
  team: TeamWithPlayers
  canManage: boolean
  canView: boolean
  onViewDetails: () => void
}

function TeamCard({ team, canManage, canView, onViewDetails }: TeamCardProps) {
  const stats = getTeamStats(team)

  const getTeamStats = (team: TeamWithPlayers) => {
    const totalGames = team.wins + team.losses
    const winPercentage = totalGames > 0 ? (team.wins / totalGames * 100).toFixed(1) : '0.0'
    const pointDiff = team.points_for - team.points_against
    
    return {
      totalGames,
      winPercentage,
      pointDiff,
      avgPointsFor: totalGames > 0 ? (team.points_for / totalGames).toFixed(1) : '0.0',
      avgPointsAgainst: totalGames > 0 ? (team.points_against / totalGames).toFixed(1) : '0.0'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-600'
      case 'inactive':
        return 'bg-gray-100 text-gray-600'
      case 'suspended':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full hover:shadow-lg transition-all duration-200">
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg",
                team.team_color || "bg-basketball-orange-500"
              )}>
                {team.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{team.name}</h3>
                <p className="text-sm text-gray-600">{team.league?.name}</p>
                <Badge className={cn('text-xs mt-1', getStatusColor(team.status))}>
                  {team.status}
                </Badge>
              </div>
            </div>
            {team.wins > team.losses && (
              <Star className="h-5 w-5 text-yellow-500" />
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Team Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{team.wins}</p>
              <p className="text-xs text-gray-600">Wins</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{team.losses}</p>
              <p className="text-xs text-gray-600">Losses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.winPercentage}%</p>
              <p className="text-xs text-gray-600">Win Rate</p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <Users className="h-4 w-4" />
              <span>{team.players?.length || 0} / {team.roster_size} players</span>
            </div>
            
            <div className="flex items-center space-x-2 text-gray-600">
              <Trophy className="h-4 w-4" />
              <span>Coached by {team.coach?.name}</span>
            </div>
            
            {team.home_venue && (
              <div className="flex items-center space-x-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{team.home_venue}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-gray-600">
              <BarChart3 className="h-4 w-4" />
              <span>
                {stats.pointDiff > 0 ? '+' : ''}{stats.pointDiff} point differential
              </span>
              {stats.pointDiff > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex space-x-2">
              {canView && (
                <Button variant="outline" size="sm" onClick={onViewDetails}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              )}
              
              {canManage && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/teams/${team.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            
            <Badge variant="outline" className="text-xs">
              {team.age_group}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface TeamDetailsModalProps {
  team: TeamWithPlayers | null
  isOpen: boolean
  onClose: () => void
  canManage: boolean
}

function TeamDetailsModal({ team, isOpen, onClose, canManage }: TeamDetailsModalProps) {
  if (!team) return null

  const stats = getTeamStats(team)

  const getTeamStats = (team: TeamWithPlayers) => {
    const totalGames = team.wins + team.losses
    const winPercentage = totalGames > 0 ? (team.wins / totalGames * 100).toFixed(1) : '0.0'
    const pointDiff = team.points_for - team.points_against
    
    return {
      totalGames,
      winPercentage,
      pointDiff,
      avgPointsFor: totalGames > 0 ? (team.points_for / totalGames).toFixed(1) : '0.0',
      avgPointsAgainst: totalGames > 0 ? (team.points_against / totalGames).toFixed(1) : '0.0'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
              team.team_color || "bg-basketball-orange-500"
            )}>
              {team.name.charAt(0)}
            </div>
            <div>
              <span>{team.name}</span>
              <p className="text-sm font-normal text-gray-600">{team.league?.name}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Trophy className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Coach:</span>
                      <span>{team.coach?.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Roster Size:</span>
                      <span>{team.players?.length || 0} / {team.roster_size}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Age Group:</span>
                      <span className="capitalize">{team.age_group}</span>
                    </div>
                    {team.home_venue && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">Home Venue:</span>
                        <span>{team.home_venue}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Season Record</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold text-green-600">{team.wins}</p>
                      <p className="text-sm text-gray-600">Wins</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-red-600">{team.losses}</p>
                      <p className="text-sm text-gray-600">Losses</p>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-lg font-semibold">{stats.winPercentage}% Win Rate</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {canManage && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <UserPlus className="h-6 w-6" />
                      <span className="text-xs">Add Player</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Calendar className="h-6 w-6" />
                      <span className="text-xs">Schedule</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <BarChart3 className="h-6 w-6" />
                      <span className="text-xs">Stats</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Settings className="h-6 w-6" />
                      <span className="text-xs">Settings</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="roster" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Team Roster</span>
                  {canManage && (
                    <Button size="sm">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Player
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {team.players && team.players.length > 0 ? (
                  <div className="space-y-4">
                    {team.players.map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-basketball-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {player.jersey_number || '?'}
                          </div>
                          <div>
                            <p className="font-medium">{player.user?.name}</p>
                            <p className="text-sm text-gray-600">
                              {player.position || 'No position'} • {player.height || 'Height not set'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={player.status === 'active' ? 'default' : 'secondary'}>
                          {player.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>No players on this team yet</p>
                    {canManage && (
                      <Button className="mt-4">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add First Player
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scoring Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Points For:</span>
                    <span className="font-semibold">{team.points_for}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Points Against:</span>
                    <span className="font-semibold">{team.points_against}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Point Differential:</span>
                    <span className={cn(
                      'font-semibold',
                      stats.pointDiff > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {stats.pointDiff > 0 ? '+' : ''}{stats.pointDiff}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Points Per Game:</span>
                    <span className="font-semibold">{stats.avgPointsFor}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Win Percentage:</span>
                    <span className="font-semibold">{stats.winPercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Games:</span>
                    <span className="font-semibold">{stats.totalGames}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>League Ranking:</span>
                    <span className="font-semibold">TBD</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}