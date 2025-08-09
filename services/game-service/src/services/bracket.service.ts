import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import { logger } from '../config/database';

export interface Team {
  id: string;
  name: string;
  seed: number;
  wins: number;
  losses: number;
  pointDifferential: number;
}

export interface BracketGame {
  id: string;
  gameNumber: number;
  round: number;
  position: number;
  homeTeam: Team | null;
  awayTeam: Team | null;
  winner: Team | null;
  homeScore: number | null;
  awayScore: number | null;
  scheduledTime: Date | null;
  venueId: string | null;
  status: 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  nextGameId: string | null; // For winner advancement
  thirdPlaceGame: boolean;
  prerequisites: {
    homeTeamSource: string | null; // Game ID or 'seed-X'
    awayTeamSource: string | null; // Game ID or 'seed-X'
  };
}

export interface BracketConfiguration {
  type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION';
  teamCount: number;
  includeThirdPlaceMatch: boolean;
  seedFromStandings: boolean;
  timezone: string;
  tournamentName: string;
  venueIds: string[];
  startDate: Date;
  gameDurationMinutes: number;
  bufferMinutes: number;
  preferredTimes: string[]; // ['09:00', '11:00', '13:00', '15:00']
  preferredDays: string[]; // ['SATURDAY', 'SUNDAY']
}

export interface Bracket {
  id: string;
  tournamentId: string;
  organizationId: string;
  name: string;
  type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  teamCount: number;
  teams: Team[];
  games: BracketGame[];
  rounds: number;
  createdAt: Date;
  updatedAt: Date;
  configuration: BracketConfiguration;
  winner: Team | null;
  runnerUp: Team | null;
  thirdPlace: Team | null;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: Array<{
    type: 'VENUE_DOUBLE_BOOKING' | 'TEAM_DOUBLE_BOOKING' | 'TRAVEL_TIME_VIOLATION' | 'SCHEDULING_CONSTRAINT';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    gameIds: string[];
    suggestedResolution: string;
  }>;
}

export class BracketService {
  private static instance: BracketService;

  public static getInstance(): BracketService {
    if (!BracketService.instance) {
      BracketService.instance = new BracketService();
    }
    return BracketService.instance;
  }

  /**
   * Creates a new tournament bracket
   */
  async createBracket(config: BracketConfiguration, teams: Team[]): Promise<Bracket> {
    try {
      // Validate configuration
      this.validateConfiguration(config, teams);

      // Sort teams by seeding
      const sortedTeams = this.seedTeams(teams, config.seedFromStandings);

      // Generate bracket structure
      const bracket: Bracket = {
        id: uuidv4(),
        tournamentId: uuidv4(),
        organizationId: '', // Will be set by caller
        name: config.tournamentName,
        type: config.type,
        status: 'DRAFT',
        teamCount: sortedTeams.length,
        teams: sortedTeams,
        games: [],
        rounds: this.calculateRounds(sortedTeams.length, config.type),
        createdAt: new Date(),
        updatedAt: new Date(),
        configuration: config,
        winner: null,
        runnerUp: null,
        thirdPlace: null,
      };

      // Generate games based on bracket type
      if (config.type === 'SINGLE_ELIMINATION') {
        bracket.games = this.generateSingleEliminationGames(bracket);
      } else {
        bracket.games = this.generateDoubleEliminationGames(bracket);
      }

      // Schedule games if venues and times are provided
      if (config.venueIds.length > 0) {
        await this.scheduleGames(bracket);
      }

      logger.info('Bracket created successfully', {
        bracketId: bracket.id,
        type: config.type,
        teamCount: sortedTeams.length,
        rounds: bracket.rounds,
        gamesGenerated: bracket.games.length,
      });

      return bracket;
    } catch (error) {
      logger.error('Failed to create bracket:', error);
      throw error;
    }
  }

