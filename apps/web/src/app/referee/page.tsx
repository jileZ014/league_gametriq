'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Phone,
  Navigation,
  ClipboardList,
  Send,
  Download
} from 'lucide-react';

interface GameAssignment {
  id: string;
  date: string;
  time: string;
  venue: string;
  venueAddress: string;
  homeTeam: string;
  awayTeam: string;
  division: string;
  role: 'head' | 'assistant';
  status: 'upcoming' | 'in_progress' | 'completed';
  payRate: number;
  notes?: string;
}

interface GameReport {
  gameId: string;
  technicalFouls: number;
  ejections: number;
  injuries: boolean;
  incidents: string;
  finalScore: {
    home: number;
    away: number;
  };
}

export default function RefereeDashboard() {
  const [selectedGame, setSelectedGame] = useState<GameAssignment | null>(null);
  const [assignments] = useState<GameAssignment[]>([
    {
      id: '1',
      date: '2024-01-15',
      time: '6:00 PM',
      venue: 'Phoenix Sports Complex',
      venueAddress: '1234 Sports Way, Phoenix, AZ 85001',
      homeTeam: 'Phoenix Suns U12',
      awayTeam: 'Desert Hawks U12',
      division: 'U12 Boys',
      role: 'head',
      status: 'upcoming',
      payRate: 45,
      notes: 'Championship qualifier game'
    },
    {
      id: '2',
      date: '2024-01-15',
      time: '7:30 PM',
      venue: 'Phoenix Sports Complex',
      venueAddress: '1234 Sports Way, Phoenix, AZ 85001',
      homeTeam: 'Valley Thunder U14',
      awayTeam: 'Mesa Lightning U14',
      division: 'U14 Boys',
      role: 'assistant',
      status: 'upcoming',
      payRate: 35
    },
    {
      id: '3',
      date: '2024-01-14',
      time: '5:00 PM',
      venue: 'Desert Valley Gym',
      venueAddress: '5678 Court St, Tempe, AZ 85281',
      homeTeam: 'Scottsdale Storm U10',
      awayTeam: 'Chandler Chargers U10',
      division: 'U10 Girls',
      role: 'head',
      status: 'completed',
      payRate: 40
    }
  ]);

  const [report, setReport] = useState<Partial<GameReport>>({
    technicalFouls: 0,
    ejections: 0,
    injuries: false,
    incidents: '',
    finalScore: { home: 0, away: 0 }
  });

  const AssignmentCard = ({ assignment }: { assignment: GameAssignment }) => (
    <Card 
      className={`cursor-pointer transition-all ${selectedGame?.id === assignment.id ? 'ring-2 ring-orange-500' : ''}`}
      onClick={() => setSelectedGame(assignment)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Badge variant={assignment.status === 'upcoming' ? 'default' : 
                           assignment.status === 'in_progress' ? 'destructive' : 'secondary'}>
              {assignment.status === 'completed' ? 'COMPLETED' : 
               assignment.status === 'in_progress' ? 'LIVE' : 'UPCOMING'}
            </Badge>
            <Badge variant="outline">
              {assignment.role === 'head' ? 'Head Ref' : 'Assistant'}
            </Badge>
          </div>
          <span className="text-sm font-medium text-green-600">
            ${assignment.payRate}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="font-semibold">{assignment.homeTeam}</p>
          <p className="text-sm text-muted-foreground">vs</p>
          <p className="font-semibold">{assignment.awayTeam}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {assignment.date}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {assignment.time}
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span>{assignment.venue}</span>
        </div>
        {assignment.notes && (
          <p className="text-xs text-amber-600 font-medium">
            ⚠️ {assignment.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const GameDetails = ({ game }: { game: GameAssignment }) => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Game Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Division</p>
              <p className="font-medium">{game.division}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Home Team</p>
              <p className="font-medium">{game.homeTeam}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Away Team</p>
              <p className="font-medium">{game.awayTeam}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Date & Time</p>
              <p className="font-medium">{game.date} at {game.time}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Venue</p>
              <p className="font-medium">{game.venue}</p>
              <p className="text-sm text-muted-foreground">{game.venueAddress}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Role</p>
              <p className="font-medium">
                {game.role === 'head' ? 'Head Referee' : 'Assistant Referee'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="flex-1">
          <Navigation className="h-4 w-4 mr-2" />
          Get Directions
        </Button>
        <Button variant="outline" className="flex-1">
          <Phone className="h-4 w-4 mr-2" />
          Contact Venue
        </Button>
        <Button variant="outline" className="flex-1">
          <ClipboardList className="h-4 w-4 mr-2" />
          Game Rules
        </Button>
      </div>

      {game.notes && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Special Notes:</strong> {game.notes}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const GameReportForm = ({ game }: { game: GameAssignment }) => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Submit Game Report</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Final Score - {game.homeTeam}</label>
          <input
            type="number"
            className="w-full mt-1 px-3 py-2 border rounded-md"
            value={report.finalScore?.home || 0}
            onChange={(e) => setReport(prev => ({
              ...prev,
              finalScore: { ...prev.finalScore!, home: parseInt(e.target.value) }
            }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Final Score - {game.awayTeam}</label>
          <input
            type="number"
            className="w-full mt-1 px-3 py-2 border rounded-md"
            value={report.finalScore?.away || 0}
            onChange={(e) => setReport(prev => ({
              ...prev,
              finalScore: { ...prev.finalScore!, away: parseInt(e.target.value) }
            }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Technical Fouls</label>
          <input
            type="number"
            className="w-full mt-1 px-3 py-2 border rounded-md"
            value={report.technicalFouls || 0}
            onChange={(e) => setReport(prev => ({
              ...prev,
              technicalFouls: parseInt(e.target.value)
            }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Ejections</label>
          <input
            type="number"
            className="w-full mt-1 px-3 py-2 border rounded-md"
            value={report.ejections || 0}
            onChange={(e) => setReport(prev => ({
              ...prev,
              ejections: parseInt(e.target.value)
            }))}
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={report.injuries || false}
            onChange={(e) => setReport(prev => ({
              ...prev,
              injuries: e.target.checked
            }))}
          />
          <span className="text-sm font-medium">Injuries occurred during game</span>
        </label>
      </div>

      <div>
        <label className="text-sm font-medium">Incident Report (if any)</label>
        <textarea
          className="w-full mt-1 px-3 py-2 border rounded-md resize-none"
          rows={4}
          placeholder="Describe any incidents, conflicts, or notable events..."
          value={report.incidents || ''}
          onChange={(e) => setReport(prev => ({
            ...prev,
            incidents: e.target.value
          }))}
        />
      </div>

      <Button className="w-full">
        <Send className="h-4 w-4 mr-2" />
        Submit Report
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Referee Portal</h1>
          <p className="text-muted-foreground">Manage your game assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Certified Official
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">18</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Earnings (Month)</p>
                <p className="text-2xl font-bold">$720</p>
              </div>
              <span className="text-2xl">💰</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">4.8</p>
              </div>
              <span className="text-2xl">⭐</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignments List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Your Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignments.map(assignment => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Assignment Details */}
        <div className="lg:col-span-2">
          {selectedGame ? (
            <Card>
              <CardHeader>
                <CardTitle>Assignment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="report" disabled={selectedGame.status !== 'completed'}>
                      Report
                    </TabsTrigger>
                    <TabsTrigger value="resources">Resources</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="mt-6">
                    <GameDetails game={selectedGame} />
                  </TabsContent>
                  <TabsContent value="report" className="mt-6">
                    <GameReportForm game={selectedGame} />
                  </TabsContent>
                  <TabsContent value="resources" className="mt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Official Resources</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Button variant="outline" className="justify-start">
                          <FileText className="h-4 w-4 mr-2" />
                          Rule Book (2024)
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <Download className="h-4 w-4 mr-2" />
                          Scoresheet Template
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Pre-game Checklist
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <Phone className="h-4 w-4 mr-2" />
                          Emergency Contacts
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96 text-muted-foreground">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an assignment to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}