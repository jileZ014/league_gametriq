/**
 * Game Prediction Card Component
 * Displays AI-powered game predictions with confidence levels
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/simple-ui';
import { Badge } from '@/components/simple-ui';
import { Button } from '@/components/simple-ui';
import { Progress } from '@/components/simple-ui';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Users,
  BarChart3,
  Zap,
  Shield
} from 'lucide-react';
import { Team, Game, GamePrediction } from '@/lib/ai/types';
import { getAIEngine, getConfidenceLevel } from '@/lib/ai';

interface PredictionCardProps {
  homeTeam: Team;
  awayTeam: Team;
  game: Game;
  className?: string;
  showDetails?: boolean;
  onViewDetails?: () => void;
}

export function PredictionCard({
  homeTeam,
  awayTeam,
  game,
  className = '',
  showDetails = false,
  onViewDetails
}: PredictionCardProps) {
  const [prediction, setPrediction] = useState<GamePrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrediction();
  }, [homeTeam.id, awayTeam.id, game.id]);

  const loadPrediction = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const aiEngine = getAIEngine();
      const gameAnalytics = aiEngine.getGameAnalytics();
      
      const result = await gameAnalytics.predictGame(homeTeam, awayTeam, game);
      setPrediction(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
      console.error('Prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={`w-full border-yellow-200 ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !prediction) {
    return (
      <Card className={`w-full border-red-200 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{error || 'Prediction unavailable'}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadPrediction}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const homeWinProb = Math.round(prediction.homeTeamWinProbability * 100);
  const awayWinProb = Math.round(prediction.awayTeamWinProbability * 100);
  const confidenceLevel = getConfidenceLevel(prediction.confidence);
  const isHomeTeamFavored = prediction.homeTeamWinProbability > 0.5;

  return (
    <Card className={`w-full border-yellow-200 bg-gradient-to-br from-yellow-50 to-white ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-black flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Game Prediction
          </CardTitle>
          <Badge 
            variant={confidenceLevel === 'High' || confidenceLevel === 'Very High' ? 'default' : 'secondary'}
            className="bg-yellow-600 text-white"
          >
            {confidenceLevel} Confidence
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>{new Date(game.date).toLocaleDateString()}</span>
          <span className="text-gray-400">•</span>
          <span>{game.venue}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Team Matchup */}
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Home Team */}
          <div className="text-center">
            <div className="font-bold text-black text-lg">{homeTeam.name}</div>
            <div className="text-sm text-gray-600">
              {homeTeam.wins}-{homeTeam.losses}
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold ${isHomeTeamFavored ? 'text-green-600' : 'text-gray-500'}`}>
                {homeWinProb}%
              </div>
              <div className="text-xs text-gray-500">Win Probability</div>
            </div>
          </div>

          {/* VS */}
          <div className="text-center">
            <div className="text-gray-400 font-medium">VS</div>
            <div className="mt-2 text-sm text-gray-600">
              Predicted Score
            </div>
            <div className="text-lg font-bold text-black">
              {prediction.predictedHomeScore} - {prediction.predictedAwayScore}
            </div>
          </div>

          {/* Away Team */}
          <div className="text-center">
            <div className="font-bold text-black text-lg">{awayTeam.name}</div>
            <div className="text-sm text-gray-600">
              {awayTeam.wins}-{awayTeam.losses}
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold ${!isHomeTeamFavored ? 'text-green-600' : 'text-gray-500'}`}>
                {awayWinProb}%
              </div>
              <div className="text-xs text-gray-500">Win Probability</div>
            </div>
          </div>
        </div>

        {/* Win Probability Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-black">{homeTeam.name}</span>
            <span className="text-black">{awayTeam.name}</span>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full" style={{width: `${homeWinProb}%`}} />
            </div>
            <div 
              className="absolute top-0 right-0 h-3 bg-black rounded-r"
              style={{ width: `${awayWinProb}%` }}
            ></div>
          </div>
        </div>

        {/* Key Factors */}
        {prediction.factors && prediction.factors.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-black flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Key Factors
            </div>
            <div className="space-y-1">
              {prediction.factors.slice(0, showDetails ? prediction.factors.length : 3).map((factor, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {factor.impact > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-gray-700">{factor.description}</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.abs(factor.impact * 100).toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewDetails}
              className="flex-1 border-yellow-300 text-black hover:bg-yellow-50"
            >
              <Users className="h-4 w-4 mr-1" />
              View Details
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadPrediction}
            className="border-yellow-300 text-black hover:bg-yellow-50"
          >
            <Zap className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Confidence Indicator */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-yellow-100">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>AI Confidence: {Math.round(prediction.confidence * 100)}%</span>
          </div>
          <span>Updated: {new Date(prediction.lastUpdated).toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}