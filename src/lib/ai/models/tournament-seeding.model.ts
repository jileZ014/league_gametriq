/**
 * Tournament Seeding Model
 * AI-powered tournament seeding and bracket prediction system
 */

import * as tf from '@tensorflow/tfjs';
import { Matrix } from 'ml-matrix';
import { 
  Team, 
  Game, 
  TournamentSeeding,
  TournamentAnalytics,
  TournamentBracket,
  UpsetProbability,
  ChampionshipProjection,
  OptimalSeeding,
  AnalyticsResult 
} from '../types';

interface TeamRating {
  team: Team;
  rating: number;
  strengthOfSchedule: number;
  recentForm: number;
  injuryAdjustment: number;
  finalRating: number;
}

interface MatchupPrediction {
  team1: Team;
  team2: Team;
  team1WinProbability: number;
  upsetPotential: number;
  confidence: number;
}

export class TournamentSeedingModel {
  private ratingModel: tf.LayersModel | null = null;
  private upsetModel: tf.LayersModel | null = null;
  private isTraining = false;

  constructor() {
    this.initializeModels();
  }

  private async initializeModels(): Promise<void> {
    try {
      this.ratingModel = await tf.loadLayersModel('/models/tournament-seeding/rating-model.json');
      this.upsetModel = await tf.loadLayersModel('/models/tournament-seeding/upset-model.json');
      console.log('Loaded existing tournament seeding models');
    } catch (error) {
      console.log('Creating new tournament seeding models');
      this.ratingModel = this.createRatingModel();
      this.upsetModel = this.createUpsetModel();
    }
  }