  /**
   * Validates bracket configuration
   */
  private validateConfiguration(config: BracketConfiguration, teams: Team[]): void {
    if (teams.length < 4 || teams.length > 32) {
      throw new Error('Tournament must have between 4 and 32 teams');
    }

    if (!this.isPowerOfTwo(teams.length) && config.type === 'SINGLE_ELIMINATION') {
      throw new Error('Single elimination tournaments require a power of 2 number of teams');
    }

    if (config.venueIds.length === 0) {
      throw new Error('At least one venue must be specified');
    }

    if (config.preferredTimes.length === 0) {
      throw new Error('At least one preferred time must be specified');
    }

    if (moment(config.startDate).isBefore(moment())) {
      throw new Error('Tournament start date must be in the future');
    }
  }

  /**
   * Seeds teams based on standings or manual seeding
   */
  private seedTeams(teams: Team[], seedFromStandings: boolean): Team[] {
    if (seedFromStandings) {
      return teams.sort((a, b) => {
        // Sort by win percentage first
        const aWinPct = a.wins / Math.max(1, a.wins + a.losses);
        const bWinPct = b.wins / Math.max(1, b.wins + b.losses);
        
        if (aWinPct !== bWinPct) {
          return bWinPct - aWinPct;
        }
        
        // Then by point differential
        return b.pointDifferential - a.pointDifferential;
      }).map((team, index) => ({
        ...team,
        seed: index + 1,
      }));
    }

    return teams.sort((a, b) => a.seed - b.seed);
  }

  /**
   * Generates single elimination bracket games
   */
  private generateSingleEliminationGames(bracket: Bracket): BracketGame[] {
    const games: BracketGame[] = [];
    const teams = bracket.teams;
    const totalTeams = teams.length;
    const rounds = bracket.rounds;
    let gameNumber = 1;

    // First round - pair teams by seeding (1 vs lowest, 2 vs second-lowest, etc.)
    const firstRoundGames = totalTeams / 2;
    
    for (let i = 0; i < firstRoundGames; i++) {
      const homeTeam = teams[i];
      const awayTeam = teams[totalTeams - 1 - i];

      games.push({
        id: uuidv4(),
        gameNumber: gameNumber++,
        round: 1,
        position: i + 1,
        homeTeam,
        awayTeam,
        winner: null,
        homeScore: null,
        awayScore: null,
        scheduledTime: null,
        venueId: null,
        status: 'PENDING',
        nextGameId: null, // Will be set after all games are created
        thirdPlaceGame: false,
        prerequisites: {
          homeTeamSource: `seed-${homeTeam.seed}`,
          awayTeamSource: `seed-${awayTeam.seed}`,
        },
      });
    }

    // Generate subsequent rounds
    for (let round = 2; round <= rounds; round++) {
      const gamesInRound = Math.pow(2, rounds - round);
      
      for (let position = 1; position <= gamesInRound; position++) {
        const isChampionshipGame = round === rounds;
        
        games.push({
          id: uuidv4(),
          gameNumber: gameNumber++,
          round,
          position,
          homeTeam: null,
          awayTeam: null,
          winner: null,
          homeScore: null,
          awayScore: null,
          scheduledTime: null,
          venueId: null,
          status: 'PENDING',
          nextGameId: null,
          thirdPlaceGame: false,
          prerequisites: {
            homeTeamSource: null, // Will be set from previous round games
            awayTeamSource: null, // Will be set from previous round games
          },
        });
      }
    }

    // Third place game if requested
    if (bracket.configuration.includeThirdPlaceMatch && rounds > 1) {
      games.push({
        id: uuidv4(),
        gameNumber: gameNumber++,
        round: rounds,
        position: 999, // Special position for third place
        homeTeam: null,
        awayTeam: null,
        winner: null,
        homeScore: null,
        awayScore: null,
        scheduledTime: null,
        venueId: null,
        status: 'PENDING',
        nextGameId: null,
        thirdPlaceGame: true,
        prerequisites: {
          homeTeamSource: null, // Loser of semi-final 1
          awayTeamSource: null, // Loser of semi-final 2
        },
      });
    }

    // Link games for advancement
    this.linkSingleEliminationGames(games, rounds);

    return games;
  }

