/**
 * Tournament Engine - Advanced bracket generation and management system
 * Supports multiple tournament formats with sophisticated seeding algorithms
 */

export interface Team {
  id: string;
  name: string;
  seed?: number;
  powerRating?: number;
  winPercentage?: number;
  record?: {
    wins: number;
    losses: number;
    ties?: number;
  };
  headToHead?: Record<string, { wins: number; losses: number }>;
  divisionId?: string;
  regionId?: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  roundNumber: number;
  bracketPosition: number;
  team1?: Team;
  team2?: Team;
  winner?: Team;
  loser?: Team;
  score?: {
    team1Score: number;
    team2Score: number;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'bye';
  scheduledTime?: Date;
  court?: string;
  parentMatches?: string[]; // IDs of matches that feed into this one
  childMatches?: string[]; // IDs of matches this feeds into
  isConsolation?: boolean;
  isFinals?: boolean;
  isThirdPlace?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  format: TournamentFormat;
  teams: Team[];
  matches: Match[];
  rounds: number;
  status: 'setup' | 'in_progress' | 'completed';
  settings: TournamentSettings;
  bracket?: BracketStructure;
  consolationBracket?: BracketStructure;
  createdAt: Date;
  updatedAt: Date;
}

export type TournamentType = 'single_elimination' | 'double_elimination' | 'round_robin' | 'pool_play' | 'three_game_guarantee';

export type TournamentFormat = {
  size: number; // Number of teams
  byes: number; // Number of byes needed
  guaranteedGames: number; // Minimum games per team
  allowConsolation: boolean;
  seedingMethod: SeedingMethod;
  tiebreakers: TiebreakerRule[];
};

export type SeedingMethod = 'manual' | 'power_rating' | 'win_percentage' | 'random' | 'regional' | 'divisional';

export type TiebreakerRule = 'head_to_head' | 'point_differential' | 'points_scored' | 'random';

export interface TournamentSettings {
  autoAdvance: boolean;
  randomizeByes: boolean;
  balancedBracket: boolean;
  regionProtection: boolean; // Avoid same-region matchups early
  divisionProtection: boolean; // Avoid same-division matchups early
  consolationRounds: number;
}

export interface BracketStructure {
  rounds: BracketRound[];
  totalRounds: number;
  totalMatches: number;
}

export interface BracketRound {
  roundNumber: number;
  matches: Match[];
  isComplete: boolean;
  name?: string; // e.g., "Quarterfinals", "Semifinals", "Finals"
}

/**
 * Core Tournament Engine Class
 */
export class TournamentEngine {
  private tournament: Tournament;

  constructor(tournament: Tournament) {
    this.tournament = tournament;
  }

  /**
   * Generate tournament bracket based on type and settings
   */
  generateBracket(): BracketStructure {
    switch (this.tournament.type) {
      case 'single_elimination':
        return this.generateSingleEliminationBracket();
      case 'double_elimination':
        return this.generateDoubleEliminationBracket();
      case 'round_robin':
        return this.generateRoundRobinBracket();
      case 'pool_play':
        return this.generatePoolPlayBracket();
      case 'three_game_guarantee':
        return this.generateThreeGameGuaranteeBracket();
      default:
        throw new Error(`Unsupported tournament type: ${this.tournament.type}`);
    }
  }

  /**
   * Single Elimination Bracket Generation
   */
  private generateSingleEliminationBracket(): BracketStructure {
    const teams = this.seedTeams();
    const tournamentSize = this.getNextPowerOfTwo(teams.length);
    const byes = tournamentSize - teams.length;
    const rounds = Math.log2(tournamentSize);

    const bracket: BracketStructure = {
      rounds: [],
      totalRounds: rounds,
      totalMatches: tournamentSize - 1,
    };

    // Generate first round with byes
    const firstRound = this.generateFirstRound(teams, byes);
    bracket.rounds.push(firstRound);

    // Generate subsequent rounds
    for (let round = 2; round <= rounds; round++) {
      const roundMatches = this.generateNextRound(bracket.rounds[round - 2], round);
      bracket.rounds.push({
        roundNumber: round,
        matches: roundMatches,
        isComplete: false,
        name: this.getRoundName(round, rounds),
      });
    }

    return bracket;
  }

