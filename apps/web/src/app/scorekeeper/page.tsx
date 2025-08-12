'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOffline } from '@/hooks/useOffline';
import { usePWA } from '@/hooks/usePWA';
import { 
  Clock, 
  Users, 
  Trophy, 
  Pause, 
  Play, 
  RotateCcw,
  Plus,
  Minus,
  AlertCircle,
  Wifi,
  WifiOff,
  Save,
  Send
} from 'lucide-react';

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: number;
  timeRemaining: string;
  status: 'not_started' | 'in_progress' | 'halftime' | 'finished';
  fouls: {
    home: number;
    away: number;
  };
  timeouts: {
    home: number;
    away: number;
  };
}

export default function ScorekeeperDashboard() {
  const isOffline = useOffline();
  const { isInstalled } = usePWA();
  
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [games, setGames] = useState<Game[]>([
    {
      id: '1',
      homeTeam: 'Phoenix Suns',
      awayTeam: 'Desert Hawks',
      homeScore: 0,
      awayScore: 0,
      period: 1,
      timeRemaining: '10:00',
      status: 'not_started',
      fouls: { home: 0, away: 0 },
      timeouts: { home: 3, away: 3 }
    },
    {
      id: '2',
      homeTeam: 'Valley Thunder',
      awayTeam: 'Mesa Lightning',
      homeScore: 24,
      awayScore: 18,
      period: 2,
      timeRemaining: '5:32',
      status: 'in_progress',
      fouls: { home: 3, away: 5 },
      timeouts: { home: 2, away: 3 }
    }
  ]);
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [pendingActions, setPendingActions] = useState<any[]>([]);

  // Handle score updates with offline support
  const updateScore = useCallback((gameId: string, team: 'home' | 'away', delta: number) => {
    setGames(prev => prev.map(game => {
      if (game.id === gameId) {
        const newGame = { ...game };
        if (team === 'home') {
          newGame.homeScore = Math.max(0, newGame.homeScore + delta);
        } else {
          newGame.awayScore = Math.max(0, newGame.awayScore + delta);
        }
        
        // Queue for sync if offline
        if (isOffline) {
          setPendingActions(prev => [...prev, {
            type: 'score_update',
            gameId,
            team,
            score: team === 'home' ? newGame.homeScore : newGame.awayScore,
            timestamp: new Date().toISOString()
          }]);
        }
        
        return newGame;
      }
      return game;
    }));
  }, [isOffline]);

  // Handle fouls
  const updateFouls = useCallback((gameId: string, team: 'home' | 'away', delta: number) => {
    setGames(prev => prev.map(game => {
      if (game.id === gameId) {
        const newGame = { ...game };
        if (team === 'home') {
          newGame.fouls.home = Math.max(0, newGame.fouls.home + delta);
        } else {
          newGame.fouls.away = Math.max(0, newGame.fouls.away + delta);
        }
        
        if (isOffline) {
          setPendingActions(prev => [...prev, {
            type: 'foul_update',
            gameId,
            team,
            fouls: team === 'home' ? newGame.fouls.home : newGame.fouls.away,
            timestamp: new Date().toISOString()
          }]);
        }
        
        return newGame;
      }
      return game;
    }));
  }, [isOffline]);

  // Handle timeouts
  const useTimeout = useCallback((gameId: string, team: 'home' | 'away') => {
    setGames(prev => prev.map(game => {
      if (game.id === gameId) {
        const newGame = { ...game };
        if (team === 'home' && newGame.timeouts.home > 0) {
          newGame.timeouts.home -= 1;
        } else if (team === 'away' && newGame.timeouts.away > 0) {
          newGame.timeouts.away -= 1;
        }
        
        if (isOffline) {
          setPendingActions(prev => [...prev, {
            type: 'timeout_used',
            gameId,
            team,
            remaining: team === 'home' ? newGame.timeouts.home : newGame.timeouts.away,
            timestamp: new Date().toISOString()
          }]);
        }
        
        return newGame;
      }
      return game;
    }));
  }, [isOffline]);

  // Sync pending actions when online
  useEffect(() => {
    if (!isOffline && pendingActions.length > 0) {
      // Sync with server
      console.log('Syncing', pendingActions.length, 'pending actions');
      // API call would go here
      setPendingActions([]);
    }
  }, [isOffline, pendingActions]);

  const GameCard = ({ game }: { game: Game }) => (
    <Card 
      className={`cursor-pointer transition-all ${selectedGame?.id === game.id ? 'ring-2 ring-orange-500' : ''}`}
      onClick={() => setSelectedGame(game)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <Badge variant={game.status === 'in_progress' ? 'default' : 'secondary'}>
            {game.status === 'in_progress' ? 'LIVE' : game.status.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Period {game.period} - {game.timeRemaining}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium">{game.homeTeam}</span>
            <span className="text-2xl font-bold">{game.homeScore}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">{game.awayTeam}</span>
            <span className="text-2xl font-bold">{game.awayScore}</span>
          </div>
        </div>
        {game.status === 'in_progress' && (
          <div className="mt-4 flex justify-between text-xs text-muted-foreground">
            <span>Fouls: {game.fouls.home} - {game.fouls.away}</span>
            <span>TOs: {game.timeouts.home} - {game.timeouts.away}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const ScoreControl = ({ game }: { game: Game }) => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">Score Control</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Home Team */}
          <div className="space-y-3">
            <h4 className="font-medium">{game.homeTeam}</h4>
            <div className="text-4xl font-bold">{game.homeScore}</div>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => updateScore(game.id, 'home', 1)}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" /> 1
              </Button>
              <Button 
                onClick={() => updateScore(game.id, 'home', 2)}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" /> 2
              </Button>
              <Button 
                onClick={() => updateScore(game.id, 'home', 3)}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" /> 3
              </Button>
              <Button 
                onClick={() => updateScore(game.id, 'home', -1)}
                size="sm"
                variant="outline"
                className="text-red-600"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Away Team */}
          <div className="space-y-3">
            <h4 className="font-medium">{game.awayTeam}</h4>
            <div className="text-4xl font-bold">{game.awayScore}</div>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => updateScore(game.id, 'away', 1)}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" /> 1
              </Button>
              <Button 
                onClick={() => updateScore(game.id, 'away', 2)}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" /> 2
              </Button>
              <Button 
                onClick={() => updateScore(game.id, 'away', 3)}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" /> 3
              </Button>
              <Button 
                onClick={() => updateScore(game.id, 'away', -1)}
                size="sm"
                variant="outline"
                className="text-red-600"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Clock */}
      <div className="text-center space-y-3">
        <div className="text-2xl font-mono">{game.timeRemaining}</div>
        <div className="flex gap-2 justify-center">
          <Button 
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            variant={isTimerRunning ? "destructive" : "default"}
          >
            {isTimerRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {isTimerRunning ? 'Pause' : 'Start'}
          </Button>
          <Button variant="outline">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Fouls and Timeouts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Team Fouls</h4>
          <div className="flex justify-between items-center">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateFouls(game.id, 'home', 1)}
            >
              Home: {game.fouls.home}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateFouls(game.id, 'away', 1)}
            >
              Away: {game.fouls.away}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Timeouts</h4>
          <div className="flex justify-between items-center">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => useTimeout(game.id, 'home')}
              disabled={game.timeouts.home === 0}
            >
              Home: {game.timeouts.home}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => useTimeout(game.id, 'away')}
              disabled={game.timeouts.away === 0}
            >
              Away: {game.timeouts.away}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Scorekeeper Dashboard</h1>
          <p className="text-muted-foreground">Manage live game scores</p>
        </div>
        <div className="flex items-center gap-3">
          {isOffline ? (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline Mode
            </Badge>
          ) : (
            <Badge variant="default" className="gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          )}
          {pendingActions.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Save className="h-3 w-3" />
              {pendingActions.length} Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Offline Alert */}
      {isOffline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900">Offline Mode Active</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Your changes are being saved locally and will sync when connection is restored.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Games List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Today's Games</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {games.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Score Control Panel */}
        <div className="lg:col-span-2">
          {selectedGame ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedGame.homeTeam} vs {selectedGame.awayTeam}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="score" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="score">Score</TabsTrigger>
                    <TabsTrigger value="stats">Stats</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>
                  <TabsContent value="score" className="mt-6">
                    <ScoreControl game={selectedGame} />
                  </TabsContent>
                  <TabsContent value="stats">
                    <div className="text-center py-8 text-muted-foreground">
                      Player statistics tracking coming soon
                    </div>
                  </TabsContent>
                  <TabsContent value="notes">
                    <div className="space-y-4">
                      <textarea 
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={6}
                        placeholder="Add game notes..."
                      />
                      <Button className="w-full">
                        <Send className="h-4 w-4 mr-2" />
                        Submit Game Report
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96 text-muted-foreground">
                <div className="text-center">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a game to start scoring</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}