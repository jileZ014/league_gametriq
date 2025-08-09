import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import { logger } from '../config/database';

export interface Official {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  certificationLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  specialties: string[]; // ['REFEREE', 'SCOREKEEPER', 'CLOCK_OPERATOR']
  maxGamesPerDay: number;
  maxGamesPerWeek: number;
  travelRadius: number; // kilometers
  hourlyRate: number;
  active: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Availability {
  id: string;
  officialId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  availabilityType: 'AVAILABLE' | 'PREFERRED' | 'UNAVAILABLE';
  recurring: boolean;
  specificDate?: Date; // For one-time availability
  notes?: string;
}

export interface Assignment {
  id: string;
  gameId: string;
  officialId: string;
  role: 'HEAD_REFEREE' | 'ASSISTANT_REFEREE' | 'SCOREKEEPER' | 'CLOCK_OPERATOR';
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED';
  assignedAt: Date;
  confirmedAt?: Date;
  payRate: number;
  estimatedPay: number;
  actualPay?: number;
  notes?: string;
  createdBy: string;
}

export interface Game {
  id: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scheduledTime: Date;
  status: string;
  gameNumber: number;
  gameType: string;
  division?: string;
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'COMPETITIVE';
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
}

export interface AssignmentConstraints {
  requireCertificationLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  preferredSpecialties: string[];
  maxTravelDistance?: number;
  minRestPeriodMinutes: number;
  allowBackToBackGames: boolean;
  maxGamesPerOfficialPerDay: number;
  maxGamesPerOfficialPerWeek: number;
  requireConfirmationHours: number; // Hours before game
}

export interface OptimizationResult {
  success: boolean;
  assignments: Assignment[];
  unassignedGames: Game[];
  conflicts: Array<{
    type: 'DOUBLE_BOOKING' | 'TRAVEL_TIME' | 'REST_PERIOD' | 'MAX_GAMES_EXCEEDED' | 'SKILL_MISMATCH';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    officialId?: string;
    gameIds: string[];
    suggestedResolution: string;
  }>;
  statistics: {
    totalGames: number;
    assignedGames: number;
    unassignedGames: number;
    totalOfficials: number;
    activeOfficials: number;
    averageGamesPerOfficial: number;
    costEstimate: number;
  };
}

export class OfficialsService {
  private static instance: OfficialsService;

  public static getInstance(): OfficialsService {
    if (!OfficialsService.instance) {
      OfficialsService.instance = new OfficialsService();
    }
    return OfficialsService.instance;
  }