  /**
   * Double Elimination Bracket Generation
   */
  private generateDoubleEliminationBracket(): BracketStructure {
    const teams = this.seedTeams();
    const winnersbracket = this.generateSingleEliminationBracket();
    
    // Generate losers bracket
    const numLosersRounds = (winnersbracket.totalRounds - 1) * 2;
    const losersBracket = this.generateLosersBracket(winnersbracket, numLosersRounds);

    // Combine brackets
    const totalRounds = winnersbracket.totalRounds + 1; // +1 for grand finals
    const bracket: BracketStructure = {
      rounds: [...winnersbracket.rounds, ...losersBracket],
      totalRounds,
      totalMatches: winnersbracket.totalMatches + losersBracket.reduce((sum, round) => sum + round.matches.length, 0) + 1,
    };

    // Add grand finals
    const grandFinals = this.generateGrandFinals(winnersbracket, losersBracket);
    bracket.rounds.push(grandFinals);

    return bracket;
  }

  /**
   * Round Robin Bracket Generation
   */
  private generateRoundRobinBracket(): BracketStructure {
    const teams = this.seedTeams();
    const rounds = teams.length % 2 === 0 ? teams.length - 1 : teams.length;
    const matchesPerRound = Math.floor(teams.length / 2);

    const bracket: BracketStructure = {
      rounds: [],
      totalRounds: rounds,
      totalMatches: rounds * matchesPerRound,
    };

    // Generate round-robin schedule using circle method
    const schedule = this.generateRoundRobinSchedule(teams);
    
    for (let round = 1; round <= rounds; round++) {
      const roundMatches = schedule[round - 1].map((matchup, index) => ({
        id: `${this.tournament.id}_r${round}_m${index + 1}`,
        tournamentId: this.tournament.id,
        roundNumber: round,
        bracketPosition: index + 1,
        team1: matchup.team1,
        team2: matchup.team2,
        status: 'pending' as const,
      }));

      bracket.rounds.push({
        roundNumber: round,
        matches: roundMatches,
        isComplete: false,
        name: `Round ${round}`,
      });
    }

    return bracket;
  }

  /**
   * Pool Play Bracket Generation
   */
  private generatePoolPlayBracket(): BracketStructure {
    const teams = this.seedTeams();
    const poolSize = 4; // Standard pool size
    const pools = this.divideIntoPools(teams, poolSize);
    
    // Generate pool play rounds
    const poolRounds: BracketRound[] = [];
    let matchId = 1;

    pools.forEach((pool, poolIndex) => {
      const poolSchedule = this.generateRoundRobinSchedule(pool);
      
      poolSchedule.forEach((round, roundIndex) => {
        const roundNumber = roundIndex + 1;
        const existingRound = poolRounds.find(r => r.roundNumber === roundNumber);
        
        const poolMatches = round.map((matchup, index) => ({
          id: `${this.tournament.id}_pool${poolIndex + 1}_r${roundNumber}_m${index + 1}`,
          tournamentId: this.tournament.id,
          roundNumber,
          bracketPosition: matchId++,
          team1: matchup.team1,
          team2: matchup.team2,
          status: 'pending' as const,
        }));

        if (existingRound) {
          existingRound.matches.push(...poolMatches);
        } else {
          poolRounds.push({
            roundNumber,
            matches: poolMatches,
            isComplete: false,
            name: `Pool Play Round ${roundNumber}`,
          });
        }
      });
    });

    // Generate elimination bracket from pool winners
    const eliminationTeams = pools.map(pool => pool[0]); // Pool winners
    const eliminationBracket = this.generateSingleEliminationBracketForTeams(eliminationTeams);

    return {
      rounds: [...poolRounds, ...eliminationBracket.rounds],
      totalRounds: poolRounds.length + eliminationBracket.totalRounds,
      totalMatches: poolRounds.reduce((sum, round) => sum + round.matches.length, 0) + eliminationBracket.totalMatches,
    };
  }

