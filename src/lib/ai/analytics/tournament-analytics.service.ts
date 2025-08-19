/**
 * Tournament Analytics Service
 * Tournament seeding, bracket prediction, and analysis
 */

import { 
  Team, 
  TournamentSeeding,
  TournamentAnalytics,
  UpsetProbability,
  ChampionshipProjection,
  AnalyticsResult 
} from '../types';
import { TournamentSeedingModel } from '../models/tournament-seeding.model';

export class TournamentAnalyticsService {
  private seedingModel: TournamentSeedingModel;

  constructor(seedingModel: TournamentSeedingModel) {
    this.seedingModel = seedingModel;
  }

  async generateSeeding(teams: Team[]): Promise<AnalyticsResult<TournamentSeeding[]>> {
    try {
      return await this.seedingModel.generateOptimalSeeding(teams);
    } catch (error) {
      throw new Error(`Tournament seeding failed: ${error}`);
    }
  }

  async predictBracket(seeding: TournamentSeeding[], teams: Team[]): Promise<AnalyticsResult<any>> {
    try {
      return await this.seedingModel.predictBracket(seeding, teams);
    } catch (error) {
      throw new Error(`Bracket prediction failed: ${error}`);
    }
  }

  async identifyUpsets(seeding: TournamentSeeding[], teams: Team[]): Promise<AnalyticsResult<UpsetProbability[]>> {
    try {
      return await this.seedingModel.identifyUpsets(seeding, teams);
    } catch (error) {
      throw new Error(`Upset analysis failed: ${error}`);
    }
  }

  async generateChampionshipProjections(
    seeding: TournamentSeeding[], 
    teams: Team[]
  ): Promise<AnalyticsResult<ChampionshipProjection[]>> {
    try {
      return await this.seedingModel.generateChampionshipProjections(seeding, teams);
    } catch (error) {
      throw new Error(`Championship projections failed: ${error}`);
    }
  }

  async analyzeTournamentBalance(teams: Team[]): Promise<AnalyticsResult<{
    competitiveBalance: number;
    recommendedChanges: string[];
    strengthDistribution: any[];
  }>> {
    const balance = this.calculateCompetitiveBalance(teams);
    const changes = this.recommendSeedingChanges(teams);
    const distribution = this.analyzeStrengthDistribution(teams);

    return {
      data: {
        competitiveBalance: balance,
        recommendedChanges: changes,
        strengthDistribution: distribution
      },
      confidence: 0.8,
      factors: ['team_records', 'strength_of_schedule', 'recent_form'],
      cached: false,
      generatedAt: new Date()
    };
  }

  private calculateCompetitiveBalance(teams: Team[]): number {
    const winPercentages = teams.map(team => {
      const totalGames = team.wins + team.losses;
      return totalGames > 0 ? team.wins / totalGames : 0.5;
    });

    const mean = winPercentages.reduce((sum, pct) => sum + pct, 0) / winPercentages.length;
    const variance = winPercentages.reduce((sum, pct) => sum + Math.pow(pct - mean, 2), 0) / winPercentages.length;
    
    return Math.max(0, 1 - variance * 2); // Higher balance = lower variance
  }

  private recommendSeedingChanges(teams: Team[]): string[] {
    const recommendations: string[] = [];
    
    // Sort teams by win percentage
    const sortedTeams = teams
      .map(team => {
        const totalGames = team.wins + team.losses;
        return {
          team,
          winPct: totalGames > 0 ? team.wins / totalGames : 0.5
        };
      })
      .sort((a, b) => b.winPct - a.winPct);

    // Check for teams with similar records
    for (let i = 0; i < sortedTeams.length - 1; i++) {
      const current = sortedTeams[i];
      const next = sortedTeams[i + 1];
      
      if (Math.abs(current.winPct - next.winPct) < 0.05 && current.winPct !== next.winPct) {
        recommendations.push(
          `Consider head-to-head record between ${current.team.name} and ${next.team.name} for seeding`
        );
      }
    }

    return recommendations;
  }

  private analyzeStrengthDistribution(teams: Team[]): any[] {
    return teams.map(team => {
      const totalGames = team.wins + team.losses;
      const winPct = totalGames > 0 ? team.wins / totalGames : 0.5;
      const avgPointsFor = totalGames > 0 ? team.pointsFor / totalGames : 100;
      const avgPointsAgainst = totalGames > 0 ? team.pointsAgainst / totalGames : 100;
      
      return {
        teamName: team.name,
        winPercentage: winPct,
        pointDifferential: avgPointsFor - avgPointsAgainst,
        strength: winPct * 0.6 + (avgPointsFor - avgPointsAgainst) / 50 * 0.4
      };
    }).sort((a, b) => b.strength - a.strength);
  }
}