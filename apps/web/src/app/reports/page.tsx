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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FileText,
  BarChart3,
  Users,
  Trophy,
  DollarSign,
  Calendar,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  Mail,
  Settings,
  Filter,
  Search,
  RefreshCw,
  Share2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  Target,
  Activity,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database, Report, ReportType, ReportFormat, ReportStatus, League, Team } from '@/lib/supabase/types'

interface ReportFilters {
  type: ReportType | 'all'
  status: ReportStatus | 'all'
  league: string
  search: string
}

interface ReportFormData {
  name: string
  description: string
  report_type: ReportType
  league_id?: string
  team_id?: string
  format: ReportFormat
  is_scheduled: boolean
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    day_of_week?: number
    day_of_month?: number
    time: string
  }
  recipients: string[]
  parameters: {
    date_range?: {
      start: string
      end: string
    }
    include_players?: boolean
    include_games?: boolean
    include_stats?: boolean
    include_financial?: boolean
  }
}

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-4">
      <FileText className="h-12 w-12 mx-auto text-basketball-orange-500 animate-spin" />
      <p className="text-muted-foreground">Loading reports...</p>
    </div>
  </div>
)

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>({
    type: 'all',
    status: 'all',
    league: 'all',
    search: ''
  })
  const [formData, setFormData] = useState<ReportFormData>({
    name: '',
    description: '',
    report_type: 'team_stats',
    format: 'pdf',
    is_scheduled: false,
    recipients: [],
    parameters: {}
  })

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchReportsAndData()
    }
  }, [user, filters])

  const fetchReportsAndData = async () => {
    try {
      setLoading(true)
      
      // Fetch leagues and teams for filters
      const [leaguesResult, teamsResult] = await Promise.all([
        supabase.from('leagues').select('*').order('name'),
        supabase.from('teams').select('*').order('name')
      ])

      if (leaguesResult.data) setLeagues(leaguesResult.data)
      if (teamsResult.data) setTeams(teamsResult.data)

      // Build reports query
      let reportsQuery = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.type !== 'all') {
        reportsQuery = reportsQuery.eq('report_type', filters.type)
      }
      
      if (filters.status !== 'all') {
        reportsQuery = reportsQuery.eq('status', filters.status)
      }

      if (filters.league !== 'all') {
        reportsQuery = reportsQuery.eq('league_id', filters.league)
      }

      if (filters.search) {
        reportsQuery = reportsQuery.ilike('name', `%${filters.search}%`)
      }

      // Filter by user role
      if (user.role === 'coach') {
        reportsQuery = reportsQuery.eq('created_by', user.id)
      }

      const { data: reportsData, error: reportsError } = await reportsQuery

      if (reportsError) throw reportsError
      setReports(reportsData || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (reportId: string) => {
    try {
      setIsGenerating(reportId)
      
      // Mock report generation - in real app, this would call a background job
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update last_generated timestamp
      await supabase
        .from('reports')
        .update({ 
          last_generated: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', reportId)

      // Refresh reports list
      fetchReportsAndData()
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsGenerating(null)
    }
  }

  const createReport = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          ...formData,
          created_by: user!.id,
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error

      setShowCreateDialog(false)
      setFormData({
        name: '',
        description: '',
        report_type: 'team_stats',
        format: 'pdf',
        is_scheduled: false,
        recipients: [],
        parameters: {}
      })
      
      fetchReportsAndData()
    } catch (error) {
      console.error('Error creating report:', error)
    }
  }

  const deleteReport = async (reportId: string) => {
    try {
      await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)

      fetchReportsAndData()
    } catch (error) {
      console.error('Error deleting report:', error)
    }
  }

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-600'
      case 'inactive':
        return 'bg-gray-100 text-gray-600'
      case 'failed':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3" />
      case 'inactive':
        return <Pause className="h-3 w-3" />
      case 'failed':
        return <XCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const getReportTypeIcon = (type: ReportType) => {
    switch (type) {
      case 'team_stats':
        return <Users className="h-4 w-4" />
      case 'player_stats':
        return <Target className="h-4 w-4" />
      case 'game_results':
        return <Trophy className="h-4 w-4" />
      case 'attendance':
        return <Activity className="h-4 w-4" />
      case 'financial':
        return <DollarSign className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatReportType = (type: ReportType) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const canManageReports = () => {
    return user?.role === 'league-admin' || user?.role === 'coach'
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
          <p className="text-muted-foreground">Please sign in to view reports.</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="mt-2 text-gray-600">
                Generate insights and reports for your basketball operations
              </p>
            </div>
            
            {canManageReports() && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Report
                  </Button>
                </DialogTrigger>
                <CreateReportDialog 
                  formData={formData}
                  setFormData={setFormData}
                  leagues={leagues}
                  teams={teams}
                  onSubmit={createReport}
                />
              </Dialog>
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
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Reports</p>
                    <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Reports</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reports.filter(r => r.status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Scheduled</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reports.filter(r => r.is_scheduled).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Generated Today</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reports.filter(r => 
                        r.last_generated && 
                        new Date(r.last_generated).toDateString() === new Date().toDateString()
                      ).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                      placeholder="Search reports..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as ReportType | 'all' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="team_stats">Team Stats</SelectItem>
                      <SelectItem value="player_stats">Player Stats</SelectItem>
                      <SelectItem value="game_results">Game Results</SelectItem>
                      <SelectItem value="attendance">Attendance</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as ReportStatus | 'all' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <label className="text-sm font-medium">Actions</label>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon" onClick={fetchReportsAndData}>
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

          {/* Reports List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onGenerate={() => generateReport(report.id)}
                onDelete={() => deleteReport(report.id)}
                isGenerating={isGenerating === report.id}
                canManage={canManageReports()}
              />
            ))}
          </div>

          {/* Empty State */}
          {reports.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600 mb-6">
                {filters.search || filters.type !== 'all' || filters.status !== 'all' || filters.league !== 'all'
                  ? "Try adjusting your filters to see more reports"
                  : "Create your first report to get started"
                }
              </p>
              {canManageReports() && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Report
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

interface ReportCardProps {
  report: Report
  onGenerate: () => void
  onDelete: () => void
  isGenerating: boolean
  canManage: boolean
}

function ReportCard({ report, onGenerate, onDelete, isGenerating, canManage }: ReportCardProps) {
  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-600'
      case 'inactive':
        return 'bg-gray-100 text-gray-600'
      case 'failed':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3" />
      case 'inactive':
        return <Pause className="h-3 w-3" />
      case 'failed':
        return <XCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const getReportTypeIcon = (type: ReportType) => {
    switch (type) {
      case 'team_stats':
        return <Users className="h-4 w-4" />
      case 'player_stats':
        return <Target className="h-4 w-4" />
      case 'game_results':
        return <Trophy className="h-4 w-4" />
      case 'attendance':
        return <Activity className="h-4 w-4" />
      case 'financial':
        return <DollarSign className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatReportType = (type: ReportType) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
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
            <div className="space-y-2">
              <h3 className="font-semibold text-lg leading-tight">{report.name}</h3>
              <div className="flex items-center space-x-2">
                <Badge className={cn('text-xs', getStatusColor(report.status))}>
                  <span className="flex items-center space-x-1">
                    {getStatusIcon(report.status)}
                    <span>{report.status}</span>
                  </span>
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <span className="flex items-center space-x-1">
                    {getReportTypeIcon(report.report_type)}
                    <span>{formatReportType(report.report_type)}</span>
                  </span>
                </Badge>
              </div>
            </div>
            {report.is_scheduled && (
              <Clock className="h-5 w-5 text-blue-500" />
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {report.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{report.description}</p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Format:</span>
              <Badge variant="outline" className="text-xs uppercase">
                {report.format}
              </Badge>
            </div>
            
            {report.last_generated && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Generated:</span>
                <span className="text-xs">
                  {new Date(report.last_generated).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {report.recipients && report.recipients.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Recipients:</span>
                <span className="text-xs">{report.recipients.length} email(s)</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Generate
              </Button>
              
              {canManage && (
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
              {canManage && (
                <Button variant="ghost" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface CreateReportDialogProps {
  formData: ReportFormData
  setFormData: (data: ReportFormData) => void
  leagues: League[]
  teams: Team[]
  onSubmit: () => void
}

function CreateReportDialog({ formData, setFormData, leagues, teams, onSubmit }: CreateReportDialogProps) {
  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Report</DialogTitle>
        <DialogDescription>
          Configure a new report template for your basketball data
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Report Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter report name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this report covers"
              rows={3}
            />
          </div>
        </div>

        {/* Report Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Report Type</Label>
            <Select
              value={formData.report_type}
              onValueChange={(value) => setFormData({ ...formData, report_type: value as ReportType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team_stats">Team Statistics</SelectItem>
                <SelectItem value="player_stats">Player Statistics</SelectItem>
                <SelectItem value="game_results">Game Results</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="custom">Custom Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Output Format</Label>
            <Select
              value={formData.format}
              onValueChange={(value) => setFormData({ ...formData, format: value as ReportFormat })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                <SelectItem value="csv">CSV File</SelectItem>
                <SelectItem value="json">JSON Data</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scope */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="league">League (Optional)</Label>
            <Select
              value={formData.league_id || ''}
              onValueChange={(value) => setFormData({ ...formData, league_id: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All leagues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Leagues</SelectItem>
                {leagues.map((league) => (
                  <SelectItem key={league.id} value={league.id}>
                    {league.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Team (Optional)</Label>
            <Select
              value={formData.team_id || ''}
              onValueChange={(value) => setFormData({ ...formData, team_id: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scheduling */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="scheduled"
              checked={formData.is_scheduled}
              onCheckedChange={(checked) => setFormData({ ...formData, is_scheduled: checked })}
            />
            <Label htmlFor="scheduled">Schedule automatic generation</Label>
          </div>

          {formData.is_scheduled && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={formData.schedule?.frequency}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule, frequency: value as any }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formData.schedule?.time || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule, time: e.target.value }
                  })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Parameters */}
        <div className="space-y-4">
          <Label>Report Parameters</Label>
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include_players"
                checked={formData.parameters.include_players}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  parameters: { ...formData.parameters, include_players: checked as boolean }
                })}
              />
              <Label htmlFor="include_players" className="text-sm">Include Player Data</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include_games"
                checked={formData.parameters.include_games}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  parameters: { ...formData.parameters, include_games: checked as boolean }
                })}
              />
              <Label htmlFor="include_games" className="text-sm">Include Game Data</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include_stats"
                checked={formData.parameters.include_stats}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  parameters: { ...formData.parameters, include_stats: checked as boolean }
                })}
              />
              <Label htmlFor="include_stats" className="text-sm">Include Statistics</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include_financial"
                checked={formData.parameters.include_financial}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  parameters: { ...formData.parameters, include_financial: checked as boolean }
                })}
              />
              <Label htmlFor="include_financial" className="text-sm">Include Financial Data</Label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setFormData({
            name: '',
            description: '',
            report_type: 'team_stats',
            format: 'pdf',
            is_scheduled: false,
            recipients: [],
            parameters: {}
          })}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!formData.name}>
            Create Report
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}