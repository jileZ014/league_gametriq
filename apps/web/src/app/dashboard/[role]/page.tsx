'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Star,
  Target,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardPageProps {
  params: {
    role: string
  }
}

type UserRole = 'league-admin' | 'coach' | 'parent' | 'player' | 'referee' | 'scorekeeper'

const roleConfig = {
  'league-admin': {
    title: 'League Administrator Dashboard',
    description: 'Manage leagues, teams, and tournaments',
    color: 'text-purple-600',
    bgGradient: 'from-purple-500 to-indigo-600',
    icon: Trophy,
  },
  'coach': {
    title: 'Coach Dashboard',
    description: 'Manage your team and players',
    color: 'text-basketball-orange-600',
    bgGradient: 'from-basketball-orange-500 to-red-500',
    icon: Users,
  },
  'parent': {
    title: 'Parent Dashboard',
    description: "Follow your child's basketball journey",
    color: 'text-basketball-green-600',
    bgGradient: 'from-basketball-green-500 to-teal-500',
    icon: Shield,
  },
  'player': {
    title: 'Player Dashboard',
    description: 'Track your stats and team progress',
    color: 'text-blue-600',
    bgGradient: 'from-blue-500 to-cyan-500',
    icon: Basketball,
  },
  'referee': {
    title: 'Referee Dashboard',
    description: 'Manage your officiating schedule',
    color: 'text-gray-600',
    bgGradient: 'from-gray-500 to-slate-600',
    icon: BarChart3,
  },
  'scorekeeper': {
    title: 'Scorekeeper Dashboard',
    description: 'Record and manage game statistics',
    color: 'text-teal-600',
    bgGradient: 'from-teal-500 to-green-500',
    icon: Clock,
  },
}

