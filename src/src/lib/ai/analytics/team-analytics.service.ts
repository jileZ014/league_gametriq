/**
 * Team Analytics Service
 * Team performance analysis and insights
 */

import { Team, LineupOptimization, Player, AnalyticsResult } from '../types';
import { LineupOptimizerModel } from '../models/lineup-optimizer.model';

export class TeamAnalyticsService {
  private lineupOptimizer: LineupOptimizerModel;

  constructor(lineupOptimizer: LineupOptimizerModel) {
    this.lineupOptimizer = lineupOptimizer;
  }

  async optimizeLineup(
    players: Player[],
    opponent?: Team
  ): Promise<AnalyticsResult<LineupOptimization>> {
    try {
      return await this.lineupOptimizer.optimizeLineup(players, opponent);
    } catch (error) {
      throw new Error(`Lineup optimization failed: ${error}`);
    }
  }

  async analyzeTeamChemistry(
    team: Team,
    players: Player[]
  ): Promise<AnalyticsResult<{
    chemistry: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }>> {
    const chemistry = this.calculateTeamChemistry(players);
    const { strengths, weaknesses } = this.analyzeTeamComposition(team, players);
    const recommendations = this.generateTeamRecommendations(team, players);

    return {
      data: { chemistry, strengths, weaknesses, recommendations },
      confidence: 0.8,
      factors: ['player_synergy', 'position_balance', 'performance_metrics'],
      cached: false,
      generatedAt: new Date()
    };
  }

  private calculateTeamChemistry(players: Player[]): number {
    // Simplified chemistry calculation
    const efficiencyVariance = this.calculateVariance(players.map(p => p.efficiency));
    const positionBalance = this.calculatePositionBalance(players);
    
    return Math.max(0, Math.min(1, 0.8 - efficiencyVariance * 0.1 + positionBalance * 0.3));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculatePositionBalance(players: Player[]): number {
    const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
    const positionCounts = positions.map(pos => 
      players.filter(p => p.position === pos).length
    );
    
    const variance = this.calculateVariance(positionCounts);
    return Math.max(0, 1 - variance * 0.2);
  }

  private analyzeTeamComposition(team: Team, players: Player[]): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    const avgPoints = players.reduce((sum, p) => sum + p.pointsPerGame, 0) / players.length;
    const avgEfficiency = players.reduce((sum, p) => sum + p.efficiency, 0) / players.length;
    
    if (avgPoints > 12) strengths.push('Balanced scoring attack');
    if (avgEfficiency > 15) strengths.push('High team efficiency');
    if (players.length >= 8) strengths.push('Good depth');
    
    if (avgPoints < 8) weaknesses.push('Limited scoring options');
    if (avgEfficiency < 10) weaknesses.push('Low efficiency players');
    if (players.length < 6) weaknesses.push('Lack of depth');
    
    return { strengths, weaknesses };
  }

  private generateTeamRecommendations(team: Team, players: Player[]): string[] {
    const recommendations: string[] = [];
    
    const totalGames = team.wins + team.losses;
    const winPct = totalGames > 0 ? team.wins / totalGames : 0;
    
    if (winPct < 0.4) {
      recommendations.push('Focus on fundamentals and building team chemistry');
    }
    if (winPct > 0.7) {
      recommendations.push('Maintain current system and prepare for playoffs');
    }
    
    const guards = players.filter(p => ['PG', 'SG'].includes(p.position));
    if (guards.length < 2) {
      recommendations.push('Consider developing more guard depth');
    }
    
    return recommendations;
  }
}