  /**
   * Links single elimination games for proper team advancement
   */
  private linkSingleEliminationGames(games: BracketGame[], totalRounds: number): void {
    for (let round = 1; round < totalRounds; round++) {
      const currentRoundGames = games.filter(g => g.round === round && !g.thirdPlaceGame);
      const nextRoundGames = games.filter(g => g.round === round + 1 && !g.thirdPlaceGame);

      for (let i = 0; i < currentRoundGames.length; i++) {
        const currentGame = currentRoundGames[i];
        const nextGameIndex = Math.floor(i / 2);
        const nextGame = nextRoundGames[nextGameIndex];

        if (nextGame) {
          currentGame.nextGameId = nextGame.id;
          
          // Set prerequisites for next round
          if (i % 2 === 0) {
            nextGame.prerequisites.homeTeamSource = currentGame.id;
          } else {
            nextGame.prerequisites.awayTeamSource = currentGame.id;
          }
        }
      }
    }

    // Link third place game if it exists
    const thirdPlaceGame = games.find(g => g.thirdPlaceGame);
    if (thirdPlaceGame) {
      const semiFinalGames = games.filter(g => g.round === totalRounds - 1 && !g.thirdPlaceGame);
      if (semiFinalGames.length >= 2) {
        thirdPlaceGame.prerequisites.homeTeamSource = semiFinalGames[0].id;
        thirdPlaceGame.prerequisites.awayTeamSource = semiFinalGames[1].id;
      }
    }
  }

  /**
   * Generates double elimination bracket games
   */
  private generateDoubleEliminationGames(bracket: Bracket): BracketGame[] {
    // Double elimination is more complex - simplified implementation for now
    // In practice, you'd have winners bracket, losers bracket, and grand finals
    const games: BracketGame[] = [];
    
    logger.info('Double elimination bracket generation not fully implemented in this MVP version');
    
    // For now, fall back to single elimination structure
    return this.generateSingleEliminationGames(bracket);
  }