  /**
   * Creates a new official
   */
  async createOfficial(officialData: Omit<Official, 'id' | 'createdAt' | 'updatedAt'>): Promise<Official> {
    try {
      const official: Official = {
        ...officialData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // TODO: Save to database
      logger.info('Official created', {
        officialId: official.id,
        name: `${official.firstName} ${official.lastName}`,
        certificationLevel: official.certificationLevel,
        specialties: official.specialties,
      });

      return official;
    } catch (error) {
      logger.error('Failed to create official:', error);
      throw error;
    }
  }

  /**
   * Sets availability for an official
   */
  async setAvailability(availability: Omit<Availability, 'id'>): Promise<Availability> {
    try {
      const availabilityRecord: Availability = {
        ...availability,
        id: uuidv4(),
      };

      // Validate time format
      if (!this.isValidTimeFormat(availability.startTime) || !this.isValidTimeFormat(availability.endTime)) {
        throw new Error('Invalid time format. Use HH:mm format.');
      }

      // Validate day of week
      if (availability.dayOfWeek < 0 || availability.dayOfWeek > 6) {
        throw new Error('Invalid day of week. Use 0-6 (Sunday-Saturday).');
      }

      // TODO: Save to database
      logger.info('Availability set', {
        officialId: availability.officialId,
        dayOfWeek: availability.dayOfWeek,
        timeRange: `${availability.startTime}-${availability.endTime}`,
        type: availability.availabilityType,
      });

      return availabilityRecord;
    } catch (error) {
      logger.error('Failed to set availability:', error);
      throw error;
    }
  }

  /**
   * Assigns officials to games using optimization algorithm
   */
  async optimizeAssignments(
    games: Game[],
    officials: Official[],
    venues: Venue[],
    constraints: AssignmentConstraints,
    organizationId: string
  ): Promise<OptimizationResult> {
    try {
      logger.info('Starting officials assignment optimization', {
        gameCount: games.length,
        officialCount: officials.length,
        organizationId,
      });

      const assignments: Assignment[] = [];
      const unassignedGames: Game[] = [];
      const conflicts: OptimizationResult['conflicts'] = [];

      // Filter active officials
      const activeOfficials = officials.filter(o => o.active);

      // Sort games by priority (date, importance, etc.)
      const sortedGames = this.prioritizeGames(games);

      // Track official workload
      const officialWorkload = new Map<string, {
        dailyGames: Map<string, number>;
        weeklyGames: number;
        lastGameTime: Date | null;
        totalPay: number;
      }>();

      // Initialize workload tracking
      activeOfficials.forEach(official => {
        officialWorkload.set(official.id, {
          dailyGames: new Map(),
          weeklyGames: 0,
          lastGameTime: null,
          totalPay: 0,
        });
      });

      // Assign officials to each game
      for (const game of sortedGames) {
        const gameVenue = venues.find(v => v.id === game.venueId);
        const gameDate = moment(game.scheduledTime).tz('America/Phoenix');
        const gameDateKey = gameDate.format('YYYY-MM-DD');

        // Determine required roles for this game
        const requiredRoles = this.getRequiredRoles(game);
        const gameAssignments: Assignment[] = [];

        for (const role of requiredRoles) {
          const suitableOfficials = this.findSuitableOfficials(
            activeOfficials,
            game,
            role,
            gameVenue,
            constraints,
            officialWorkload,
            gameDate
          );

          if (suitableOfficials.length === 0) {
            conflicts.push({
              type: 'SKILL_MISMATCH',
              severity: 'HIGH',
              description: `No suitable officials available for ${role} role in game ${game.gameNumber}`,
              gameIds: [game.id],
              suggestedResolution: 'Recruit more officials or adjust constraints',
            });
            continue;
          }

          // Select best official using scoring algorithm
          const selectedOfficial = this.selectBestOfficial(suitableOfficials, game, gameVenue, constraints);
          
          // Create assignment
          const assignment: Assignment = {
            id: uuidv4(),
            gameId: game.id,
            officialId: selectedOfficial.id,
            role: role as Assignment['role'],
            status: 'PENDING',
            assignedAt: new Date(),
            payRate: this.calculatePayRate(selectedOfficial, game, role),
            estimatedPay: 0, // Will be calculated
            createdBy: 'system',
          };

          assignment.estimatedPay = this.calculateEstimatedPay(assignment, game);

          gameAssignments.push(assignment);

          // Update workload tracking
          const workload = officialWorkload.get(selectedOfficial.id)!;
          const currentDailyGames = workload.dailyGames.get(gameDateKey) || 0;
          workload.dailyGames.set(gameDateKey, currentDailyGames + 1);
          workload.weeklyGames += 1;
          workload.lastGameTime = game.scheduledTime;
          workload.totalPay += assignment.estimatedPay;
        }

        if (gameAssignments.length === requiredRoles.length) {
          assignments.push(...gameAssignments);
        } else {
          unassignedGames.push(game);
          conflicts.push({
            type: 'SKILL_MISMATCH',
            severity: 'CRITICAL',
            description: `Could not assign all required officials for game ${game.gameNumber}`,
            gameIds: [game.id],
            suggestedResolution: 'Manual assignment required or game rescheduling',
          });
        }
      }

      // Detect conflicts in final assignments
      const additionalConflicts = await this.detectAssignmentConflicts(assignments, games, venues, constraints);
      conflicts.push(...additionalConflicts);

      // Calculate statistics
      const statistics = {
        totalGames: games.length,
        assignedGames: assignments.length / this.getAverageRolesPerGame(),
        unassignedGames: unassignedGames.length,
        totalOfficials: officials.length,
        activeOfficials: activeOfficials.length,
        averageGamesPerOfficial: assignments.length / Math.max(1, activeOfficials.length),
        costEstimate: assignments.reduce((total, a) => total + a.estimatedPay, 0),
      };

      logger.info('Officials assignment optimization completed', {
        success: unassignedGames.length === 0,
        assignedGames: Math.floor(statistics.assignedGames),
        unassignedGames: statistics.unassignedGames,
        conflictsFound: conflicts.length,
        costEstimate: statistics.costEstimate,
      });

      return {
        success: unassignedGames.length === 0 && conflicts.filter(c => c.severity === 'CRITICAL').length === 0,
        assignments,
        unassignedGames,
        conflicts,
        statistics,
      };
    } catch (error) {
      logger.error('Failed to optimize assignments:', error);
      throw error;
    }
  }

  /**
   * Checks if an official is available for a specific game
   */
  async checkAvailability(
    officialId: string,
    gameTime: Date,
    gameDuration: number = 120
  ): Promise<{
    available: boolean;
    reason?: string;
    conflicts?: string[];
  }> {
    try {
      // TODO: Get official's availability from database
      // TODO: Get existing assignments from database
      
      const gameDate = moment(gameTime).tz('America/Phoenix');
      const gameEnd = gameDate.clone().add(gameDuration, 'minutes');
      
      // Mock availability check for now
      return {
        available: true,
      };
    } catch (error) {
      logger.error('Failed to check availability:', error);
      throw error;
    }
  }

  /**
   * Generates CSV export for payroll
   */
  async generatePayrollExport(
    startDate: Date,
    endDate: Date,
    organizationId: string
  ): Promise<string> {
    try {
      // TODO: Get completed assignments from database for date range
      const assignments: Assignment[] = []; // Mock data

      const csvHeaders = [
        'Official ID',
        'Official Name',
        'Game Date',
        'Game Number',
        'Role',
        'Hours',
        'Hourly Rate',
        'Total Pay',
        'Status',
      ].join(',');

      const csvRows = assignments.map(assignment => {
        // TODO: Get official and game details
        return [
          assignment.officialId,
          'Official Name', // TODO: Get from official record
          'Game Date', // TODO: Get from game record
          'Game Number', // TODO: Get from game record
          assignment.role,
          '2', // Typical game duration in hours
          assignment.payRate.toString(),
          assignment.actualPay?.toString() || assignment.estimatedPay.toString(),
          assignment.status,
        ].join(',');
      });

      const csv = [csvHeaders, ...csvRows].join('\n');

      logger.info('Payroll export generated', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        assignmentCount: assignments.length,
        organizationId,
      });

      return csv;
    } catch (error) {
      logger.error('Failed to generate payroll export:', error);
      throw error;
    }
  }