  private createRatingModel(): tf.LayersModel {
    // Model to calculate comprehensive team ratings
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [12], // Team performance metrics
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
          units: 1, // Final rating
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

  private createUpsetModel(): tf.LayersModel {
    // Model to predict upset probability
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [8], // Matchup features
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1, // Upset probability
          activation: 'sigmoid'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  /**
   * Generate optimal tournament seeding
   */
  async generateOptimalSeeding(
    teams: Team[],
    historicalGames: Game[] = []
  ): Promise<AnalyticsResult<TournamentSeeding[]>> {
    // Calculate comprehensive ratings for each team
    const teamRatings = await Promise.all(
      teams.map(team => this.calculateTeamRating(team, teams, historicalGames))
    );

    // Sort by final rating
    teamRatings.sort((a, b) => b.finalRating - a.finalRating);

    // Generate seeding
    const seeding: TournamentSeeding[] = teamRatings.map((rating, index) => ({
      teamId: rating.team.id,
      seed: index + 1,
      rating: rating.finalRating,
      projectedWins: this.calculateProjectedWins(rating, teamRatings),
      strengthOfSchedule: rating.strengthOfSchedule,
      upsetProbability: this.calculateUpsetProbability(rating, index + 1),
      championshipOdds: this.calculateChampionshipOdds(rating, teamRatings)
    }));

    return {
      data: seeding,
      confidence: 0.85,
      factors: ['team_performance', 'strength_of_schedule', 'recent_form', 'historical_matchups'],
      cached: false,
      generatedAt: new Date()
    };
  }

  private async calculateTeamRating(
    team: Team,
    allTeams: Team[],
    historicalGames: Game[]
  ): Promise<TeamRating> {
    const totalGames = team.wins + team.losses;
    if (totalGames === 0) {
      return {
        team,
        rating: 0.5,
        strengthOfSchedule: 0.5,
        recentForm: 0.5,
        injuryAdjustment: 1.0,
        finalRating: 0.5
      };
    }

    // Basic performance metrics
    const winPercentage = team.wins / totalGames;
    const pointDifferential = (team.pointsFor - team.pointsAgainst) / totalGames;
    const offensiveEfficiency = team.pointsFor / totalGames;
    const defensiveEfficiency = team.pointsAgainst / totalGames;

    // Calculate strength of schedule
    const strengthOfSchedule = this.calculateStrengthOfSchedule(team, allTeams, historicalGames);

    // Recent form analysis
    const recentForm = this.calculateRecentForm(team);

    // Injury adjustment (mock - would be based on actual injury reports)
    const injuryAdjustment = 0.95; // Assume slight injury impact

    // Use AI model to calculate final rating
    let finalRating = winPercentage; // Default fallback

    if (this.ratingModel) {
      try {
        const features = [
          winPercentage,
          pointDifferential / 20, // Normalize
          offensiveEfficiency / 100,
          defensiveEfficiency / 100,
          strengthOfSchedule,
          recentForm,
          injuryAdjustment,
          totalGames / 30, // Normalize games played
          this.calculateMomentum(team),
          this.calculateExperience(team),
          this.calculateDepth(team),
          this.calculateCoaching(team)
        ];

        const featureTensor = tf.tensor2d([features], [1, features.length]);
        const prediction = this.ratingModel.predict(featureTensor) as tf.Tensor;
        const predictionData = await prediction.data();

        finalRating = predictionData[0];

        featureTensor.dispose();
        prediction.dispose();
      } catch (error) {
        console.warn('Error calculating team rating:', error);
      }
    }

    return {
      team,
      rating: winPercentage,
      strengthOfSchedule,
      recentForm,
      injuryAdjustment,
      finalRating: Math.max(0.1, Math.min(0.9, finalRating))
    };
  }

  private calculateStrengthOfSchedule(
    team: Team,
    allTeams: Team[],
    historicalGames: Game[]
  ): number {
    const teamGames = historicalGames.filter(
      game => game.homeTeamId === team.id || game.awayTeamId === team.id
    );

    if (teamGames.length === 0) return 0.5;

    let totalOpponentWinPct = 0;
    let gameCount = 0;

    for (const game of teamGames) {
      const opponentId = game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId;
      const opponent = allTeams.find(t => t.id === opponentId);

      if (opponent) {
        const opponentGames = opponent.wins + opponent.losses;
        if (opponentGames > 0) {
          totalOpponentWinPct += opponent.wins / opponentGames;
          gameCount++;
        }
      }
    }

    return gameCount > 0 ? totalOpponentWinPct / gameCount : 0.5;
  }

  private calculateRecentForm(team: Team): number {
    if (!team.lastFiveGames || team.lastFiveGames.length === 0) return 0.5;

    const wins = team.lastFiveGames.filter(result => result === 'W').length;
    const recentForm = wins / team.lastFiveGames.length;

    // Weight recent games more heavily
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1]; // Most recent game has highest weight
    let weightedForm = 0;
    let totalWeight = 0;

    for (let i = 0; i < Math.min(team.lastFiveGames.length, 5); i++) {
      const result = team.lastFiveGames[i] === 'W' ? 1 : 0;
      weightedForm += result * weights[i];
      totalWeight += weights[i];
    }

    return totalWeight > 0 ? weightedForm / totalWeight : recentForm;
  }

  private calculateMomentum(team: Team): number {
    // Parse streak and convert to momentum score
    const match = team.streak.match(/([WL])(\d+)/);
    if (!match) return 0.5;

    const [, type, count] = match;
    const streakLength = parseInt(count);
    const isWinning = type === 'W';

    // Momentum increases with winning streaks, decreases with losing streaks
    const momentum = isWinning 
      ? 0.5 + Math.min(0.4, streakLength * 0.08)
      : 0.5 - Math.min(0.4, streakLength * 0.08);

    return Math.max(0.1, Math.min(0.9, momentum));
  }

  private calculateExperience(team: Team): number {
    // Mock experience calculation - would be based on actual player ages and playoff experience
    return 0.6 + Math.random() * 0.3; // Random between 0.6-0.9
  }

  private calculateDepth(team: Team): number {
    // Mock depth calculation - would be based on bench player ratings
    return 0.5 + Math.random() * 0.4; // Random between 0.5-0.9
  }

  private calculateCoaching(team: Team): number {
    // Mock coaching rating - would be based on coach's track record
    return 0.6 + Math.random() * 0.3; // Random between 0.6-0.9
  }

  private calculateProjectedWins(rating: TeamRating, allRatings: TeamRating[]): number {
    // Estimate wins based on rating relative to other teams
    const averageRating = allRatings.reduce((sum, r) => sum + r.finalRating, 0) / allRatings.length;
    const relativeStrength = rating.finalRating / averageRating;
    
    // Assume 16-game tournament bracket (5 rounds max)
    const maxWins = 5;
    return Math.min(maxWins, relativeStrength * maxWins);
  }

  private calculateUpsetProbability(rating: TeamRating, seed: number): number {
    // Higher seeds (worse teams) have higher upset probability when they win
    const seedFactor = seed / 16; // Normalize to 0-1
    const ratingFactor = 1 - rating.finalRating;
    
    return Math.min(0.8, seedFactor * 0.6 + ratingFactor * 0.4);
  }

  private calculateChampionshipOdds(rating: TeamRating, allRatings: TeamRating[]): number {
    // Championship odds based on relative strength
    const totalStrength = allRatings.reduce((sum, r) => sum + r.finalRating, 0);
    return rating.finalRating / totalStrength;
  }

  /**
   * Predict tournament bracket outcomes
   */
  async predictBracket(
    seeding: TournamentSeeding[],
    teams: Team[]
  ): Promise<AnalyticsResult<TournamentBracket>> {
    const teamMap = new Map(teams.map(t => [t.id, t]));
    
    // Simulate tournament rounds
    let currentRound = seeding.map(s => teamMap.get(s.teamId)!).filter(Boolean);
    const bracket: TournamentBracket = {
      regions: [],
      finalFour: [],
      championship: [],
      winner: null
    };

    // First round matchups
    const firstRoundMatchups = this.createMatchups(currentRound);
    const secondRoundTeams: Team[] = [];

    for (const matchup of firstRoundMatchups) {
      const prediction = await this.predictMatchup(matchup.team1, matchup.team2);
      const winner = prediction.team1WinProbability > 0.5 ? matchup.team1 : matchup.team2;
      secondRoundTeams.push(winner);
    }

    // Continue simulating rounds until championship
    currentRound = secondRoundTeams;
    const rounds: Team[][] = [secondRoundTeams];

    while (currentRound.length > 1) {
      const matchups = this.createMatchups(currentRound);
      const nextRound: Team[] = [];

      for (const matchup of matchups) {
        const prediction = await this.predictMatchup(matchup.team1, matchup.team2);
        const winner = prediction.team1WinProbability > 0.5 ? matchup.team1 : matchup.team2;
        nextRound.push(winner);
      }

      rounds.push(nextRound);
      currentRound = nextRound;
    }

    // Populate bracket structure
    if (rounds.length >= 3) {
      bracket.finalFour = rounds[rounds.length - 3];
    }
    if (rounds.length >= 2) {
      bracket.championship = rounds[rounds.length - 2];
    }
    if (rounds.length >= 1) {
      bracket.winner = rounds[rounds.length - 1][0];
    }

    return {
      data: bracket,
      confidence: 0.7,
      factors: ['team_ratings', 'matchup_predictions', 'upset_probabilities'],
      cached: false,
      generatedAt: new Date()
    };
  }

  private createMatchups(teams: Team[]): Array<{ team1: Team; team2: Team; }> {
    const matchups: Array<{ team1: Team; team2: Team; }> = [];
    
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        matchups.push({
          team1: teams[i],
          team2: teams[i + 1]
        });
      }
    }

