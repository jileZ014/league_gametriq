/**
 * Lineup Optimizer Component
 * AI-powered lineup optimization with tactical insights
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/simple-ui';
import { Badge } from '@/components/simple-ui';
import { Button } from '@/components/simple-ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/simple-ui';
import { 
  Users, 
  TrendingUp, 
  BarChart3, 
  Zap, 
  RefreshCw,
  Target,
  Star,
  ArrowRight,
  Shield,
  Activity
} from 'lucide-react';
import { Player, Team, LineupOptimization } from '@/lib/ai/types';
import { getAIEngine } from '@/lib/ai';

interface LineupOptimizerProps {
  team: Team;
  players: Player[];
  opponent?: Team;
  className?: string;
}

interface LineupDisplay {
  PG: Player | null;
  SG: Player | null;
  SF: Player | null;
  PF: Player | null;
  C: Player | null;
}

export function LineupOptimizer({
  team,
  players,
  opponent,
  className = ''
}: LineupOptimizerProps) {
  const [optimization, setOptimization] = useState<LineupOptimization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('optimal');

  useEffect(() => {
    if (players.length >= 5) {
      optimizeLineup();
    }
  }, [players, opponent]);

  const optimizeLineup = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const aiEngine = getAIEngine();
      const teamAnalytics = aiEngine.getTeamAnalytics();
      
      const result = await teamAnalytics.optimizeLineup(players, opponent);
      setOptimization(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lineup optimization failed');
      console.error('Lineup optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLineupDisplay = (positions: any): LineupDisplay => {
    return {
      PG: players.find(p => p.id === positions.pointGuard) || null,
      SG: players.find(p => p.id === positions.shootingGuard) || null,
      SF: players.find(p => p.id === positions.smallForward) || null,
      PF: players.find(p => p.id === positions.powerForward) || null,
      C: players.find(p => p.id === positions.center) || null
    };
  };

  const PlayerCard = ({ player, position }: { player: Player | null; position: string }) => (
    <div className="bg-white rounded-lg border border-yellow-200 p-3 text-center">
      <div className="text-xs font-medium text-yellow-600 mb-1">{position}</div>
      {player ? (
        <>
          <div className="font-bold text-black text-sm">{player.name}</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>{player.pointsPerGame.toFixed(1)} PPG</div>
            <div className="flex items-center justify-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span>{player.efficiency.toFixed(1)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-gray-400 text-sm">No player assigned</div>
      )}
    </div>
  );

  const LineupView = ({ lineup }: { lineup: LineupDisplay }) => (
    <div className="grid grid-cols-5 gap-2">
      <PlayerCard player={lineup.PG} position="PG" />
      <PlayerCard player={lineup.SG} position="SG" />
      <PlayerCard player={lineup.SF} position="SF" />
      <PlayerCard player={lineup.PF} position="PF" />
      <PlayerCard player={lineup.C} position="C" />
    </div>
  );

  if (players.length < 5) {
    return (
      <Card className={`w-full border-yellow-200 ${className}`}>
        <CardContent className="p-6 text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">Need at least 5 players to optimize lineup</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full border-yellow-200 bg-gradient-to-br from-yellow-50 to-white ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-black flex items-center gap-2">
            <Users className="h-5 w-5 text-yellow-600" />
            Lineup Optimizer
          </CardTitle>
          <div className="flex gap-2">
            {opponent && (
              <Badge variant="outline" className="border-yellow-300 text-black">
                vs {opponent.name}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={optimizeLineup}
              disabled={loading}
              className="border-yellow-300 text-black hover:bg-yellow-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse grid grid-cols-5 gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="text-center text-sm text-gray-600">
              Analyzing player combinations...
            </div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={optimizeLineup}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : optimization ? (
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="optimal">Optimal</TabsTrigger>
              <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="optimal" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-black">Recommended Starting Lineup</h3>
                  <Badge className="bg-yellow-600 text-white">
                    {Math.round(optimization.synergy * 100)}% Synergy
                  </Badge>
                </div>
                
                <LineupView lineup={getLineupDisplay(optimization.positions)} />

                <div className="grid grid-cols-3 gap-4 p-3 bg-yellow-50 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm font-medium text-black">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Offensive Rating
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {optimization.offensiveRating.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm font-medium text-black">
                      <Shield className="h-4 w-4 text-blue-600" />
                      Defensive Rating
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {optimization.defensiveRating.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm font-medium text-black">
                      <Activity className="h-4 w-4 text-purple-600" />
                      Expected +/-
                    </div>
                    <div className="text-lg font-bold text-purple-600">
                      {optimization.expectedPlusMinusPerGame > 0 ? '+' : ''}
                      {optimization.expectedPlusMinusPerGame.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="alternatives" className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-medium text-black">Alternative Lineups</h3>
                {optimization.alternatives.slice(0, 2).map((alt, index) => (
                  <div key={index} className="border border-yellow-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-black">
                        Option {index + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(alt.synergy * 100)}% Synergy
                      </Badge>
                    </div>
                    <LineupView lineup={getLineupDisplay(alt.positions)} />
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>OFF: {alt.offensiveRating.toFixed(1)}</span>
                      <span>DEF: {alt.defensiveRating.toFixed(1)}</span>
                      <span>+/-: {alt.expectedPlusMinusPerGame > 0 ? '+' : ''}{alt.expectedPlusMinusPerGame.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-black mb-2 flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    Lineup Analysis
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span className="text-gray-700">Team Chemistry</span>
                      <Badge variant="outline">
                        {Math.round(optimization.synergy * 100)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span className="text-gray-700">Offensive Potential</span>
                      <Badge variant="outline">
                        {optimization.offensiveRating > 110 ? 'High' : 
                         optimization.offensiveRating > 100 ? 'Good' : 'Average'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span className="text-gray-700">Defensive Strength</span>
                      <Badge variant="outline">
                        {optimization.defensiveRating > 110 ? 'Elite' : 
                         optimization.defensiveRating > 100 ? 'Good' : 'Average'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {opponent && (
                  <div>
                    <h3 className="font-medium text-black mb-2 flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      Matchup Strategy vs {opponent.name}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="p-2 bg-blue-50 rounded flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Lineup optimized for opponent's playing style</span>
                      </div>
                      <div className="p-2 bg-green-50 rounded flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Focus on exploiting their defensive weaknesses</span>
                      </div>
                      <div className="p-2 bg-purple-50 rounded flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>Defensive assignments to limit their key players</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-yellow-100">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>AI-Optimized Lineup</span>
          </div>
          <span>Legacy Youth Sports</span>
        </div>
      </CardContent>
    </Card>
  );
}