  // Private helper methods

  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private prioritizeGames(games: Game[]): Game[] {
    return games.sort((a, b) => {
      // Sort by game date first
      const dateComparison = moment(a.scheduledTime).diff(moment(b.scheduledTime));
      if (dateComparison !== 0) return dateComparison;

      // Then by game importance (championships, playoffs, etc.)
      const aImportance = this.getGameImportance(a);
      const bImportance = this.getGameImportance(b);
      if (aImportance !== bImportance) return bImportance - aImportance;

      // Finally by game number
      return a.gameNumber - b.gameNumber;
    });
  }

  private getGameImportance(game: Game): number {
    if (game.gameType === 'CHAMPIONSHIP') return 5;
    if (game.gameType === 'PLAYOFF') return 4;
    if (game.gameType === 'SEMIFINAL') return 3;
    if (game.gameType === 'QUARTERFINAL') return 2;
    return 1; // REGULAR
  }

  private getRequiredRoles(game: Game): string[] {
    const roles = ['HEAD_REFEREE'];

    // Add assistant referee for advanced games
    if (game.skillLevel === 'ADVANCED' || game.skillLevel === 'COMPETITIVE' || game.gameType !== 'REGULAR') {
      roles.push('ASSISTANT_REFEREE');
    }

    // Always need scorekeeper and clock operator
    roles.push('SCOREKEEPER', 'CLOCK_OPERATOR');

    return roles;
  }

  private getAverageRolesPerGame(): number {
    return 3; // Typical: head referee, scorekeeper, clock operator
  }

