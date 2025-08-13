import { Injectable, Logger } from '@nestjs/common';
import { TournamentFormat, SeedingMethod } from '../entities/tournament.entity';
import { TournamentTeam } from '../entities/tournament-team.entity';
import { TournamentMatch, MatchType } from '../entities/tournament-match.entity';

export interface BracketConfig {
  format: TournamentFormat;
  teams: TournamentTeam[];
  seedingMethod: SeedingMethod;
  includeConsolation?: boolean;
  includeThirdPlace?: boolean;
  poolCount?: number;
  teamsPerPool?: number;
  advanceFromPool?: number;
}

export interface GeneratedBracket {
  rounds: BracketRound[];
  matches: Partial<TournamentMatch>[];
  totalRounds: number;
  structure: any;
}

export interface BracketRound {
  roundNumber: number;
  name: string;
  matchCount: number;
  matches: Partial<TournamentMatch>[];
}

@Injectable()
export class BracketGeneratorService {
  private readonly logger = new Logger(BracketGeneratorService.name);

  /**
   * Generate a complete tournament bracket based on format
   */
  async generateBracket(config: BracketConfig): Promise<GeneratedBracket> {
    this.logger.log(`Generating ${config.format} bracket for ${config.teams.length} teams`);

    // Seed teams if needed
    const seededTeams = await this.seedTeams(config.teams, config.seedingMethod);

    switch (config.format) {
      case TournamentFormat.SINGLE_ELIMINATION:
        return this.generateSingleElimination(seededTeams, config);
      
      case TournamentFormat.DOUBLE_ELIMINATION:
        return this.generateDoubleElimination(seededTeams, config);
      
      case TournamentFormat.ROUND_ROBIN:
        return this.generateRoundRobin(seededTeams, config);
      
      case TournamentFormat.POOL_PLAY:
        return this.generatePoolPlay(seededTeams, config);
      
      default:
        throw new Error(`Unsupported tournament format: ${config.format}`);
    }
  }

  /**
   * Generate single elimination bracket
   */
  private generateSingleElimination(
    teams: TournamentTeam[],
    config: BracketConfig
  ): GeneratedBracket {
    const teamCount = teams.length;
    const rounds = Math.ceil(Math.log2(teamCount));
    const totalSlots = Math.pow(2, rounds);
    const byesNeeded = totalSlots - teamCount;

    const generatedRounds: BracketRound[] = [];
    const allMatches: Partial<TournamentMatch>[] = [];
    let matchCounter = 1;

    // First round with byes
    const firstRoundMatches: Partial<TournamentMatch>[] = [];
    const firstRoundTeams = this.distributeTeamsWithByes(teams, totalSlots, byesNeeded);

    for (let i = 0; i < totalSlots / 2; i++) {
      const homeTeam = firstRoundTeams[i];
      const awayTeam = firstRoundTeams[totalSlots - 1 - i];

      const match: Partial<TournamentMatch> = {
        matchNumber: `R1M${i + 1}`,
        round: 1,
        position: i,
        matchType: rounds === 1 ? MatchType.FINAL : MatchType.BRACKET,
        homeTeamId: homeTeam?.id,
        awayTeamId: awayTeam?.id,
        homeTeamSeed: homeTeam?.seed,
        awayTeamSeed: awayTeam?.seed,
      };

      // If one team has a bye, they automatically advance
      if (homeTeam && !awayTeam) {
        match.winnerId = homeTeam.id;
        match.homeTeamPlaceholder = `Seed ${homeTeam.seed}`;
        match.awayTeamPlaceholder = 'BYE';
      } else if (!homeTeam && awayTeam) {
        match.winnerId = awayTeam.id;
        match.homeTeamPlaceholder = 'BYE';
        match.awayTeamPlaceholder = `Seed ${awayTeam.seed}`;
      }

      // Set up advancement
      const nextRoundPosition = Math.floor(i / 2);
      const isHomeInNext = i % 2 === 0;
      match.nextMatches = {
        winnerTo: {
          matchId: `R2M${nextRoundPosition + 1}`,
          position: isHomeInNext ? 'home' : 'away',
        },
      };

      firstRoundMatches.push(match);
      allMatches.push(match);
    }

    generatedRounds.push({
      roundNumber: 1,
      name: this.getRoundName(1, rounds),
      matchCount: firstRoundMatches.length,
      matches: firstRoundMatches,
    });

    // Generate subsequent rounds
    for (let round = 2; round <= rounds; round++) {
      const roundMatches: Partial<TournamentMatch>[] = [];
      const matchesInRound = Math.pow(2, rounds - round);

      for (let i = 0; i < matchesInRound; i++) {
        const match: Partial<TournamentMatch> = {
          matchNumber: `R${round}M${i + 1}`,
          round: round,
          position: i,
          matchType: this.getMatchType(round, rounds),
          homeTeamPlaceholder: `Winner of R${round - 1}M${i * 2 + 1}`,
          awayTeamPlaceholder: `Winner of R${round - 1}M${i * 2 + 2}`,
        };

        // Set up advancement for non-final rounds
        if (round < rounds) {
          const nextRoundPosition = Math.floor(i / 2);
          const isHomeInNext = i % 2 === 0;
          match.nextMatches = {
            winnerTo: {
              matchId: `R${round + 1}M${nextRoundPosition + 1}`,
              position: isHomeInNext ? 'home' : 'away',
            },
          };
        }

        // Set previous matches
        match.previousMatches = {
          home: {
            matchId: `R${round - 1}M${i * 2 + 1}`,
            result: 'winner',
          },
          away: {
            matchId: `R${round - 1}M${i * 2 + 2}`,
            result: 'winner',
          },
        };

        roundMatches.push(match);
        allMatches.push(match);
      }

      generatedRounds.push({
        roundNumber: round,
        name: this.getRoundName(round, rounds),
        matchCount: roundMatches.length,
        matches: roundMatches,
      });
    }

    // Add third place game if configured
    if (config.includeThirdPlace && rounds > 1) {
      const thirdPlaceMatch: Partial<TournamentMatch> = {
        matchNumber: '3RD',
        round: rounds,
        position: 1,
        matchType: MatchType.THIRD_PLACE,
        homeTeamPlaceholder: `Loser of SF1`,
        awayTeamPlaceholder: `Loser of SF2`,
        previousMatches: {
          home: {
            matchId: `R${rounds - 1}M1`,
            result: 'loser',
          },
          away: {
            matchId: `R${rounds - 1}M2`,
            result: 'loser',
          },
        },
      };
      allMatches.push(thirdPlaceMatch);
    }

    return {
      rounds: generatedRounds,
      matches: allMatches,
      totalRounds: rounds,
      structure: {
        format: 'single_elimination',
        teamCount,
        byesCount: byesNeeded,
        totalMatches: allMatches.length,
      },
    };
  }