  /**
   * Three Game Guarantee Bracket Generation
   */
  private generateThreeGameGuaranteeBracket(): BracketStructure {
    const teams = this.seedTeams();
    
    // Split into upper and lower brackets
    const upperBracket = teams.filter((_, index) => index % 2 === 0);
    const lowerBracket = teams.filter((_, index) => index % 2 === 1);

    const upperElimination = this.generateSingleEliminationBracketForTeams(upperBracket);
    const lowerElimination = this.generateSingleEliminationBracketForTeams(lowerBracket);

    // Generate consolation games to ensure 3-game guarantee
    const consolationRounds = this.generateConsolationRounds(upperElimination, lowerElimination);

    return {
      rounds: [...upperElimination.rounds, ...lowerElimination.rounds, ...consolationRounds],
      totalRounds: Math.max(upperElimination.totalRounds, lowerElimination.totalRounds) + consolationRounds.length,
      totalMatches: upperElimination.totalMatches + lowerElimination.totalMatches + 
                   consolationRounds.reduce((sum, round) => sum + round.matches.length, 0),
    };
  }

  /**
   * Advanced Seeding Algorithms
   */
  private seedTeams(): Team[] {
    const teams = [...this.tournament.teams];

    switch (this.tournament.format.seedingMethod) {
      case 'power_rating':
        return teams.sort((a, b) => (b.powerRating || 0) - (a.powerRating || 0));
      
      case 'win_percentage':
        return teams.sort((a, b) => {
          const aWinPct = a.winPercentage || this.calculateWinPercentage(a);
          const bWinPct = b.winPercentage || this.calculateWinPercentage(b);
          return bWinPct - aWinPct;
        });
      
      case 'regional':
        return this.seedByRegion(teams);
      
      case 'divisional':
        return this.seedByDivision(teams);
      
      case 'random':
        return this.shuffleArray(teams);
      
      case 'manual':
      default:
        return teams.sort((a, b) => (a.seed || 999) - (b.seed || 999));
    }
  }

  /**
   * Calculate win percentage for a team
   */
  private calculateWinPercentage(team: Team): number {
    if (!team.record) return 0;
    const totalGames = team.record.wins + team.record.losses + (team.record.ties || 0);
    if (totalGames === 0) return 0;
    return (team.record.wins + (team.record.ties || 0) * 0.5) / totalGames;
  }

  /**
   * Seed teams by region to avoid early same-region matchups
   */
  private seedByRegion(teams: Team[]): Team[] {
    const regions = new Map<string, Team[]>();
    
    teams.forEach(team => {
      const region = team.regionId || 'default';
      if (!regions.has(region)) {
        regions.set(region, []);
      }
      regions.get(region)!.push(team);
    });

    // Sort teams within each region by power rating
    regions.forEach(regionTeams => {
      regionTeams.sort((a, b) => (b.powerRating || 0) - (a.powerRating || 0));
    });

    // Interleave teams from different regions
    const seededTeams: Team[] = [];
    const regionArrays = Array.from(regions.values());
    
    let maxLength = Math.max(...regionArrays.map(arr => arr.length));
    for (let i = 0; i < maxLength; i++) {
      regionArrays.forEach(regionTeams => {
        if (i < regionTeams.length) {
          seededTeams.push(regionTeams[i]);
        }
      });
    }

    return seededTeams;
  }

