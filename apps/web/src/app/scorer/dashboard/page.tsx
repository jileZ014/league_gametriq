'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// import { Progress } from '@/components/ui/progress' // Removed - component not available
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ClipboardList,
  Play,
  Pause,
  Timer,
  Users,
  Activity,
  Wifi,
  WifiOff,
  Bell,
  LogOut,
  TrendingUp,
  Target,
  Zap,
  AlertCircle
} from 'lucide-react'

export default function ScorerDashboard() {
  const router = useRouter()
  const { user, userRole, signOut, isDemo } = useAuth()
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Check authentication and role
    if (!isDemo && !user) {
      router.push('/login')
    } else if (!isDemo && userRole && !['scorer', 'scorekeeper'].includes(userRole)) {
      router.push(`/${userRole}/dashboard`)
    }

    // Monitor online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user, userRole, isDemo, router])

  // Mock data for demonstration
  const todaysGames = [
    {
      id: 1,
      time: '6:00 PM',
      teams: { home: 'Phoenix Suns Jr.', away: 'Lakers Jr.' },
      venue: 'Court 1',
      division: 'U14',
      status: 'live',
      score: { home: 45, away: 42 },
      quarter: 3,
      timeRemaining: '5:23'
    },
    {
      id: 2,
      time: '7:30 PM',
      teams: { home: 'Warriors Youth', away: 'Celtics Youth' },
      venue: 'Court 2',
      division: 'U12',
      status: 'upcoming',
      score: { home: 0, away: 0 }
    },
    {
      id: 3,
      time: '9:00 PM',
      teams: { home: 'Spurs Academy', away: 'Heat Academy' },
      venue: 'Court 1',
      division: 'U16',
      status: 'upcoming',
      score: { home: 0, away: 0 }
    }
  ]

  const recentGames = [
    {
      id: 1,
      teams: 'Suns Jr. 68 - 62 Lakers Jr.',
      date: 'Yesterday',
      stats: { fouls: 18, timeouts: 8, duration: '1h 45m' }
    },
    {
      id: 2,
      teams: 'Warriors 55 - 58 Celtics',
      date: '2 days ago',
      stats: { fouls: 22, timeouts: 10, duration: '1h 52m' }
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-blue-500" />
              Scorekeeper Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track live games and manage statistics
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-600">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-orange-500" />
                  <span className="text-sm text-orange-600">Offline Mode</span>
                </>
              )}
            </div>
            {isDemo && (
              <Badge variant="outline" className="py-2 px-4">
                Demo Mode
              </Badge>
            )}
            <Button variant="outline" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button onClick={signOut} variant="ghost">
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Games Today</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Live Now</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
                <Activity className="h-8 w-8 text-red-500 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">This Week</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Game Time</p>
                  <p className="text-2xl font-bold">1h 48m</p>
                </div>
                <Timer className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Game Alert */}
        {todaysGames.some(g => g.status === 'live') && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-100">LIVE GAME IN PROGRESS</p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Phoenix Suns Jr. vs Lakers Jr. - Q3, 5:23 remaining
                    </p>
                  </div>
                </div>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Play className="h-4 w-4 mr-2" />
                  Continue Scoring
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Games - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Today's Games</CardTitle>
                <CardDescription>Games you're assigned to score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todaysGames.map((game) => (
                    <div key={game.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={
                              game.status === 'live' ? 'destructive' : 
                              game.status === 'upcoming' ? 'secondary' : 'default'
                            }>
                              {game.status === 'live' ? 'LIVE' : game.status.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{game.division}</Badge>
                            <span className="text-sm text-gray-500">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {game.time}
                            </span>
                          </div>
                          
                          {/* Score Display */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${game.status === 'live' && game.score.home > game.score.away ? 'text-green-600' : ''}`}>
                                {game.teams.home}
                              </span>
                              <span className="text-2xl font-bold">{game.score.home}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${game.status === 'live' && game.score.away > game.score.home ? 'text-green-600' : ''}`}>
                                {game.teams.away}
                              </span>
                              <span className="text-2xl font-bold">{game.score.away}</span>
                            </div>
                          </div>

                          {game.status === 'live' && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Quarter {game.quarter}</span>
                                <span className="font-mono">{game.timeRemaining}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{width: '75%'}} />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center mt-3 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-1" />
                            {game.venue}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {game.status === 'live' ? (
                            <Button size="sm" className="bg-red-600 hover:bg-red-700">
                              <Pause className="h-4 w-4 mr-1" />
                              Scoring
                            </Button>
                          ) : game.status === 'upcoming' ? (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Games */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Games</CardTitle>
                <CardDescription>Games you've scored this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentGames.map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{game.teams}</p>
                        <p className="text-sm text-gray-500">{game.date}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          <Target className="h-4 w-4 inline mr-1" />
                          {game.stats.fouls} fouls
                        </span>
                        <span>
                          <Pause className="h-4 w-4 inline mr-1" />
                          {game.stats.timeouts} TOs
                        </span>
                        <span>
                          <Timer className="h-4 w-4 inline mr-1" />
                          {game.stats.duration}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions & Tips */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4 mr-2" />
                  Start New Game
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Practice Mode
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Activity className="h-4 w-4 mr-2" />
                  Statistics Report
                </Button>
              </CardContent>
            </Card>

            {/* Offline Sync Status */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Status</CardTitle>
                <CardDescription>Offline data management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Unsync'd Games</span>
                    <Badge variant={isOnline ? "default" : "secondary"}>
                      0
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Sync</span>
                    <span className="text-sm text-gray-500">2 min ago</span>
                  </div>
                  <Button variant="outline" className="w-full" disabled={!isOnline}>
                    <Zap className="h-4 w-4 mr-2" />
                    Force Sync
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scoring Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Scoring Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                    <p>Use keyboard shortcuts for faster scoring (Space = Start/Stop)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                    <p>Enable offline mode before entering gyms with poor connectivity</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                    <p>Double-tap player numbers for quick foul recording</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}