  /**
   * Generate double elimination bracket
   */
  private generateDoubleElimination(
    teams: TournamentTeam[],
    config: BracketConfig
  ): GeneratedBracket {
    const teamCount = teams.length;
    const winnersRounds = Math.ceil(Math.log2(teamCount));
    const allMatches: Partial<TournamentMatch>[] = [];
    const generatedRounds: BracketRound[] = [];

    // Generate winners bracket
    const winnersBracket = this.generateSingleElimination(teams, {
      ...config,
      includeThirdPlace: false,
    });

    // Mark all winners bracket matches
    winnersBracket.matches.forEach(match => {
      match.bracket = 'winners';
      allMatches.push(match);
    });

    // Generate losers bracket
    const losersMatches = this.generateLosersBracket(teamCount, winnersRounds);
    losersMatches.forEach(match => {
      match.bracket = 'losers';
      allMatches.push(match);
    });

    // Grand Finals
    const grandFinal: Partial<TournamentMatch> = {
      matchNumber: 'GF1',
      round: winnersRounds + Math.ceil(Math.log2(teamCount)) + 1,
      position: 0,
      matchType: MatchType.CHAMPIONSHIP,
      bracket: 'grand_final',
      homeTeamPlaceholder: 'Winners Bracket Champion',
      awayTeamPlaceholder: 'Losers Bracket Champion',
    };
    allMatches.push(grandFinal);

    // Potential second grand final (if losers bracket champion wins first)
    const grandFinal2: Partial<TournamentMatch> = {
      matchNumber: 'GF2',
      round: winnersRounds + Math.ceil(Math.log2(teamCount)) + 2,
      position: 0,
      matchType: MatchType.CHAMPIONSHIP,
      bracket: 'grand_final',
      homeTeamPlaceholder: 'GF1 Winner',
      awayTeamPlaceholder: 'GF1 Loser',
      notes: 'Only played if Losers Bracket Champion wins GF1',
    };
    allMatches.push(grandFinal2);

    return {
      rounds: generatedRounds,
      matches: allMatches,
      totalRounds: winnersRounds * 2 + 2,
      structure: {
        format: 'double_elimination',
        teamCount,
        winnersRounds,
        losersRounds: winnersRounds * 2 - 1,
        totalMatches: allMatches.length,
      },
    };
  }

