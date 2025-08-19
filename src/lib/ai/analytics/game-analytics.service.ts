/**
 * Game Analytics Service
 * Comprehensive game analysis and prediction service
 */

import { 
  Team, 
  Game, 
  GamePrediction, 
  MatchupAnalysis,
  PlayerGameStats,
  AnalyticsResult,
  AIError 
} from '../types';
import { GamePredictionModel } from '../models/game-prediction.model';
import { BasketballVectorStore } from '../retrieval/vector-store';
import { BasketballContextBuilder } from '../retrieval/context-builder';
import { StatEmbeddingsGenerator } from '../embeddings/stat-embeddings';

interface GameAnalyticsConfig {
  cacheEnabled: boolean;
  cacheDuration: number; // minutes
  minConfidenceThreshold: number;
  maxPredictionHorizon: number; // days
}

export class GameAnalyticsService {
  private predictionModel: GamePredictionModel;
  private vectorStore: BasketballVectorStore;
  private contextBuilder: BasketballContextBuilder;
  private embeddingsGenerator: StatEmbeddingsGenerator;
  private cache: Map<string, { data: any; expires: Date; }> = new Map();
  private config: GameAnalyticsConfig;

  constructor(
    predictionModel: GamePredictionModel,
    vectorStore: BasketballVectorStore,
    contextBuilder: BasketballContextBuilder,
    embeddingsGenerator: StatEmbeddingsGenerator,
    config: Partial<GameAnalyticsConfig> = {}
  ) {
    this.predictionModel = predictionModel;
    this.vectorStore = vectorStore;
    this.contextBuilder = contextBuilder;
    this.embeddingsGenerator = embeddingsGenerator;
    
    this.config = {
      cacheEnabled: true,
      cacheDuration: 15, // 15 minutes
      minConfidenceThreshold: 0.6,
      maxPredictionHorizon: 7, // 7 days
      ...config
    };
  }

  /**
   * Generate comprehensive game prediction
   */
  async predictGame(
    homeTeam: Team,
    awayTeam: Team,
    game: Game,
    options: {
      includeFactors?: boolean;
      includeAlternativeScenarios?: boolean;
      historicalGames?: Game[];
      playerStats?: PlayerGameStats[];
    } = {}
  ): Promise<AnalyticsResult<GamePrediction>> {
    try {
      const cacheKey = this.generateCacheKey('prediction', game.id, homeTeam.id, awayTeam.id);
      
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = this.getFromCache<GamePrediction>(cacheKey);
        if (cached) {
          return {
            data: cached,
            confidence: cached.confidence,
            factors: cached.factors.map(f => f.factor),
            cached: true,
            generatedAt: cached.lastUpdated
          };
        }
      }

      // Validate prediction horizon
      const daysDiff = (game.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysDiff > this.config.maxPredictionHorizon) {
        throw new AIError(
          `Prediction horizon exceeds maximum of ${this.config.maxPredictionHorizon} days`,
          'PREDICTION_HORIZON_EXCEEDED',
          { daysDiff, maxHorizon: this.config.maxPredictionHorizon },
          false
        );
      }

      // Generate prediction using ML model
      const prediction = await this.predictionModel.predict(
        homeTeam,
        awayTeam,
        game,
        options.historicalGames || []
      );

      // Enhance prediction with additional analysis
      const enhancedPrediction = await this.enhancePrediction(
        prediction.data,
        homeTeam,
        awayTeam,
        game,
        options
      );

      // Validate confidence threshold
      if (enhancedPrediction.confidence < this.config.minConfidenceThreshold) {
        console.warn(`Low confidence prediction: ${enhancedPrediction.confidence}`);
      }

      // Store in cache
      if (this.config.cacheEnabled) {
        this.setCache(cacheKey, enhancedPrediction);
      }

      return {
        data: enhancedPrediction,
        confidence: enhancedPrediction.confidence,
        factors: enhancedPrediction.factors.map(f => f.factor),
        cached: false,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Error predicting game:', error);
      throw this.createAIError('Game prediction failed', error);
    }
  }