  /**
   * Schedules games across available venues and time slots
   */
  private async scheduleGames(bracket: Bracket): Promise<void> {
    const config = bracket.configuration;
    const games = bracket.games.sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.position - b.position;
    });

    let currentDate = moment(config.startDate).tz(config.timezone);
    let venueIndex = 0;
    let timeSlotIndex = 0;

    for (const game of games) {
      // Skip if it's a later round game (will be scheduled when teams advance)
      if (game.round > 1) continue;

      // Find next available slot
      while (!this.isPreferredDay(currentDate, config.preferredDays)) {
        currentDate.add(1, 'day');
      }

      const timeSlot = config.preferredTimes[timeSlotIndex];
      const [hours, minutes] = timeSlot.split(':').map(Number);
      
      game.scheduledTime = currentDate
        .clone()
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0)
        .toDate();
      
      game.venueId = config.venueIds[venueIndex];
      game.status = 'SCHEDULED';

      // Move to next venue
      venueIndex = (venueIndex + 1) % config.venueIds.length;
      
      // If we've used all venues for this time slot, move to next time slot
      if (venueIndex === 0) {
        timeSlotIndex = (timeSlotIndex + 1) % config.preferredTimes.length;
        
        // If we've used all time slots for this day, move to next day
        if (timeSlotIndex === 0) {
          currentDate.add(1, 'day');
        } else {
          // Add buffer time between games
          currentDate.add(config.gameDurationMinutes + config.bufferMinutes, 'minutes');
        }
      } else {
        // Games at the same time, different venues
        // No time change needed
      }
    }
  }

  /**
   * Advances the winner of a completed game to the next round
   */
  async advanceWinner(bracket: Bracket, gameId: string, winnerId: string, homeScore: number, awayScore: number): Promise<Bracket> {
    try {
      const game = bracket.games.find(g => g.id === gameId);
      if (!game) {
        throw new Error('Game not found in bracket');
      }

      if (game.status !== 'COMPLETED') {
        throw new Error('Game must be completed to advance winner');
      }

      // Validate winner
      const winner = game.homeTeam?.id === winnerId ? game.homeTeam : 
                    game.awayTeam?.id === winnerId ? game.awayTeam : null;
      
      if (!winner) {
        throw new Error('Winner must be one of the competing teams');
      }

      // Update game results
      game.winner = winner;
      game.homeScore = homeScore;
      game.awayScore = awayScore;

      // Advance winner to next game if applicable
      if (game.nextGameId) {
        const nextGame = bracket.games.find(g => g.id === game.nextGameId);
        if (nextGame) {
          if (nextGame.prerequisites.homeTeamSource === gameId) {
            nextGame.homeTeam = winner;
          } else if (nextGame.prerequisites.awayTeamSource === gameId) {
            nextGame.awayTeam = winner;
          }

          // If both teams are now assigned, schedule the next game
          if (nextGame.homeTeam && nextGame.awayTeam && nextGame.status === 'PENDING') {
            await this.scheduleNextRoundGame(bracket, nextGame);
          }
        }
      }

      // Handle third place game
      if (game.round === bracket.rounds - 1 && !game.thirdPlaceGame) {
        const loser = game.homeTeam?.id === winnerId ? game.awayTeam : game.homeTeam;
        const thirdPlaceGame = bracket.games.find(g => g.thirdPlaceGame);
        
        if (thirdPlaceGame && loser) {
          if (thirdPlaceGame.prerequisites.homeTeamSource === gameId) {
            thirdPlaceGame.homeTeam = loser;
          } else if (thirdPlaceGame.prerequisites.awayTeamSource === gameId) {
            thirdPlaceGame.awayTeam = loser;
          }

          // Schedule third place game if both losers are assigned
          if (thirdPlaceGame.homeTeam && thirdPlaceGame.awayTeam && thirdPlaceGame.status === 'PENDING') {
            await this.scheduleNextRoundGame(bracket, thirdPlaceGame);
          }
        }
      }

      // Check if tournament is complete
      const championshipGame = bracket.games.find(g => 
        g.round === bracket.rounds && !g.thirdPlaceGame && g.status === 'COMPLETED'
      );

      if (championshipGame) {
        bracket.winner = championshipGame.winner;
        bracket.runnerUp = championshipGame.winner?.id === championshipGame.homeTeam?.id ? 
          championshipGame.awayTeam : championshipGame.homeTeam;
        
        // Get third place winner
        const thirdPlaceGame = bracket.games.find(g => g.thirdPlaceGame && g.status === 'COMPLETED');
        if (thirdPlaceGame) {
          bracket.thirdPlace = thirdPlaceGame.winner;
        }

        bracket.status = 'COMPLETED';
      }

      bracket.updatedAt = new Date();

      logger.info('Winner advanced in bracket', {
        bracketId: bracket.id,
        gameId,
        winnerId,
        nextGameId: game.nextGameId,
        tournamentComplete: bracket.status === 'COMPLETED',
      });

      return bracket;
    } catch (error) {
      logger.error('Failed to advance winner:', error);
      throw error;
    }
  }

  /**
   * Schedules a next round game
   */
  private async scheduleNextRoundGame(bracket: Bracket, game: BracketGame): Promise<void> {
    const config = bracket.configuration;
    
    // Find the latest game time from the previous round
    const previousRoundGames = bracket.games.filter(g => 
      g.round === game.round - 1 && g.scheduledTime && g.status === 'COMPLETED'
    );

    if (previousRoundGames.length === 0) return;

    const latestGameTime = previousRoundGames.reduce((latest, g) => {
      const gameTime = moment(g.scheduledTime!);
      return gameTime.isAfter(latest) ? gameTime : latest;
    }, moment(previousRoundGames[0].scheduledTime!));

    // Schedule next game at least one day later
    const nextGameTime = latestGameTime
      .clone()
      .tz(config.timezone)
      .add(1, 'day')
      .hour(parseInt(config.preferredTimes[0].split(':')[0]))
      .minute(parseInt(config.preferredTimes[0].split(':')[1]))
      .second(0)
      .millisecond(0);

    // Ensure it's on a preferred day
    while (!this.isPreferredDay(nextGameTime, config.preferredDays)) {
      nextGameTime.add(1, 'day');
    }

    game.scheduledTime = nextGameTime.toDate();
    game.venueId = config.venueIds[0]; // Use first venue for championship/important games
    game.status = 'SCHEDULED';
  }

  /**
   * Detects scheduling conflicts in the bracket
   */
  async detectConflicts(bracket: Bracket): Promise<ConflictDetectionResult> {
    const conflicts: ConflictDetectionResult['conflicts'] = [];
    const scheduledGames = bracket.games.filter(g => g.scheduledTime && g.venueId);

    // Check for venue double booking
    const venueBookings = new Map<string, BracketGame[]>();
    
    scheduledGames.forEach(game => {
      const venueId = game.venueId!;
      if (!venueBookings.has(venueId)) {
        venueBookings.set(venueId, []);
      }
      venueBookings.get(venueId)!.push(game);
    });

    // Check each venue for conflicts
    venueBookings.forEach((games, venueId) => {
      for (let i = 0; i < games.length; i++) {
        for (let j = i + 1; j < games.length; j++) {
          const game1 = games[i];
          const game2 = games[j];
          
          if (this.doGamesOverlap(game1, game2, bracket.configuration)) {
            conflicts.push({
              type: 'VENUE_DOUBLE_BOOKING',
              severity: 'CRITICAL',
              description: `Games ${game1.gameNumber} and ${game2.gameNumber} are double-booked at venue ${venueId}`,
              gameIds: [game1.id, game2.id],
              suggestedResolution: 'Reschedule one of the games to a different time or venue',
            });
          }
        }
      }
    });

    // Check for team double booking
    scheduledGames.forEach(game1 => {
      scheduledGames.forEach(game2 => {
        if (game1.id !== game2.id && this.doGamesOverlap(game1, game2, bracket.configuration)) {
          const commonTeams = this.getCommonTeams(game1, game2);
          if (commonTeams.length > 0) {
            conflicts.push({
              type: 'TEAM_DOUBLE_BOOKING',
              severity: 'CRITICAL',
              description: `Team(s) ${commonTeams.join(', ')} are double-booked between games ${game1.gameNumber} and ${game2.gameNumber}`,
              gameIds: [game1.id, game2.id],
              suggestedResolution: 'Reschedule one of the games',
            });
          }
        }
      });
    });

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Gets visualization data for the bracket
   */
  getBracketVisualization(bracket: Bracket): any {
    const rounds: any[] = [];

    for (let roundNum = 1; roundNum <= bracket.rounds; roundNum++) {
      const roundGames = bracket.games.filter(g => g.round === roundNum && !g.thirdPlaceGame);
      
      rounds.push({
        round: roundNum,
        name: this.getRoundName(roundNum, bracket.rounds),
        games: roundGames.map(game => ({
          id: game.id,
          gameNumber: game.gameNumber,
          position: game.position,
          homeTeam: game.homeTeam ? {
            id: game.homeTeam.id,
            name: game.homeTeam.name,
            seed: game.homeTeam.seed,
          } : null,
          awayTeam: game.awayTeam ? {
            id: game.awayTeam.id,
            name: game.awayTeam.name,
            seed: game.awayTeam.seed,
          } : null,
          winner: game.winner ? {
            id: game.winner.id,
            name: game.winner.name,
          } : null,
          score: game.homeScore !== null && game.awayScore !== null ? {
            home: game.homeScore,
            away: game.awayScore,
          } : null,
          scheduledTime: game.scheduledTime,
          status: game.status,
        })),
      });
    }

    // Add third place game if exists
    const thirdPlaceGame = bracket.games.find(g => g.thirdPlaceGame);
    if (thirdPlaceGame) {
      rounds.push({
        round: 'third-place',
        name: 'Third Place',
        games: [{
          id: thirdPlaceGame.id,
          gameNumber: thirdPlaceGame.gameNumber,
          position: thirdPlaceGame.position,
          homeTeam: thirdPlaceGame.homeTeam ? {
            id: thirdPlaceGame.homeTeam.id,
            name: thirdPlaceGame.homeTeam.name,
            seed: thirdPlaceGame.homeTeam.seed,
          } : null,
          awayTeam: thirdPlaceGame.awayTeam ? {
            id: thirdPlaceGame.awayTeam.id,
            name: thirdPlaceGame.awayTeam.name,
            seed: thirdPlaceGame.awayTeam.seed,
          } : null,
          winner: thirdPlaceGame.winner ? {
            id: thirdPlaceGame.winner.id,
            name: thirdPlaceGame.winner.name,
          } : null,
          score: thirdPlaceGame.homeScore !== null && thirdPlaceGame.awayScore !== null ? {
            home: thirdPlaceGame.homeScore,
            away: thirdPlaceGame.awayScore,
          } : null,
          scheduledTime: thirdPlaceGame.scheduledTime,
          status: thirdPlaceGame.status,
        }],
      });
    }

    return {
      bracketId: bracket.id,
      name: bracket.name,
      type: bracket.type,
      status: bracket.status,
      teamCount: bracket.teamCount,
      rounds: bracket.rounds,
      champion: bracket.winner,
      runnerUp: bracket.runnerUp,
      thirdPlace: bracket.thirdPlace,
      visualization: rounds,
      createdAt: bracket.createdAt,
      updatedAt: bracket.updatedAt,
    };
  }

  // Utility methods

  private isPowerOfTwo(n: number): boolean {
    return (n & (n - 1)) === 0 && n > 0;
  }

  private calculateRounds(teamCount: number, type: string): number {
    return Math.ceil(Math.log2(teamCount));
  }

  private isPreferredDay(date: moment.Moment, preferredDays: string[]): boolean {
    const dayName = date.format('dddd').toUpperCase();
    return preferredDays.includes(dayName);
  }

  private doGamesOverlap(game1: BracketGame, game2: BracketGame, config: BracketConfiguration): boolean {
    if (!game1.scheduledTime || !game2.scheduledTime) return false;

    const game1Start = moment(game1.scheduledTime);
    const game1End = game1Start.clone().add(config.gameDurationMinutes, 'minutes');
    const game2Start = moment(game2.scheduledTime);
    const game2End = game2Start.clone().add(config.gameDurationMinutes, 'minutes');

    return game1Start.isBefore(game2End) && game2Start.isBefore(game1End);
  }

  private getCommonTeams(game1: BracketGame, game2: BracketGame): string[] {
    const teams1 = [game1.homeTeam?.id, game1.awayTeam?.id].filter(Boolean);
    const teams2 = [game2.homeTeam?.id, game2.awayTeam?.id].filter(Boolean);
    
    return teams1.filter(teamId => teams2.includes(teamId)) as string[];
  }

  private getRoundName(round: number, totalRounds: number): string {
    if (round === totalRounds) return 'Championship';
    if (round === totalRounds - 1) return 'Semifinals';
    if (round === totalRounds - 2) return 'Quarterfinals';
    if (round === 1) return 'First Round';
    return `Round ${round}`;
  }
}