  /**
   * Generate round robin schedule
   */
  private generateRoundRobin(
    teams: TournamentTeam[],
    config: BracketConfig
  ): GeneratedBracket {
    const teamCount = teams.length;
    const rounds = teamCount % 2 === 0 ? teamCount - 1 : teamCount;
    const matchesPerRound = Math.floor(teamCount / 2);
    const allMatches: Partial<TournamentMatch>[] = [];
    const generatedRounds: BracketRound[] = [];

    // Add dummy team if odd number
    const scheduleTeams = [...teams];
    if (teamCount % 2 === 1) {
      scheduleTeams.push(null); // Bye
    }

    // Generate round-robin using circle method
    for (let round = 0; round < rounds; round++) {
      const roundMatches: Partial<TournamentMatch>[] = [];

      for (let match = 0; match < matchesPerRound; match++) {
        let home = (round + match) % (scheduleTeams.length - 1);
        let away = (scheduleTeams.length - 1 - match + round) % (scheduleTeams.length - 1);

        // Last team stays in place
        if (match === 0) {
          away = scheduleTeams.length - 1;
        }

        const homeTeam = scheduleTeams[home];
        const awayTeam = scheduleTeams[away];

        if (homeTeam && awayTeam) {
          const matchObj: Partial<TournamentMatch> = {
            matchNumber: `RR${round + 1}M${match + 1}`,
            round: round + 1,
            position: match,
            matchType: MatchType.POOL_PLAY,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeTeamSeed: homeTeam.seed,
            awayTeamSeed: awayTeam.seed,
          };

          roundMatches.push(matchObj);
          allMatches.push(matchObj);
        }
      }

      generatedRounds.push({
        roundNumber: round + 1,
        name: `Round ${round + 1}`,
        matchCount: roundMatches.length,
        matches: roundMatches,
      });
    }

    return {
      rounds: generatedRounds,
      matches: allMatches,
      totalRounds: rounds,
      structure: {
        format: 'round_robin',
        teamCount,
        totalRounds: rounds,
        matchesPerRound,
        totalMatches: allMatches.length,
      },
    };
  }

  /**
   * Generate pool play with knockout stage
   */
  private generatePoolPlay(
    teams: TournamentTeam[],
    config: BracketConfig
  ): GeneratedBracket {
    const poolCount = config.poolCount || 4;
    const teamsPerPool = Math.ceil(teams.length / poolCount);
    const advanceFromPool = config.advanceFromPool || 2;
    const allMatches: Partial<TournamentMatch>[] = [];
    const generatedRounds: BracketRound[] = [];

    // Distribute teams into pools
    const pools = this.distributeTeamsIntoPools(teams, poolCount);

    // Generate round-robin for each pool
    let matchCounter = 1;
    pools.forEach((poolTeams, poolIndex) => {
      const poolId = String.fromCharCode(65 + poolIndex); // A, B, C, D...
      
      // Mark teams with their pool
      poolTeams.forEach(team => {
        team.poolId = poolId;
      });

      const poolRobin = this.generateRoundRobin(poolTeams, config);
      poolRobin.matches.forEach(match => {
        match.matchNumber = `P${poolId}M${matchCounter++}`;
        match.bracket = `pool_${poolId}`;
        allMatches.push(match);
      });
    });

    // Generate knockout stage
    const knockoutTeams = advanceFromPool * poolCount;
    const knockoutRounds = Math.ceil(Math.log2(knockoutTeams));

    // Create placeholder teams for knockout
    const knockoutMatches: Partial<TournamentMatch>[] = [];
    for (let round = 1; round <= knockoutRounds; round++) {
      const matchesInRound = Math.pow(2, knockoutRounds - round);
      
      for (let i = 0; i < matchesInRound; i++) {
        const match: Partial<TournamentMatch> = {
          matchNumber: `KO${round}M${i + 1}`,
          round: pools[0].length + round, // After pool play rounds
          position: i,
          matchType: this.getMatchType(round, knockoutRounds),
          bracket: 'knockout',
        };

        if (round === 1) {
          // First knockout round - teams from pools
          const homePoolPosition = this.getPoolAdvancementPosition(i, 'home', advanceFromPool, poolCount);
          const awayPoolPosition = this.getPoolAdvancementPosition(i, 'away', advanceFromPool, poolCount);
          
          match.homeTeamPlaceholder = `${homePoolPosition.pool} #${homePoolPosition.position}`;
          match.awayTeamPlaceholder = `${awayPoolPosition.pool} #${awayPoolPosition.position}`;
        } else {
          // Subsequent rounds
          match.homeTeamPlaceholder = `Winner of KO${round - 1}M${i * 2 + 1}`;
          match.awayTeamPlaceholder = `Winner of KO${round - 1}M${i * 2 + 2}`;
        }

        knockoutMatches.push(match);
        allMatches.push(match);
      }
    }

    return {
      rounds: generatedRounds,
      matches: allMatches,
      totalRounds: pools[0].length + knockoutRounds,
      structure: {
        format: 'pool_play',
        poolCount,
        teamsPerPool,
        advanceFromPool,
        poolPlayRounds: pools[0].length - 1,
        knockoutRounds,
        totalMatches: allMatches.length,
      },
    };
  }

