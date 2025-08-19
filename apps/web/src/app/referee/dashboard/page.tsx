'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Whistle,
  FileText,
  AlertCircle,
  CheckCircle,
  Users,
  DollarSign,
  Bell,
  LogOut,
  ClipboardCheck,
  Star
} from 'lucide-react'

export default function RefereeDashboard() {
  const router = useRouter()
  const { user, userRole, signOut, isDemo } = useAuth()

  useEffect(() => {
    // Check authentication and role
    if (!isDemo && !user) {
      router.push('/login')
    } else if (!isDemo && userRole && userRole !== 'referee') {
      router.push(`/${userRole}/dashboard`)
    }
  }, [user, userRole, isDemo, router])

  // Mock data for demonstration
  const upcomingGames = [
    {
      id: 1,
      date: 'Today',
      time: '6:00 PM',
      teams: 'Suns Jr. vs Lakers Jr.',
      venue: 'Phoenix Arena Court 1',
      division: 'U14',
      status: 'confirmed',
      fee: '$45'
    },
    {
      id: 2,
      date: 'Tomorrow',
      time: '10:00 AM',
      teams: 'Warriors Youth vs Celtics Youth',
      venue: 'Mesa Recreation Center',
      division: 'U12',
      status: 'confirmed',
      fee: '$40'
    },
    {
      id: 3,
      date: 'Saturday',
      time: '2:00 PM',
      teams: 'Spurs Academy vs Heat Academy',
      venue: 'Tempe Sports Complex',
      division: 'U16',
      status: 'pending',
      fee: '$50'
    }
  ]

  const recentReports = [
    {
      id: 1,
      game: 'Suns Jr. vs Lakers Jr.',
      date: 'Yesterday',
      status: 'submitted',
      incidents: 0
    },
    {
      id: 2,
      game: 'Warriors Youth vs Celtics Youth',
      date: '2 days ago',
      status: 'submitted',
      incidents: 1
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Whistle className="h-8 w-8 text-purple-500" />
              Referee Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your game assignments and reports
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Games This Week</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reports Pending</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
                <FileText className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-2xl font-bold">$1,250</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Rating</p>
                  <p className="text-2xl font-bold">4.8</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Assignments - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Assignments</CardTitle>
                <CardDescription>Your scheduled games for the next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingGames.map((game) => (
                    <div key={game.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={game.status === 'confirmed' ? 'default' : 'secondary'}>
                              {game.status}
                            </Badge>
                            <Badge variant="outline">{game.division}</Badge>
                            <Badge variant="outline" className="text-green-600">
                              {game.fee}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg">{game.teams}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {game.date}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {game.time}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-1" />
                            {game.venue}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {game.status === 'pending' && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              Accept
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recent Reports & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Submit Game Report
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Full Schedule
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Rules & Guidelines
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Report Incident
                </Button>
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>Your submitted game reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentReports.map((report) => (
                    <div key={report.id} className="border-b pb-3 last:border-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{report.game}</p>
                          <p className="text-xs text-gray-500">{report.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {report.incidents > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {report.incidents} incident
                            </Badge>
                          )}
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="link" className="w-full mt-2">
                  View All Reports →
                </Button>
              </CardContent>
            </Card>

            {/* Availability Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Available for assignments</span>
                    <Badge className="bg-green-500">Active</Badge>
                  </div>
                  <Button variant="outline" className="w-full">
                    Manage Availability
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}