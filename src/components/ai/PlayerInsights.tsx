/**
 * Player Insights Component
 * AI-powered player performance analysis and predictions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/simple-ui';
import { Badge } from '@/components/simple-ui';
import { Button } from '@/components/simple-ui';
import { Progress } from '@/components/simple-ui';
import { 
  User, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity,
  BarChart3,
  Zap,
  Star,
  AlertTriangle,
  ThumbsUp
} from 'lucide-react';
import { Player, PlayerPerformancePrediction, PerformanceTrend } from '@/lib/ai/types';
import { getAIEngine, getConfidenceLevel } from '@/lib/ai';

interface PlayerInsightsProps {
  player: Player;
  nextGame?: any;
  recentStats?: any[];
  className?: string;
  compact?: boolean;
}

export function PlayerInsights({
  player,
  nextGame,
  recentStats = [],
  className = '',
  compact = false
}: PlayerInsightsProps) {
  const [prediction, setPrediction] = useState<PlayerPerformancePrediction | null>(null);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nextGame) {
      loadPlayerInsights();
    } else {
      loadPlayerTrends();
    }
  }, [player.id, nextGame]);

  const loadPlayerInsights = async () => {
    if (!nextGame) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const aiEngine = getAIEngine();
      const playerAnalytics = aiEngine.getPlayerAnalytics();
      
      // Get prediction for next game
      const predictionResult = await playerAnalytics.predictPlayerPerformance(
        player, 
        nextGame, 
        recentStats
      );
      setPrediction(predictionResult.data);
      setTrends(predictionResult.data.trends);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      console.error('Player insights error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const aiEngine = getAIEngine();
      const playerAnalytics = aiEngine.getPlayerAnalytics();
      
      // Get trend analysis
      const trendsResult = await playerAnalytics.analyzePlayerTrends(player, recentStats);
      setTrends(trendsResult.data.trends);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      console.error('Player trends error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'improving': return 'text-green-600 bg-green-50';
      case 'declining': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPerformanceLevel = (value: number, max: number = 30) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return { level: 'Excellent', color: 'text-green-600' };
    if (percentage >= 60) return { level: 'Good', color: 'text-blue-600' };
    if (percentage >= 40) return { level: 'Average', color: 'text-yellow-600' };
    return { level: 'Below Average', color: 'text-red-600' };
  };

  if (compact) {
    return (
      <Card className={`border-yellow-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-black">{player.name}</div>
              <div className="text-sm text-gray-600">{player.position}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-black">{player.pointsPerGame.toFixed(1)}</div>
              <div className="text-xs text-gray-500">PPG</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full border-yellow-200 bg-gradient-to-br from-yellow-50 to-white ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-black flex items-center gap-2">
            <User className="h-5 w-5 text-yellow-600" />
            {player.name}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-yellow-300 text-black">
              {player.position}
            </Badge>
            {prediction && (
              <Badge 
                variant={getConfidenceLevel(prediction.confidence) === 'High' ? 'default' : 'secondary'}
                className="bg-yellow-600 text-white"
              >
                {getConfidenceLevel(prediction.confidence)} Confidence
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={nextGame ? loadPlayerInsights : loadPlayerTrends}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Season Stats */}
            <div className="grid grid-cols-3 gap-4 p-3 bg-yellow-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-black">{player.pointsPerGame.toFixed(1)}</div>
                <div className="text-xs text-gray-600">Points/Game</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-black">{player.assistsPerGame.toFixed(1)}</div>
                <div className="text-xs text-gray-600">Assists/Game</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-black">{player.reboundsPerGame.toFixed(1)}</div>
                <div className="text-xs text-gray-600">Rebounds/Game</div>
              </div>
            </div>

            {/* Next Game Prediction */}
            {prediction && nextGame && (
              <div className="space-y-3">
                <h3 className="font-medium text-black flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Next Game Prediction
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white rounded border border-yellow-200">
                    <div className="text-xl font-bold text-green-600">
                      {prediction.expectedPoints.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-600">Expected Points</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getPerformanceLevel(prediction.expectedPoints).level}
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded border border-yellow-200">
                    <div className="text-xl font-bold text-blue-600">
                      {prediction.expectedAssists.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-600">Expected Assists</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getPerformanceLevel(prediction.expectedAssists, 10).level}
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded border border-yellow-200">
                    <div className="text-xl font-bold text-purple-600">
                      {prediction.expectedRebounds.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-600">Expected Rebounds</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getPerformanceLevel(prediction.expectedRebounds, 15).level}
                    </div>
                  </div>
                </div>

                {/* Risk Factors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded border border-yellow-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-black">Injury Risk</span>
                      {prediction.injuryRisk > 0.7 ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <Progress 
                      value={prediction.injuryRisk * 100} 
                      className="h-2"
                    />
                    <div className="text-xs text-gray-600 mt-1">
                      {prediction.injuryRisk < 0.3 ? 'Low' : 
                       prediction.injuryRisk < 0.6 ? 'Moderate' : 'High'} Risk
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded border border-yellow-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-black">Fatigue Level</span>
                      <Activity className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full" 
                        style={{width: `${prediction.fatigueLevel * 100}%`}}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {prediction.fatigueLevel < 0.3 ? 'Fresh' : 
                       prediction.fatigueLevel < 0.6 ? 'Moderate' : 'Tired'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Trends */}
            {trends.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-black flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Performance Trends
                </h3>
                
                <div className="space-y-2">
                  {trends.map((trend, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-white rounded border border-yellow-200">
                      {getTrendIcon(trend.direction)}
                      <div className="flex-1">
                        <div className="font-medium text-sm text-black">{trend.metric}</div>
                        <div className="text-xs text-gray-600 capitalize">
                          {trend.direction} • {Math.round(trend.confidence * 100)}% confidence
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getTrendColor(trend.direction)}`}
                      >
                        {(trend.magnitude * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Player Efficiency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  Efficiency Rating
                </span>
                <span className="text-lg font-bold text-yellow-600">
                  {player.efficiency.toFixed(1)}
                </span>
              </div>
              <Progress 
                value={(player.efficiency / 30) * 100} 
                className="h-2 bg-gray-200"
              />
              <div className="text-xs text-gray-600 text-center">
                {getPerformanceLevel(player.efficiency, 30).level}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={nextGame ? loadPlayerInsights : loadPlayerTrends}
                className="flex-1 border-yellow-300 text-black hover:bg-yellow-50"
              >
                <Zap className="h-4 w-4 mr-1" />
                Refresh Analysis
              </Button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-yellow-100">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>AI Player Analysis</span>
          </div>
          <span>Legacy Youth Sports</span>
        </div>
      </CardContent>
    </Card>
  );
}