  /**
   * Seed teams based on method
   */
  private async seedTeams(
    teams: TournamentTeam[],
    method: SeedingMethod
  ): Promise<TournamentTeam[]> {
    switch (method) {
      case SeedingMethod.RANDOM:
        return this.randomSeed(teams);
      
      case SeedingMethod.RANKED:
        return this.rankedSeed(teams);
      
      case SeedingMethod.SNAKE:
        return this.snakeSeed(teams);
      
      case SeedingMethod.MANUAL:
      default:
        // Assume teams already have seed numbers
        return teams.sort((a, b) => (a.seed || 999) - (b.seed || 999));
    }
  }

  /**
   * Random seeding
   */
  private randomSeed(teams: TournamentTeam[]): TournamentTeam[] {
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    shuffled.forEach((team, index) => {
      team.seed = index + 1;
    });
    return shuffled;
  }

  /**
   * Ranked seeding based on regular season record
   */
  private rankedSeed(teams: TournamentTeam[]): TournamentTeam[] {
    const sorted = [...teams].sort((a, b) => {
      const aRecord = a.regularSeasonRecord || { winPercentage: 0 };
      const bRecord = b.regularSeasonRecord || { winPercentage: 0 };
      
      // First by win percentage
      if (aRecord.winPercentage !== bRecord.winPercentage) {
        return bRecord.winPercentage - aRecord.winPercentage;
      }
      
      // Then by point differential
      const aDiff = (aRecord.pointsFor || 0) - (aRecord.pointsAgainst || 0);
      const bDiff = (bRecord.pointsFor || 0) - (bRecord.pointsAgainst || 0);
      return bDiff - aDiff;
    });

    sorted.forEach((team, index) => {
      team.seed = index + 1;
    });
    return sorted;
  }

  /**
   * Snake seeding for pools
   */
  private snakeSeed(teams: TournamentTeam[]): TournamentTeam[] {
    // First rank teams
    const ranked = this.rankedSeed(teams);
    return ranked;
  }

  /**
   * Distribute teams with byes for single elimination
   */
  private distributeTeamsWithByes(
    teams: TournamentTeam[],
    totalSlots: number,
    byesNeeded: number
  ): (TournamentTeam | null)[] {
    const result: (TournamentTeam | null)[] = new Array(totalSlots).fill(null);
    
    // Place teams with proper bye distribution
    // Top seeds get byes
    let teamIndex = 0;
    const byePositions = this.calculateByePositions(totalSlots, byesNeeded);
    
    for (let i = 0; i < totalSlots; i++) {
      if (!byePositions.includes(i) && teamIndex < teams.length) {
        result[i] = teams[teamIndex++];
      }
    }
    
    return result;
  }

  /**
   * Calculate which positions should have byes
   */
  private calculateByePositions(totalSlots: number, byesNeeded: number): number[] {
    const positions: number[] = [];
    const interval = Math.floor(totalSlots / byesNeeded);
    
    for (let i = 0; i < byesNeeded; i++) {
      positions.push(totalSlots - 1 - (i * interval));
    }
    
    return positions;
  }