  private findSuitableOfficials(
    officials: Official[],
    game: Game,
    role: string,
    venue: Venue | undefined,
    constraints: AssignmentConstraints,
    workload: Map<string, any>,
    gameDate: moment.Moment
  ): Official[] {
    return officials.filter(official => {
      // Check if official has required specialty
      if (!official.specialties.includes(role)) return false;

      // Check certification level if required
      if (constraints.requireCertificationLevel && 
          this.getCertificationLevel(official.certificationLevel) < this.getCertificationLevel(constraints.requireCertificationLevel)) {
        return false;
      }

      // Check travel distance
      if (venue && constraints.maxTravelDistance && this.calculateDistance(official, venue) > constraints.maxTravelDistance) {
        return false;
      }

      // Check workload constraints
      const officialWorkload = workload.get(official.id)!;
      const gameDateKey = gameDate.format('YYYY-MM-DD');
      const dailyGames = officialWorkload.dailyGames.get(gameDateKey) || 0;

      if (dailyGames >= Math.min(official.maxGamesPerDay, constraints.maxGamesPerOfficialPerDay)) {
        return false;
      }

      if (officialWorkload.weeklyGames >= Math.min(official.maxGamesPerWeek, constraints.maxGamesPerOfficialPerWeek)) {
        return false;
      }

      // Check rest period
      if (!constraints.allowBackToBackGames && officialWorkload.lastGameTime) {
        const timeSinceLastGame = gameDate.diff(moment(officialWorkload.lastGameTime), 'minutes');
        if (timeSinceLastGame < constraints.minRestPeriodMinutes) {
          return false;
        }
      }

      // TODO: Check availability calendar

      return true;
    });
  }

  private selectBestOfficial(officials: Official[], game: Game, venue: Venue | undefined, constraints: AssignmentConstraints): Official {
    // Score each official and select the best one
    let bestOfficial = officials[0];
    let bestScore = this.scoreOfficial(bestOfficial, game, venue, constraints);

    for (let i = 1; i < officials.length; i++) {
      const official = officials[i];
      const score = this.scoreOfficial(official, game, venue, constraints);
      
      if (score > bestScore) {
        bestOfficial = official;
        bestScore = score;
      }
    }

    return bestOfficial;
  }

  private scoreOfficial(official: Official, game: Game, venue: Venue | undefined, constraints: AssignmentConstraints): number {
    let score = 0;

    // Certification level match
    const certificationBonus = this.getCertificationLevel(official.certificationLevel) * 10;
    score += certificationBonus;

    // Proximity bonus (closer is better)
    if (venue) {
      const distance = this.calculateDistance(official, venue);
      const proximityBonus = Math.max(0, 50 - distance); // Up to 50 points for being very close
      score += proximityBonus;
    }

    // Lower hourly rate bonus (cost efficiency)
    const costBonus = Math.max(0, 100 - official.hourlyRate); // Up to 100 points for lower rates
    score += costBonus * 0.1; // Weight cost less than other factors

    // Preference for officials with fewer games (load balancing)
    // TODO: Get current workload and adjust score

    return score;
  }