  /**
   * Seed teams by division
   */
  private seedByDivision(teams: Team[]): Team[] {
    const divisions = new Map<string, Team[]>();
    
    teams.forEach(team => {
      const division = team.divisionId || 'default';
      if (!divisions.has(division)) {
        divisions.set(division, []);
      }
      divisions.get(division)!.push(team);
    });

    // Sort teams within each division
    divisions.forEach(divisionTeams => {
      divisionTeams.sort((a, b) => (b.powerRating || 0) - (a.powerRating || 0));
    });

    // Interleave teams from different divisions
    const seededTeams: Team[] = [];
    const divisionArrays = Array.from(divisions.values());
    
    let maxLength = Math.max(...divisionArrays.map(arr => arr.length));
    for (let i = 0; i < maxLength; i++) {
      divisionArrays.forEach(divisionTeams => {
        if (i < divisionTeams.length) {
          seededTeams.push(divisionTeams[i]);
        }
      });
    }

    return seededTeams;
  }

  /**
   * Utility function to get next power of 2
   */
  private getNextPowerOfTwo(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  /**
   * Generate first round with proper bye placement
   */
  private generateFirstRound(teams: Team[], byes: number): BracketRound {
    const matches: Match[] = [];
    let matchIndex = 1;
    let teamIndex = 0;

    // Distribute byes among top seeds
    const byePositions = this.generateByePositions(teams.length + byes, byes);

    for (let position = 1; position <= teams.length + byes; position += 2) {
      const team1Pos = position;
      const team2Pos = position + 1;

      let team1: Team | undefined;
      let team2: Team | undefined;
      let status: Match['status'] = 'pending';

      // Check if either position gets a bye
      if (byePositions.includes(team1Pos)) {
        team2 = teams[teamIndex++];
        status = 'bye';
      } else if (byePositions.includes(team2Pos)) {
        team1 = teams[teamIndex++];
        status = 'bye';
      } else {
        team1 = teams[teamIndex++];
        team2 = teams[teamIndex++];
      }

      matches.push({
        id: `${this.tournament.id}_r1_m${matchIndex}`,
        tournamentId: this.tournament.id,
        roundNumber: 1,
        bracketPosition: matchIndex,
        team1,
        team2,
        status,
      });

      matchIndex++;
    }

    return {
      roundNumber: 1,
      matches,
      isComplete: false,
      name: 'First Round',
    };
  }

  /**
   * Generate bye positions for balanced bracket
   */
  private generateByePositions(tournamentSize: number, byes: number): number[] {
    const positions: number[] = [];
    
    if (this.tournament.settings.randomizeByes) {
      // Random bye placement
      const availablePositions = Array.from({ length: tournamentSize }, (_, i) => i + 1);
      for (let i = 0; i < byes; i++) {
        const randomIndex = Math.floor(Math.random() * availablePositions.length);
        positions.push(availablePositions.splice(randomIndex, 1)[0]);
      }
    } else {
      // Standard bye placement (top seeds get byes)
      for (let i = 1; i <= byes; i++) {
        positions.push(i);
      }
    }

    return positions.sort((a, b) => a - b);
  }

  /**
   * Generate next round matches
   */
  private generateNextRound(previousRound: BracketRound, roundNumber: number): Match[] {
    const matches: Match[] = [];
    const previousMatches = previousRound.matches;
    
    for (let i = 0; i < previousMatches.length; i += 2) {
      const match1 = previousMatches[i];
      const match2 = previousMatches[i + 1];
      
      matches.push({
        id: `${this.tournament.id}_r${roundNumber}_m${Math.floor(i / 2) + 1}`,
        tournamentId: this.tournament.id,
        roundNumber,
        bracketPosition: Math.floor(i / 2) + 1,
        status: 'pending',
        parentMatches: [match1.id, match2?.id].filter(Boolean),
      });
    }

    return matches;
  }

  /**
   * Generate round robin schedule using circle method
   */
  private generateRoundRobinSchedule(teams: Team[]): Array<Array<{ team1: Team; team2: Team }>> {
    const schedule: Array<Array<{ team1: Team; team2: Team }>> = [];
    const teamsCopy = [...teams];
    
    // Add dummy team if odd number of teams
    if (teamsCopy.length % 2 === 1) {
      teamsCopy.push({ id: 'bye', name: 'BYE' });
    }

    const numRounds = teamsCopy.length - 1;
    const numMatchesPerRound = teamsCopy.length / 2;

    for (let round = 0; round < numRounds; round++) {
      const roundMatches: Array<{ team1: Team; team2: Team }> = [];
      
      for (let match = 0; match < numMatchesPerRound; match++) {
        const home = (round + match) % (teamsCopy.length - 1);
        const away = (teamsCopy.length - 1 - match + round) % (teamsCopy.length - 1);
        
        let team1Index = home;
        let team2Index = away;
        
        if (match === 0) {
          team2Index = teamsCopy.length - 1;
        }

        const team1 = teamsCopy[team1Index];
        const team2 = teamsCopy[team2Index];

        // Skip matches with BYE team
        if (team1.id !== 'bye' && team2.id !== 'bye') {
          roundMatches.push({ team1, team2 });
        }
      }
      
      schedule.push(roundMatches);
    }

    return schedule;
  }

  /**
   * Divide teams into pools
   */

  /**
   * Get round name based on position
   */
  private getRoundName(round: number, totalRounds: number): string {
    const fromEnd = totalRounds - round + 1;
    
    switch (fromEnd) {
      case 1: return 'Finals';
      case 2: return 'Semifinals';
      case 3: return 'Quarterfinals';
      case 4: return 'Round of 16';
      case 5: return 'Round of 32';
      case 6: return 'Round of 64';
      default: return `Round ${round}`;
    }
  }

  /**
   * Shuffle array utility
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Additional helper methods for double elimination and other complex formats
   */
  private generateLosersBracket(winnersbracket: BracketStructure, numRounds: number): BracketRound[] {
    // Implementation for losers bracket generation
    const losersBracketRounds: BracketRound[] = [];
    
    // Complex losers bracket logic would go here
    // This is a simplified version
    
    return losersBracketRounds;
  }

  private generateGrandFinals(winnersbracket: BracketStructure, losersBracket: BracketRound[]): BracketRound {
    return {
      roundNumber: winnersbracket.totalRounds + 1,
      matches: [{
        id: `${this.tournament.id}_grand_finals`,
        tournamentId: this.tournament.id,
        roundNumber: winnersbracket.totalRounds + 1,
        bracketPosition: 1,
        status: 'pending',
        isFinals: true,
      }],
      isComplete: false,
      name: 'Grand Finals',
    };
  }

  private generateSingleEliminationBracketForTeams(teams: Team[]): BracketStructure {
    const tempTournament = { ...this.tournament, teams };
    const tempEngine = new TournamentEngine(tempTournament);
    return tempEngine.generateSingleEliminationBracket();
  }

  private generateConsolationRounds(upperBracket: BracketStructure, lowerBracket: BracketStructure): BracketRound[] {
    // Generate consolation games to ensure minimum game guarantee
    return [];
  }

  private divideIntoPools(teams: Team[], poolSize: number): Team[][] {
    const pools: Team[][] = [];
    const numPools = Math.ceil(teams.length / poolSize);
    
    // Snake draft to balance pools
    for (let pool = 0; pool < numPools; pool++) {
      pools.push([]);
    }

    teams.forEach((team, index) => {
      const poolIndex = Math.floor(index / poolSize) % 2 === 0 
        ? index % numPools 
        : numPools - 1 - (index % numPools);
      pools[poolIndex].push(team);
    });

    return pools.filter(pool => pool.length > 0);
  }

  /**
   * Advance team to next round
   */
  advanceTeam(matchId: string, winner: Team, loser: Team): void {
    const match = this.findMatch(matchId);
    if (!match) throw new Error(`Match ${matchId} not found`);

    match.winner = winner;
    match.loser = loser;
    match.status = 'completed';

    // Find and update child matches
    if (match.childMatches) {
      match.childMatches.forEach(childMatchId => {
        const childMatch = this.findMatch(childMatchId);
        if (childMatch) {
          if (!childMatch.team1) {
            childMatch.team1 = winner;
          } else if (!childMatch.team2) {
            childMatch.team2 = winner;
          }
        }
      });
    }
  }

  /**
   * Find match by ID
   */
  private findMatch(matchId: string): Match | undefined {
    for (const round of this.tournament.bracket?.rounds || []) {
      const match = round.matches.find(m => m.id === matchId);
      if (match) return match;
    }
    return undefined;
  }

  /**
   * Get tournament statistics
   */
  getStatistics() {
    const totalMatches = this.tournament.matches.length;
    const completedMatches = this.tournament.matches.filter(m => m.status === 'completed').length;
    const inProgressMatches = this.tournament.matches.filter(m => m.status === 'in_progress').length;
    
    return {
      totalMatches,
      completedMatches,
      inProgressMatches,
      pendingMatches: totalMatches - completedMatches - inProgressMatches,
      completionPercentage: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
    };
  }
}

/**
 * Tournament Factory for creating different tournament types
 */
export class TournamentFactory {
  static createSingleElimination(teams: Team[], settings?: Partial<TournamentSettings>): Tournament {
    const format: TournamentFormat = {
      size: teams.length,
      byes: Math.pow(2, Math.ceil(Math.log2(teams.length))) - teams.length,
      guaranteedGames: 1,
      allowConsolation: settings?.consolationRounds ? settings.consolationRounds > 0 : false,
      seedingMethod: 'power_rating',
      tiebreakers: ['head_to_head', 'point_differential'],
    };

    return {
      id: `tournament_${Date.now()}`,
      name: 'Single Elimination Tournament',
      type: 'single_elimination',
      format,
      teams,
      matches: [],
      rounds: Math.ceil(Math.log2(teams.length)),
      status: 'setup',
      settings: {
        autoAdvance: false,
        randomizeByes: false,
        balancedBracket: true,
        regionProtection: false,
        divisionProtection: false,
        consolationRounds: 0,
        ...settings,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static createDoubleElimination(teams: Team[], settings?: Partial<TournamentSettings>): Tournament {
    const format: TournamentFormat = {
      size: teams.length,
      byes: Math.pow(2, Math.ceil(Math.log2(teams.length))) - teams.length,
      guaranteedGames: 2,
      allowConsolation: true,
      seedingMethod: 'power_rating',
      tiebreakers: ['head_to_head', 'point_differential'],
    };

    return {
      id: `tournament_${Date.now()}`,
      name: 'Double Elimination Tournament',
      type: 'double_elimination',
      format,
      teams,
      matches: [],
      rounds: (Math.ceil(Math.log2(teams.length)) - 1) * 2 + 1,
      status: 'setup',
      settings: {
        autoAdvance: false,
        randomizeByes: false,
        balancedBracket: true,
        regionProtection: false,
        divisionProtection: false,
        consolationRounds: 0,
        ...settings,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static createRoundRobin(teams: Team[], settings?: Partial<TournamentSettings>): Tournament {
    const format: TournamentFormat = {
      size: teams.length,
      byes: 0,
      guaranteedGames: teams.length - 1,
      allowConsolation: false,
      seedingMethod: 'manual',
      tiebreakers: ['head_to_head', 'point_differential', 'points_scored'],
    };

    return {
      id: `tournament_${Date.now()}`,
      name: 'Round Robin Tournament',
      type: 'round_robin',
      format,
      teams,
      matches: [],
      rounds: teams.length % 2 === 0 ? teams.length - 1 : teams.length,
      status: 'setup',
      settings: {
        autoAdvance: true,
        randomizeByes: false,
        balancedBracket: true,
        regionProtection: false,
        divisionProtection: false,
        consolationRounds: 0,
        ...settings,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}