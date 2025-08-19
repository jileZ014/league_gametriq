/**
 * Lineup Optimizer Model
 * AI-powered lineup optimization for basketball teams
 */

import * as tf from '@tensorflow/tfjs';
import { Matrix } from 'ml-matrix';
import { 
  Player, 
  Team,
  LineupOptimization,
  PlayerGameStats,
  AnalyticsResult 
} from '../types';

interface LineupComposition {
  pointGuard: Player;
  shootingGuard: Player;
  smallForward: Player;
  powerForward: Player;
  center: Player;
}

interface LineupMetrics {
  offensiveRating: number;
  defensiveRating: number;
  reboundingRate: number;
  ballMovement: number;
  spacing: number;
  chemistry: number;
  versatility: number;
  experience: number;
}

export class LineupOptimizerModel {
  private synergyModel: tf.LayersModel | null = null;
  private isTraining = false;
  private positionRequirements = {
    pointGuard: ['PG', 'G'],
    shootingGuard: ['SG', 'G', 'SF'],
    smallForward: ['SF', 'F', 'SG'],
    powerForward: ['PF', 'F', 'C'],
    center: ['C', 'PF']
  };

  constructor() {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      this.synergyModel = await tf.loadLayersModel('/models/lineup-optimizer/model.json');
      console.log('Loaded existing lineup optimizer model');
    } catch (error) {
      console.log('Creating new lineup optimizer model');
      this.synergyModel = this.createSynergyModel();
    }
  }

  private createSynergyModel(): tf.LayersModel {
    // Model to predict lineup synergy based on player combinations
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [25], // 5 players × 5 features each
          units: 128,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 8, // [offRating, defRating, reboundRate, ballMovement, spacing, chemistry, versatility, experience]
          activation: 'sigmoid'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  /**
   * Optimize starting lineup for a team
   */
  async optimizeLineup(
    players: Player[],
    opponent?: Team,
    gameContext?: {
      importance: number;
      restDays: number;
      homeAway: 'home' | 'away';
    }
  ): Promise<AnalyticsResult<LineupOptimization>> {
    // Filter players by position eligibility
    const eligiblePlayers = this.getEligiblePlayersByPosition(players);
    
    // Generate all possible lineup combinations
    const lineupCombinations = this.generateLineupCombinations(eligiblePlayers);
    
    // Evaluate each lineup
    const evaluatedLineups = await Promise.all(
      lineupCombinations.map(async lineup => {
        const metrics = await this.evaluateLineup(lineup, opponent, gameContext);
        return {
          lineup,
          metrics,
          overallRating: this.calculateOverallRating(metrics)
        };
      })
    );

    // Sort by overall rating
    evaluatedLineups.sort((a, b) => b.overallRating - a.overallRating);

    const bestLineup = evaluatedLineups[0];
    const alternatives = evaluatedLineups.slice(1, 4); // Top 3 alternatives

    const optimization: LineupOptimization = {
      teamId: players[0]?.teamId || '',
      positions: {
        pointGuard: bestLineup.lineup.pointGuard.id,
        shootingGuard: bestLineup.lineup.shootingGuard.id,
        smallForward: bestLineup.lineup.smallForward.id,
        powerForward: bestLineup.lineup.powerForward.id,
        center: bestLineup.lineup.center.id
      },
      synergy: bestLineup.metrics.chemistry,
      offensiveRating: bestLineup.metrics.offensiveRating,
      defensiveRating: bestLineup.metrics.defensiveRating,
      expectedPlusMinusPerGame: this.calculateExpectedPlusMinus(bestLineup.lineup),
      alternatives: alternatives.map(alt => ({
        teamId: players[0]?.teamId || '',
        positions: {
          pointGuard: alt.lineup.pointGuard.id,
          shootingGuard: alt.lineup.shootingGuard.id,
          smallForward: alt.lineup.smallForward.id,
          powerForward: alt.lineup.powerForward.id,
          center: alt.lineup.center.id
        },
        synergy: alt.metrics.chemistry,
        offensiveRating: alt.metrics.offensiveRating,
        defensiveRating: alt.metrics.defensiveRating,
        expectedPlusMinusPerGame: this.calculateExpectedPlusMinus(alt.lineup),
        alternatives: []
      }))
    };

    return {
      data: optimization,
      confidence: bestLineup.overallRating / 100,
      factors: this.getOptimizationFactors(bestLineup.metrics),
      cached: false,
      generatedAt: new Date()
    };
  }

  private getEligiblePlayersByPosition(players: Player[]): {
    [position: string]: Player[];
  } {
    const eligible: { [position: string]: Player[] } = {
      pointGuard: [],
      shootingGuard: [],
      smallForward: [],
      powerForward: [],
      center: []
    };

    for (const player of players) {
      for (const [position, eligiblePositions] of Object.entries(this.positionRequirements)) {
        if (eligiblePositions.includes(player.position)) {
          eligible[position].push(player);
        }
      }
    }

    return eligible;
  }

  private generateLineupCombinations(eligiblePlayers: { [position: string]: Player[] }): LineupComposition[] {
    const combinations: LineupComposition[] = [];
    const maxCombinations = 50; // Limit to prevent exponential explosion

    // Generate combinations (simplified - in production, use more sophisticated algorithm)
    for (const pg of eligiblePlayers.pointGuard.slice(0, 3)) {
      for (const sg of eligiblePlayers.shootingGuard.slice(0, 3)) {
        for (const sf of eligiblePlayers.smallForward.slice(0, 3)) {
          for (const pf of eligiblePlayers.powerForward.slice(0, 3)) {
            for (const c of eligiblePlayers.center.slice(0, 3)) {
              // Ensure no duplicate players
              const players = [pg, sg, sf, pf, c];
              const uniqueIds = new Set(players.map(p => p.id));
              
              if (uniqueIds.size === 5 && combinations.length < maxCombinations) {
                combinations.push({
                  pointGuard: pg,
                  shootingGuard: sg,
                  smallForward: sf,
                  powerForward: pf,
                  center: c
                });
              }
            }
          }
        }
      }
    }

    return combinations;
  }

  private async evaluateLineup(
    lineup: LineupComposition,
    opponent?: Team,
    gameContext?: {
      importance: number;
      restDays: number;
      homeAway: 'home' | 'away';
    }
  ): Promise<LineupMetrics> {
    const players = Object.values(lineup);

    // Calculate basic metrics
    const offensiveRating = this.calculateOffensiveRating(players);
    const defensiveRating = this.calculateDefensiveRating(players);
    const reboundingRate = this.calculateReboundingRate(players);
    const ballMovement = this.calculateBallMovement(players);
    const spacing = this.calculateSpacing(players);
    const versatility = this.calculateVersatility(players);
    const experience = this.calculateExperience(players);

    // Use AI model to predict chemistry/synergy
    let chemistry = 0.7; // Default
    
    if (this.synergyModel) {
      try {
        const features = this.extractLineupFeatures(players);
        const featureTensor = tf.tensor2d([features], [1, features.length]);
        const prediction = this.synergyModel.predict(featureTensor) as tf.Tensor;
        const predictionData = await prediction.data();
        
        chemistry = predictionData[5]; // Chemistry is the 6th output
        
        featureTensor.dispose();
        prediction.dispose();
      } catch (error) {
        console.warn('Error predicting lineup synergy:', error);
      }
    }

    // Apply contextual adjustments
    if (gameContext) {
      const adjustments = this.applyContextualAdjustments(
        { offensiveRating, defensiveRating, reboundingRate, ballMovement, spacing, chemistry, versatility, experience },
        gameContext,
        opponent
      );
      
      return adjustments;
    }

    return {
      offensiveRating,
      defensiveRating,
      reboundingRate,
      ballMovement,
      spacing,
      chemistry,
      versatility,
      experience
    };
  }

  private extractLineupFeatures(players: Player[]): number[] {
    const features: number[] = [];
    
    for (const player of players) {
      features.push(
        player.pointsPerGame / 30,
        player.assistsPerGame / 15,
        player.reboundsPerGame / 15,
        player.efficiency / 30,
        player.fieldGoalPercentage
      );
    }
    
    return features;
  }

  private calculateOffensiveRating(players: Player[]): number {
    const totalPoints = players.reduce((sum, p) => sum + p.pointsPerGame, 0);
    const totalAssists = players.reduce((sum, p) => sum + p.assistsPerGame, 0);
    const avgFieldGoalPct = players.reduce((sum, p) => sum + p.fieldGoalPercentage, 0) / players.length;
    const avgFreeThrowPct = players.reduce((sum, p) => sum + p.freeThrowPercentage, 0) / players.length;
    
    // Simplified offensive rating calculation
    const baseRating = totalPoints * 2 + totalAssists * 1.5;
    const shootingBonus = (avgFieldGoalPct + avgFreeThrowPct) * 20;
    
    return Math.min(120, baseRating + shootingBonus);
  }

  private calculateDefensiveRating(players: Player[]): number {
    // Mock defensive rating based on size, athleticism, and experience
    const avgHeight = players.reduce((sum, p) => sum + p.height, 0) / players.length;
    const avgAge = players.reduce((sum, p) => sum + p.age, 0) / players.length;
    const totalRebounds = players.reduce((sum, p) => sum + p.reboundsPerGame, 0);
    
    // Height advantage helps defense
    const heightFactor = Math.min(20, (avgHeight - 70) * 0.5);
    
    // Experience helps defense (peak around 26-28 years)
    const experienceFactor = avgAge > 30 ? 30 - (avgAge - 30) : avgAge;
    
    // Rebounding helps defense
    const reboundFactor = totalRebounds * 0.8;
    
    return Math.max(80, Math.min(110, 85 + heightFactor + experienceFactor * 0.3 + reboundFactor));
  }

  private calculateReboundingRate(players: Player[]): number {
    const totalRebounds = players.reduce((sum, p) => sum + p.reboundsPerGame, 0);
    const avgHeight = players.reduce((sum, p) => sum + p.height, 0) / players.length;
    
    // Height correlates with rebounding
    const heightBonus = (avgHeight - 70) * 0.1;
    
    return Math.min(60, totalRebounds + heightBonus);
  }

  private calculateBallMovement(players: Player[]): number {
    const totalAssists = players.reduce((sum, p) => sum + p.assistsPerGame, 0);
    const guardAssists = players
      .filter(p => ['PG', 'SG'].includes(p.position))
      .reduce((sum, p) => sum + p.assistsPerGame, 0);
    
    // Ball movement is better with more assists, especially from guards
    return Math.min(30, totalAssists + guardAssists * 0.5);
  }

  private calculateSpacing(players: Player[]): number {
    // Mock spacing calculation based on shooting ability
    const shooters = players.filter(p => p.fieldGoalPercentage > 0.45).length;
    const avgFgPct = players.reduce((sum, p) => sum + p.fieldGoalPercentage, 0) / players.length;
    
    return Math.min(25, shooters * 4 + (avgFgPct - 0.4) * 50);
  }

  private calculateVersatility(players: Player[]): number {
    // Players who can play multiple positions add versatility
    let versatilityScore = 0;
    
    for (const player of players) {
      const eligiblePositions = Object.values(this.positionRequirements)
        .filter(positions => positions.includes(player.position)).length;
      versatilityScore += eligiblePositions;
    }
    
    return Math.min(20, versatilityScore);
  }

  private calculateExperience(players: Player[]): number {
    const avgAge = players.reduce((sum, p) => sum + p.age, 0) / players.length;
    const avgGames = players.reduce((sum, p) => sum + p.gamesPlayed, 0) / players.length;
    
    // Experience peaks around 26-28 years and more games played
    const ageFactor = avgAge > 30 ? 30 - (avgAge - 30) * 0.5 : avgAge;
    const gamesFactor = Math.min(10, avgGames * 0.1);
    
    return Math.min(25, ageFactor * 0.6 + gamesFactor);
  }

  private applyContextualAdjustments(
    metrics: LineupMetrics,
    gameContext: {
      importance: number;
      restDays: number;
      homeAway: 'home' | 'away';
    },
    opponent?: Team
  ): LineupMetrics {
    const adjusted = { ...metrics };

    // Home court advantage
    if (gameContext.homeAway === 'home') {
      adjusted.offensiveRating *= 1.05;
      adjusted.chemistry *= 1.03;
    }

    // Rest impact (more rest = better performance, but too much rest = rust)
    const restFactor = gameContext.restDays === 0 ? 0.95 : 
                      gameContext.restDays <= 2 ? 1.02 :
                      gameContext.restDays <= 4 ? 1.0 : 0.98;
    
    adjusted.offensiveRating *= restFactor;
    adjusted.defensiveRating *= restFactor;

    // Game importance (high stakes can elevate or hurt performance)
    if (gameContext.importance > 0.8) {
      adjusted.experience *= 1.1; // Experience matters more in big games
      adjusted.chemistry *= 0.98; // But chemistry might suffer under pressure
    }

    return adjusted;
  }

  private calculateOverallRating(metrics: LineupMetrics): number {
    // Weighted combination of all metrics
    return (
      metrics.offensiveRating * 0.25 +
      metrics.defensiveRating * 0.25 +
      metrics.reboundingRate * 0.15 +
      metrics.ballMovement * 0.1 +
      metrics.spacing * 0.1 +
      metrics.chemistry * 0.1 +
      metrics.versatility * 0.03 +
      metrics.experience * 0.02
    );
  }

  private calculateExpectedPlusMinus(lineup: LineupComposition): number {
    const players = Object.values(lineup);
    const avgPlusMinus = players.reduce((sum, p) => sum + p.plusMinus, 0) / players.length;
    const efficiencyBonus = players.reduce((sum, p) => sum + p.efficiency, 0) / players.length / 10;
    
    return avgPlusMinus + efficiencyBonus;
  }

  private getOptimizationFactors(metrics: LineupMetrics): string[] {
    const factors: string[] = [];

    if (metrics.offensiveRating > 110) factors.push('high_offensive_potential');
    if (metrics.defensiveRating < 95) factors.push('strong_defense');
    if (metrics.chemistry > 0.8) factors.push('excellent_chemistry');
    if (metrics.spacing > 20) factors.push('good_floor_spacing');
    if (metrics.ballMovement > 25) factors.push('excellent_ball_movement');
    if (metrics.versatility > 15) factors.push('lineup_versatility');
    if (metrics.experience > 20) factors.push('veteran_leadership');

    return factors;
  }

  /**
   * Analyze lineup matchups against opponent
   */
  async analyzeMatchups(
    ourLineup: LineupComposition,
    opponentLineup: LineupComposition
  ): Promise<{
    advantages: string[];
    disadvantages: string[];
    keyMatchups: Array<{
      position: string;
      ourPlayer: Player;
      theirPlayer: Player;
      advantage: 'us' | 'them' | 'neutral';
      reasoning: string;
    }>;
  }> {
    const keyMatchups = [
      {
        position: 'Point Guard',
        ourPlayer: ourLineup.pointGuard,
        theirPlayer: opponentLineup.pointGuard,
        advantage: this.comparePlayers(ourLineup.pointGuard, opponentLineup.pointGuard),
        reasoning: this.getMatchupReasoning(ourLineup.pointGuard, opponentLineup.pointGuard)
      },
      {
        position: 'Shooting Guard',
        ourPlayer: ourLineup.shootingGuard,
        theirPlayer: opponentLineup.shootingGuard,
        advantage: this.comparePlayers(ourLineup.shootingGuard, opponentLineup.shootingGuard),
        reasoning: this.getMatchupReasoning(ourLineup.shootingGuard, opponentLineup.shootingGuard)
      },
      {
        position: 'Small Forward',
        ourPlayer: ourLineup.smallForward,
        theirPlayer: opponentLineup.smallForward,
        advantage: this.comparePlayers(ourLineup.smallForward, opponentLineup.smallForward),
        reasoning: this.getMatchupReasoning(ourLineup.smallForward, opponentLineup.smallForward)
      },
      {
        position: 'Power Forward',
        ourPlayer: ourLineup.powerForward,
        theirPlayer: opponentLineup.powerForward,
        advantage: this.comparePlayers(ourLineup.powerForward, opponentLineup.powerForward),
        reasoning: this.getMatchupReasoning(ourLineup.powerForward, opponentLineup.powerForward)
      },
      {
        position: 'Center',
        ourPlayer: ourLineup.center,
        theirPlayer: opponentLineup.center,
        advantage: this.comparePlayers(ourLineup.center, opponentLineup.center),
        reasoning: this.getMatchupReasoning(ourLineup.center, opponentLineup.center)
      }
    ];

    const advantages: string[] = [];
    const disadvantages: string[] = [];

    for (const matchup of keyMatchups) {
      if (matchup.advantage === 'us') {
        advantages.push(`${matchup.position}: ${matchup.reasoning}`);
      } else if (matchup.advantage === 'them') {
        disadvantages.push(`${matchup.position}: ${matchup.reasoning}`);
      }
    }

    return { advantages, disadvantages, keyMatchups };
  }

  private comparePlayers(ourPlayer: Player, theirPlayer: Player): 'us' | 'them' | 'neutral' {
    const ourScore = ourPlayer.efficiency + ourPlayer.pointsPerGame * 0.5;
    const theirScore = theirPlayer.efficiency + theirPlayer.pointsPerGame * 0.5;
    
    const diff = ourScore - theirScore;
    
    if (diff > 3) return 'us';
    if (diff < -3) return 'them';
    return 'neutral';
  }

  private getMatchupReasoning(ourPlayer: Player, theirPlayer: Player): string {
    const reasons: string[] = [];
    
    if (ourPlayer.pointsPerGame > theirPlayer.pointsPerGame + 2) {
      reasons.push('superior scoring');
    }
    if (ourPlayer.assistsPerGame > theirPlayer.assistsPerGame + 1) {
      reasons.push('better playmaking');
    }
    if (ourPlayer.reboundsPerGame > theirPlayer.reboundsPerGame + 1) {
      reasons.push('rebounding edge');
    }
    if (ourPlayer.efficiency > theirPlayer.efficiency + 2) {
      reasons.push('higher efficiency');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'even matchup';
  }

  /**
   * Get substitution recommendations during game
   */
  async getSubstitutionRecommendations(
    currentLineup: LineupComposition,
    availablePlayers: Player[],
    gameState: {
      quarter: number;
      timeRemaining: string;
      score: { us: number; them: number; };
      gameFlow: 'winning' | 'losing' | 'close';
    }
  ): Promise<{
    recommendations: Array<{
      playerOut: Player;
      playerIn: Player;
      reason: string;
      urgency: 'low' | 'medium' | 'high';
    }>;
    reasoning: string[];
  }> {
    const recommendations: Array<{
      playerOut: Player;
      playerIn: Player;
      reason: string;
      urgency: 'low' | 'medium' | 'high';
    }> = [];

    const currentPlayers = Object.values(currentLineup);
    
    // Check for fatigue-based substitutions
    for (const player of currentPlayers) {
      if (player.fatigueFactor > 0.8 && gameState.quarter >= 3) {
        const replacement = availablePlayers
          .filter(p => p.position === player.position && p.id !== player.id)
          .sort((a, b) => b.efficiency - a.efficiency)[0];
        
        if (replacement) {
          recommendations.push({
            playerOut: player,
            playerIn: replacement,
            reason: 'Player fatigue - rest recommended',
            urgency: 'medium'
          });
        }
      }
    }

    // Game situation-based recommendations
    if (gameState.gameFlow === 'losing' && gameState.quarter === 4) {
      // Need scoring
      const bestScorer = availablePlayers
        .filter(p => !currentPlayers.some(cp => cp.id === p.id))
        .sort((a, b) => b.pointsPerGame - a.pointsPerGame)[0];
      
      if (bestScorer) {
        const lowestScorer = currentPlayers
          .sort((a, b) => a.pointsPerGame - b.pointsPerGame)[0];
        
        recommendations.push({
          playerOut: lowestScorer,
          playerIn: bestScorer,
          reason: 'Need offensive boost - trailing in 4th quarter',
          urgency: 'high'
        });
      }
    }

    const reasoning = [
      'Substitutions based on player fatigue levels and game situation',
      'Prioritizing fresh legs and situational advantages',
      'Considering position requirements and team chemistry'
    ];

    return { recommendations, reasoning };
  }
}