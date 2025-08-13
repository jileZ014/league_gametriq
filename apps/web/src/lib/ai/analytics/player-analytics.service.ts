/**
 * Player Analytics Service
 * Individual player performance analysis and insights
 */

import { 
  Player, 
  PlayerPerformancePrediction,
  PerformanceTrend,
  PlayerGameStats,
  AnalyticsResult 
} from '../types';
import { PlayerPerformanceModel } from '../models/player-performance.model';

export class PlayerAnalyticsService {
  private performanceModel: PlayerPerformanceModel;
  private cache: Map<string, any> = new Map();

  constructor(performanceModel: PlayerPerformanceModel) {
    this.performanceModel = performanceModel;
  }

  async predictPlayerPerformance(
    player: Player,
    game: any,
    recentStats: PlayerGameStats[] = []
  ): Promise<AnalyticsResult<PlayerPerformancePrediction>> {
    try {
      return await this.performanceModel.predict(player, game, recentStats);
    } catch (error) {
      throw new Error(`Player performance prediction failed: ${error}`);
    }
  }

  async analyzePlayerTrends(
    player: Player,
    gameStats: PlayerGameStats[]
  ): Promise<AnalyticsResult<{
    trends: PerformanceTrend[];
    consistency: number;
    hotStreaks: number[];
    improvement: string[];
  }>> {
    const trends = this.calculateTrends(player, gameStats);
    const consistency = this.calculateConsistency(gameStats);
    const hotStreaks = this.identifyHotStreaks(gameStats);
    const improvement = this.suggestImprovements(player, gameStats);

    return {
      data: { trends, consistency, hotStreaks, improvement },
      confidence: 0.8,
      factors: ['statistical_analysis', 'performance_trends'],
      cached: false,
      generatedAt: new Date()
    };
  }

  async getPlayerComparison(
    players: Player[]
  ): Promise<AnalyticsResult<{
    rankings: Array<{ player: Player; score: number; }>;
    similarities: Array<{ player1: Player; player2: Player; similarity: number; }>;
  }>> {
    const rankings = players
      .map(player => ({
        player,
        score: player.efficiency + player.pointsPerGame * 0.5
      }))
      .sort((a, b) => b.score - a.score);

    const similarities = this.findSimilarPlayers(players);

    return {
      data: { rankings, similarities },
      confidence: 0.85,
      factors: ['efficiency', 'scoring', 'overall_impact'],
      cached: false,
      generatedAt: new Date()
    };
  }

  private calculateTrends(player: Player, stats: PlayerGameStats[]): PerformanceTrend[] {
    if (stats.length < 5) return [];

    const pointsTrend = this.calculateStatTrend(stats.map(s => s.points));
    const assistsTrend = this.calculateStatTrend(stats.map(s => s.assists));
    const reboundsTrend = this.calculateStatTrend(stats.map(s => s.rebounds));

    return [
      { metric: 'Points', ...pointsTrend, confidence: 0.8 },
      { metric: 'Assists', ...assistsTrend, confidence: 0.75 },
      { metric: 'Rebounds', ...reboundsTrend, confidence: 0.75 }
    ];
  }

  private calculateStatTrend(values: number[]): { direction: 'improving' | 'declining' | 'stable'; magnitude: number } {
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const diff = (secondAvg - firstAvg) / Math.max(firstAvg, 1);
    
    if (Math.abs(diff) < 0.1) return { direction: 'stable', magnitude: Math.abs(diff) };
    return { direction: diff > 0 ? 'improving' : 'declining', magnitude: Math.abs(diff) };
  }

  private calculateConsistency(stats: PlayerGameStats[]): number {
    if (stats.length < 3) return 0.5;
    
    const points = stats.map(s => s.points);
    const mean = points.reduce((sum, val) => sum + val, 0) / points.length;
    const variance = points.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / points.length;
    
    return Math.max(0, 1 - Math.sqrt(variance) / Math.max(mean, 1));
  }

  private identifyHotStreaks(stats: PlayerGameStats[]): number[] {
    const streaks: number[] = [];
    let currentStreak = 0;
    
    const avgPoints = stats.reduce((sum, s) => sum + s.points, 0) / stats.length;
    
    for (const stat of stats) {
      if (stat.points > avgPoints * 1.2) {
        currentStreak++;
      } else {
        if (currentStreak >= 2) streaks.push(currentStreak);
        currentStreak = 0;
      }
    }
    
    if (currentStreak >= 2) streaks.push(currentStreak);
    return streaks;
  }

  private suggestImprovements(player: Player, stats: PlayerGameStats[]): string[] {
    const suggestions: string[] = [];
    
    if (player.fieldGoalPercentage < 0.45) {
      suggestions.push('Work on shot selection and shooting mechanics');
    }
    if (player.freeThrowPercentage < 0.7) {
      suggestions.push('Improve free throw consistency');
    }
    if (stats.length > 0) {
      const avgTurnovers = stats.reduce((sum, s) => sum + s.turnovers, 0) / stats.length;
      if (avgTurnovers > 3) {
        suggestions.push('Focus on ball security and decision making');
      }
    }
    
    return suggestions;
  }

  private findSimilarPlayers(players: Player[]): Array<{ player1: Player; player2: Player; similarity: number; }> {
    const similarities: Array<{ player1: Player; player2: Player; similarity: number; }> = [];
    
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const similarity = this.calculatePlayerSimilarity(players[i], players[j]);
        if (similarity > 0.7) {
          similarities.push({
            player1: players[i],
            player2: players[j],
            similarity
          });
        }
      }
    }
    
    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  private calculatePlayerSimilarity(player1: Player, player2: Player): number {
    const stats1 = [player1.pointsPerGame, player1.assistsPerGame, player1.reboundsPerGame, player1.efficiency];
    const stats2 = [player2.pointsPerGame, player2.assistsPerGame, player2.reboundsPerGame, player2.efficiency];
    
    let similarity = 0;
    for (let i = 0; i < stats1.length; i++) {
      const diff = Math.abs(stats1[i] - stats2[i]) / Math.max(stats1[i], stats2[i], 1);
      similarity += 1 - diff;
    }
    
    return similarity / stats1.length;
  }
}