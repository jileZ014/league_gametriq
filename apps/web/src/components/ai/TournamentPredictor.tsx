/**
 * Tournament Predictor Component
 * AI-powered tournament bracket prediction and seeding analysis
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Target, 
  BarChart3, 
  Zap,
  Medal,
  TrendingUp,
  AlertTriangle,
  Crown,
  Users,
  Star
} from 'lucide-react';
import { Team, TournamentSeeding, ChampionshipProjection, UpsetProbability } from '@/lib/ai/types';
import { getAIEngine } from '@/lib/ai';

interface TournamentPredictorProps {
  teams: Team[];
  className?: string;
}

export function TournamentPredictor({
  teams,
  className = ''
}: TournamentPredictorProps) {
  const [seeding, setSeeding] = useState<TournamentSeeding[]>([]);
  const [championshipProjections, setChampionshipProjections] = useState<ChampionshipProjection[]>([]);
  const [upsetProbabilities, setUpsetProbabilities] = useState<UpsetProbability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teams.length >= 4) {
      generateTournamentAnalysis();
    }
  }, [teams]);

  const generateTournamentAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const aiEngine = getAIEngine();
      const tournamentAnalytics = aiEngine.getTournamentAnalytics();
      
      // Generate seeding
      const seedingResult = await tournamentAnalytics.generateSeeding(teams);
      setSeeding(seedingResult.data);
      
      // Generate championship projections
      const championshipResult = await tournamentAnalytics.generateChampionshipProjections(
        seedingResult.data, 
        teams
      );
      setChampionshipProjections(championshipResult.data);
      
      // Identify potential upsets
      const upsetsResult = await tournamentAnalytics.identifyUpsets(
        seedingResult.data, 
        teams
      );
      setUpsetProbabilities(upsetsResult.data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tournament analysis failed');
      console.error('Tournament analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeedColor = (seed: number) => {
    if (seed <= 2) return 'bg-green-100 text-green-800 border-green-200';
    if (seed <= 4) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (seed <= 8) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getChampionshipOddsColor = (odds: number) => {
    if (odds > 0.3) return 'text-green-600';
    if (odds > 0.15) return 'text-blue-600';
    if (odds > 0.05) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (teams.length < 4) {
    return (
      <Card className={`w-full border-yellow-200 ${className}`}>
        <CardContent className="p-6 text-center">
          <Trophy className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">Need at least 4 teams to generate tournament predictions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full border-yellow-200 bg-gradient-to-br from-yellow-50 to-white ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-black flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Tournament Predictor
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-yellow-300 text-black">
              {teams.length} Teams
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={generateTournamentAnalysis}
              disabled={loading}
              className="border-yellow-300 text-black hover:bg-yellow-50"
            >
              {loading ? (
                <Zap className="h-4 w-4 animate-pulse" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse grid grid-cols-2 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="text-center text-sm text-gray-600">
              Analyzing tournament scenarios...
            </div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateTournamentAnalysis}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="seeding" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="seeding">Seeding</TabsTrigger>
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="upsets">Upsets</TabsTrigger>
            </TabsList>

            <TabsContent value="seeding" className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-medium text-black flex items-center gap-1">
                  <Medal className="h-4 w-4" />
                  Optimal Tournament Seeding
                </h3>
                
                <div className="grid gap-2">
                  {seeding.slice(0, 8).map((seed) => {
                    const team = teams.find(t => t.id === seed.teamId);
                    if (!team) return null;
                    
                    const totalGames = team.wins + team.losses;
                    const winPct = totalGames > 0 ? (team.wins / totalGames * 100).toFixed(1) : '0.0';
                    
                    return (
                      <div key={seed.teamId} className="flex items-center gap-3 p-3 bg-white rounded border border-yellow-200">
                        <Badge className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getSeedColor(seed.seed)}`}>
                          {seed.seed}
                        </Badge>
                        
                        <div className="flex-1">
                          <div className="font-medium text-black">{team.name}</div>
                          <div className="text-sm text-gray-600">
                            {team.wins}-{team.losses} ({winPct}%) • {team.league}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium text-black">
                            Rating: {seed.rating.toFixed(3)}
                          </div>
                          <div className="text-xs text-gray-600">
                            SOS: {seed.strengthOfSchedule.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-sm font-bold text-yellow-600">
                            {(seed.championshipOdds * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">Title Odds</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-black flex items-center gap-1 mb-3">
                    <Crown className="h-4 w-4" />
                    Championship Projections
                  </h3>
                  
                  <div className="space-y-2">
                    {championshipProjections.slice(0, 6).map((projection, index) => (
                      <div key={projection.team.id} className="flex items-center gap-3 p-3 bg-white rounded border border-yellow-200">
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-medium text-black">{projection.team.name}</div>
                          <div className="text-sm text-gray-600">
                            {projection.keyFactors.slice(0, 2).join(', ')}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Championship Odds</span>
                              <span className={`font-medium ${getChampionshipOddsColor(projection.probability)}`}>
                                {(projection.probability * 100).toFixed(1)}%
                              </span>
                            </div>
                            <Progress 
                              value={projection.probability * 100} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <BarChart3 className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-black mb-1">AI Analysis Summary</div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div>• Top {championshipProjections.length} teams have {((championshipProjections.slice(0, 3).reduce((sum, p) => sum + p.probability, 0)) * 100).toFixed(1)}% combined championship probability</div>
                        <div>• Tournament appears {(championshipProjections[0]?.probability || 0) > 0.4 ? 'predictable with clear favorite' : 'competitive with multiple contenders'}</div>
                        <div>• Seeding recommendations based on performance metrics and strength of schedule</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upsets" className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-medium text-black flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Potential Upset Scenarios
                </h3>
                
                {upsetProbabilities.length > 0 ? (
                  <div className="space-y-2">
                    {upsetProbabilities.slice(0, 5).map((upset, index) => (
                      <div key={index} className="p-3 bg-white rounded border border-red-200">
                        <div className="flex items-center gap-3 mb-2">
                          <TrendingUp className="h-4 w-4 text-red-500" />
                          <div className="flex-1">
                            <div className="font-medium text-black">
                              {upset.matchup.team2.name} over {upset.matchup.team1.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              Round {upset.matchup.round} • {(upset.probability * 100).toFixed(1)}% upset probability
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="border-red-300 text-red-700"
                          >
                            High Risk
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-xs text-gray-600 mb-1">Key Factors:</div>
                          <div className="flex flex-wrap gap-1">
                            {upset.factors.map((factor, factorIndex) => (
                              <Badge 
                                key={factorIndex} 
                                variant="outline" 
                                className="text-xs border-gray-300"
                              >
                                {factor.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                    <Star className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <div className="font-medium text-green-800">Low Upset Risk</div>
                    <div className="text-sm text-green-700 mt-1">
                      Current seeding appears well-balanced with favorites likely to advance
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 mt-4 border-t border-yellow-100">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>AI Tournament Analysis</span>
          </div>
          <span>Legacy Youth Sports</span>
        </div>
      </CardContent>
    </Card>
  );
}