  /**
   * Generate losers bracket structure
   */
  private generateLosersBracket(
    teamCount: number,
    winnersRounds: number
  ): Partial<TournamentMatch>[] {
    const matches: Partial<TournamentMatch>[] = [];
    let matchCounter = 1;
    let currentRound = 1;

    // Losers bracket has (winnersRounds - 1) * 2 rounds
    const totalLosersRounds = (winnersRounds - 1) * 2;

    for (let round = 1; round <= totalLosersRounds; round++) {
      const isDropRound = round % 2 === 1; // Odd rounds receive dropdowns from winners
      const matchesInRound = Math.pow(2, Math.floor((totalLosersRounds - round) / 2));

      for (let i = 0; i < matchesInRound; i++) {
        const match: Partial<TournamentMatch> = {
          matchNumber: `L${round}M${i + 1}`,
          round: winnersRounds + round,
          position: i,
          matchType: MatchType.BRACKET,
          bracket: 'losers',
        };

        if (isDropRound) {
          // Teams drop from winners bracket
          const winnersRound = Math.floor((round + 1) / 2);
          match.homeTeamPlaceholder = round === 1 
            ? `Loser of R1M${i * 2 + 1}`
            : `Winner of L${round - 1}M${i + 1}`;
          match.awayTeamPlaceholder = round === 1
            ? `Loser of R1M${i * 2 + 2}`
            : `Loser of R${winnersRound}M${i + 1}`;
        } else {
          // Winners from previous losers round
          match.homeTeamPlaceholder = `Winner of L${round - 1}M${i * 2 + 1}`;
          match.awayTeamPlaceholder = `Winner of L${round - 1}M${i * 2 + 2}`;
        }

        matches.push(match);
      }
    }

    return matches;
  }

  /**
   * Distribute teams into pools using snake draft
   */
  private distributeTeamsIntoPools(
    teams: TournamentTeam[],
    poolCount: number
  ): TournamentTeam[][] {
    const pools: TournamentTeam[][] = Array(poolCount).fill(null).map(() => []);
    const seededTeams = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));

    // Snake draft distribution
    let poolIndex = 0;
    let direction = 1;

    seededTeams.forEach((team, index) => {
      pools[poolIndex].push(team);
      
      poolIndex += direction;
      if (poolIndex === poolCount || poolIndex === -1) {
        direction *= -1;
        poolIndex += direction;
      }
    });

    return pools;
  }

  /**
   * Get pool advancement position for knockout stage
   */
  private getPoolAdvancementPosition(
    matchIndex: number,
    position: 'home' | 'away',
    advanceFromPool: number,
    poolCount: number
  ): { pool: string; position: number } {
    // Standard cross-pool matchups (1A vs 2B, 1B vs 2A, etc.)
    const matchups = this.generatePoolMatchups(advanceFromPool, poolCount);
    const matchup = matchups[matchIndex];
    
    if (position === 'home') {
      return {
        pool: String.fromCharCode(65 + matchup.homePool),
        position: matchup.homePosition,
      };
    } else {
      return {
        pool: String.fromCharCode(65 + matchup.awayPool),
        position: matchup.awayPosition,
      };
    }
  }

  /**
   * Generate pool matchups for knockout stage
   */
  private generatePoolMatchups(
    advanceFromPool: number,
    poolCount: number
  ): Array<{ homePool: number; homePosition: number; awayPool: number; awayPosition: number }> {
    const matchups: Array<{ homePool: number; homePosition: number; awayPool: number; awayPosition: number }> = [];

    // Standard cross-pool pairing
    for (let position = 1; position <= advanceFromPool; position++) {
      for (let pool = 0; pool < poolCount; pool += 2) {
        if (pool + 1 < poolCount) {
          matchups.push({
            homePool: pool,
            homePosition: position,
            awayPool: pool + 1,
            awayPosition: advanceFromPool - position + 1,
          });
        }
      }
    }

    return matchups;
  }

  /**
   * Get round name based on position
   */
  private getRoundName(round: number, totalRounds: number): string {
    const roundsFromEnd = totalRounds - round;
    
    switch (roundsFromEnd) {
      case 0:
        return 'Final';
      case 1:
        return 'Semifinals';
      case 2:
        return 'Quarterfinals';
      case 3:
        return 'Round of 16';
      case 4:
        return 'Round of 32';
      case 5:
        return 'Round of 64';
      default:
        return `Round ${round}`;
    }
  }

  /**
   * Get match type based on round position
   */
  private getMatchType(round: number, totalRounds: number): MatchType {
    const roundsFromEnd = totalRounds - round;
    
    switch (roundsFromEnd) {
      case 0:
        return MatchType.FINAL;
      case 1:
        return MatchType.SEMIFINAL;
      case 2:
        return MatchType.QUARTERFINAL;
      default:
        return MatchType.BRACKET;
    }
  }
}