  private getCertificationLevel(level: string): number {
    const levels = { 'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3, 'EXPERT': 4 };
    return levels[level as keyof typeof levels] || 0;
  }

  private calculateDistance(official: Official, venue: Venue): number {
    // TODO: Implement actual distance calculation using coordinates
    // For now, return a mock distance
    return Math.random() * official.travelRadius;
  }

  private calculatePayRate(official: Official, game: Game, role: string): number {
    let baseRate = official.hourlyRate;

    // Role multipliers
    const roleMultipliers = {
      'HEAD_REFEREE': 1.0,
      'ASSISTANT_REFEREE': 0.8,
      'SCOREKEEPER': 0.6,
      'CLOCK_OPERATOR': 0.5,
    };

    const multiplier = roleMultipliers[role as keyof typeof roleMultipliers] || 1.0;
    baseRate *= multiplier;

    // Game type bonuses
    if (game.gameType === 'CHAMPIONSHIP') baseRate *= 1.5;
    else if (game.gameType === 'PLAYOFF') baseRate *= 1.25;

    // Skill level bonuses
    if (game.skillLevel === 'COMPETITIVE') baseRate *= 1.2;
    else if (game.skillLevel === 'ADVANCED') baseRate *= 1.1;

    return Math.round(baseRate * 100) / 100; // Round to 2 decimal places
  }

  private calculateEstimatedPay(assignment: Assignment, game: Game): number {
    const gameDurationHours = 2; // Typical game duration
    return assignment.payRate * gameDurationHours;
  }

  private async detectAssignmentConflicts(
    assignments: Assignment[],
    games: Game[],
    venues: Venue[],
    constraints: AssignmentConstraints
  ): Promise<OptimizationResult['conflicts']> {
    const conflicts: OptimizationResult['conflicts'] = [];

    // Group assignments by official
    const officialAssignments = new Map<string, Assignment[]>();
    assignments.forEach(assignment => {
      if (!officialAssignments.has(assignment.officialId)) {
        officialAssignments.set(assignment.officialId, []);
      }
      officialAssignments.get(assignment.officialId)!.push(assignment);
    });

    // Check each official for conflicts
    officialAssignments.forEach((officialAssigns, officialId) => {
      // Check for double booking (overlapping games)
      for (let i = 0; i < officialAssigns.length; i++) {
        for (let j = i + 1; j < officialAssigns.length; j++) {
          const game1 = games.find(g => g.id === officialAssigns[i].gameId);
          const game2 = games.find(g => g.id === officialAssigns[j].gameId);

          if (game1 && game2 && this.doGamesOverlap(game1, game2)) {
            conflicts.push({
              type: 'DOUBLE_BOOKING',
              severity: 'CRITICAL',
              description: `Official ${officialId} is double-booked for overlapping games`,
              officialId,
              gameIds: [game1.id, game2.id],
              suggestedResolution: 'Reassign one of the games to a different official',
            });
          }
        }
      }

      // Check travel time between consecutive games
      const sortedAssigns = officialAssigns.sort((a, b) => {
        const gameA = games.find(g => g.id === a.gameId);
        const gameB = games.find(g => g.id === b.gameId);
        if (!gameA || !gameB) return 0;
        return moment(gameA.scheduledTime).diff(moment(gameB.scheduledTime));
      });

      for (let i = 0; i < sortedAssigns.length - 1; i++) {
        const currentGame = games.find(g => g.id === sortedAssigns[i].gameId);
        const nextGame = games.find(g => g.id === sortedAssigns[i + 1].gameId);

        if (currentGame && nextGame) {
          const currentVenue = venues.find(v => v.id === currentGame.venueId);
          const nextVenue = venues.find(v => v.id === nextGame.venueId);

          if (currentVenue && nextVenue && currentVenue.id !== nextVenue.id) {
            const travelTime = this.calculateTravelTime(currentVenue, nextVenue);
            const timeBetweenGames = moment(nextGame.scheduledTime).diff(
              moment(currentGame.scheduledTime).add(120, 'minutes'), // Assume 2-hour game duration
              'minutes'
            );

            if (timeBetweenGames < travelTime) {
              conflicts.push({
                type: 'TRAVEL_TIME',
                severity: 'HIGH',
                description: `Insufficient travel time between venues for official ${officialId}`,
                officialId,
                gameIds: [currentGame.id, nextGame.id],
                suggestedResolution: `Allow at least ${travelTime} minutes travel time between games`,
              });
            }
          }
        }
      }
    });

    return conflicts;
  }

  private doGamesOverlap(game1: Game, game2: Game): boolean {
    const game1Start = moment(game1.scheduledTime);
    const game1End = game1Start.clone().add(120, 'minutes'); // 2-hour games
    const game2Start = moment(game2.scheduledTime);
    const game2End = game2Start.clone().add(120, 'minutes');

    return game1Start.isBefore(game2End) && game2Start.isBefore(game1End);
  }

  private calculateTravelTime(venue1: Venue, venue2: Venue): number {
    // TODO: Implement actual travel time calculation using mapping service
    // For now, return estimated time based on distance
    const distance = this.calculateVenueDistance(venue1, venue2);
    return Math.max(30, distance * 2); // Minimum 30 minutes, 2 minutes per km
  }

  private calculateVenueDistance(venue1: Venue, venue2: Venue): number {
    // TODO: Implement actual distance calculation
    // For now, return a mock distance
    return Math.random() * 50; // 0-50 km
  }
}