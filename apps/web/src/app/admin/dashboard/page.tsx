'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Shield,
  Users,
  Trophy,
  Calendar,
  DollarSign,
  Activity,
  Settings,
  Bell,
  LogOut,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  BarChart3,
  FileText,
  UserPlus,
  Clock,
  MapPin,
  Zap
} from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, userRole, signOut, isDemo } = useAuth()

  useEffect(() => {
    // Check authentication and role
    if (!isDemo && !user) {
      router.push('/login')
    } else if (!isDemo && userRole && !['admin', 'league-admin'].includes(userRole)) {
      router.push(`/${userRole}/dashboard`)
    }
  }, [user, userRole, isDemo, router])

  // Mock data for demonstration
  const stats = {
    totalLeagues: 82,
    activeTeams: 3542,
    totalPlayers: 42504,
    upcomingGames: 156,
    revenue: {
      current: 125430,
      change: 12.5,
      trend: 'up'
    },
    registrations: {
      current: 234,
      change: -5.2,
      trend: 'down'
    }
  }

  const recentActivity = [
    {
      type: 'registration',
      message: 'New team registered: Phoenix Elite U16',
      time: '5 minutes ago',
      icon: UserPlus,
      color: 'text-green-500'
    },
    {
      type: 'payment',
      message: 'League fees received from Desert Storm',
      time: '1 hour ago',
      icon: DollarSign,
      color: 'text-blue-500'
    },
    {
      type: 'alert',
      message: 'Referee shortage for Saturday games',
      time: '2 hours ago',
      icon: AlertCircle,
      color: 'text-orange-500'
    },
    {
      type: 'schedule',
      message: 'Tournament bracket generated for Summer Classic',
      time: '3 hours ago',
      icon: Trophy,
      color: 'text-purple-500'
    }
  ]

  const upcomingTasks = [
    {
      title: 'Review referee applications',
      due: 'Today',
      priority: 'high',
      count: 8
    },
    {
      title: 'Approve tournament schedules',
      due: 'Tomorrow',
      priority: 'medium',
      count: 3
    },
    {
      title: 'Process team registrations',
      due: 'This week',
      priority: 'low',
      count: 15
    }
  ]

  const systemHealth = [
    { name: 'API Server', status: 'operational', uptime: 99.9 },
    { name: 'Database', status: 'operational', uptime: 99.8 },
    { name: 'Payment Gateway', status: 'operational', uptime: 100 },
    { name: 'Email Service', status: 'degraded', uptime: 95.2 }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-red-500" />
              Administrator Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Complete league management and system administration
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isDemo && (
              <Badge variant="outline" className="py-2 px-4">
                Demo Mode
              </Badge>
            )}
            <Button variant="outline" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button onClick={signOut} variant="ghost">
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Leagues</p>
                  <p className="text-2xl font-bold">{stats.totalLeagues}</p>
                </div>
                <Trophy className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Teams</p>
                  <p className="text-2xl font-bold">{stats.activeTeams.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Players</p>
                  <p className="text-2xl font-bold">{(stats.totalPlayers / 1000).toFixed(1)}k</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold">{stats.upcomingGames}</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-gray-600">Revenue (MTD)</p>
                <p className="text-2xl font-bold">${(stats.revenue.current / 1000).toFixed(1)}k</p>
                <div className="flex items-center mt-1">
                  {stats.revenue.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${stats.revenue.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {stats.revenue.change}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-gray-600">Registrations</p>
                <p className="text-2xl font-bold">{stats.registrations.current}</p>
                <div className="flex items-center mt-1">
                  {stats.registrations.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${stats.registrations.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(stats.registrations.change)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Activity & Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system events and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => {
                    const Icon = activity.icon
                    return (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800`}>
                          <Icon className={`h-4 w-4 ${activity.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.message}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Button variant="link" className="w-full mt-4">
                  View All Activity →
                </Button>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Infrastructure and service status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemHealth.map((service) => (
                    <div key={service.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{service.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            service.status === 'operational' ? 'default' : 
                            service.status === 'degraded' ? 'secondary' : 'destructive'
                          }>
                            {service.status}
                          </Badge>
                          <span className="text-sm text-gray-500">{service.uptime}%</span>
                        </div>
                      </div>
                      <Progress 
                        value={service.uptime} 
                        className={`h-2 ${service.uptime < 98 ? 'bg-orange-100' : ''}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions & Tasks */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New League
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Trophy className="h-4 w-4 mr-2" />
                  Create Tournament
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Games
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Reports
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Button>
              </CardContent>
            </Card>

            {/* Pending Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Tasks</CardTitle>
                <CardDescription>Items requiring your attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingTasks.map((task, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={
                              task.priority === 'high' ? 'destructive' : 
                              task.priority === 'medium' ? 'secondary' : 'outline'
                            } className="text-xs">
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {task.due}
                            </span>
                          </div>
                        </div>
                        <Badge>{task.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="link" className="w-full mt-2">
                  View All Tasks →
                </Button>
              </CardContent>
            </Card>

            {/* Saturday Peak Alert */}
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Saturday Peak Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">
                  System load expected to increase significantly this Saturday:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Expected Games</span>
                    <span className="font-semibold">248</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Concurrent Users</span>
                    <span className="font-semibold">1,200+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak Time</span>
                    <span className="font-semibold">10 AM - 2 PM</span>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Review Capacity Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}