  /**
   * Analyze matchup between two teams
   */
  async analyzeMatchup(
    homeTeam: Team,
    awayTeam: Team,
    options: {
      includePlayerMatchups?: boolean;
      includeHistoricalContext?: boolean;
      historicalGames?: Game[];
      players?: any[];
    } = {}
  ): Promise<AnalyticsResult<MatchupAnalysis>> {
    try {
      const cacheKey = this.generateCacheKey('matchup', homeTeam.id, awayTeam.id);
      
      if (this.config.cacheEnabled) {
        const cached = this.getFromCache<MatchupAnalysis>(cacheKey);
        if (cached) {
          return {
            data: cached,
            confidence: 0.8,
            factors: ['team_stats', 'recent_form', 'head_to_head'],
            cached: true,
            generatedAt: new Date()
          };
        }
      }

      // Build team analytics
      const homeAnalytics = this.calculateTeamAnalytics(homeTeam);
      const awayAnalytics = this.calculateTeamAnalytics(awayTeam);

      // Analyze player matchups if requested
      let keyMatchups: any[] = [];
      if (options.includePlayerMatchups && options.players) {
        keyMatchups = this.analyzePlayerMatchups(
          options.players.filter(p => p.teamId === homeTeam.id),
          options.players.filter(p => p.teamId === awayTeam.id)
        );
      }

      // Calculate tactical advantages
      const tacticalAdvantages = this.calculateTacticalAdvantages(homeAnalytics, awayAnalytics);

      // Generate gameplan recommendations
      const gameplan = this.generateGameplan(homeTeam, awayTeam, homeAnalytics, awayAnalytics);

      // Assess injury impact
      const injuryImpact = this.assessInjuryImpact(options.players || []);

      const matchupAnalysis: MatchupAnalysis = {
        homeTeam: homeAnalytics,
        awayTeam: awayAnalytics,
        keyMatchups,
        tacticalAdvantages,
        gameplan,
        injuryImpact
      };

      if (this.config.cacheEnabled) {
        this.setCache(cacheKey, matchupAnalysis);
      }

      return {
        data: matchupAnalysis,
        confidence: 0.85,
        factors: ['statistical_analysis', 'tactical_assessment', 'player_matchups'],
        cached: false,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Error analyzing matchup:', error);
      throw this.createAIError('Matchup analysis failed', error);
    }
  }

  /**
   * Analyze game performance after completion
   */
  async analyzeGamePerformance(
    game: Game,
    homeTeam: Team,
    awayTeam: Team,
    playerStats: PlayerGameStats[] = []
  ): Promise<AnalyticsResult<{
    gameflow: string[];
    keyMoments: string[];
    performanceHighlights: string[];
    tacticalInsights: string[];
    playerContributions: any[];
  }>> {
    try {
      if (game.status !== 'completed') {
        throw new AIError(
          'Cannot analyze performance of incomplete game',
          'GAME_NOT_COMPLETED',
          { gameId: game.id, status: game.status },
          false
        );
      }

      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;
      const totalPoints = homeScore + awayScore;
      const margin = Math.abs(homeScore - awayScore);

      // Analyze game flow
      const gameflow = this.analyzeGameFlow(game, homeScore, awayScore, totalPoints);

      // Identify key moments
      const keyMoments = this.identifyKeyMoments(game, homeScore, awayScore, playerStats);

      // Performance highlights
      const performanceHighlights = this.extractPerformanceHighlights(playerStats, homeTeam, awayTeam);

      // Tactical insights
      const tacticalInsights = this.generateTacticalInsights(game, homeTeam, awayTeam, homeScore, awayScore);

      // Player contributions
      const playerContributions = this.analyzePlayerContributions(playerStats);

      const analysis = {
        gameflow,
        keyMoments,
        performanceHighlights,
        tacticalInsights,
        playerContributions
      };

      return {
        data: analysis,
        confidence: 0.9,
        factors: ['game_statistics', 'player_performance', 'tactical_analysis'],
        cached: false,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Error analyzing game performance:', error);
      throw this.createAIError('Game performance analysis failed', error);
    }
  }

  /**
   * Get live game insights during play
   */
  async getLiveGameInsights(
    game: Game,
    homeTeam: Team,
    awayTeam: Team,
    currentStats: PlayerGameStats[] = []
  ): Promise<AnalyticsResult<{
    momentum: string;
    keyFactors: string[];
    predictions: {
      finalScore: { home: number; away: number; };
      winProbability: { home: number; away: number; };
    };
    recommendations: string[];
  }>> {
    try {
      if (game.status !== 'in_progress') {
        throw new AIError(
          'Cannot provide live insights for non-active game',
          'GAME_NOT_ACTIVE',
          { gameId: game.id, status: game.status },
          false
        );
      }

      const currentHomeScore = game.homeScore || 0;
      const currentAwayScore = game.awayScore || 0;
      const quarter = game.quarter || 1;
      const timeRemaining = game.timeRemaining || '12:00';

      // Calculate momentum
      const momentum = this.calculateMomentum(currentHomeScore, currentAwayScore, quarter);

      // Identify key factors affecting the game
      const keyFactors = this.identifyLiveGameFactors(
        game,
        homeTeam,
        awayTeam,
        currentStats
      );

      // Predict final score and win probability
      const predictions = await this.predictLiveGameOutcome(
        game,
        homeTeam,
        awayTeam,
        quarter,
        timeRemaining
      );

      // Generate tactical recommendations
      const recommendations = this.generateLiveRecommendations(
        game,
        homeTeam,
        awayTeam,
        currentStats,
        momentum
      );

      const insights = {
        momentum,
        keyFactors,
        predictions,
        recommendations
      };

      return {
        data: insights,
        confidence: 0.75, // Lower confidence for live predictions
        factors: ['current_score', 'time_remaining', 'player_performance', 'momentum'],
        cached: false,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Error getting live game insights:', error);
      throw this.createAIError('Live game insights failed', error);
    }
  }

  // Private helper methods

  private async enhancePrediction(
    basePrediction: GamePrediction,
    homeTeam: Team,
    awayTeam: Team,
    game: Game,
    options: any
  ): Promise<GamePrediction> {
    // Add weather factors if outdoor venue
    if (game.venue.toLowerCase().includes('outdoor')) {
      basePrediction.factors.push({
        factor: 'Weather Conditions',
        impact: 0.05,
        description: 'Outdoor venue may affect shooting performance'
      });
    }

    // Add venue capacity factor
    basePrediction.factors.push({
      factor: 'Home Court Advantage',
      impact: 0.55,
      description: `${homeTeam.name} playing at home venue: ${game.venue}`
    });

    // Adjust confidence based on team record similarity
    const homeGames = homeTeam.wins + homeTeam.losses;
    const awayGames = awayTeam.wins + awayTeam.losses;
    const homeWinPct = homeGames > 0 ? homeTeam.wins / homeGames : 0.5;
    const awayWinPct = awayGames > 0 ? awayTeam.wins / awayGames : 0.5;
    
    const recordDifference = Math.abs(homeWinPct - awayWinPct);
    if (recordDifference < 0.1) {
      basePrediction.confidence *= 0.9; // Reduce confidence for close matchups
      basePrediction.factors.push({
        factor: 'Evenly Matched Teams',
        impact: 0.1,
        description: 'Similar records suggest a competitive game'
      });
    }

    return basePrediction;
  }

  private calculateTeamAnalytics(team: Team): any {
    const totalGames = team.wins + team.losses;
    const winPct = totalGames > 0 ? team.wins / totalGames : 0.5;
    const avgPointsFor = totalGames > 0 ? team.pointsFor / totalGames : 100;
    const avgPointsAgainst = totalGames > 0 ? team.pointsAgainst / totalGames : 100;

    return {
      offensiveEfficiency: avgPointsFor / 100, // Normalized
      defensiveEfficiency: (120 - avgPointsAgainst) / 120, // Inverted and normalized
      paceOfPlay: this.estimatePaceOfPlay(team),
      reboundRate: this.estimateReboundRate(team),
      turnoverRate: this.estimateTurnoverRate(team),
      freeThrowRate: this.estimateFreeThrowRate(team),
      threePointRate: this.estimateThreePointRate(team),
      strengths: this.identifyTeamStrengths(team, avgPointsFor, avgPointsAgainst),
      weaknesses: this.identifyTeamWeaknesses(team, avgPointsFor, avgPointsAgainst),
      optimalGameplan: this.generateOptimalGameplan(team, avgPointsFor, avgPointsAgainst)
    };
  }

  private analyzePlayerMatchups(homePlayers: any[], awayPlayers: any[]): any[] {
    const matchups: any[] = [];

    // Match players by position
    const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
    
    for (const position of positions) {
      const homePlayer = homePlayers.find(p => p.position === position);
      const awayPlayer = awayPlayers.find(p => p.position === position);

      if (homePlayer && awayPlayer) {
        const advantage = this.comparePlayerPerformance(homePlayer, awayPlayer);
        matchups.push({
          homePlayer,
          awayPlayer,
          advantage: advantage > 0.1 ? 'home' : advantage < -0.1 ? 'away' : 'neutral',
          impact: Math.abs(advantage),
          reasoning: this.generateMatchupReasoning(homePlayer, awayPlayer, advantage)
        });
      }
    }

    return matchups;
  }

  private comparePlayerPerformance(player1: any, player2: any): number {
    const score1 = player1.efficiency + player1.pointsPerGame * 0.5 + player1.reboundsPerGame * 0.3;
    const score2 = player2.efficiency + player2.pointsPerGame * 0.5 + player2.reboundsPerGame * 0.3;
    
    return (score1 - score2) / Math.max(score1, score2);
  }

  private generateMatchupReasoning(player1: any, player2: any, advantage: number): string {
    if (Math.abs(advantage) < 0.1) return 'Even matchup';
    
    const winner = advantage > 0 ? player1 : player2;
    const reasons: string[] = [];
    
    if (winner.pointsPerGame > (advantage > 0 ? player2 : player1).pointsPerGame + 2) {
      reasons.push('scoring advantage');
    }
    if (winner.efficiency > (advantage > 0 ? player2 : player1).efficiency + 2) {
      reasons.push('higher efficiency');
    }
    
    return reasons.join(', ') || 'overall performance edge';
  }

  private calculateTacticalAdvantages(homeAnalytics: any, awayAnalytics: any): string[] {
    const advantages: string[] = [];

    if (homeAnalytics.offensiveEfficiency > awayAnalytics.defensiveEfficiency + 0.1) {
      advantages.push('Home team offense vs away team defense');
    }
    if (awayAnalytics.offensiveEfficiency > homeAnalytics.defensiveEfficiency + 0.1) {
      advantages.push('Away team offense vs home team defense');
    }
    if (homeAnalytics.paceOfPlay > awayAnalytics.paceOfPlay + 0.1) {
      advantages.push('Home team pace advantage');
    }
    if (homeAnalytics.reboundRate > awayAnalytics.reboundRate + 0.1) {
      advantages.push('Home team rebounding edge');
    }

    return advantages;
  }

  private generateGameplan(homeTeam: Team, awayTeam: Team, homeAnalytics: any, awayAnalytics: any): string[] {
    const gameplan: string[] = [];

    // Offensive gameplan
    if (homeAnalytics.offensiveEfficiency > 1.1) {
      gameplan.push('Emphasize ball movement and high-percentage shots');
    } else {
      gameplan.push('Focus on improving shot selection and creating better looks');
    }

    // Defensive gameplan
    if (awayAnalytics.offensiveEfficiency > 1.1) {
      gameplan.push('Implement tight perimeter defense to limit scoring');
    } else {
      gameplan.push('Standard defensive rotations should be effective');
    }

    // Rebounding gameplan
    if (homeAnalytics.reboundRate < awayAnalytics.reboundRate) {
      gameplan.push('Extra emphasis on defensive rebounding and boxing out');
    }

    // Pace gameplan
    if (homeAnalytics.paceOfPlay > awayAnalytics.paceOfPlay) {
      gameplan.push('Push the pace and force up-tempo game');
    } else {
      gameplan.push('Control tempo and execute in half-court sets');
    }

    return gameplan;
  }

  private assessInjuryImpact(players: any[]): any[] {
    return players
      .filter(player => player.injuryHistory && player.injuryHistory.length > 0)
      .map(player => ({
        playerId: player.id,
        impact: player.injuryHistory.length > 2 ? 'high' : 'medium',
        replacement: 'Available bench player', // Simplified
        teamImpact: player.efficiency > 15 ? 0.8 : 0.4
      }));
  }

  private analyzeGameFlow(game: Game, homeScore: number, awayScore: number, totalPoints: number): string[] {
    const flow: string[] = [];

    if (totalPoints > 180) {
      flow.push('High-scoring affair with both teams finding offensive rhythm');
    } else if (totalPoints < 140) {
      flow.push('Defensive battle with limited scoring opportunities');
    } else {
      flow.push('Balanced game with typical scoring pace');
    }

    const margin = Math.abs(homeScore - awayScore);
    if (margin <= 3) {
      flow.push('Extremely close contest decided by final possessions');
    } else if (margin <= 10) {
      flow.push('Competitive game with neither team pulling away');
    } else {
      flow.push('One team established control and maintained advantage');
    }

    return flow;
  }

  private identifyKeyMoments(game: Game, homeScore: number, awayScore: number, playerStats: PlayerGameStats[]): string[] {
    const moments: string[] = [];

    // High-scoring individual performances
    const topScorer = playerStats.reduce((max, stat) => 
      stat.points > max.points ? stat : max, { points: 0, playerId: '' });
    
    if (topScorer.points > 25) {
      moments.push(`Outstanding individual performance: ${topScorer.points} points`);
    }

    // Close finish
    const margin = Math.abs(homeScore - awayScore);
    if (margin <= 5) {
      moments.push('Game decided in final minutes with clutch performances');
    }

    // Efficient team play
    const totalAssists = playerStats.reduce((sum, stat) => sum + stat.assists, 0);
    if (totalAssists > 20) {
      moments.push('Excellent ball movement and team basketball');
    }

    return moments;
  }

  private extractPerformanceHighlights(playerStats: PlayerGameStats[], homeTeam: Team, awayTeam: Team): string[] {
    const highlights: string[] = [];

    // Top individual performances
    const sortedStats = playerStats.sort((a, b) => b.points - a.points);
    const topPerformers = sortedStats.slice(0, 3);

    topPerformers.forEach((stat, index) => {
      if (stat.points >= 20 || stat.assists >= 8 || stat.rebounds >= 10) {
        highlights.push(`Player ${stat.playerId}: ${stat.points} pts, ${stat.assists} ast, ${stat.rebounds} reb`);
      }
    });

    // Double-doubles and triple-doubles
    const doubleDoubles = playerStats.filter(stat => {
      const stats = [stat.points, stat.assists, stat.rebounds];
      return stats.filter(s => s >= 10).length >= 2;
    });

    if (doubleDoubles.length > 0) {
      highlights.push(`${doubleDoubles.length} double-double performance(s)`);
    }

    return highlights;
  }

  private generateTacticalInsights(game: Game, homeTeam: Team, awayTeam: Team, homeScore: number, awayScore: number): string[] {
    const insights: string[] = [];

    const totalPoints = homeScore + awayScore;
    const homeWon = homeScore > awayScore;

    if (totalPoints > 180) {
      insights.push('High-tempo game favored offensive execution over defense');
    }

    if (homeWon) {
      insights.push(`${homeTeam.name} capitalized on home court advantage`);
    } else {
      insights.push(`${awayTeam.name} overcame road challenges to secure victory`);
    }

    const margin = Math.abs(homeScore - awayScore);
    if (margin > 15) {
      insights.push('Decisive victory suggests tactical dominance');
    } else if (margin <= 5) {
      insights.push('Close game indicates well-matched tactical approaches');
    }

    return insights;
  }

  private analyzePlayerContributions(playerStats: PlayerGameStats[]): any[] {
    return playerStats
      .map(stat => ({
        playerId: stat.playerId,
        points: stat.points,
        efficiency: stat.points + stat.assists + stat.rebounds - stat.turnovers,
        plusMinus: stat.plusMinus,
        impact: this.calculatePlayerImpact(stat)
      }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 10);
  }

  private calculatePlayerImpact(stat: PlayerGameStats): number {
    return stat.points * 1.0 + stat.assists * 1.5 + stat.rebounds * 1.2 + 
           stat.steals * 2.0 + stat.blocks * 2.0 - stat.turnovers * 1.5;
  }

  private calculateMomentum(homeScore: number, awayScore: number, quarter: number): string {
    const scoreDiff = homeScore - awayScore;
    const gameProgress = quarter / 4;

    if (Math.abs(scoreDiff) <= 3) {
      return 'Even';
    } else if (scoreDiff > 3) {
      return gameProgress > 0.75 ? 'Strong Home' : 'Moderate Home';
    } else {
      return gameProgress > 0.75 ? 'Strong Away' : 'Moderate Away';
    }
  }

  private identifyLiveGameFactors(game: Game, homeTeam: Team, awayTeam: Team, stats: PlayerGameStats[]): string[] {
    const factors: string[] = [];

    const homeScore = game.homeScore || 0;
    const awayScore = game.awayScore || 0;
    const quarter = game.quarter || 1;

    if (quarter >= 4) {
      factors.push('Fourth quarter execution crucial');
    }

    if (Math.abs(homeScore - awayScore) <= 5) {
      factors.push('Close game - every possession matters');
    }

    const homeStats = stats.filter(s => s.playerId.includes('home')); // Simplified check
    const awayStats = stats.filter(s => !s.playerId.includes('home'));

    const homeTurnovers = homeStats.reduce((sum, s) => sum + s.turnovers, 0);
    const awayTurnovers = awayStats.reduce((sum, s) => sum + s.turnovers, 0);

    if (Math.abs(homeTurnovers - awayTurnovers) >= 3) {
      factors.push('Turnover differential impacting game flow');
    }

    return factors;
  }

  private async predictLiveGameOutcome(
    game: Game,
    homeTeam: Team,
    awayTeam: Team,
    quarter: number,
    timeRemaining: string
  ): Promise<any> {
    const currentHomeScore = game.homeScore || 0;
    const currentAwayScore = game.awayScore || 0;
    
    // Simple projection based on current pace
    const gameProgress = (quarter - 1) / 4 + (1 - this.parseTimeRemaining(timeRemaining)) / 4;
    const projectedTotal = (currentHomeScore + currentAwayScore) / Math.max(gameProgress, 0.1);
    
    const homeProjection = Math.round((currentHomeScore / Math.max(gameProgress, 0.1)));
    const awayProjection = Math.round((currentAwayScore / Math.max(gameProgress, 0.1)));

    const scoreDiff = currentHomeScore - currentAwayScore;
    const timeLeft = (4 - quarter) + this.parseTimeRemaining(timeRemaining);
    
    // Calculate win probability based on score and time
    const homeWinProb = this.calculateLiveWinProbability(scoreDiff, timeLeft);

    return {
      finalScore: {
        home: homeProjection,
        away: awayProjection
      },
      winProbability: {
        home: homeWinProb,
        away: 1 - homeWinProb
      }
    };
  }

  private generateLiveRecommendations(
    game: Game,
    homeTeam: Team,
    awayTeam: Team,
    stats: PlayerGameStats[],
    momentum: string
  ): string[] {
    const recommendations: string[] = [];
    const quarter = game.quarter || 1;
    const homeScore = game.homeScore || 0;
    const awayScore = game.awayScore || 0;

    if (quarter >= 4) {
      recommendations.push('Focus on clock management and high-percentage shots');
    }

    if (momentum.includes('Strong')) {
      const leadingTeam = homeScore > awayScore ? homeTeam.name : awayTeam.name;
      recommendations.push(`${leadingTeam} should maintain current strategy and intensity`);
    } else if (momentum === 'Even') {
      recommendations.push('Both teams should focus on execution and minimize mistakes');
    }

    // Player-specific recommendations
    const highScorers = stats.filter(s => s.points > 15);
    if (highScorers.length > 0) {
      recommendations.push('Continue feeding hot players and creating scoring opportunities');
    }

    return recommendations;
  }

  // Utility methods

  private parseTimeRemaining(timeString: string): number {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return (minutes + seconds / 60) / 12; // Normalize to 0-1 scale for quarter
  }

  private calculateLiveWinProbability(scoreDiff: number, timeLeft: number): number {
    // Simplified win probability calculation
    const baseProb = 0.5 + (scoreDiff * 0.02); // 2% per point
    const timeAdjustment = (4 - timeLeft) * 0.1; // Time remaining impact
    
    return Math.max(0.05, Math.min(0.95, baseProb + timeAdjustment));
  }

  private estimatePaceOfPlay(team: Team): number {
    // Mock estimation - would be based on actual pace statistics
    return 0.5 + (Math.random() - 0.5) * 0.3;
  }

  private estimateReboundRate(team: Team): number {
    // Mock estimation - would be based on actual rebounding statistics
    return 0.5 + (Math.random() - 0.5) * 0.3;
  }

  private estimateTurnoverRate(team: Team): number {
    // Mock estimation - would be based on actual turnover statistics
    return 0.5 + (Math.random() - 0.5) * 0.3;
  }

  private estimateFreeThrowRate(team: Team): number {
    // Mock estimation - would be based on actual free throw statistics
    return 0.5 + (Math.random() - 0.5) * 0.3;
  }

  private estimateThreePointRate(team: Team): number {
    // Mock estimation - would be based on actual three-point statistics
    return 0.5 + (Math.random() - 0.5) * 0.3;
  }

  private identifyTeamStrengths(team: Team, avgPointsFor: number, avgPointsAgainst: number): string[] {
    const strengths: string[] = [];
    
    if (avgPointsFor > 105) strengths.push('High-powered offense');
    if (avgPointsAgainst < 95) strengths.push('Stingy defense');
    if (team.wins > team.losses) strengths.push('Winning culture');
    if (team.streak.includes('W')) strengths.push('Current momentum');
    
    return strengths;
  }

  private identifyTeamWeaknesses(team: Team, avgPointsFor: number, avgPointsAgainst: number): string[] {
    const weaknesses: string[] = [];
    
    if (avgPointsFor < 90) weaknesses.push('Offensive struggles');
    if (avgPointsAgainst > 110) weaknesses.push('Defensive vulnerabilities');
    if (team.losses > team.wins) weaknesses.push('Inconsistent performance');
    if (team.streak.includes('L')) weaknesses.push('Recent struggles');
    
    return weaknesses;
  }

  private generateOptimalGameplan(team: Team, avgPointsFor: number, avgPointsAgainst: number): string[] {
    const gameplan: string[] = [];
    
    if (avgPointsFor > 100) {
      gameplan.push('Continue aggressive offensive approach');
    } else {
      gameplan.push('Focus on improving shot selection and ball movement');
    }
    
    if (avgPointsAgainst < 100) {
      gameplan.push('Maintain defensive intensity and communication');
    } else {
      gameplan.push('Emphasize defensive fundamentals and help defense');
    }
    
    return gameplan;
  }

  private generateCacheKey(...parts: string[]): string {
    return parts.join(':');
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expires < new Date()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    const expires = new Date(Date.now() + this.config.cacheDuration * 60 * 1000);
    this.cache.set(key, { data, expires });
  }

  private createAIError(message: string, originalError: any): AIError {
    const error = new Error(message) as AIError;
    error.code = 'GAME_ANALYTICS_ERROR';
    error.context = { originalError: originalError?.message };
    error.retryable = true;
    return error;
  }
}