'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Target,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Share2,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database, Tournament, TournamentWithTeams, TournamentStatus, TournamentType } from '@/lib/supabase/types'

interface TournamentFilters {
  status: TournamentStatus | 'all'
  type: TournamentType | 'all'
  search: string
}

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-4">
      <Trophy className="h-12 w-12 mx-auto text-basketball-orange-500 animate-spin" />
      <p className="text-muted-foreground">Loading tournaments...</p>
    </div>
  </div>
)

export default function TournamentsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tournaments, setTournaments] = useState<TournamentWithTeams[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TournamentFilters>({
    status: 'all',
    type: 'all',
    search: ''
  })

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchTournaments()
    }
  }, [user, filters])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('tournaments')
        .select(`
          *,
          league:league_id(name, age_group),
          participating_teams:teams(count)
        `)
        .order('start_date', { ascending: false })

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      
      if (filters.type !== 'all') {
        query = query.eq('tournament_type', filters.type)
      }

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setTournaments(data || [])
    } catch (error) {
      console.error('Error fetching tournaments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-600'
      case 'registration':
        return 'bg-blue-100 text-blue-600'
      case 'bracket_set':
        return 'bg-yellow-100 text-yellow-600'
      case 'in_progress':
        return 'bg-green-100 text-green-600'
      case 'completed':
        return 'bg-purple-100 text-purple-600'
      case 'cancelled':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusIcon = (status: TournamentStatus) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-3 w-3" />
      case 'registration':
        return <Users className="h-3 w-3" />
      case 'bracket_set':
        return <Target className="h-3 w-3" />
      case 'in_progress':
        return <Clock className="h-3 w-3" />
      case 'completed':
        return <CheckCircle className="h-3 w-3" />
      case 'cancelled':
        return <AlertCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const formatTournamentType = (type: TournamentType) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const canManageTournament = (tournament: Tournament) => {
    return user?.role === 'league-admin' || tournament.created_by === user?.id
  }

  const filteredTournaments = tournaments.filter(tournament => {
    if (filters.status !== 'all' && tournament.status !== filters.status) return false
    if (filters.type !== 'all' && tournament.tournament_type !== filters.type) return false
    if (filters.search && !tournament.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const groupedTournaments = {
    upcoming: filteredTournaments.filter(t => ['draft', 'registration', 'bracket_set'].includes(t.status)),
    active: filteredTournaments.filter(t => t.status === 'in_progress'),
    completed: filteredTournaments.filter(t => ['completed', 'cancelled'].includes(t.status))
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
          <p className="text-muted-foreground">Please sign in to view tournaments.</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Tournaments</h1>
              <p className="mt-2 text-gray-600">
                Manage and participate in basketball tournaments
              </p>
            </div>
            
            {(user.role === 'league-admin' || user.role === 'coach') && (
              <Button asChild>
                <Link href="/tournaments/create">
                  <Plus className="mr-2 h-4 w-4 inline" /> Create Tournament
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tournaments..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as TournamentStatus | 'all' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="bracket_set">Bracket Set</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as TournamentType | 'all' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="single_elimination">Single Elimination</SelectItem>
                      <SelectItem value="double_elimination">Double Elimination</SelectItem>
                      <SelectItem value="round_robin">Round Robin</SelectItem>
                      <SelectItem value="swiss">Swiss</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Actions</label>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon" onClick={fetchTournaments}>
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

          {/* Tournament Tabs */}
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Upcoming ({groupedTournaments.upcoming.length})</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Active ({groupedTournaments.active.length})</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>Completed ({groupedTournaments.completed.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-6">
              <TournamentGrid 
                tournaments={groupedTournaments.upcoming} 
                canManage={canManageTournament}
                emptyMessage="No upcoming tournaments"
                emptyIcon={Calendar}
              />
            </TabsContent>

            <TabsContent value="active" className="space-y-6">
              <TournamentGrid 
                tournaments={groupedTournaments.active} 
                canManage={canManageTournament}
                emptyMessage="No active tournaments"
                emptyIcon={Clock}
              />
            </TabsContent>

            <TabsContent value="completed" className="space-y-6">
              <TournamentGrid 
                tournaments={groupedTournaments.completed} 
                canManage={canManageTournament}
                emptyMessage="No completed tournaments"
                emptyIcon={Trophy}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  )
}

interface TournamentGridProps {
  tournaments: TournamentWithTeams[]
  canManage: (tournament: Tournament) => boolean
  emptyMessage: string
  emptyIcon: any
}

function TournamentGrid({ tournaments, canManage, emptyMessage, emptyIcon: EmptyIcon }: TournamentGridProps) {
  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-600'
      case 'registration':
        return 'bg-blue-100 text-blue-600'
      case 'bracket_set':
        return 'bg-yellow-100 text-yellow-600'
      case 'in_progress':
        return 'bg-green-100 text-green-600'
      case 'completed':
        return 'bg-purple-100 text-purple-600'
      case 'cancelled':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusIcon = (status: TournamentStatus) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-3 w-3" />
      case 'registration':
        return <Users className="h-3 w-3" />
      case 'bracket_set':
        return <Target className="h-3 w-3" />
      case 'in_progress':
        return <Clock className="h-3 w-3" />
      case 'completed':
        return <CheckCircle className="h-3 w-3" />
      case 'cancelled':
        return <AlertCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const formatTournamentType = (type: TournamentType) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <EmptyIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{emptyMessage}</h3>
        <p className="text-gray-600 mb-6">
          {emptyMessage === "No upcoming tournaments" 
            ? "Create a new tournament to get started"
            : "Check back later for updates"
          }
        </p>
        {emptyMessage === "No upcoming tournaments" && (
          <Button asChild>
            <Link href="/tournaments/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tournaments.map((tournament) => (
        <motion.div
          key={tournament.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="h-full hover:shadow-lg transition-all duration-200">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg leading-tight">{tournament.name}</h3>
                  <div className="flex items-center space-x-2">
                    <Badge className={cn('text-xs', getStatusColor(tournament.status))}>
                      <span className="flex items-center space-x-1">
                        {getStatusIcon(tournament.status)}
                        <span>{tournament.status.replace('_', ' ')}</span>
                      </span>
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {formatTournamentType(tournament.tournament_type)}
                    </Badge>
                  </div>
                </div>
                {tournament.status === 'completed' && (
                  <Star className="h-5 w-5 text-yellow-500" />
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{tournament.venue}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{tournament.teams?.length || 0} / {tournament.max_teams} teams</span>
                </div>
                
                <div className="flex items-center space-x-2 text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span>${tournament.entry_fee} entry fee</span>
                </div>
              </div>

              {tournament.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{tournament.description}</p>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tournaments/${tournament.id}/bracket`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                  
                  {canManage(tournament) && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/tournaments/${tournament.id}/edit`}>
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
                
                <Button variant="ghost" size="sm">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}