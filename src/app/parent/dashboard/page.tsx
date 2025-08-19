'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/simple-ui'
import { Button } from '@/components/simple-ui'
import { Badge } from '@/components/simple-ui'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Trophy, 
  Users, 
  Activity,
  TrendingUp,
  Heart,
  Bell,
  LogOut
} from 'lucide-react'

export default function ParentDashboard() {
  const router = useRouter()
  const { user, userRole, signOut, isDemo } = useAuth()

  useEffect(() => {
    // Check authentication and role
    if (!isDemo && !user) {
      router.push('/login')
    } else if (!isDemo && userRole && userRole !== 'parent') {
      router.push(`/${userRole}/dashboard`)
    }
  }, [user, userRole, isDemo, router])

  // Mock data for demonstration
  const childrenData = [
    {
      name: 'Emma Johnson',
      team: 'Phoenix Suns Jr.',
      nextGame: 'Tomorrow, 3:00 PM',
      recentScore: 'W 68-62'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Heart className="h-8 w-8 text-basketball-green-500" />
              Parent Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your children's basketball activities
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
            <Button onClick={signOut} variant="ghost">
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Children Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {childrenData.map((child, index) => (
            <Card key={index} className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {child.name}
                  <Badge className="bg-basketball-green-500">Active</Badge>
                </CardTitle>
                <CardDescription>Team: {child.team}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                    Next Game: {child.nextGame}
                  </div>
                  <div className="flex items-center text-sm">
                    <Trophy className="h-4 w-4 mr-2 text-gray-500" />
                    Last Result: {child.recentScore}
                  </div>
                </div>
                <Button className="w-full mt-4">View Details</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Games This Week</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <Calendar className="h-8 w-8 text-basketball-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Season Record</p>
                  <p className="text-2xl font-bold">12-3</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Points Avg</p>
                  <p className="text-2xl font-bold">8.5</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Practice Attendance</p>
                  <p className="text-2xl font-bold">95%</p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Games */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Games</CardTitle>
            <CardDescription>Your children's scheduled games</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((game) => (
                <div key={game} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Tomorrow</p>
                      <p className="font-bold">3:00 PM</p>
                    </div>
                    <div>
                      <p className="font-semibold">Phoenix Suns Jr. vs Desert Eagles</p>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        Mesa Recreation Center
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">View Details</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}