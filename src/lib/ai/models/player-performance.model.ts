/**
 * Player Performance Model
 * Machine learning model for predicting individual player performance
 */

import * as tf from '@tensorflow/tfjs';
import { Matrix } from 'ml-matrix';
import { 
  Player, 
  Game, 
  PlayerPerformancePrediction, 
  PerformanceTrend,
  PlayerGameStats,
  AnalyticsResult 
} from '../types';

export class PlayerPerformanceModel {
  private model: tf.LayersModel | null = null;
  private isTraining = false;
  private features: string[] = [
    'seasonAveragePoints',
    'seasonAverageAssists',
    'seasonAverageRebounds',
    'last5GameAverage',
    'minutesPerGame',
    'fieldGoalPercentage',
    'freeThrowPercentage',
    'efficiency',
    'plusMinus',
    'fatigueFactor',
    'injuryRisk',
    'homeAway',
    'restDays',
    'opponentDefensiveRating',
    'gameImportance',
    'timeOfSeason'
  ];

  constructor() {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      this.model = await tf.loadLayersModel('/models/player-performance/model.json');
      console.log('Loaded existing player performance model');
    } catch (error) {
      console.log('Creating new player performance model');
      this.model = this.createModel();
    }
  }

  private createModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [this.features.length],
          units: 128,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 6, // [points, assists, rebounds, efficiency, injuryRisk, fatigueLevel]
          activation: 'linear'
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
   * Extract features for player performance prediction
   */
  private extractFeatures(
    player: Player,
    game: Game,
    recentStats: PlayerGameStats[] = [],
    opponentDefensiveRating: number = 100
  ): number[] {
    // Recent performance (last 5 games)
    const last5Games = recentStats.slice(-5);
    const last5Avg = last5Games.length > 0 
      ? last5Games.reduce((sum, stat) => sum + stat.points, 0) / last5Games.length 
      : player.pointsPerGame;

    // Home/away factor
    const homeAway = 1; // 1 for home, 0 for away (would be determined from game)

    // Rest days (mock calculation)
    const restDays = 2;

    // Game importance (0-1 scale)
    const gameImportance = 0.5; // Would be calculated based on playoff implications, rivalry, etc.

    // Time of season (0-1, where 0 is start, 1 is end)
    const timeOfSeason = 0.5; // Would be calculated from current date vs season dates

    return [
      player.pointsPerGame / 30, // Normalize to 0-1
      player.assistsPerGame / 15,
      player.reboundsPerGame / 20,
      last5Avg / 30,
      player.minutesPerGame / 48,
      player.fieldGoalPercentage,
      player.freeThrowPercentage,
      player.efficiency / 40, // Normalize efficiency rating
      (player.plusMinus + 50) / 100, // Normalize plus-minus
      player.fatigueFactor,
      this.calculateInjuryRisk(player),
      homeAway,
      Math.min(restDays / 7, 1), // Normalize rest days
      opponentDefensiveRating / 120,
      gameImportance,
      timeOfSeason
    ];
  }

  private calculateInjuryRisk(player: Player): number {
    // Simple injury risk calculation based on history and fatigue
    const historyRisk = player.injuryHistory.length * 0.1;
    const fatigueRisk = player.fatigueFactor * 0.2;
    const ageRisk = player.age > 30 ? (player.age - 30) * 0.05 : 0;
    
    return Math.min(1, historyRisk + fatigueRisk + ageRisk);
  }

  /**
   * Predict player performance for upcoming game
   */
  async predict(
    player: Player,
    game: Game,
    recentStats: PlayerGameStats[] = [],
    opponentDefensiveRating: number = 100
  ): Promise<AnalyticsResult<PlayerPerformancePrediction>> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const features = this.extractFeatures(player, game, recentStats, opponentDefensiveRating);
    const featureTensor = tf.tensor2d([features], [1, features.length]);

    const prediction = this.model.predict(featureTensor) as tf.Tensor;
    const predictionData = await prediction.data();

    // Clean up tensors
    featureTensor.dispose();
    prediction.dispose();

    // Extract predictions and apply realistic bounds
    const expectedPoints = Math.max(0, predictionData[0] * 30);
    const expectedAssists = Math.max(0, predictionData[1] * 15);
    const expectedRebounds = Math.max(0, predictionData[2] * 20);
    const efficiency = Math.max(0, predictionData[3] * 40);
    const injuryRisk = Math.max(0, Math.min(1, predictionData[4]));
    const fatigueLevel = Math.max(0, Math.min(1, predictionData[5]));

    // Calculate confidence based on prediction consistency
    const variance = this.calculatePredictionVariance(predictionData, player);
    const confidence = Math.max(0.3, 1 - variance);

    // Generate performance trends
    const trends = this.generatePerformanceTrends(player, recentStats, {
      points: expectedPoints,
      assists: expectedAssists,
      rebounds: expectedRebounds
    });

    const performancePrediction: PlayerPerformancePrediction = {
      playerId: player.id,
      gameId: game.id,
      expectedPoints,
      expectedAssists,
      expectedRebounds,
      efficiency,
      injuryRisk,
      fatigueLevel,
      confidence,
      trends
    };

    return {
      data: performancePrediction,
      confidence,
      factors: ['recent_form', 'season_averages', 'matchup_difficulty', 'fatigue_level'],
      cached: false,
      generatedAt: new Date()
    };
  }

  private calculatePredictionVariance(predictionData: Float32Array, player: Player): number {
    // Calculate how much the prediction deviates from season averages
    const pointsVariance = Math.abs(predictionData[0] * 30 - player.pointsPerGame) / player.pointsPerGame;
    const assistsVariance = Math.abs(predictionData[1] * 15 - player.assistsPerGame) / Math.max(1, player.assistsPerGame);
    const reboundsVariance = Math.abs(predictionData[2] * 20 - player.reboundsPerGame) / Math.max(1, player.reboundsPerGame);
    
    return (pointsVariance + assistsVariance + reboundsVariance) / 3;
  }

  private generatePerformanceTrends(
    player: Player, 
    recentStats: PlayerGameStats[],
    prediction: { points: number; assists: number; rebounds: number; }
  ): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];

    if (recentStats.length >= 3) {
      // Analyze points trend
      const recentPointsAvg = recentStats.slice(-3).reduce((sum, stat) => sum + stat.points, 0) / 3;
      const pointsTrend = this.calculateTrend(recentPointsAvg, player.pointsPerGame);
      trends.push({
        metric: 'Points',
        direction: pointsTrend.direction,
        magnitude: pointsTrend.magnitude,
        confidence: 0.8
      });

      // Analyze assists trend
      const recentAssistsAvg = recentStats.slice(-3).reduce((sum, stat) => sum + stat.assists, 0) / 3;
      const assistsTrend = this.calculateTrend(recentAssistsAvg, player.assistsPerGame);
      trends.push({
        metric: 'Assists',
        direction: assistsTrend.direction,
        magnitude: assistsTrend.magnitude,
        confidence: 0.7
      });

      // Analyze rebounds trend
      const recentReboundsAvg = recentStats.slice(-3).reduce((sum, stat) => sum + stat.rebounds, 0) / 3;
      const reboundsTrend = this.calculateTrend(recentReboundsAvg, player.reboundsPerGame);
      trends.push({
        metric: 'Rebounds',
        direction: reboundsTrend.direction,
        magnitude: reboundsTrend.magnitude,
        confidence: 0.75
      });
    }

    return trends;
  }

  private calculateTrend(recent: number, season: number): {
    direction: 'improving' | 'declining' | 'stable';
    magnitude: number;
  } {
    const diff = (recent - season) / Math.max(1, season);
    
    if (Math.abs(diff) < 0.1) {
      return { direction: 'stable', magnitude: Math.abs(diff) };
    } else if (diff > 0) {
      return { direction: 'improving', magnitude: diff };
    } else {
      return { direction: 'declining', magnitude: Math.abs(diff) };
    }
  }

  /**
   * Analyze player performance patterns
   */
  async analyzePerformancePatterns(
    player: Player,
    gameStats: PlayerGameStats[]
  ): Promise<{
    consistencyScore: number;
    hotStreaks: number[];
    coldStreaks: number[];
    clutchPerformance: number;
    homevAwayDifference: number;
  }> {
    if (gameStats.length < 5) {
      return {
        consistencyScore: 0.5,
        hotStreaks: [],
        coldStreaks: [],
        clutchPerformance: 0.5,
        homevAwayDifference: 0
      };
    }

    // Calculate consistency (lower variance = higher consistency)
    const points = gameStats.map(stat => stat.points);
    const variance = this.calculateVariance(points);
    const consistencyScore = Math.max(0, 1 - (variance / (player.pointsPerGame * player.pointsPerGame)));

    // Identify hot and cold streaks
    const { hotStreaks, coldStreaks } = this.identifyStreaks(points, player.pointsPerGame);

    // Clutch performance (mock - would analyze performance in close games)
    const clutchPerformance = 0.5 + (Math.random() - 0.5) * 0.3;

    // Home vs away difference (mock)
    const homevAwayDifference = 2.5; // Points difference between home and away games

    return {
      consistencyScore,
      hotStreaks,
      coldStreaks,
      clutchPerformance,
      homevAwayDifference
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private identifyStreaks(points: number[], average: number): {
    hotStreaks: number[];
    coldStreaks: number[];
  } {
    const hotStreaks: number[] = [];
    const coldStreaks: number[] = [];
    
    let currentHotStreak = 0;
    let currentColdStreak = 0;

    for (const point of points) {
      if (point > average * 1.2) { // 20% above average
        currentHotStreak++;
        if (currentColdStreak > 0) {
          coldStreaks.push(currentColdStreak);
          currentColdStreak = 0;
        }
      } else if (point < average * 0.8) { // 20% below average
        currentColdStreak++;
        if (currentHotStreak > 0) {
          hotStreaks.push(currentHotStreak);
          currentHotStreak = 0;
        }
      } else {
        if (currentHotStreak > 0) {
          hotStreaks.push(currentHotStreak);
          currentHotStreak = 0;
        }
        if (currentColdStreak > 0) {
          coldStreaks.push(currentColdStreak);
          currentColdStreak = 0;
        }
      }
    }

    return { hotStreaks, coldStreaks };
  }

  /**
   * Train the model with historical player performance data
   */
  async trainModel(
    trainingData: Array<{
      player: Player;
      game: Game;
      recentStats: PlayerGameStats[];
      opponentDefensiveRating: number;
      actualStats: PlayerGameStats;
    }>
  ): Promise<void> {
    if (this.isTraining) {
      throw new Error('Model is already training');
    }

    this.isTraining = true;

    try {
      const features: number[][] = [];
      const labels: number[][] = [];

      for (const data of trainingData) {
        const gameFeatures = this.extractFeatures(
          data.player,
          data.game,
          data.recentStats,
          data.opponentDefensiveRating
        );
        
        features.push(gameFeatures);
        
        // Labels: [points, assists, rebounds, efficiency, injuryRisk, fatigueLevel]
        const efficiency = this.calculateGameEfficiency(data.actualStats);
        labels.push([
          data.actualStats.points / 30, // Normalize
          data.actualStats.assists / 15,
          data.actualStats.rebounds / 20,
          efficiency / 40,
          data.player.fatigueFactor, // Assume fatigue correlates with actual performance
          data.player.fatigueFactor * 1.1 // Mock injury risk
        ]);
      }

      const featureTensor = tf.tensor2d(features);
      const labelTensor = tf.tensor2d(labels);

      if (this.model) {
        await this.model.fit(featureTensor, labelTensor, {
          epochs: 150,
          batchSize: 16,
          validationSplit: 0.2,
          shuffle: true,
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              if (epoch % 25 === 0) {
                console.log(`Epoch ${epoch}: loss = ${logs?.loss}, val_loss = ${logs?.val_loss}`);
              }
            }
          }
        });

        await this.model.save('localstorage://player-performance-model');
      }

      featureTensor.dispose();
      labelTensor.dispose();

      console.log('Player performance model training completed');
    } finally {
      this.isTraining = false;
    }
  }

  private calculateGameEfficiency(stats: PlayerGameStats): number {
    // Simple efficiency calculation
    return (stats.points + stats.rebounds + stats.assists + stats.steals + stats.blocks) -
           (stats.turnovers + (stats.fieldGoals.attempted - stats.fieldGoals.made) + 
            (stats.freeThrows.attempted - stats.freeThrows.made));
  }

  /**
   * Get optimal rotation recommendations
   */
  async getRotationRecommendations(
    players: Player[],
    totalMinutes: number = 240 // 48 minutes * 5 positions
  ): Promise<{
    starters: Player[];
    rotation: Array<{ player: Player; minutes: number; }>;
    reasoning: string[];
  }> {
    // Sort players by efficiency and recent form
    const rankedPlayers = players
      .map(player => ({
        player,
        score: player.efficiency + (player.pointsPerGame * 0.5) + (player.reboundsPerGame * 0.3)
      }))
      .sort((a, b) => b.score - a.score);

    const starters = rankedPlayers.slice(0, 5).map(p => p.player);
    const rotation: Array<{ player: Player; minutes: number; }> = [];

    // Distribute minutes based on performance and fatigue
    let remainingMinutes = totalMinutes;
    
    for (const { player } of rankedPlayers) {
      if (remainingMinutes <= 0) break;
      
      const optimalMinutes = Math.min(
        player.minutesPerGame,
        remainingMinutes,
        48 * (1 - player.fatigueFactor) // Reduce minutes for tired players
      );
      
      if (optimalMinutes > 5) { // Minimum playing time
        rotation.push({ player, minutes: optimalMinutes });
        remainingMinutes -= optimalMinutes;
      }
    }

    const reasoning = [
      'Starters selected based on efficiency rating and season performance',
      'Minutes allocated considering player fatigue and optimal rest patterns',
      'Rotation designed to maintain competitive advantage throughout the game'
    ];

    return { starters, rotation, reasoning };
  }
}