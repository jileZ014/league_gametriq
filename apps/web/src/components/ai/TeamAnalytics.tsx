/**
 * Team Analytics Component
 * AI-powered team performance analysis and insights
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Target,
  BarChart3,
  Zap,
  Star,
  Activity,
  Award
} from 'lucide-react';
import { Team, Player } from '@/lib/ai/types';
import { getAIEngine } from '@/lib/ai';

interface TeamAnalyticsProps {
  team: Team;
  players: Player[];
  className?: string;
}

interface TeamAnalysis {
  chemistry: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export function TeamAnalytics({
  team,
  players,
  className = ''
}: TeamAnalyticsProps) {
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (players.length > 0) {
      loadTeamAnalysis();
    }
  }, [team.id, players]);

  const loadTeamAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const aiEngine = getAIEngine();
      const teamAnalytics = aiEngine.getTeamAnalytics();
      
      const result = await teamAnalytics.analyzeTeamChemistry(team, players);
      setAnalysis(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Team analysis failed');
      console.error('Team analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate team statistics
  const totalGames = team.wins + team.losses;
  const winPercentage = totalGames > 0 ? (team.wins / totalGames) * 100 : 0;
  const avgPointsFor = totalGames > 0 ? team.pointsFor / totalGames : 0;
  const avgPointsAgainst = totalGames > 0 ? team.pointsAgainst / totalGames : 0;
  const pointDifferential = avgPointsFor - avgPointsAgainst;

  // Player statistics
  const avgPlayerEfficiency = players.length > 0 
    ? players.reduce((sum, p) => sum + p.efficiency, 0) / players.length 
    : 0;
  const topScorers = players
    .sort((a, b) => b.pointsPerGame - a.pointsPerGame)
    .slice(0, 3);

  const getWinPercentageColor = (pct: number) => {
    if (pct >= 70) return 'text-green-600 bg-green-50';
    if (pct >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getChemistryLevel = (chemistry: number) => {
    if (chemistry >= 0.8) return { level: 'Excellent', color: 'text-green-600' };
    if (chemistry >= 0.6) return { level: 'Good', color: 'text-blue-600' };
    if (chemistry >= 0.4) return { level: 'Average', color: 'text-yellow-600' };
    return { level: 'Needs Work', color: 'text-red-600' };
  };

  return (
    <Card className={`w-full border-yellow-200 bg-gradient-to-br from-yellow-50 to-white ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-black flex items-center gap-2">
            <Users className="h-5 w-5 text-yellow-600" />
            {team.name} Analytics
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-yellow-300 text-black">
              {team.league}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTeamAnalysis}
              disabled={loading}
              className="border-yellow-300 text-black hover:bg-yellow-50"
            >
              <Zap className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Team Record & Performance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white rounded border border-yellow-200">
            <div className="text-2xl font-bold text-black">{team.wins}-{team.losses}</div>
            <div className="text-xs text-gray-600">Record</div>
            <div className={`text-xs font-medium mt-1 px-2 py-1 rounded ${getWinPercentageColor(winPercentage)}`}>
              {winPercentage.toFixed(1)}%
            </div>
          </div>

          <div className="text-center p-3 bg-white rounded border border-yellow-200">
            <div className="text-2xl font-bold text-green-600">{avgPointsFor.toFixed(1)}</div>
            <div className="text-xs text-gray-600">Avg Points For</div>
            <div className="text-xs text-gray-500 mt-1">
              {avgPointsFor > 100 ? 'High' : avgPointsFor > 80 ? 'Good' : 'Low'} Scoring
            </div>
          </div>

          <div className="text-center p-3 bg-white rounded border border-yellow-200">
            <div className="text-2xl font-bold text-blue-600">{avgPointsAgainst.toFixed(1)}</div>
            <div className="text-xs text-gray-600">Avg Points Against</div>
            <div className="text-xs text-gray-500 mt-1">
              {avgPointsAgainst < 80 ? 'Elite' : avgPointsAgainst < 100 ? 'Good' : 'Weak'} Defense
            </div>
          </div>

          <div className="text-center p-3 bg-white rounded border border-yellow-200">
            <div className={`text-2xl font-bold ${pointDifferential > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {pointDifferential > 0 ? '+' : ''}{pointDifferential.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600">Point Differential</div>
            <div className="text-xs text-gray-500 mt-1">
              Per Game
            </div>
          </div>
        </div>

        {/* Team Chemistry Analysis */}
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
          </div>
        ) : analysis ? (
          <>
            {/* Team Chemistry */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-black flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  Team Chemistry
                </h3>
                <Badge className={`${getChemistryLevel(analysis.chemistry).color} bg-transparent border`}>
                  {getChemistryLevel(analysis.chemistry).level}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Progress value={analysis.chemistry * 100} className="h-3" />
                <div className="text-center text-sm text-gray-600">
                  {Math.round(analysis.chemistry * 100)}% Team Chemistry Score
                </div>
              </div>
            </div>

            {/* Strengths and Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium text-black flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Team Strengths
                </h3>
                <div className="space-y-1">
                  {analysis.strengths.length > 0 ? (
                    analysis.strengths.map((strength, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm">
                        <Star className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="text-green-800">{strength}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 italic">No specific strengths identified</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-black flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Areas for Improvement
                </h3>
                <div className="space-y-1">
                  {analysis.weaknesses.length > 0 ? (
                    analysis.weaknesses.map((weakness, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm">
                        <Target className="h-3 w-3 text-red-600 flex-shrink-0" />
                        <span className="text-red-800">{weakness}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 italic">No major weaknesses identified</div>
                  )}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-black flex items-center gap-1">
                  <Award className="h-4 w-4 text-purple-600" />
                  AI Recommendations
                </h3>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-purple-50 rounded">
                      <BarChart3 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-purple-800">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Top Players */}
        <div className="space-y-3">
          <h3 className="font-medium text-black flex items-center gap-1">
            <Star className="h-4 w-4" />
            Top Performers
          </h3>
          
          <div className="grid gap-2">
            {topScorers.map((player, index) => (
              <div key={player.id} className="flex items-center gap-3 p-3 bg-white rounded border border-yellow-200">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs font-bold text-yellow-600">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-black">{player.name}</div>
                  <div className="text-xs text-gray-600">{player.position}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-black">{player.pointsPerGame.toFixed(1)} PPG</div>
                  <div className="text-xs text-gray-600">
                    {player.assistsPerGame.toFixed(1)} APG • {player.reboundsPerGame.toFixed(1)} RPG
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-yellow-600">{player.efficiency.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">EFF</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Form */}
        <div className="space-y-3">
          <h3 className="font-medium text-black flex items-center gap-1">
            <Activity className="h-4 w-4" />
            Current Form
          </h3>
          
          <div className="flex items-center gap-4 p-3 bg-white rounded border border-yellow-200">
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">Current Streak</div>
              <div className="font-bold text-lg text-black">{team.streak}</div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">Last 5 Games</div>
              <div className="flex gap-1">
                {team.lastFiveGames.map((result, index) => (
                  <div 
                    key={index} 
                    className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white ${
                      result === 'W' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {result}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-sm text-gray-600 mb-1">Team Efficiency</div>
              <div className="font-bold text-lg text-yellow-600">
                {avgPlayerEfficiency.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-yellow-100">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>AI Team Analysis</span>
          </div>
          <span>Legacy Youth Sports</span>
        </div>
      </CardContent>
    </Card>
  );
}