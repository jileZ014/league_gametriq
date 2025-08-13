/**
 * Basketball Statistics Embeddings
 * Creates vector embeddings for basketball statistics and patterns
 */

import * as tf from '@tensorflow/tfjs';
import { Matrix } from 'ml-matrix';
import { 
  Player, 
  Team, 
  Game, 
  PlayerGameStats,
  Embedding 
} from '../types';

export class StatEmbeddingsGenerator {
  private embeddingModel: tf.LayersModel | null = null;
  private embeddingDimension = 128;

  constructor() {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      this.embeddingModel = await tf.loadLayersModel('/models/embeddings/stat-embeddings.json');
      console.log('Loaded existing stat embeddings model');
    } catch (error) {
      console.log('Creating new stat embeddings model');
      this.embeddingModel = this.createEmbeddingModel();
    }
  }

  private createEmbeddingModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [20], // Basketball stat features
          units: 256,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 128,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: this.embeddingDimension,
          activation: 'tanh' // Normalized embedding space
        })
      ]
    });

    return model;
  }

  /**
   * Generate embedding for player statistics
   */
  async generatePlayerStatEmbedding(
    player: Player,
    recentStats: PlayerGameStats[] = []
  ): Promise<Embedding> {
    const features = this.extractPlayerStatFeatures(player, recentStats);
    const embedding = await this.generateEmbedding(features);

    return {
      id: `player_${player.id}_stats`,
      vector: embedding,
      metadata: {
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        teamId: player.teamId,
        pointsPerGame: player.pointsPerGame,
        assistsPerGame: player.assistsPerGame,
        reboundsPerGame: player.reboundsPerGame,
        efficiency: player.efficiency,
        type: 'player_stats',
        lastUpdated: new Date().toISOString()
      },
      type: 'player',
      created: new Date()
    };
  }

  /**
   * Generate embedding for team statistics
   */
  async generateTeamStatEmbedding(team: Team): Promise<Embedding> {
    const features = this.extractTeamStatFeatures(team);
    const embedding = await this.generateEmbedding(features);

    return {
      id: `team_${team.id}_stats`,
      vector: embedding,
      metadata: {
        teamId: team.id,
        teamName: team.name,
        league: team.league,
        division: team.division,
        wins: team.wins,
        losses: team.losses,
        pointsFor: team.pointsFor,
        pointsAgainst: team.pointsAgainst,
        winPercentage: team.wins / (team.wins + team.losses),
        type: 'team_stats',
        lastUpdated: new Date().toISOString()
      },
      type: 'team',
      created: new Date()
    };
  }

  /**
   * Generate embedding for game statistics and patterns
   */
  async generateGameStatEmbedding(
    game: Game,
    homeTeam: Team,
    awayTeam: Team,
    playerStats: PlayerGameStats[] = []
  ): Promise<Embedding> {
    const features = this.extractGameStatFeatures(game, homeTeam, awayTeam, playerStats);
    const embedding = await this.generateEmbedding(features);

    return {
      id: `game_${game.id}_stats`,
      vector: embedding,
      metadata: {
        gameId: game.id,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        date: game.date.toISOString(),
        venue: game.venue,
        status: game.status,
        type: 'game_stats',
        lastUpdated: new Date().toISOString()
      },
      type: 'game',
      created: new Date()
    };
  }

  /**
   * Generate embedding for statistical patterns
   */
  async generateStatPatternEmbedding(
    pattern: {
      id: string;
      name: string;
      description: string;
      stats: number[];
      context: string;
      frequency: number;
    }
  ): Promise<Embedding> {
    const features = this.extractStatPatternFeatures(pattern);
    const embedding = await this.generateEmbedding(features);

    return {
      id: `pattern_${pattern.id}`,
      vector: embedding,
      metadata: {
        patternId: pattern.id,
        patternName: pattern.name,
        description: pattern.description,
        context: pattern.context,
        frequency: pattern.frequency,
        type: 'stat_pattern',
        lastUpdated: new Date().toISOString()
      },
      type: 'stat_pattern',
      created: new Date()
    };
  }

  private extractPlayerStatFeatures(player: Player, recentStats: PlayerGameStats[]): number[] {
    // Core season statistics
    const features = [
      player.pointsPerGame / 30, // Normalize to 0-1
      player.assistsPerGame / 15,
      player.reboundsPerGame / 15,
      player.fieldGoalPercentage,
      player.freeThrowPercentage,
      player.efficiency / 30,
      player.plusMinus / 20, // Normalize plus-minus
      player.minutesPerGame / 48,
      player.gamesPlayed / 30,
      player.fatigueFactor,
      player.age / 35, // Normalize age
      player.height / 84, // Normalize height (inches)
      player.weight / 250 // Normalize weight (pounds)
    ];

    // Recent performance trends (last 5 games)
    if (recentStats.length > 0) {
      const recentAvgPoints = recentStats.reduce((sum, stat) => sum + stat.points, 0) / recentStats.length;
      const recentAvgAssists = recentStats.reduce((sum, stat) => sum + stat.assists, 0) / recentStats.length;
      const recentAvgRebounds = recentStats.reduce((sum, stat) => sum + stat.rebounds, 0) / recentStats.length;
      const recentAvgFgPct = recentStats.reduce((sum, stat) => 
        sum + (stat.fieldGoals.made / Math.max(1, stat.fieldGoals.attempted)), 0) / recentStats.length;

      features.push(
        recentAvgPoints / 30,
        recentAvgAssists / 15,
        recentAvgRebounds / 15,
        recentAvgFgPct,
        this.calculateTrend(recentStats.map(s => s.points)),
        this.calculateConsistency(recentStats.map(s => s.points)),
        this.calculateHotStreak(recentStats.map(s => s.points), player.pointsPerGame)
      );
    } else {
      // Fill with defaults if no recent stats
      features.push(
        player.pointsPerGame / 30,
        player.assistsPerGame / 15,
        player.reboundsPerGame / 15,
        player.fieldGoalPercentage,
        0.5, // Neutral trend
        0.5, // Average consistency
        0.5  // No streak info
      );
    }

    return features;
  }

  private extractTeamStatFeatures(team: Team): number[] {
    const totalGames = team.wins + team.losses;
    const winPct = totalGames > 0 ? team.wins / totalGames : 0.5;
    const avgPointsFor = totalGames > 0 ? team.pointsFor / totalGames : 100;
    const avgPointsAgainst = totalGames > 0 ? team.pointsAgainst / totalGames : 100;
    const pointDifferential = avgPointsFor - avgPointsAgainst;

    return [
      winPct,
      avgPointsFor / 120, // Normalize offensive output
      avgPointsAgainst / 120, // Normalize defensive rating
      pointDifferential / 40, // Normalize point differential
      totalGames / 30, // Normalize games played
      this.parseStreak(team.streak),
      this.calculateRecentForm(team.lastFiveGames),
      this.getAgeGroupFactor(team.ageGroup),
      this.getDivisionStrength(team.division),
      this.calculateOffensiveRating(team),
      this.calculateDefensiveRating(team),
      this.calculatePaceOfPlay(team),
      this.calculateReboundRate(team),
      this.calculateTurnoverRate(team),
      this.calculateFreeThrowRate(team),
      this.calculateThreePointRate(team),
      // Additional contextual features
      0.5, // Home court advantage (normalized)
      0.5, // Injury impact (normalized)
      0.5, // Chemistry rating (normalized)
      0.5  // Coaching impact (normalized)
    ];
  }

  private extractGameStatFeatures(
    game: Game,
    homeTeam: Team,
    awayTeam: Team,
    playerStats: PlayerGameStats[]
  ): number[] {
    const homeScore = game.homeScore || 0;
    const awayScore = game.awayScore || 0;
    const totalPoints = homeScore + awayScore;
    const scoreDiff = homeScore - awayScore;

    // Game-level features
    const gameFeatures = [
      homeScore / 150, // Normalize score
      awayScore / 150,
      totalPoints / 300,
      scoreDiff / 50,
      this.getVenueFactor(game.venue),
      this.getDateFactor(game.date),
      this.getStatusFactor(game.status),
      game.quarter || 4 / 4, // Normalize quarter
      this.getAttendanceFactor(game.attendance || 0)
    ];

    // Team context features
    const teamFeatures = [
      ...this.extractTeamStatFeatures(homeTeam).slice(0, 5), // Key home team stats
      ...this.extractTeamStatFeatures(awayTeam).slice(0, 5)  // Key away team stats
    ];

    // Player performance aggregates
    const playerFeatures = this.aggregatePlayerStats(playerStats);

    return [...gameFeatures, ...teamFeatures, ...playerFeatures];
  }

  private extractStatPatternFeatures(pattern: {
    stats: number[];
    frequency: number;
    context: string;
  }): number[] {
    const normalizedStats = pattern.stats.map(stat => Math.max(0, Math.min(1, stat)));
    
    // Pad or truncate to fixed size
    const targetSize = 15;
    const paddedStats = normalizedStats.slice(0, targetSize);
    while (paddedStats.length < targetSize) {
      paddedStats.push(0);
    }

    // Add pattern metadata features
    const metaFeatures = [
      pattern.frequency,
      this.getContextFactor(pattern.context),
      this.calculateStatVariance(pattern.stats),
      this.calculateStatMean(pattern.stats),
      this.calculateStatTrend(pattern.stats)
    ];

    return [...paddedStats, ...metaFeatures];
  }

  private async generateEmbedding(features: number[]): Promise<number[]> {
    if (!this.embeddingModel) {
      // Fallback: simple dimensionality reduction using PCA-like approach
      return this.generateFallbackEmbedding(features);
    }

    try {
      // Ensure features are the right size
      const paddedFeatures = this.padFeatures(features, 20);
      const featureTensor = tf.tensor2d([paddedFeatures], [1, paddedFeatures.length]);
      
      const embedding = this.embeddingModel.predict(featureTensor) as tf.Tensor;
      const embeddingData = await embedding.data();
      
      featureTensor.dispose();
      embedding.dispose();
      
      return Array.from(embeddingData);
    } catch (error) {
      console.warn('Error generating embedding:', error);
      return this.generateFallbackEmbedding(features);
    }
  }

  private generateFallbackEmbedding(features: number[]): number[] {
    // Simple hash-based embedding as fallback
    const embedding = new Array(this.embeddingDimension).fill(0);
    
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      for (let j = 0; j < this.embeddingDimension; j++) {
        const hash = this.simpleHash(i + j + feature * 1000) % 1000;
        embedding[j] += (hash / 1000 - 0.5) * feature;
      }
    }

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / Math.max(magnitude, 1e-6));
  }

  private padFeatures(features: number[], targetSize: number): number[] {
    const padded = features.slice(0, targetSize);
    while (padded.length < targetSize) {
      padded.push(0);
    }
    return padded;
  }

  // Helper functions for feature extraction
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0.5;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const trend = (secondAvg - firstAvg) / Math.max(firstAvg, 1);
    return Math.max(0, Math.min(1, 0.5 + trend * 0.5));
  }

  private calculateConsistency(values: number[]): number {
    if (values.length < 2) return 0.5;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / Math.max(mean, 1);
    
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  private calculateHotStreak(values: number[], average: number): number {
    if (values.length < 3) return 0.5;
    
    const recentValues = values.slice(-3);
    const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    const streak = recentAvg / Math.max(average, 1);
    return Math.max(0, Math.min(1, streak));
  }

  private parseStreak(streak: string): number {
    const match = streak.match(/([WL])(\d+)/);
    if (!match) return 0.5;
    
    const [, type, count] = match;
    const streakLength = parseInt(count);
    const isWinning = type === 'W';
    
    const momentum = isWinning 
      ? 0.5 + Math.min(0.5, streakLength * 0.1)
      : 0.5 - Math.min(0.5, streakLength * 0.1);
    
    return Math.max(0, Math.min(1, momentum));
  }

  private calculateRecentForm(games: string[]): number {
    if (!games || games.length === 0) return 0.5;
    
    const wins = games.filter(result => result === 'W').length;
    return wins / games.length;
  }

  private getAgeGroupFactor(ageGroup: string): number {
    // Normalize age group to 0-1 scale
    const ageGroupMap: { [key: string]: number } = {
      'U8': 0.1, 'U10': 0.2, 'U12': 0.3, 'U14': 0.4,
      'U16': 0.5, 'U18': 0.6, 'High School': 0.7,
      'College': 0.8, 'Adult': 0.9, 'Senior': 1.0
    };
    return ageGroupMap[ageGroup] || 0.5;
  }

  private getDivisionStrength(division: string): number {
    // Mock division strength - would be calculated from historical data
    const strengthMap: { [key: string]: number } = {
      'A': 0.9, 'B': 0.7, 'C': 0.5, 'D': 0.3,
      'Premier': 0.95, 'Elite': 0.85, 'Competitive': 0.65, 'Recreational': 0.4
    };
    return strengthMap[division] || 0.5;
  }

  private calculateOffensiveRating(team: Team): number {
    const totalGames = team.wins + team.losses;
    return totalGames > 0 ? (team.pointsFor / totalGames) / 120 : 0.5;
  }

  private calculateDefensiveRating(team: Team): number {
    const totalGames = team.wins + team.losses;
    return totalGames > 0 ? 1 - (team.pointsAgainst / totalGames) / 120 : 0.5;
  }

  private calculatePaceOfPlay(team: Team): number {
    // Mock pace calculation - would be based on possessions per game
    return 0.5 + (Math.random() - 0.5) * 0.4; // Random between 0.3-0.7
  }

  private calculateReboundRate(team: Team): number {
    // Mock rebound rate - would be based on actual rebounding statistics
    return 0.5 + (Math.random() - 0.5) * 0.3; // Random between 0.35-0.65
  }

  private calculateTurnoverRate(team: Team): number {
    // Mock turnover rate - would be based on actual turnover statistics
    return 0.5 + (Math.random() - 0.5) * 0.3; // Random between 0.35-0.65
  }

  private calculateFreeThrowRate(team: Team): number {
    // Mock free throw rate - would be based on actual free throw statistics
    return 0.5 + (Math.random() - 0.5) * 0.3; // Random between 0.35-0.65
  }

  private calculateThreePointRate(team: Team): number {
    // Mock three-point rate - would be based on actual three-point statistics
    return 0.5 + (Math.random() - 0.5) * 0.3; // Random between 0.35-0.65
  }

  private getVenueFactor(venue: string): number {
    // Mock venue factor - would consider venue size, atmosphere, etc.
    return 0.5 + (this.simpleHash(venue) % 500) / 1000 - 0.25; // -0.25 to 0.25 offset
  }

  private getDateFactor(date: Date): number {
    // Time of season factor (0 = start, 1 = end)
    const seasonStart = new Date(date.getFullYear(), 8, 1); // September 1st
    const seasonEnd = new Date(date.getFullYear() + 1, 2, 31); // March 31st
    const timeDiff = date.getTime() - seasonStart.getTime();
    const seasonLength = seasonEnd.getTime() - seasonStart.getTime();
    
    return Math.max(0, Math.min(1, timeDiff / seasonLength));
  }

  private getStatusFactor(status: string): number {
    const statusMap: { [key: string]: number } = {
      'scheduled': 0.0,
      'in_progress': 0.5,
      'completed': 1.0,
      'cancelled': -1.0
    };
    return statusMap[status] || 0.0;
  }

  private getAttendanceFactor(attendance: number): number {
    // Normalize attendance (assuming max capacity around 5000 for youth basketball)
    return Math.min(1, attendance / 5000);
  }

  private aggregatePlayerStats(playerStats: PlayerGameStats[]): number[] {
    if (playerStats.length === 0) {
      return [0, 0, 0, 0, 0]; // Default values
    }

    const totalPoints = playerStats.reduce((sum, stat) => sum + stat.points, 0);
    const totalAssists = playerStats.reduce((sum, stat) => sum + stat.assists, 0);
    const totalRebounds = playerStats.reduce((sum, stat) => sum + stat.rebounds, 0);
    const totalTurnovers = playerStats.reduce((sum, stat) => sum + stat.turnovers, 0);
    const totalPlusMinus = playerStats.reduce((sum, stat) => sum + stat.plusMinus, 0);

    return [
      totalPoints / (playerStats.length * 30), // Normalize team points
      totalAssists / (playerStats.length * 15), // Normalize team assists
      totalRebounds / (playerStats.length * 15), // Normalize team rebounds
      totalTurnovers / (playerStats.length * 10), // Normalize team turnovers
      totalPlusMinus / (playerStats.length * 20) // Normalize team plus-minus
    ];
  }

  private getContextFactor(context: string): number {
    const contextMap: { [key: string]: number } = {
      'regular_season': 0.5,
      'playoffs': 0.8,
      'championship': 1.0,
      'tournament': 0.7,
      'exhibition': 0.2
    };
    return contextMap[context] || 0.5;
  }

  private calculateStatVariance(stats: number[]): number {
    if (stats.length < 2) return 0;
    
    const mean = stats.reduce((sum, val) => sum + val, 0) / stats.length;
    const variance = stats.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / stats.length;
    
    return Math.min(1, variance); // Normalize to 0-1
  }

  private calculateStatMean(stats: number[]): number {
    if (stats.length === 0) return 0;
    return stats.reduce((sum, val) => sum + val, 0) / stats.length;
  }

  private calculateStatTrend(stats: number[]): number {
    if (stats.length < 2) return 0.5;
    
    const firstHalf = stats.slice(0, Math.floor(stats.length / 2));
    const secondHalf = stats.slice(Math.floor(stats.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const trend = (secondAvg - firstAvg) / Math.max(Math.abs(firstAvg), 1);
    return Math.max(0, Math.min(1, 0.5 + trend * 0.5));
  }

  private simpleHash(str: string | number): number {
    const s = str.toString();
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Compare embeddings for similarity
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Find similar patterns in embeddings
   */
  findSimilarEmbeddings(
    queryEmbedding: number[],
    candidateEmbeddings: Embedding[],
    threshold: number = 0.7,
    limit: number = 10
  ): Array<{ embedding: Embedding; similarity: number; }> {
    const similarities = candidateEmbeddings.map(candidate => ({
      embedding: candidate,
      similarity: this.calculateSimilarity(queryEmbedding, candidate.vector)
    }));

    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}