    return matchups;
  }

  private async predictMatchup(team1: Team, team2: Team): Promise<MatchupPrediction> {
    const team1Games = team1.wins + team1.losses;
    const team2Games = team2.wins + team2.losses;

    // Basic win probability calculation
    const team1WinPct = team1Games > 0 ? team1.wins / team1Games : 0.5;
    const team2WinPct = team2Games > 0 ? team2.wins / team2Games : 0.5;

    const team1Rating = team1WinPct;
    const team2Rating = team2WinPct;

    // Simple Elo-style probability
    const ratingDiff = team1Rating - team2Rating;
    const team1WinProbability = 1 / (1 + Math.exp(-ratingDiff * 10));

    // Calculate upset potential
    const seedDiff = Math.abs(team1Rating - team2Rating);
    const upsetPotential = seedDiff > 0.2 ? Math.min(0.3, seedDiff) : 0.05;

    return {
      team1,
      team2,
      team1WinProbability,
      upsetPotential,
      confidence: 0.75
    };
  }

  /**
   * Identify potential upsets in the tournament
   */
  async identifyUpsets(
    seeding: TournamentSeeding[],
    teams: Team[]
  ): Promise<AnalyticsResult<UpsetProbability[]>> {
    const teamMap = new Map(teams.map(t => [t.id, t]));
    const upsets: UpsetProbability[] = [];

    // Look for potential upsets in early rounds
    for (let i = 0; i < seeding.length - 1; i += 2) {
      const higherSeed = seeding[i];
      const lowerSeed = seeding[i + 1];
      
      const higherSeedTeam = teamMap.get(higherSeed.teamId);
      const lowerSeedTeam = teamMap.get(lowerSeed.teamId);

      if (higherSeedTeam && lowerSeedTeam) {
        const matchupPrediction = await this.predictMatchup(higherSeedTeam, lowerSeedTeam);
        
        // If lower seed has >30% chance to win, consider it an upset potential
        if (matchupPrediction.team1WinProbability < 0.7) {
          upsets.push({
            matchup: {
              id: `${higherSeedTeam.id}_vs_${lowerSeedTeam.id}`,
              round: 1,
              team1: higherSeedTeam,
              team2: lowerSeedTeam,
              winProbability1: matchupPrediction.team1WinProbability,
              winProbability2: 1 - matchupPrediction.team1WinProbability,
              upset: true,
              advance: null
            },
            probability: 1 - matchupPrediction.team1WinProbability,
            factors: this.getUpsetFactors(higherSeed, lowerSeed)
          });
        }
      }
    }

    // Sort by upset probability
    upsets.sort((a, b) => b.probability - a.probability);

    return {
      data: upsets,
      confidence: 0.8,
      factors: ['recent_form', 'matchup_advantages', 'momentum', 'experience'],
      cached: false,
      generatedAt: new Date()
    };
  }

  private getUpsetFactors(higherSeed: TournamentSeeding, lowerSeed: TournamentSeeding): string[] {
    const factors: string[] = [];

    if (lowerSeed.rating > higherSeed.rating * 0.9) {
      factors.push('similar_performance_levels');
    }

    if (lowerSeed.strengthOfSchedule > higherSeed.strengthOfSchedule) {
      factors.push('tougher_schedule_experience');
    }

    // Mock additional factors
    factors.push('momentum_shift');
    factors.push('matchup_advantages');

    return factors;
  }

  /**
   * Generate championship projections
   */
  async generateChampionshipProjections(
    seeding: TournamentSeeding[],
    teams: Team[]
  ): Promise<AnalyticsResult<ChampionshipProjection[]>> {
    const teamMap = new Map(teams.map(t => [t.id, t]));
    const projections: ChampionshipProjection[] = [];

    // Take top contenders (top 8 seeds)
    const topContenders = seeding.slice(0, 8);

    for (const seed of topContenders) {
      const team = teamMap.get(seed.teamId);
      if (!team) continue;

      // Simulate championship path
      const path = await this.simulateChampionshipPath(team, seeding, teams);
      
      projections.push({
        team,
        probability: seed.championshipOdds,
        path: path.teams,
        keyFactors: path.factors
      });
    }

    // Sort by championship probability
    projections.sort((a, b) => b.probability - a.probability);

    return {
      data: projections,
      confidence: 0.75,
      factors: ['team_strength', 'bracket_position', 'championship_experience'],
      cached: false,
      generatedAt: new Date()
    };
  }

  private async simulateChampionshipPath(
    team: Team,
    seeding: TournamentSeeding[],
    teams: Team[]
  ): Promise<{
    teams: Team[];
    factors: string[];
  }> {
    // Simplified path simulation
    const teamSeed = seeding.find(s => s.teamId === team.id);
    if (!teamSeed) {
      return { teams: [], factors: [] };
    }

    // Mock championship path
    const path: Team[] = [team];
    const factors: string[] = [
      'favorable_bracket_position',
      'strong_recent_form',
      'championship_experience',
      'key_player_health'
    ];

    return { teams: path, factors };
  }

  /**
   * Optimize seeding for competitive balance
   */
  async optimizeSeeding(
    currentSeeding: TournamentSeeding[],
    teams: Team[]
  ): Promise<AnalyticsResult<OptimalSeeding>> {
    // Calculate competitive balance metrics for current seeding
    const currentBalance = this.calculateCompetitiveBalance(currentSeeding);

    // Generate alternative seeding arrangements
    const alternatives = this.generateSeedingAlternatives(currentSeeding);
    
    // Find the most balanced arrangement
    let bestBalance = currentBalance;
    let bestSeeding = currentSeeding;

    for (const alternative of alternatives) {
      const balance = this.calculateCompetitiveBalance(alternative);
      if (balance > bestBalance) {
        bestBalance = balance;
        bestSeeding = alternative;
      }
    }

    // Generate improvements list
    const improvements = this.identifySeedingImprovements(currentSeeding, bestSeeding, teams);

    const optimalSeeding: OptimalSeeding = {
      current: currentSeeding,
      optimal: bestSeeding,
      improvements
    };

    return {
      data: optimalSeeding,
      confidence: 0.85,
      factors: ['competitive_balance', 'upset_potential', 'viewer_interest'],
      cached: false,
      generatedAt: new Date()
    };
  }

  private calculateCompetitiveBalance(seeding: TournamentSeeding[]): number {
    // Simple competitive balance: variance in ratings should be evenly distributed
    const ratings = seeding.map(s => s.rating);
    const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
    
    // Lower variance = better balance
    return 1 / (1 + variance);
  }

  private generateSeedingAlternatives(seeding: TournamentSeeding[]): TournamentSeeding[][] {
    // Generate a few alternative seeding arrangements
    const alternatives: TournamentSeeding[][] = [];
    
    // Alternative 1: Swap adjacent seeds with similar ratings
    const alt1 = [...seeding];
    for (let i = 0; i < alt1.length - 1; i++) {
      if (Math.abs(alt1[i].rating - alt1[i + 1].rating) < 0.05) {
        [alt1[i], alt1[i + 1]] = [alt1[i + 1], alt1[i]];
        alt1[i].seed = i + 1;
        alt1[i + 1].seed = i + 2;
      }
    }
    alternatives.push(alt1);

    return alternatives;
  }

  private identifySeedingImprovements(
    current: TournamentSeeding[],
    optimal: TournamentSeeding[],
    teams: Team[]
  ): Array<{
    team: Team;
    currentSeed: number;
    optimalSeed: number;
    reasoning: string;
    impact: number;
  }> {
    const improvements: Array<{
      team: Team;
      currentSeed: number;
      optimalSeed: number;
      reasoning: string;
      impact: number;
    }> = [];

    const teamMap = new Map(teams.map(t => [t.id, t]));

    for (let i = 0; i < current.length; i++) {
      const currentSeed = current[i];
      const optimalSeed = optimal.find(o => o.teamId === currentSeed.teamId);
      
      if (optimalSeed && currentSeed.seed !== optimalSeed.seed) {
        const team = teamMap.get(currentSeed.teamId);
        if (team) {
          improvements.push({
            team,
            currentSeed: currentSeed.seed,
            optimalSeed: optimalSeed.seed,
            reasoning: this.getSeedingReasoning(currentSeed, optimalSeed),
            impact: Math.abs(currentSeed.seed - optimalSeed.seed) / 16
          });
        }
      }
    }

    return improvements;
  }

  private getSeedingReasoning(current: TournamentSeeding, optimal: TournamentSeeding): string {
    if (current.seed > optimal.seed) {
      return 'Team deserves higher seed based on strength of schedule and recent performance';
    } else {
      return 'Team should be seeded lower due to weaker performance metrics';
    }
  }
}