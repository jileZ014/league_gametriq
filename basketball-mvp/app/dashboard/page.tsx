'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Calendar, Users, Trophy, Activity } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todayGames: 5,
    liveGames: 2,
    totalTeams: 48,
    totalPlayers: 576
  })

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }
        setUser(currentUser)
      } catch (error) {
        console.error('Error loading user:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  const getRoleDisplay = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  const getRoleActions = () => {
    const role = user?.role || 'spectator'
    
    switch (role) {
      case 'admin':
        return [
          { label: 'Manage Teams', href: '/teams', icon: Trophy },
          { label: 'Schedule Games', href: '/games', icon: Calendar },
          { label: 'View Reports', href: '/reports', icon: Users }
        ]
      case 'scorekeeper':
        return [
          { label: 'Live Games', href: '/games', icon: Activity },
          { label: 'Score Games', href: '/games', icon: Calendar },
          { label: 'Game History', href: '/games', icon: Trophy }
        ]
      case 'coach':
        return [
          { label: 'My Teams', href: '/teams', icon: Users },
          { label: 'Game Schedule', href: '/games', icon: Calendar },
          { label: 'Team Stats', href: '/teams', icon: Trophy }
        ]
      case 'referee':
        return [
          { label: 'Game Assignments', href: '/games', icon: Calendar },
          { label: 'Submit Reports', href: '/games', icon: Activity },
          { label: 'Schedule', href: '/games', icon: Trophy }
        ]
      default:
        return [
          { label: 'Live Scores', href: '/games', icon: Activity },
          { label: 'Schedule', href: '/games', icon: Calendar },
          { label: 'Teams', href: '/teams', icon: Users }
        ]
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading dashboard...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user.name || 'User'}
          </h1>
          <p className="text-text-secondary">
            {getRoleDisplay(user.role || 'spectator')} Dashboard
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Today's Games</p>
                <p className="text-2xl font-bold">{stats.todayGames}</p>
              </div>
              <Calendar className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Live Now</p>
                <p className="text-2xl font-bold">{stats.liveGames}</p>
              </div>
              <Activity className="w-8 h-8 text-live" />
            </div>
            {stats.liveGames > 0 && (
              <div className="mt-2">
                <span className="inline-flex px-2 py-1 bg-live bg-opacity-20 text-live text-xs font-semibold rounded-full">
                  LIVE
                </span>
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Total Teams</p>
                <p className="text-2xl font-bold">{stats.totalTeams}</p>
              </div>
              <Users className="w-8 h-8 text-accent" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Total Players</p>
                <p className="text-2xl font-bold">{stats.totalPlayers}</p>
              </div>
              <Trophy className="w-8 h-8 text-success" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {getRoleActions().map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-4 bg-bg-secondary rounded-lg hover:bg-bg-secondary/70 transition-colors"
                >
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="font-medium">{action.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
              <Activity className="w-4 h-4 text-live" />
              <span className="text-sm">Phoenix Suns Youth vs Desert Eagles - Game in progress</span>
              <span className="text-xs text-text-secondary ml-auto">2 min ago</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
              <Trophy className="w-4 h-4 text-success" />
              <span className="text-sm">Scottsdale Storm won against Chandler Champions 67-61</span>
              <span className="text-xs text-text-secondary ml-auto">3 hours ago</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
              <Calendar className="w-4 h-4 text-accent" />
              <span className="text-sm">2 new games scheduled for tomorrow</span>
              <span className="text-xs text-text-secondary ml-auto">1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}