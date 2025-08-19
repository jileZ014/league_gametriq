/**
 * Game Prediction Model
 * Machine learning model for predicting basketball game outcomes
 */

import * as tf from '@tensorflow/tfjs';
import { Matrix } from 'ml-matrix';
import { 
  Team, 
  Game, 
  GamePrediction, 
  PredictionFactor, 
  PlayerGameStats,
  AnalyticsResult 
} from '../types';

export class GamePredictionModel {
  private model: tf.LayersModel | null = null;
  private isTraining = false;
  private features: string[] = [
    'homeWinPercentage',
    'awayWinPercentage',
    'homeOffensiveRating',
    'awayOffensiveRating',
    'homeDefensiveRating',
    'awayDefensiveRating',
    'homeRecentForm',
    'awayRecentForm',
    'headToHeadRecord',
    'homeCourtAdvantage',
    'restDaysHome',
    'restDaysAway',
    'injuryImpactHome',
    'injuryImpactAway',
    'seasonMomentum',
    'strengthOfSchedule'
  ];

  constructor() {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      // Try to load existing model
      this.model = await tf.loadLayersModel('/models/game-prediction/model.json');
      console.log('Loaded existing game prediction model');
    } catch (error) {
      // Create new model if none exists
      console.log('Creating new game prediction model');
      this.model = this.createModel();
    }
  }

  private createModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [this.features.length],
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 3, // [homeWinProb, awayWinProb, totalPoints]
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
   * Extract features from teams and game context
   */
  private extractFeatures(
    homeTeam: Team, 
    awayTeam: Team, 
    game: Game,
    historicalGames: Game[] = []
  ): number[] {
    const homeGames = homeTeam.wins + homeTeam.losses;
    const awayGames = awayTeam.wins + awayTeam.losses;
    
    // Win percentages
    const homeWinPct = homeGames > 0 ? homeTeam.wins / homeGames : 0.5;
    const awayWinPct = awayGames > 0 ? awayTeam.wins / awayGames : 0.5;

    // Offensive and defensive ratings
    const homeOffRating = homeGames > 0 ? homeTeam.pointsFor / homeGames : 100;
    const awayOffRating = awayGames > 0 ? awayTeam.pointsFor / awayGames : 100;
    const homeDefRating = homeGames > 0 ? homeTeam.pointsAgainst / homeGames : 100;
    const awayDefRating = awayGames > 0 ? awayTeam.pointsAgainst / awayGames : 100;

    // Recent form (last 5 games)
    const homeRecentForm = this.calculateRecentForm(homeTeam.lastFiveGames);
    const awayRecentForm = this.calculateRecentForm(awayTeam.lastFiveGames);

    // Head-to-head record
    const headToHead = this.calculateHeadToHead(homeTeam, awayTeam, historicalGames);

    // Home court advantage (normalized)
    const homeCourtAdvantage = 0.55; // Baseline home court advantage

    // Rest days (mock - would be calculated from schedule)
    const restDaysHome = 2;
    const restDaysAway = 1;

    // Injury impact (mock - would be calculated from injury reports)
    const injuryImpactHome = 0.95;
    const injuryImpactAway = 0.98;

    // Season momentum (based on recent streak)
    const seasonMomentum = this.calculateSeasonMomentum(homeTeam, awayTeam);

    // Strength of schedule (normalized)
    const strengthOfSchedule = 0.5;

    return [
      homeWinPct,
      awayWinPct,
      homeOffRating / 120, // Normalize to ~0-1
      awayOffRating / 120,
      homeDefRating / 120,
      awayDefRating / 120,
      homeRecentForm,
      awayRecentForm,
      headToHead,
      homeCourtAdvantage,
      restDaysHome / 7, // Normalize to 0-1
      restDaysAway / 7,
      injuryImpactHome,
      injuryImpactAway,
      seasonMomentum,
      strengthOfSchedule
    ];
  }

  private calculateRecentForm(games: string[]): number {
    if (games.length === 0) return 0.5;
    
    const wins = games.filter(result => result === 'W').length;
    return wins / games.length;
  }

  private calculateHeadToHead(homeTeam: Team, awayTeam: Team, historicalGames: Game[]): number {
    const h2hGames = historicalGames.filter(game => 
      (game.homeTeamId === homeTeam.id && game.awayTeamId === awayTeam.id) ||
      (game.homeTeamId === awayTeam.id && game.awayTeamId === homeTeam.id)
    );

    if (h2hGames.length === 0) return 0.5;

    const homeWins = h2hGames.filter(game => {
      if (game.homeTeamId === homeTeam.id) {
        return (game.homeScore || 0) > (game.awayScore || 0);
      } else {
        return (game.awayScore || 0) > (game.homeScore || 0);
      }
    }).length;

    return homeWins / h2hGames.length;
  }

  private calculateSeasonMomentum(homeTeam: Team, awayTeam: Team): number {
    // Simple momentum calculation based on streak
    const parseStreak = (streak: string): number => {
      const match = streak.match(/([WL])(\d+)/);
      if (!match) return 0;
      
      const [, type, count] = match;
      const value = parseInt(count);
      return type === 'W' ? value : -value;
    };

    const homeMomentum = parseStreak(homeTeam.streak);
    const awayMomentum = parseStreak(awayTeam.streak);
    
    return (homeMomentum - awayMomentum) / 10; // Normalize
  }

  /**
   * Predict game outcome
   */
  async predict(
    homeTeam: Team,
    awayTeam: Team,
    game: Game,
    historicalGames: Game[] = []
  ): Promise<AnalyticsResult<GamePrediction>> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const features = this.extractFeatures(homeTeam, awayTeam, game, historicalGames);
    const featureTensor = tf.tensor2d([features], [1, features.length]);

    const prediction = this.model.predict(featureTensor) as tf.Tensor;
    const predictionData = await prediction.data();

    // Clean up tensors
    featureTensor.dispose();
    prediction.dispose();

    // Extract predictions
    const homeWinProb = Math.max(0, Math.min(1, predictionData[0]));
    const awayWinProb = 1 - homeWinProb;
    const totalPoints = Math.max(120, predictionData[2]); // Reasonable basketball total

    // Calculate individual scores based on team averages and total
    const homeAvg = homeTeam.pointsFor / Math.max(1, homeTeam.wins + homeTeam.losses);
    const awayAvg = awayTeam.pointsFor / Math.max(1, awayTeam.wins + awayTeam.losses);
    const avgTotal = homeAvg + awayAvg;
    
    const homeScore = Math.round((homeAvg / avgTotal) * totalPoints);
    const awayScore = Math.round(totalPoints - homeScore);

    // Calculate confidence based on prediction certainty
    const confidence = Math.abs(homeWinProb - 0.5) * 2;

    // Generate prediction factors
    const factors = this.generatePredictionFactors(features, homeTeam, awayTeam);

    const gamePrediction: GamePrediction = {
      gameId: game.id,
      homeTeamWinProbability: homeWinProb,
      awayTeamWinProbability: awayWinProb,
      predictedHomeScore: homeScore,
      predictedAwayScore: awayScore,
      confidence,
      factors,
      lastUpdated: new Date()
    };

    return {
      data: gamePrediction,
      confidence,
      factors: factors.map(f => f.factor),
      cached: false,
      generatedAt: new Date()
    };
  }

  private generatePredictionFactors(
    features: number[],
    homeTeam: Team,
    awayTeam: Team
  ): PredictionFactor[] {
    const factors: PredictionFactor[] = [];

    // Win percentage factor
    const winPctDiff = features[0] - features[1];
    if (Math.abs(winPctDiff) > 0.1) {
      factors.push({
        factor: 'Win Percentage',
        impact: winPctDiff,
        description: `${winPctDiff > 0 ? homeTeam.name : awayTeam.name} has a significantly better win percentage`
      });
    }

    // Offensive rating factor
    const offRatingDiff = features[2] - features[3];
    if (Math.abs(offRatingDiff) > 0.1) {
      factors.push({
        factor: 'Offensive Efficiency',
        impact: offRatingDiff,
        description: `${offRatingDiff > 0 ? homeTeam.name : awayTeam.name} has superior offensive efficiency`
      });
    }

    // Recent form factor
    const formDiff = features[6] - features[7];
    if (Math.abs(formDiff) > 0.2) {
      factors.push({
        factor: 'Recent Form',
        impact: formDiff,
        description: `${formDiff > 0 ? homeTeam.name : awayTeam.name} is in better recent form`
      });
    }

    // Home court advantage
    factors.push({
      factor: 'Home Court Advantage',
      impact: 0.55,
      description: `${homeTeam.name} benefits from playing at home`
    });

    return factors;
  }

  /**
   * Train the model with historical data
   */
  async trainModel(
    trainingData: Array<{
      homeTeam: Team;
      awayTeam: Team;
      game: Game;
      historicalGames: Game[];
      outcome: { homeWon: boolean; homeScore: number; awayScore: number; };
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
          data.homeTeam,
          data.awayTeam,
          data.game,
          data.historicalGames
        );
        
        features.push(gameFeatures);
        
        // Labels: [homeWinProb, awayWinProb, totalPoints]
        labels.push([
          data.outcome.homeWon ? 1 : 0,
          data.outcome.homeWon ? 0 : 1,
          data.outcome.homeScore + data.outcome.awayScore
        ]);
      }

      const featureTensor = tf.tensor2d(features);
      const labelTensor = tf.tensor2d(labels);

      if (this.model) {
        await this.model.fit(featureTensor, labelTensor, {
          epochs: 100,
          batchSize: 32,
          validationSplit: 0.2,
          shuffle: true,
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              console.log(`Epoch ${epoch}: loss = ${logs?.loss}, val_loss = ${logs?.val_loss}`);
            }
          }
        });

        // Save the trained model
        await this.model.save('localstorage://game-prediction-model');
      }

      // Clean up tensors
      featureTensor.dispose();
      labelTensor.dispose();

      console.log('Game prediction model training completed');
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Evaluate model performance
   */
  async evaluateModel(testData: Array<{
    homeTeam: Team;
    awayTeam: Team;
    game: Game;
    historicalGames: Game[];
    outcome: { homeWon: boolean; homeScore: number; awayScore: number; };
  }>): Promise<{
    accuracy: number;
    avgError: number;
    predictions: Array<{
      predicted: GamePrediction;
      actual: { homeWon: boolean; homeScore: number; awayScore: number; };
    }>;
  }> {
    let correct = 0;
    let totalError = 0;
    const predictions: Array<{
      predicted: GamePrediction;
      actual: { homeWon: boolean; homeScore: number; awayScore: number; };
    }> = [];

    for (const data of testData) {
      const prediction = await this.predict(
        data.homeTeam,
        data.awayTeam,
        data.game,
        data.historicalGames
      );

      const predictedWinner = prediction.data.homeTeamWinProbability > 0.5;
      const actualWinner = data.outcome.homeWon;

      if (predictedWinner === actualWinner) {
        correct++;
      }

      const scoreError = Math.abs(prediction.data.predictedHomeScore - data.outcome.homeScore) +
                        Math.abs(prediction.data.predictedAwayScore - data.outcome.awayScore);
      totalError += scoreError;

      predictions.push({
        predicted: prediction.data,
        actual: data.outcome
      });
    }

    return {
      accuracy: correct / testData.length,
      avgError: totalError / testData.length,
      predictions
    };
  }

  /**
   * Get model status and metadata
   */
  getModelInfo(): {
    initialized: boolean;
    training: boolean;
    features: string[];
    architecture: string;
  } {
    return {
      initialized: this.model !== null,
      training: this.isTraining,
      features: this.features,
      architecture: 'Dense Neural Network (64-32-16-3)'
    };
  }

  /**
   * Update model with new game result
   */
  async updateWithResult(
    homeTeam: Team,
    awayTeam: Team,
    game: Game,
    result: { homeScore: number; awayScore: number; },
    historicalGames: Game[] = []
  ): Promise<void> {
    // In a production system, this would add the result to a training queue
    // and periodically retrain the model with new data
    console.log(`Updated model with result: ${homeTeam.name} ${result.homeScore} - ${result.awayScore} ${awayTeam.name}`);
  }
}