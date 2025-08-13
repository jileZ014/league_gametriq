'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  TrendingUp,
  TrendingDown,
  Award,
  Phone,
  Mail,
  Star,
  Activity,
  BarChart3,
  CalendarCheck,
  CalendarX,
  Shield,
  UserCheck,
  UserX,
  AlertCircle
} from 'lucide-react';

import { 
  Referee, 
  Assignment, 
  ExperienceLevel, 
  RefereeStatus,
  AssignmentStatus,
  Division,
  Conflict,
  SchedulingMetrics
} from '@/lib/referee/types';
import { RefereeSchedulingService } from '@/lib/referee/scheduling.service';

interface DashboardStats {
  totalReferees: number;
  activeReferees: number;
  gamesThisWeek: number;
  unassignedGames: number;
  averageRating: number;
  totalPayroll: number;
  coverageRate: number;
  conflictCount: number;
}

export default function RefereeManagementPage() {
  const [referees, setReferees] = useState<Referee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedReferee, setSelectedReferee] = useState<Referee | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<RefereeStatus | 'ALL'>('ALL');
  const [filterExperience, setFilterExperience] = useState<ExperienceLevel | 'ALL'>('ALL');
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [schedulingInProgress, setSchedulingInProgress] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [metrics, setMetrics] = useState<SchedulingMetrics | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    loadMockData();
  }, []);

  const loadMockData = () => {
    const mockReferees: Referee[] = [
      {
        id: '1',
        organizationId: 'org1',
        userId: 'user1',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '(602) 555-0101',
        address: {
          street: '123 Main St',
          city: 'Phoenix',
          state: 'AZ',
          zipCode: '85001',
          latitude: 33.4484,
          longitude: -112.0740
        },
        experience: 'CERTIFIED',
        certifications: [
          {
            id: 'cert1',
            name: 'NFHS Basketball Official',
            issuedBy: 'National Federation of State High School Associations',
            issuedDate: new Date('2020-01-15'),
            expiryDate: new Date('2025-01-15'),
            level: 'Level 3',
            verified: true
          }
        ],
        specializations: [
          {
            division: { 
              id: 'u18', 
              name: '18U',
              ageGroup: '16-18',
              skillLevel: 'COMPETITIVE',
              requiredExperience: 'EXPERIENCED',
              gameLength: 80,
              numberOfPeriods: 4,
              periodLength: 20
            },
            experienceLevel: 'EXPERT',
            gamesOfficiated: 250
          }
        ],
        yearsOfExperience: 8,
        gamesOfficiated: 1250,
        availability: [
          {
            id: 'av1',
            dayOfWeek: 6,
            startTime: '08:00',
            endTime: '20:00',
            priority: 'PREFERRED',
            effectiveFrom: new Date(),
            recurring: true
          },
          {
            id: 'av2',
            dayOfWeek: 0,
            startTime: '10:00',
            endTime: '18:00',
            priority: 'AVAILABLE',
            effectiveFrom: new Date(),
            recurring: true
          }
        ],
        blackoutDates: [],
        maxGamesPerDay: 4,
        maxGamesPerWeek: 12,
        maxConsecutiveGames: 3,
        minRestBetweenGames: 30,
        travelRadius: 25,
        preferredVenues: ['venue1', 'venue2'],
        preferredDivisions: [],
        preferredPartners: ['2'],
        avoidPartners: [],
        baseRate: 45,
        experienceMultiplier: 1.3,
        performanceRating: 4.8,
        reliability: 95,
        punctuality: 98,
        status: 'ACTIVE',
        active: true,
        lastAssignmentDate: new Date('2024-01-14'),
        totalEarnings: 8500,
        notes: 'Excellent referee, very reliable',
        tags: ['tournament-ready', 'head-referee'],
        createdAt: new Date('2019-06-01'),
        updatedAt: new Date()
      },
      {
        id: '2',
        organizationId: 'org1',
        userId: 'user2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@example.com',
        phone: '(602) 555-0102',
        address: {
          street: '456 Oak Ave',
          city: 'Tempe',
          state: 'AZ',
          zipCode: '85281',
          latitude: 33.4255,
          longitude: -111.9400
        },
        experience: 'EXPERIENCED',
        certifications: [],
        specializations: [
          {
            division: { 
              id: 'u14', 
              name: '14U',
              ageGroup: '12-14',
              skillLevel: 'COMPETITIVE',
              requiredExperience: 'INTERMEDIATE',
              gameLength: 70,
              numberOfPeriods: 4,
              periodLength: 15
            },
            experienceLevel: 'PROFICIENT',
            gamesOfficiated: 150
          }
        ],
        yearsOfExperience: 5,
        gamesOfficiated: 650,
        availability: [
          {
            id: 'av3',
            dayOfWeek: 6,
            startTime: '09:00',
            endTime: '17:00',
            priority: 'AVAILABLE',
            effectiveFrom: new Date(),
            recurring: true
          }
        ],
        blackoutDates: [],
        maxGamesPerDay: 3,
        maxGamesPerWeek: 10,
        maxConsecutiveGames: 2,
        minRestBetweenGames: 45,
        travelRadius: 20,
        preferredVenues: ['venue2'],
        preferredDivisions: [],
        preferredPartners: ['1'],
        avoidPartners: [],
        baseRate: 35,
        experienceMultiplier: 1.15,
        performanceRating: 4.5,
        reliability: 92,
        punctuality: 95,
        status: 'ACTIVE',
        active: true,
        lastAssignmentDate: new Date('2024-01-13'),
        totalEarnings: 5200,
        notes: 'Good with younger divisions',
        tags: ['youth-specialist'],
        createdAt: new Date('2020-03-15'),
        updatedAt: new Date()
      },
      {
        id: '3',
        organizationId: 'org1',
        userId: 'user3',
        firstName: 'Mike',
        lastName: 'Wilson',
        email: 'mike.wilson@example.com',
        phone: '(602) 555-0103',
        address: {
          street: '789 Pine Rd',
          city: 'Scottsdale',
          state: 'AZ',
          zipCode: '85251',
          latitude: 33.4942,
          longitude: -111.9261
        },
        experience: 'BEGINNER',
        certifications: [],
        specializations: [
          {
            division: { 
              id: 'u10', 
              name: '10U',
              ageGroup: '8-10',
              skillLevel: 'RECREATIONAL',
              requiredExperience: 'BEGINNER',
              gameLength: 60,
              numberOfPeriods: 4,
              periodLength: 12
            },
            experienceLevel: 'BASIC',
            gamesOfficiated: 50
          }
        ],
        yearsOfExperience: 1,
        gamesOfficiated: 75,
        availability: [
          {
            id: 'av4',
            dayOfWeek: 6,
            startTime: '12:00',
            endTime: '18:00',
            priority: 'IF_NEEDED',
            effectiveFrom: new Date(),
            recurring: true
          }
        ],
        blackoutDates: [
          {
            id: 'bd1',
            startDate: new Date('2024-01-20'),
            endDate: new Date('2024-01-21'),
            reason: 'Family event'
          }
        ],
        maxGamesPerDay: 2,
        maxGamesPerWeek: 6,
        maxConsecutiveGames: 2,
        minRestBetweenGames: 60,
        travelRadius: 15,
        preferredVenues: [],
        preferredDivisions: [],
        preferredPartners: [],
        avoidPartners: [],
        baseRate: 25,
        experienceMultiplier: 1.0,
        performanceRating: 4.0,
        reliability: 88,
        punctuality: 90,
        status: 'ACTIVE',
        active: true,
        lastAssignmentDate: new Date('2024-01-07'),
        totalEarnings: 1200,
        notes: 'New referee, showing promise',
        tags: ['trainee'],
        createdAt: new Date('2023-08-01'),
        updatedAt: new Date()
      }
    ];

    setReferees(mockReferees);
  };

  const stats: DashboardStats = useMemo(() => {
    const activeRefs = referees.filter(r => r.status === 'ACTIVE');
    const totalPay = referees.reduce((sum, r) => sum + r.totalEarnings, 0);
    const avgRating = referees.reduce((sum, r) => sum + r.performanceRating, 0) / referees.length;

    return {
      totalReferees: referees.length,
      activeReferees: activeRefs.length,
      gamesThisWeek: 45,
      unassignedGames: 8,
      averageRating: avgRating || 0,
      totalPayroll: totalPay,
      coverageRate: 0.92,
      conflictCount: 3
    };
  }, [referees]);

  const filteredReferees = useMemo(() => {
    return referees.filter(referee => {
      const matchesSearch = searchQuery === '' || 
        `${referee.firstName} ${referee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        referee.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'ALL' || referee.status === filterStatus;
      const matchesExperience = filterExperience === 'ALL' || referee.experience === filterExperience;

      return matchesSearch && matchesStatus && matchesExperience;
    });
  }, [referees, searchQuery, filterStatus, filterExperience]);

  const runSchedulingAlgorithm = async () => {
    setSchedulingInProgress(true);
    
    try {
      // Simulate scheduling process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock results
      setConflicts([
        {
          type: 'DOUBLE_BOOKING',
          severity: 'HIGH',
          description: 'John Smith is double-booked for games at 2:00 PM',
          affectedEntities: {
            referees: ['1'],
            games: ['game1', 'game2']
          },
          resolution: 'Reassign one game to another referee'
        },
        {
          type: 'TRAVEL_TIME',
          severity: 'MEDIUM',
          description: 'Insufficient travel time between venues for Sarah Johnson',
          affectedEntities: {
            referees: ['2'],
            games: ['game3', 'game4']
          },
          resolution: 'Allow 45 minutes between games'
        }
      ]);

      setMetrics({
        totalGames: 50,
        assignedGames: 46,
        coverageRate: 0.92,
        totalCost: 4250,
        averageCostPerGame: 85,
        refereeUtilization: new Map([
          ['1', 0.75],
          ['2', 0.60],
          ['3', 0.40]
        ]),
        travelDistance: new Map([
          ['1', 45],
          ['2', 32],
          ['3', 18]
        ]),
        workloadBalance: 0.72,
        satisfactionScore: 85
      });
    } catch (error) {
      console.error('Scheduling failed:', error);
    } finally {
      setSchedulingInProgress(false);
    }
  };

  const StatsCard = ({ icon: Icon, label, value, trend, trendValue }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  const RefereeCard = ({ referee }: { referee: Referee }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        selectedReferee?.id === referee.id ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => setSelectedReferee(referee)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">
              {referee.firstName} {referee.lastName}
            </h3>
            <p className="text-sm text-muted-foreground">{referee.email}</p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant={referee.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {referee.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {referee.experience}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-500" />
            <span>{referee.performanceRating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-green-500" />
            <span>{referee.reliability}% reliable</span>
          </div>
          <div className="flex items-center gap-1">
            <Award className="h-3 w-3 text-blue-500" />
            <span>{referee.gamesOfficiated} games</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-green-600" />
            <span>${referee.baseRate}/game</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          <MapPin className="h-3 w-3" />
          <span>{referee.address.city}, {referee.address.state}</span>
          <span className="text-muted-foreground">• {referee.travelRadius} mi radius</span>
        </div>

        <div className="flex gap-1 flex-wrap">
          {referee.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const ConflictAlert = ({ conflict }: { conflict: Conflict }) => (
    <Alert className={`mb-3 ${
      conflict.severity === 'CRITICAL' ? 'border-red-500' :
      conflict.severity === 'HIGH' ? 'border-orange-500' :
      conflict.severity === 'MEDIUM' ? 'border-yellow-500' :
      'border-blue-500'
    }`}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">{conflict.type.replace(/_/g, ' ')}</p>
            <p className="text-sm mt-1">{conflict.description}</p>
            {conflict.resolution && (
              <p className="text-sm text-muted-foreground mt-2">
                Suggested: {conflict.resolution}
              </p>
            )}
          </div>
          <Badge variant={
            conflict.severity === 'CRITICAL' ? 'destructive' :
            conflict.severity === 'HIGH' ? 'destructive' :
            conflict.severity === 'MEDIUM' ? 'default' :
            'secondary'
          }>
            {conflict.severity}
          </Badge>
        </div>
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Referee Management</h1>
          <p className="text-muted-foreground">
            Manage referee assignments and scheduling
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowSchedulingModal(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Run Scheduling
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          icon={Users}
          label="Total Referees"
          value={stats.totalReferees}
          trend="up"
          trendValue="+2 this month"
        />
        <StatsCard
          icon={UserCheck}
          label="Active Referees"
          value={stats.activeReferees}
        />
        <StatsCard
          icon={CalendarCheck}
          label="Games This Week"
          value={stats.gamesThisWeek}
          trend="up"
          trendValue="+12%"
        />
        <StatsCard
          icon={AlertTriangle}
          label="Unassigned Games"
          value={stats.unassignedGames}
          trend="down"
          trendValue="-3"
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          icon={Star}
          label="Average Rating"
          value={stats.averageRating.toFixed(1)}
        />
        <StatsCard
          icon={DollarSign}
          label="Total Payroll"
          value={`$${(stats.totalPayroll / 1000).toFixed(1)}k`}
        />
        <StatsCard
          icon={Shield}
          label="Coverage Rate"
          value={`${(stats.coverageRate * 100).toFixed(0)}%`}
        />
        <StatsCard
          icon={AlertCircle}
          label="Active Conflicts"
          value={stats.conflictCount}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {/* Scheduling Results */}
          {metrics && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Latest Scheduling Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Coverage</p>
                    <p className="text-xl font-semibold">
                      {(metrics.coverageRate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-xl font-semibold">
                      ${metrics.totalCost.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Workload Balance</p>
                    <p className="text-xl font-semibold">
                      {(metrics.workloadBalance * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Satisfaction</p>
                    <p className="text-xl font-semibold">
                      {metrics.satisfactionScore}/100
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Conflicts */}
          {conflicts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Conflicts</CardTitle>
              </CardHeader>
              <CardContent>
                {conflicts.map((conflict, index) => (
                  <ConflictAlert key={index} conflict={conflict} />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="roster" className="mt-6">
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search referees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <select
                  value={filterExperience}
                  onChange={(e) => setFilterExperience(e.target.value as any)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="ALL">All Experience</option>
                  <option value="VOLUNTEER">Volunteer</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="EXPERIENCED">Experienced</option>
                  <option value="CERTIFIED">Certified</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Referee Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReferees.map(referee => (
              <RefereeCard key={referee.id} referee={referee} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    46 games scheduled for this week with 92% coverage rate
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button onClick={runSchedulingAlgorithm} disabled={schedulingInProgress}>
                    {schedulingInProgress ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Running Algorithm...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Optimize Assignments
                      </>
                    )}
                  </Button>
                  <Button variant="outline">
                    <CalendarCheck className="h-4 w-4 mr-2" />
                    View Calendar
                  </Button>
                  <Button variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Notifications
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Conflict Resolution Center</CardTitle>
            </CardHeader>
            <CardContent>
              {conflicts.length > 0 ? (
                <div className="space-y-3">
                  {conflicts.map((conflict, index) => (
                    <ConflictAlert key={index} conflict={conflict} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No active conflicts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {referees.map(ref => (
                    <div key={ref.id} className="flex items-center justify-between">
                      <span className="text-sm">{ref.firstName} {ref.lastName}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(ref.performanceRating / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">
                          {ref.performanceRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workload Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {referees.map(ref => (
                    <div key={ref.id} className="flex items-center justify-between">
                      <span className="text-sm">{ref.firstName} {ref.lastName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {ref.gamesOfficiated} games
                        </span>
                        <Badge variant="outline">
                          ${ref.totalEarnings.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}