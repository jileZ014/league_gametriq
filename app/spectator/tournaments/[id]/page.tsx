'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Tournament, 
  BracketStructure, 
  Match, 
  Team,
  TournamentEngine,
  TournamentFactory
} from '@/lib/tournament/types';
import { BracketView } from '@/components/tournament/BracketView';
import { MatchCard } from '@/components/tournament/MatchCard';
import { Card } from '@/components/simple-ui';
import { Button } from '@/components/simple-ui';
import { Badge } from '@/components/simple-ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/simple-ui';
import { Input } from '@/components/simple-ui';
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Search,
  Filter,
  Share2,
  Bookmark,
  Bell,
  TrendingUp,
  Award,
  Target
} from 'lucide-react';
import { format } from 'date-fns';

export default function SpectatorTournamentPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bracket, setBracket] = useState<BracketStructure | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('bracket');
  const [notifications, setNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock data - in real app this would come from API
  useEffect(() => {
    const loadTournament = async () => {
      try {
        // Mock tournament data
        const mockTeams = [
          { id: '1', name: 'Phoenix Suns Youth', seed: 1, powerRating: 95, record: { wins: 12, losses: 2 } },
          { id: '2', name: 'Scottsdale Storm', seed: 2, powerRating: 88, record: { wins: 10, losses: 4 } },
          { id: '3', name: 'Tempe Thunder', seed: 3, powerRating: 92, record: { wins: 11, losses: 3 } },
          { id: '4', name: 'Mesa Mavericks', seed: 4, powerRating: 85, record: { wins: 9, losses: 5 } },
          { id: '5', name: 'Glendale Giants', seed: 5, powerRating: 90, record: { wins: 10, losses: 4 } },
          { id: '6', name: 'Chandler Champions', seed: 6, powerRating: 87, record: { wins: 9, losses: 5 } },
          { id: '7', name: 'Peoria Panthers', seed: 7, powerRating: 83, record: { wins: 8, losses: 6 } },
          { id: '8', name: 'Gilbert Gladiators', seed: 8, powerRating: 91, record: { wins: 11, losses: 3 } },
        ];

        const mockTournament = TournamentFactory.createSingleElimination(mockTeams, {
          consolationRounds: 1,
        });

        mockTournament.id = tournamentId;
        mockTournament.name = 'Phoenix Spring Championship 2024';
        (mockTournament as any).location = 'Phoenix Sports Complex';
        (mockTournament as any).startTime = new Date('2024-03-15T09:00:00');
        (mockTournament as any).description = 'Annual spring basketball championship featuring the top youth teams from across Phoenix.';

        const engine = new TournamentEngine(mockTournament);
        const generatedBracket = engine.generateBracket();

        // Add some mock results
        if (generatedBracket.rounds[0]) {
          generatedBracket.rounds[0].matches[0].score = { team1Score: 78, team2Score: 65 };
          generatedBracket.rounds[0].matches[0].winner = generatedBracket.rounds[0].matches[0].team1;
          generatedBracket.rounds[0].matches[0].status = 'completed';

          generatedBracket.rounds[0].matches[1].score = { team1Score: 72, team2Score: 69 };
          generatedBracket.rounds[0].matches[1].winner = generatedBracket.rounds[0].matches[1].team2;
          generatedBracket.rounds[0].matches[1].status = 'completed';

          generatedBracket.rounds[0].matches[2].status = 'in_progress';
          generatedBracket.rounds[0].matches[2].score = { team1Score: 45, team2Score: 42 };
        }

        mockTournament.bracket = generatedBracket;
        mockTournament.matches = generatedBracket.rounds.flatMap(round => round.matches);

        setTournament(mockTournament);
        setBracket(generatedBracket);
      } catch (error) {
        console.error('Error loading tournament:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTournament();
  }, [tournamentId]);

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    setActiveTab('details');
  };

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team);
    setActiveTab('teams');
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: tournament?.name,
        text: `Check out the ${tournament?.name} bracket!`,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const toggleNotifications = () => {
    setNotifications(!notifications);
    // In real app, would subscribe/unsubscribe to push notifications
  };

  const getUpcomingMatches = () => {
    if (!tournament?.matches) return [];
    return tournament.matches
      .filter(match => match.status === 'pending' && match.scheduledTime)
      .sort((a, b) => new Date(a.scheduledTime!).getTime() - new Date(b.scheduledTime!).getTime())
      .slice(0, 5);
  };

  const getLiveMatches = () => {
    if (!tournament?.matches) return [];
    return tournament.matches.filter(match => match.status === 'in_progress');
  };

  const getRecentResults = () => {
    if (!tournament?.matches) return [];
    return tournament.matches
      .filter(match => match.status === 'completed')
      .slice(-5);
  };

  const getTeamStats = (team: Team) => {
    if (!tournament?.matches) return { played: 0, won: 0, lost: 0 };
    
    const teamMatches = tournament.matches.filter(match => 
      (match.team1?.id === team.id || match.team2?.id === team.id) && 
      match.status === 'completed'
    );

    const won = teamMatches.filter(match => match.winner?.id === team.id).length;
    const lost = teamMatches.length - won;

    return { played: teamMatches.length, won, lost };
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!tournament || !bracket) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Tournament not found</h1>
          <p className="text-gray-600">The tournament you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {(tournament as any).location}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {(tournament as any).startTime && format(new Date((tournament as any).startTime), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {tournament.teams.length} teams
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleNotifications}
                className={notifications ? 'bg-blue-50 text-blue-600' : ''}
              >
                <Bell className="w-4 h-4 mr-1" />
                {notifications ? 'Notifications On' : 'Get Notified'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Updates Bar */}
      {getLiveMatches().length > 0 && (
        <div className="bg-red-600 text-white py-2">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="font-medium">LIVE:</span>
              <span>{getLiveMatches().length} match{getLiveMatches().length !== 1 ? 'es' : ''} in progress</span>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="bracket" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Bracket
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Details
            </TabsTrigger>
          </TabsList>

          {/* Bracket View */}
          <TabsContent value="bracket">
            <Card className="p-6">
              <div className="h-[600px]">
                <BracketView
                  tournament={tournament}
                  bracket={bracket}
                  onMatchClick={handleMatchClick}
                  onTeamClick={handleTeamClick}
                  showControls={true}
                  interactive={true}
                />
              </div>
            </Card>
          </TabsContent>

          {/* Matches View */}
          <TabsContent value="matches" className="space-y-6">
            {/* Live Matches */}
            {getLiveMatches().length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  Live Matches
                </h3>
                <div className="grid gap-4">
                  {getLiveMatches().map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onUpdateScore={() => {}}
                      showControls={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Matches */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Upcoming Matches</h3>
              <div className="grid gap-4">
                {getUpcomingMatches().map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onUpdateScore={() => {}}
                    showControls={false}
                  />
                ))}
              </div>
            </div>

            {/* Recent Results */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Results</h3>
              <div className="grid gap-4">
                {getRecentResults().map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onUpdateScore={() => {}}
                    showControls={false}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Teams View */}
          <TabsContent value="teams" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-1" />
                Filter
              </Button>
            </div>

            <div className="grid gap-4">
              {tournament.teams
                .filter(team => 
                  team.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(team => {
                  const stats = getTeamStats(team);
                  const isSelected = selectedTeam?.id === team.id;
                  
                  return (
                    <Card 
                      key={team.id} 
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedTeam(team)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                            {team.seed}
                          </Badge>
                          <div>
                            <h4 className="font-semibold">{team.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Regular Season: {team.record?.wins}-{team.record?.losses}</span>
                              {team.powerRating && (
                                <span>Rating: {team.powerRating}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-gray-600">Tournament</div>
                          <div className="font-semibold">
                            {stats.won}-{stats.lost}
                          </div>
                          {stats.played > 0 && (
                            <div className="text-xs text-gray-500">
                              {((stats.won / stats.played) * 100).toFixed(0)}% win rate
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Team's tournament path */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t">
                          <h5 className="font-medium mb-2">Tournament Path</h5>
                          <div className="space-y-2">
                            {tournament.matches
                              .filter(match => 
                                match.team1?.id === team.id || match.team2?.id === team.id
                              )
                              .map(match => (
                                <div key={match.id} className="flex items-center justify-between text-sm">
                                  <span>
                                    vs {match.team1?.id === team.id ? match.team2?.name : match.team1?.name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {match.score && (
                                      <span className="font-mono">
                                        {match.team1?.id === team.id 
                                          ? `${match.score.team1Score}-${match.score.team2Score}`
                                          : `${match.score.team2Score}-${match.score.team1Score}`
                                        }
                                      </span>
                                    )}
                                    <Badge variant="outline" className={
                                      match.status === 'completed' 
                                        ? match.winner?.id === team.id 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }>
                                      {match.status === 'completed' 
                                        ? match.winner?.id === team.id ? 'W' : 'L'
                                        : match.status
                                      }
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
            </div>
          </TabsContent>

          {/* Details View */}
          <TabsContent value="details" className="space-y-6">
            {selectedMatch ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">Match Details</h3>
                <MatchCard
                  match={selectedMatch}
                  onUpdateScore={() => {}}
                  showControls={false}
                />
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-4">Tournament Information</h3>
                <Card className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Description</h4>
                      <p className="text-gray-600">{(tournament as any).description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Format</p>
                        <p className="font-semibold">{tournament.type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Teams</p>
                        <p className="font-semibold">{tournament.teams.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Rounds</p>
                        <p className="font-semibold">{bracket.totalRounds}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Matches</p>
                        <p className="font-semibold">{bracket.totalMatches}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}