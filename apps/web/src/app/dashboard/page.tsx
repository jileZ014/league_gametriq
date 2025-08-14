'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Basketball,
  Users,
  Trophy,
  BarChart3,
  Clock,
  Shield,
  Bell,
  Settings,
  LogOut,
  Calendar,
  MapPin,
  Thermometer,
  AlertTriangle,
  Plus,
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  FileText,
  DollarSign,
  UserCheck,
  Target,
  RefreshCw,
  ArrowRight,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database, League, Team, Game, Tournament } from '@/lib/supabase/types'

interface DashboardStats {
  totalLeagues: number
  totalTeams: number
  totalPlayers: number
  activeGames: number
  activeTournaments: number
  totalRevenue: number
  weeklyGrowth: number
  monthlyGrowth: number
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: any
  href: string
  color: string
  bgColor: string
}

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-4">
      <Basketball className="h-12 w-12 mx-auto text-basketball-orange-500 animate-spin" />
      <p className="text-muted-foreground">Loading dashboard...</p>
    </div>
  </div>
)

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return <Suspense fallback={<Loading />}>{children}</Suspense>
}

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalLeagues: 0,
    totalTeams: 0,
    totalPlayers: 0,
    activeGames: 0,
    activeTournaments: 0,
    totalRevenue: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
  })
  const [recentLeagues, setRecentLeagues] = useState<League[]>([])
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([])
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTemp, setCurrentTemp] = useState(105)
  const [heatIndex, setHeatIndex] = useState(112)

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    // Phoenix heat monitoring
    const interval = setInterval(() => {
      setCurrentTemp(prev => Math.max(85, Math.min(120, prev + Math.floor(Math.random() * 6) - 3)))
      setHeatIndex(prev => Math.max(90, Math.min(130, prev + Math.floor(Math.random() * 8) - 4)))
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch dashboard statistics
      const [
        { count: leagueCount },
        { count: teamCount },
        { count: playerCount },
        { data: games },
        { data: tournaments },
        { data: leagues }
      ] = await Promise.all([
        supabase.from('leagues').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('players').select('*', { count: 'exact', head: true }),
        supabase
          .from('games')
          .select('*, home_team:home_team_id(name), away_team:away_team_id(name)')
          .eq('status', 'live')
          .order('scheduled_at', { ascending: true })
          .limit(5),
        supabase
          .from('tournaments')
          .select('*, league:league_id(name)')
          .in('status', ['registration', 'bracket_set', 'in_progress'])
          .order('start_date', { ascending: true })
          .limit(5),
        supabase
          .from('leagues')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)
      ])

      setStats({
        totalLeagues: leagueCount || 0,
        totalTeams: teamCount || 0,
        totalPlayers: playerCount || 0,
        activeGames: games?.length || 0,
        activeTournaments: tournaments?.filter(t => t.status === 'in_progress').length || 0,
        totalRevenue: 25400, // Mock data
        weeklyGrowth: 12.5,
        monthlyGrowth: 28.7,
      })

      setRecentLeagues(leagues || [])
      setUpcomingGames(games || [])
      setActiveTournaments(tournaments || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHeatSafetyLevel = (heatIndex: number) => {
    if (heatIndex < 90) return { level: 'safe', color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' }
    if (heatIndex < 100) return { level: 'caution', color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-200' }
    if (heatIndex < 110) return { level: 'warning', color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' }
    return { level: 'danger', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' }
  }

  const heatSafety = getHeatSafetyLevel(heatIndex)

  const quickActions: QuickAction[] = [
    {
      id: 'create-league',
      title: 'Create League',
      description: 'Start a new basketball league',
      icon: Trophy,
      href: '/admin/leagues/create',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      id: 'manage-teams',
      title: 'Manage Teams',
      description: 'View and organize teams',
      icon: Users,
      href: '/teams',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      id: 'schedule-games',
      title: 'Schedule Games',
      description: 'Create game schedules',
      icon: Calendar,
      href: '/admin/games/schedule',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      id: 'create-tournament',
      title: 'Create Tournament',
      description: 'Set up new tournaments',
      icon: Target,
      href: '/tournaments/create',
      color: 'text-basketball-orange-600',
      bgColor: 'bg-basketball-orange-100',
    },
    {
      id: 'generate-reports',
      title: 'Generate Reports',
      description: 'Analytics and statistics',
      icon: BarChart3,
      href: '/reports',
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
    },
    {
      id: 'manage-users',
      title: 'Manage Users',
      description: 'User administration',
      icon: UserCheck,
      href: '/admin/users',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  ]

  if (authLoading || loading) {
    return <Loading />
  }

  if (!user || user.role !== 'league-admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this dashboard.</p>
          <Button onClick={() => router.push('/')}>Return Home</Button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    League Administration
                  </h1>
                  <p className="text-sm text-gray-500 hidden sm:block">
                    Manage leagues, teams, and tournaments
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Phoenix Heat Safety Indicator */}
                <div className={cn(
                  'hidden md:flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium',
                  heatSafety.bg,
                  heatSafety.color
                )}>
                  <Thermometer className="h-3 w-3" />
                  <span>{heatIndex}°F Heat Index</span>
                </div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </Button>

                {/* Settings */}
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>

                {/* Profile Menu */}
                <div className="flex items-center space-x-2">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className="text-gray-500 hover:text-red-600"
                    title="Sign Out"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome back, {user.name.split(' ')[0]}!
              </h2>
              <p className="text-gray-600">
                Here's an overview of your basketball league operations.
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Leagues</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalLeagues}</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{stats.weeklyGrowth}% this week
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Trophy className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Teams</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalTeams}</p>
                      <p className="text-xs text-blue-600 flex items-center mt-1">
                        <Users className="h-3 w-3 mr-1" />
                        All active
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Players</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalPlayers}</p>
                      <p className="text-xs text-basketball-orange-600 flex items-center mt-1">
                        <Basketball className="h-3 w-3 mr-1" />
                        Registered
                      </p>
                    </div>
                    <div className="p-3 bg-basketball-orange-100 rounded-full">
                      <Basketball className="h-6 w-6 text-basketball-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Revenue</p>
                      <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{stats.monthlyGrowth}% this month
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Quick Actions</span>
                </CardTitle>
                <CardDescription>
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {quickActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="h-20 flex-col space-y-2 hover:shadow-md transition-all"
                      asChild
                    >
                      <Link href={action.href}>
                        <div className={cn('p-2 rounded-full', action.bgColor)}>
                          <action.icon className={cn('h-5 w-5', action.color)} />
                        </div>
                        <span className="text-xs text-center">{action.title}</span>
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dashboard Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="leagues">Leagues</TabsTrigger>
                <TabsTrigger value="games">Live Games</TabsTrigger>
                <TabsTrigger value="safety">Safety</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Leagues */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <Trophy className="h-5 w-5" />
                          <span>Recent Leagues</span>
                        </span>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/admin/leagues">
                            View All
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {recentLeagues.length > 0 ? (
                        recentLeagues.map((league) => (
                          <div key={league.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{league.name}</p>
                              <p className="text-sm text-gray-600">{league.season} • {league.age_group}</p>
                              <Badge variant={league.status === 'active' ? 'default' : 'secondary'}>
                                {league.status}
                              </Badge>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No leagues created yet</p>
                          <Button className="mt-4" asChild>
                            <Link href="/admin/leagues/create">Create First League</Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Active Tournaments */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <Target className="h-5 w-5" />
                          <span>Active Tournaments</span>
                        </span>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/tournaments">
                            View All
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {activeTournaments.length > 0 ? (
                        activeTournaments.map((tournament) => (
                          <div key={tournament.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{tournament.name}</p>
                              <p className="text-sm text-gray-600">{tournament.tournament_type.replace('_', ' ')}</p>
                              <Badge variant={tournament.status === 'in_progress' ? 'default' : 'secondary'}>
                                {tournament.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/tournaments/${tournament.id}/bracket`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No active tournaments</p>
                          <Button className="mt-4" asChild>
                            <Link href="/tournaments/create">Create Tournament</Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="leagues" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>League Management</CardTitle>
                    <CardDescription>Manage all basketball leagues</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold mb-2">League Management</h3>
                      <p className="text-gray-600 mb-4">Create and manage basketball leagues for different age groups</p>
                      <Button asChild>
                        <Link href="/admin/leagues">Go to League Management</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="games" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Live Games</span>
                    </CardTitle>
                    <CardDescription>Currently active games</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {upcomingGames.length > 0 ? (
                      <div className="space-y-4">
                        {upcomingGames.map((game) => (
                          <div key={game.id} className="flex items-center justify-between p-4 bg-basketball-orange-50 rounded-lg border">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4">
                                <div className="text-center">
                                  <p className="font-semibold">{game.home_team?.name || 'Home Team'}</p>
                                  <p className="text-2xl font-bold">{game.home_score}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-gray-600">vs</p>
                                  <Badge variant="game-live">Q{game.period}</Badge>
                                </div>
                                <div className="text-center">
                                  <p className="font-semibold">{game.away_team?.name || 'Away Team'}</p>
                                  <p className="text-2xl font-bold">{game.away_score}</p>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {game.venue}
                                </span>
                                <span className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {game.time_remaining || 'In Progress'}
                                </span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/games/${game.id}/score`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Basketball className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No live games</p>
                        <p>All games are completed or upcoming</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="safety" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Thermometer className="h-5 w-5" />
                      <span>Phoenix Heat Safety Monitor</span>
                    </CardTitle>
                    <CardDescription>Real-time weather monitoring and safety protocols</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center p-6 bg-gray-50 rounded-lg">
                        <p className="text-3xl font-bold text-gray-900">{currentTemp}°F</p>
                        <p className="text-sm text-gray-600">Current Temperature</p>
                      </div>
                      <div className="text-center p-6 bg-gray-50 rounded-lg">
                        <p className="text-3xl font-bold text-gray-900">{heatIndex}°F</p>
                        <p className="text-sm text-gray-600">Heat Index</p>
                      </div>
                    </div>

                    <div className={cn(
                      'p-6 rounded-lg border',
                      heatSafety.bg,
                      heatSafety.border
                    )}>
                      <div className="flex items-center space-x-3 mb-4">
                        {heatSafety.level === 'danger' ? (
                          <AlertTriangle className={cn('h-6 w-6', heatSafety.color)} />
                        ) : (
                          <Shield className={cn('h-6 w-6', heatSafety.color)} />
                        )}
                        <h3 className={cn('text-lg font-semibold', heatSafety.color)}>
                          {heatSafety.level.toUpperCase()} CONDITIONS
                        </h3>
                      </div>
                      
                      <div className={cn('space-y-2 text-sm', heatSafety.color)}>
                        <p className="font-medium">Recommended Safety Protocols:</p>
                        <ul className="space-y-1 ml-4">
                          <li>• Water breaks every 6-8 minutes</li>
                          <li>• Mandatory shade between activities</li>
                          <li>• Monitor players for heat exhaustion</li>
                          <li>• Ice towels and cooling stations available</li>
                          {heatSafety.level === 'danger' && (
                            <>
                              <li>• Consider postponing outdoor activities</li>
                              <li>• Shortened game periods strongly recommended</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="flex items-center">
                        <Activity className="h-4 w-4 mr-2" />
                        Last updated: {new Date().toLocaleTimeString()}
                      </span>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>
      </div>
    </ErrorBoundary>
  )
}