export default function RoleDashboard({ params }: DashboardPageProps) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const [currentTemp, setCurrentTemp] = useState(105)
  const [heatIndex, setHeatIndex] = useState(112)
  
  const role = params.role as UserRole
  const config = roleConfig[role]

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    // Simulate temperature updates for Phoenix heat safety
    const interval = setInterval(() => {
      setCurrentTemp(prev => prev + Math.floor(Math.random() * 6) - 3)
      setHeatIndex(prev => prev + Math.floor(Math.random() * 8) - 4)
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Basketball className="h-12 w-12 mx-auto text-basketball-orange-500 animate-basketball-spin" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
          <h1 className="text-xl font-semibold">Invalid Dashboard</h1>
          <p className="text-muted-foreground">This dashboard role is not recognized.</p>
          <Button onClick={() => router.push('/')}>Return Home</Button>
        </div>
      </div>
    )
  }

  const getHeatSafetyLevel = (heatIndex: number) => {
    if (heatIndex < 90) return { level: 'safe', color: 'text-green-600', bg: 'bg-green-100' }
    if (heatIndex < 100) return { level: 'caution', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (heatIndex < 110) return { level: 'warning', color: 'text-orange-600', bg: 'bg-orange-100' }
    return { level: 'danger', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const heatSafety = getHeatSafetyLevel(heatIndex)

  const IconComponent = config.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className={cn(
                'p-2 rounded-lg bg-gradient-to-r text-white',
                config.bgGradient
              )}>
                <IconComponent className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {config.title}
                </h1>
                <p className="text-sm text-gray-500 hidden sm:block">
                  {config.description}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Heat Safety Indicator for Phoenix */}
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
                  <p className="text-xs text-gray-500 capitalize">{user.role.replace('-', ' ')}</p>
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
              Here's what's happening with your basketball activities today.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Games Today</p>
                    <p className="text-3xl font-bold text-gray-900">3</p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +2 from yesterday
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
                    <p className="text-sm font-medium text-gray-600">Teams/Players</p>
                    <p className="text-3xl font-bold text-gray-900">12</p>
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
                    <p className="text-sm font-medium text-gray-600">Current Temp</p>
                    <p className="text-3xl font-bold text-gray-900">{currentTemp}°F</p>
                    <div className={cn(
                      'text-xs flex items-center mt-1',
                      heatSafety.color
                    )}>
                      <Thermometer className="h-3 w-3 mr-1" />
                      {heatSafety.level.toUpperCase()}
                    </div>
                  </div>
                  <div className={cn(
                    'p-3 rounded-full',
                    heatSafety.bg
                  )}>
                    <Thermometer className={cn('h-6 w-6', heatSafety.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Notifications</p>
                    <p className="text-3xl font-bold text-gray-900">3</p>
                    <p className="text-xs text-yellow-600 flex items-center mt-1">
                      <Bell className="h-3 w-3 mr-1" />
                      1 urgent
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Bell className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Today's Schedule</span>
                </CardTitle>
                <CardDescription>
                  Your basketball activities for today
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-basketball-orange-50 rounded-lg">
                    <div className="p-1 bg-basketball-orange-500 rounded-full">
                      <Clock className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Eagles vs Hawks</p>
                      <p className="text-sm text-gray-600">4:00 PM • Main Gym Court A</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="game-live">Live</Badge>
                        <Badge variant="outline">Q2 8:45</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-gray-400 rounded-full">
                      <Clock className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Team Practice</p>
                      <p className="text-sm text-gray-600">6:00 PM • Practice Court B</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="game-scheduled">Scheduled</Badge>
                        <Badge variant="heat-orange">Heat Warning</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="p-1 bg-blue-500 rounded-full">
                      <Trophy className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Tournament Meeting</p>
                      <p className="text-sm text-gray-600">7:30 PM • Conference Room</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">Planning</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Event
                </Button>
              </CardContent>
            </Card>

            {/* Phoenix Heat Safety */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Thermometer className="h-5 w-5" />
                  <span>Phoenix Heat Safety</span>
                </CardTitle>
                <CardDescription>
                  Real-time weather monitoring and safety protocols
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{currentTemp}°F</p>
                    <p className="text-xs text-gray-600">Temperature</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{heatIndex}°F</p>
                    <p className="text-xs text-gray-600">Heat Index</p>
                  </div>
                </div>

                <div className={cn(
                  'p-4 rounded-lg border',
                  heatSafety.bg,
                  heatSafety.level === 'danger' ? 'border-red-200' : 'border-orange-200'
                )}>
                  <div className="flex items-center space-x-2 mb-2">
                    {heatSafety.level === 'danger' ? (
                      <AlertTriangle className={cn('h-5 w-5', heatSafety.color)} />
                    ) : (
                      <Shield className={cn('h-5 w-5', heatSafety.color)} />
                    )}
                    <p className={cn('font-semibold text-sm', heatSafety.color)}>
                      {heatSafety.level.toUpperCase()} CONDITIONS
                    </p>
                  </div>
                  <ul className={cn('text-xs space-y-1', heatSafety.color)}>
                    <li>• Water breaks every 6-8 minutes</li>
                    <li>• Mandatory shade between activities</li>
                    <li>• Shortened game periods recommended</li>
                    {heatSafety.level === 'danger' && (
                      <li>• Consider postponing outdoor activities</li>
                    )}
                  </ul>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center">
                    <Activity className="h-3 w-3 mr-1" />
                    Last updated: {new Date().toLocaleTimeString()}
                  </span>
                  <Button variant="ghost" size="sm">
                    View Protocols
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Common tasks for your role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {role === 'coach' && (
                  <>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Users className="h-6 w-6" />
                      <span className="text-xs">Team Roster</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <BarChart3 className="h-6 w-6" />
                      <span className="text-xs">Game Stats</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Calendar className="h-6 w-6" />
                      <span className="text-xs">Schedule</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Target className="h-6 w-6" />
                      <span className="text-xs">Game Plan</span>
                    </Button>
                  </>
                )}

                {role === 'player' && (
                  <>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <BarChart3 className="h-6 w-6" />
                      <span className="text-xs">My Stats</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Calendar className="h-6 w-6" />
                      <span className="text-xs">Schedule</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Users className="h-6 w-6" />
                      <span className="text-xs">Team Chat</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Star className="h-6 w-6" />
                      <span className="text-xs">Achievements</span>
                    </Button>
                  </>
                )}

                {role === 'parent' && (
                  <>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Basketball className="h-6 w-6" />
                      <span className="text-xs">Child's Games</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <BarChart3 className="h-6 w-6" />
                      <span className="text-xs">Performance</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Bell className="h-6 w-6" />
                      <span className="text-xs">Notifications</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Users className="h-6 w-6" />
                      <span className="text-xs">Team Updates</span>
                    </Button>
                  </>
                )}

                {(role === 'referee' || role === 'scorekeeper') && (
                  <>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Calendar className="h-6 w-6" />
                      <span className="text-xs">Assignments</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Clock className="h-6 w-6" />
                      <span className="text-xs">Game Clock</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <BarChart3 className="h-6 w-6" />
                      <span className="text-xs">Score Entry</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Settings className="h-6 w-6" />
                      <span className="text-xs">Tools</span>
                    </Button>
                  </>
                )}

                {role === 'league-admin' && (
                  <>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Trophy className="h-6 w-6" />
                      <span className="text-xs">Leagues</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Users className="h-6 w-6" />
                      <span className="text-xs">Teams</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Calendar className="h-6 w-6" />
                      <span className="text-xs">Schedule</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <BarChart3 className="h-6 w-6" />
                      <span className="text-xs">Reports</span>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Footer Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                Phoenix, AZ
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-1" />
                COPPA Compliant
              </div>
              <div className="flex items-center">
                <Activity className="h-4 w-4 mr-1" />
                Real-time Updates
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}