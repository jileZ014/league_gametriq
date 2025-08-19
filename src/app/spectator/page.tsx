'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/simple-ui';
import { Button } from '@/components/simple-ui';
import { Badge } from '@/components/simple-ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/simple-ui';
import { Input } from '@/components/simple-ui';
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Users,
  TrendingUp,
  Bell,
  BellOff,
  Share2,
  Download,
  Filter,
  Search,
  Heart,
  HeartOff,
  ChevronRight,
  Zap,
  Target
} from 'lucide-react';

interface LiveGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  timeRemaining: string;
  venue: string;
  division: string;
  isLive: boolean;
  isFavorite?: boolean;
}

interface Team {
  id: string;
  name: string;
  wins: number;
  losses: number;
  standing: number;
  division: string;
  nextGame: string;
  logo?: string;
}

interface UpcomingGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  venue: string;
  division: string;
}

export default function SpectatorView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(['Phoenix Suns']);
  
  const [liveGames] = useState<LiveGame[]>([
    {
      id: '1',
      homeTeam: 'Phoenix Suns',
      awayTeam: 'Desert Hawks',
      homeScore: 42,
      awayScore: 38,
      period: 'Q3',
      timeRemaining: '5:23',
      venue: 'Phoenix Sports Complex',
      division: 'U12 Boys',
      isLive: true,
      isFavorite: true
    },
    {
      id: '2',
      homeTeam: 'Valley Thunder',
      awayTeam: 'Mesa Lightning',
      homeScore: 55,
      awayScore: 51,
      period: 'Q4',
      timeRemaining: '2:15',
      venue: 'Desert Valley Gym',
      division: 'U14 Boys',
      isLive: true
    },
    {
      id: '3',
      homeTeam: 'Scottsdale Storm',
      awayTeam: 'Chandler Chargers',
      homeScore: 28,
      awayScore: 30,
      period: 'HT',
      timeRemaining: '10:00',
      venue: 'Scottsdale Arena',
      division: 'U10 Girls',
      isLive: true
    }
  ]);

  const [upcomingGames] = useState<UpcomingGame[]>([
    {
      id: '4',
      homeTeam: 'Phoenix Suns',
      awayTeam: 'Tempe Titans',
      date: 'Tomorrow',
      time: '6:00 PM',
      venue: 'Phoenix Sports Complex',
      division: 'U12 Boys'
    },
    {
      id: '5',
      homeTeam: 'Desert Eagles',
      awayTeam: 'Phoenix Suns',
      date: 'Sat, Jan 20',
      time: '2:00 PM',
      venue: 'Eagle Nest Arena',
      division: 'U12 Boys'
    }
  ]);

  const [standings] = useState<Team[]>([
    { id: '1', name: 'Phoenix Suns', wins: 10, losses: 2, standing: 1, division: 'U12 Boys', nextGame: 'Tomorrow' },
    { id: '2', name: 'Desert Hawks', wins: 9, losses: 3, standing: 2, division: 'U12 Boys', nextGame: 'Saturday' },
    { id: '3', name: 'Valley Thunder', wins: 8, losses: 4, standing: 3, division: 'U12 Boys', nextGame: 'Sunday' },
    { id: '4', name: 'Mesa Lightning', wins: 7, losses: 5, standing: 4, division: 'U12 Boys', nextGame: 'Tomorrow' },
    { id: '5', name: 'Tempe Titans', wins: 6, losses: 6, standing: 5, division: 'U12 Boys', nextGame: 'Saturday' }
  ]);

  const toggleFavorite = (teamName: string) => {
    setFavoriteTeams(prev => 
      prev.includes(teamName) 
        ? prev.filter(t => t !== teamName)
        : [...prev, teamName]
    );
  };

  const LiveGameCard = ({ game }: { game: LiveGame }) => (
    <Card className={`relative overflow-hidden ${game.isFavorite ? 'ring-2 ring-orange-500' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="animate-pulse">
              <Zap className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
            <Badge variant="outline">{game.division}</Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggleFavorite(game.homeTeam)}
          >
            {favoriteTeams.includes(game.homeTeam) ? 
              <Heart className="h-4 w-4 text-red-500 fill-red-500" /> : 
              <HeartOff className="h-4 w-4" />
            }
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">
              {game.period} - {game.timeRemaining}
            </p>
          </div>
          
          <div className="grid grid-cols-3 items-center">
            <div className="text-left">
              <p className="font-semibold text-sm">{game.homeTeam}</p>
              {game.isFavorite && <p className="text-xs text-orange-500">Your Team</p>}
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold">{game.homeScore}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-2xl font-bold">{game.awayScore}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm">{game.awayTeam}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {game.venue}
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1" variant="outline">
              <Bell className="h-3 w-3 mr-1" />
              Follow
            </Button>
            <Button size="sm" className="flex-1" variant="outline">
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const UpcomingGameCard = ({ game }: { game: UpcomingGame }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <Badge variant="outline">{game.division}</Badge>
          <div className="text-right text-sm">
            <p className="font-medium">{game.date}</p>
            <p className="text-muted-foreground">{game.time}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">{game.homeTeam}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-center text-xs text-muted-foreground">vs</div>
          <div className="font-medium">{game.awayTeam}</div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
          <MapPin className="h-3 w-3" />
          {game.venue}
        </div>
      </CardContent>
    </Card>
  );

  const StandingsTable = ({ teams }: { teams: Team[] }) => (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
        <div className="col-span-2">Team</div>
        <div className="text-center">W-L</div>
        <div className="text-center">Pos</div>
      </div>
      {teams.map(team => (
        <div key={team.id} className="grid grid-cols-4 gap-2 py-2 hover:bg-muted/50 rounded-md transition-colors">
          <div className="col-span-2 flex items-center gap-2">
            <span className="font-medium">{team.name}</span>
            {favoriteTeams.includes(team.name) && (
              <Heart className="h-3 w-3 text-red-500 fill-red-500" />
            )}
          </div>
          <div className="text-center text-sm">{team.wins}-{team.losses}</div>
          <div className="text-center">
            <Badge variant={team.standing <= 3 ? "default" : "outline"} className="text-xs">
              {team.standing}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Phoenix Flight Trophy</h1>
        <p className="text-muted-foreground">Follow live games and track your favorite teams</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search teams, players, or games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Schedule
        </Button>
      </div>

      {/* Favorite Teams Alert */}
      {favoriteTeams.length > 0 && (
        <Card className="mb-6 bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Following: {favoriteTeams.join(', ')}</p>
                  <p className="text-sm text-orange-700">Get notifications for these teams</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-orange-300">
                <Bell className="h-4 w-4 mr-1" />
                Manage
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="live" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live">Live Games</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveGames.map(game => (
              <LiveGameCard key={game.id} game={game} />
            ))}
          </div>
          {liveGames.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No live games at the moment</p>
                <p className="text-sm text-muted-foreground mt-1">Check back during game times!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingGames.map(game => (
              <UpcomingGameCard key={game.id} game={game} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="standings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Division Standings</CardTitle>
                <select className="px-3 py-1 border rounded-md text-sm">
                  <option>U12 Boys</option>
                  <option>U14 Boys</option>
                  <option>U10 Girls</option>
                  <option>U12 Girls</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <StandingsTable teams={standings} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <p className="font-semibold">Leading Scorer</p>
                  <p className="text-sm text-muted-foreground">J. Smith - 18.5 PPG</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="font-semibold">Best Record</p>
                  <p className="text-sm text-muted-foreground">Phoenix Suns (10-2)</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="font-semibold">Most Improved</p>
                  <p className="text-sm text-muted-foreground">Valley Thunder</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}