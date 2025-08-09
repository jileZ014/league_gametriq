import moment from 'moment-timezone';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import pLimit from 'p-limit';

import { 
  Season, 
  Division, 
  Venue, 
  Game, 
  BlackoutDate,
  GameModel,
  VenueModel,
  BlackoutDateModel,
  ScheduleGenerationLog,
} from '../models/schedule.model';
import { ConflictDetectorService } from './conflict-detector.service';
import { heatPolicyService, HeatWarningLevel } from '../utils/heat-policy';
import { logger, getDB, CacheService } from '../config/database';

// Schedule generation parameters
export interface ScheduleGenerationParams {
  seasonId: string;
  divisionIds: string[];
  algorithm: 'ROUND_ROBIN' | 'DOUBLE_ROUND_ROBIN' | 'TOURNAMENT';
  preferredDays: string[]; // ['SATURDAY', 'SUNDAY']
  preferredTimes: string[]; // ['09:00', '11:00', '13:00', '15:00']
  gameDurationMinutes: number;
  bufferMinutes: number; // Time between games at same venue
  maxGamesPerDay: number;
  maxGamesPerWeek: number;
  enforceHeatPolicy: boolean;
  allowOverlappingDivisions: boolean;
  respectBlackoutDates: boolean;
  venue_preferences: VenuePreference[];
}

export interface VenuePreference {
  venueId: string;
  priority: number; // 1-10, higher is better
  divisions: string[]; // Which divisions can use this venue
  timeSlots: TimeSlot[];
}

export interface TimeSlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxGames: number;
}

// Team information needed for scheduling
export interface TeamInfo {
  id: string;
  name: string;
  divisionId: string;
  preferredVenues?: string[];
  blackoutDates?: Date[];
  maxGamesPerWeek?: number;
}

// Generated game schedule
export interface ScheduledGame {
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scheduledTime: Date;
  divisionId: string;
  gameNumber: string;
  estimatedDuration: number;
  conflicts: string[];
  heatWarning?: HeatWarningLevel;
}

// Schedule generation result
export interface ScheduleGenerationResult {
  success: boolean;
  games: ScheduledGame[];
  conflicts: any[];
  warnings: string[];
  statistics: {
    totalGames: number;
    gamesScheduled: number;
    gamesWithConflicts: number;
    gamesWithHeatWarnings: number;
    venueUtilization: Record<string, number>;
    generationTimeMs: number;
  };
  logId: string;
}

export class ScheduleGeneratorService {
  private static instance: ScheduleGeneratorService;
  private conflictDetector: ConflictDetectorService;
  private concurrencyLimit = pLimit(5); // Limit concurrent operations

  private constructor() {
    this.conflictDetector = new ConflictDetectorService();
  }

  static async initialize(): Promise<void> {
    if (!this.instance) {
      this.instance = new ScheduleGeneratorService();
      await this.instance.conflictDetector.initialize();
      logger.info('ScheduleGeneratorService initialized');
    }
  }

  static getInstance(): ScheduleGeneratorService {
    if (!this.instance) {
      throw new Error('ScheduleGeneratorService not initialized');
    }
    return this.instance;
  }

  static async shutdown(): Promise<void> {
    if (this.instance) {
      await this.instance.conflictDetector.shutdown();
      logger.info('ScheduleGeneratorService shutdown complete');
    }
  }

  /**
   * Generate a complete schedule for a season
   */
  async generateSchedule(
    season: Season,
    teams: TeamInfo[],
    params: ScheduleGenerationParams
  ): Promise<ScheduleGenerationResult> {
    const startTime = Date.now();
    const logId = uuidv4();

    try {
      logger.info('Starting schedule generation', {
        seasonId: season.id,
        algorithm: params.algorithm,
        teamsCount: teams.length,
        logId,
      });

      // Validate inputs
      await this.validateInputs(season, teams, params);

      // Load required data
      const [venues, divisions, blackoutDates] = await Promise.all([
        VenueModel.findAll(season.organization_id, { active: true }),
        this.getDivisionsByIds(params.divisionIds, season.organization_id),
        BlackoutDateModel.findBySeasonId(season.id, season.organization_id),
      ]);

      // Generate game matchups based on algorithm
      const matchups = await this.generateMatchups(teams, divisions, params.algorithm);

      // Schedule games with conflict resolution
      const scheduledGames = await this.scheduleGames(
        matchups,
        venues,
        blackoutDates,
        season,
        params
      );

      // Detect and resolve conflicts
      const conflicts = await this.detectConflicts(scheduledGames, venues);

      // Apply heat policy if enabled
      if (params.enforceHeatPolicy) {
        await this.applyHeatPolicy(scheduledGames, venues);
      }

      // Calculate statistics
      const statistics = this.calculateStatistics(scheduledGames, venues, startTime);

      // Log generation result
      await this.logGeneration(season, params, scheduledGames, conflicts, statistics, logId);

      const result: ScheduleGenerationResult = {
        success: true,
        games: scheduledGames,
        conflicts,
        warnings: this.generateWarnings(scheduledGames, conflicts),
        statistics,
        logId,
      };

      // Cache the result
      await CacheService.set(
        CacheService.scheduleKey(season.id),
        result,
        3600 // 1 hour cache
      );

      logger.info('Schedule generation completed', {
        seasonId: season.id,
        totalGames: statistics.totalGames,
        scheduledGames: statistics.gamesScheduled,
        conflicts: statistics.gamesWithConflicts,
        generationTime: statistics.generationTimeMs,
        logId,
      });

      return result;
    } catch (error) {
      logger.error('Schedule generation failed', {
        seasonId: season.id,
        error: error.message,
        logId,
      });

      return {
        success: false,
        games: [],
        conflicts: [],
        warnings: [`Generation failed: ${error.message}`],
        statistics: {
          totalGames: 0,
          gamesScheduled: 0,
          gamesWithConflicts: 0,
          gamesWithHeatWarnings: 0,
          venueUtilization: {},
          generationTimeMs: Date.now() - startTime,
        },
        logId,
      };
    }
  }

  /**
   * Generate round-robin matchups
   */
  private async generateMatchups(
    teams: TeamInfo[],
    divisions: Division[],
    algorithm: string
  ): Promise<Array<{ homeTeam: TeamInfo; awayTeam: TeamInfo; divisionId: string }>> {
    const matchups: Array<{ homeTeam: TeamInfo; awayTeam: TeamInfo; divisionId: string }> = [];

    for (const division of divisions) {
      const divisionTeams = teams.filter(team => team.divisionId === division.id);
      
      if (divisionTeams.length < 2) {
        logger.warn('Division has insufficient teams for scheduling', {
          divisionId: division.id,
          divisionName: division.name,
          teamsCount: divisionTeams.length,
        });
        continue;
      }

      const divisionMatchups = this.generateRoundRobinMatchups(
        divisionTeams,
        division.id,
        algorithm === 'DOUBLE_ROUND_ROBIN'
      );

      matchups.push(...divisionMatchups);
    }

    return matchups;
  }

  /**
   * Generate round-robin matchups for a division
   */
  private generateRoundRobinMatchups(
    teams: TeamInfo[],
    divisionId: string,
    doubleRoundRobin: boolean = false
  ): Array<{ homeTeam: TeamInfo; awayTeam: TeamInfo; divisionId: string }> {
    const matchups: Array<{ homeTeam: TeamInfo; awayTeam: TeamInfo; divisionId: string }> = [];
    const n = teams.length;

    // If odd number of teams, add a "bye" team
    const teamsWithBye = n % 2 === 1 ? [...teams, null] : [...teams];
    const totalTeams = teamsWithBye.length;

    // Generate round-robin using the rotating table method
    for (let round = 0; round < totalTeams - 1; round++) {
      for (let match = 0; match < totalTeams / 2; match++) {
        const home = match;
        const away = totalTeams - 1 - match;

        const homeTeam = teamsWithBye[home];
        const awayTeam = teamsWithBye[away];

        // Skip matches involving the "bye" team
        if (homeTeam && awayTeam) {
          matchups.push({
            homeTeam,
            awayTeam,
            divisionId,
          });

          // For double round-robin, add the reverse matchup
          if (doubleRoundRobin) {
            matchups.push({
              homeTeam: awayTeam,
              awayTeam: homeTeam,
              divisionId,
            });
          }
        }
      }

      // Rotate teams (keep first team fixed, rotate others)
      if (totalTeams > 2) {
        const lastTeam = teamsWithBye.pop();
        if (lastTeam !== undefined) {
          teamsWithBye.splice(1, 0, lastTeam);
        }
      }
    }

    return matchups;
  }

  /**
   * Schedule games with optimal time slots and venue assignments
   */
  private async scheduleGames(
    matchups: Array<{ homeTeam: TeamInfo; awayTeam: TeamInfo; divisionId: string }>,
    venues: Venue[],
    blackoutDates: BlackoutDate[],
    season: Season,
    params: ScheduleGenerationParams
  ): Promise<ScheduledGame[]> {
    const scheduledGames: ScheduledGame[] = [];
    const venueSchedules = new Map<string, Date[]>(); // Track venue bookings

    // Initialize venue schedules
    venues.forEach(venue => {
      venueSchedules.set(venue.id, []);
    });

    // Sort matchups to prioritize based on constraints
    const sortedMatchups = this.prioritizeMatchups(matchups, params);

    // Process matchups in batches to improve performance
    const batchSize = 10;
    for (let i = 0; i < sortedMatchups.length; i += batchSize) {
      const batch = sortedMatchups.slice(i, i + batchSize);
      
      await Promise.all(batch.map(matchup => 
        this.concurrencyLimit(async () => {
          const scheduledGame = await this.scheduleGame(
            matchup,
            venues,
            blackoutDates,
            venueSchedules,
            season,
            params,
            scheduledGames.length + 1
          );

          if (scheduledGame) {
            scheduledGames.push(scheduledGame);
            
            // Update venue schedule
            const venueBookings = venueSchedules.get(scheduledGame.venueId) || [];
            venueBookings.push(scheduledGame.scheduledTime);
            venueSchedules.set(scheduledGame.venueId, venueBookings);
          }
        })
      ));
    }

    return scheduledGames;
  }

  /**
   * Schedule a single game
   */
  private async scheduleGame(
    matchup: { homeTeam: TeamInfo; awayTeam: TeamInfo; divisionId: string },
    venues: Venue[],
    blackoutDates: BlackoutDate[],
    venueSchedules: Map<string, Date[]>,
    season: Season,
    params: ScheduleGenerationParams,
    gameNumber: number
  ): Promise<ScheduledGame | null> {
    const { homeTeam, awayTeam, divisionId } = matchup;

    // Find suitable venues for this division
    const suitableVenues = this.findSuitableVenues(venues, divisionId, params);

    // Generate candidate time slots
    const timeSlots = this.generateTimeSlots(season, params);

    // Try to find optimal time and venue combination
    for (const timeSlot of timeSlots) {
      // Skip blackout dates
      if (this.isBlackoutDate(timeSlot, blackoutDates, divisionId)) {
        continue;
      }

      for (const venue of suitableVenues) {
        // Check venue availability
        if (this.isVenueAvailable(venue, timeSlot, venueSchedules, params)) {
          // Check team availability (no conflicts with existing games)
          if (await this.areTeamsAvailable(homeTeam, awayTeam, timeSlot, venue.id, params)) {
            const scheduledGame: ScheduledGame = {
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id,
              venueId: venue.id,
              scheduledTime: timeSlot,
              divisionId,
              gameNumber: `G${gameNumber.toString().padStart(3, '0')}`,
              estimatedDuration: params.gameDurationMinutes,
              conflicts: [],
            };

            return scheduledGame;
          }
        }
      }
    }

    // If no suitable slot found, log the issue
    logger.warn('Unable to schedule game', {
      homeTeam: homeTeam.name,
      awayTeam: awayTeam.name,
      divisionId,
    });

    return null;
  }

  /**
   * Find suitable venues for a division
   */
  private findSuitableVenues(
    venues: Venue[],
    divisionId: string,
    params: ScheduleGenerationParams
  ): Venue[] {
    // Filter venues based on preferences
    const venuePreferences = params.venue_preferences.filter(pref =>
      pref.divisions.includes(divisionId)
    );

    if (venuePreferences.length === 0) {
      return venues.filter(venue => venue.active);
    }

    // Sort venues by priority
    const suitableVenues = venuePreferences
      .map(pref => ({
        venue: venues.find(v => v.id === pref.venueId),
        priority: pref.priority,
      }))
      .filter(item => item.venue && item.venue.active)
      .sort((a, b) => b.priority - a.priority)
      .map(item => item.venue!);

    return suitableVenues;
  }

  /**
   * Generate possible time slots for scheduling
   */
  private generateTimeSlots(season: Season, params: ScheduleGenerationParams): Date[] {
    const timeSlots: Date[] = [];
    const startDate = moment(season.start_date).tz('America/Phoenix');
    const endDate = moment(season.end_date).tz('America/Phoenix');

    const currentDate = startDate.clone();

    while (currentDate.isSameOrBefore(endDate, 'day')) {
      // Check if this day is in preferred days
      const dayOfWeek = currentDate.format('dddd').toUpperCase();
      
      if (params.preferredDays.includes(dayOfWeek)) {
        // Add time slots for this day
        for (const timeStr of params.preferredTimes) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const timeSlot = currentDate.clone().hour(hours).minute(minutes).second(0);
          timeSlots.push(timeSlot.toDate());
        }
      }

      currentDate.add(1, 'day');
    }

    return timeSlots;
  }

  /**
   * Check if a date conflicts with blackout dates
   */
  private isBlackoutDate(
    date: Date,
    blackoutDates: BlackoutDate[],
    divisionId: string
  ): boolean {
    return blackoutDates.some(blackout => {
      // Check date range
      const inDateRange = date >= blackout.start_date && date <= blackout.end_date;
      
      // Check if it affects this division
      const affectsDivision = blackout.affects_divisions.length === 0 || 
                             blackout.affects_divisions.includes(divisionId);

      return inDateRange && affectsDivision;
    });
  }

  /**
   * Check if venue is available at the given time
   */
  private isVenueAvailable(
    venue: Venue,
    timeSlot: Date,
    venueSchedules: Map<string, Date[]>,
    params: ScheduleGenerationParams
  ): boolean {
    const venueBookings = venueSchedules.get(venue.id) || [];
    const gameEndTime = moment(timeSlot).add(params.gameDurationMinutes + params.bufferMinutes, 'minutes');

    // Check for conflicts with existing bookings
    return !venueBookings.some(booking => {
      const bookingEnd = moment(booking).add(params.gameDurationMinutes + params.bufferMinutes, 'minutes');
      
      // Check for overlap
      return (
        (moment(timeSlot).isBetween(booking, bookingEnd, null, '[]')) ||
        (gameEndTime.isBetween(booking, bookingEnd, null, '[]')) ||
        (moment(booking).isBetween(timeSlot, gameEndTime, null, '[]'))
      );
    });
  }

  /**
   * Check if teams are available at the given time
   */
  private async areTeamsAvailable(
    homeTeam: TeamInfo,
    awayTeam: TeamInfo,
    timeSlot: Date,
    venueId: string,
    params: ScheduleGenerationParams
  ): Promise<boolean> {
    // This would check against existing games for these teams
    // For now, we'll implement basic checks

    // Check team blackout dates
    if (homeTeam.blackoutDates?.some(date => 
      moment(timeSlot).isSame(date, 'day')
    )) {
      return false;
    }

    if (awayTeam.blackoutDates?.some(date => 
      moment(timeSlot).isSame(date, 'day')
    )) {
      return false;
    }

    return true;
  }

  /**
   * Prioritize matchups based on constraints
   */
  private prioritizeMatchups(
    matchups: Array<{ homeTeam: TeamInfo; awayTeam: TeamInfo; divisionId: string }>,
    params: ScheduleGenerationParams
  ): Array<{ homeTeam: TeamInfo; awayTeam: TeamInfo; divisionId: string }> {
    // For now, randomize to ensure fair distribution
    return _.shuffle(matchups);
  }

  /**
   * Detect conflicts in scheduled games
   */
  private async detectConflicts(
    games: ScheduledGame[],
    venues: Venue[]
  ): Promise<any[]> {
    const conflicts: any[] = [];

    for (const game of games) {
      const gameConflicts = await this.conflictDetector.detectGameConflicts(
        game.venueId,
        game.scheduledTime,
        game.estimatedDuration,
        [game.homeTeamId, game.awayTeamId]
      );

      if (gameConflicts.length > 0) {
        conflicts.push({
          gameNumber: game.gameNumber,
          homeTeam: game.homeTeamId,
          awayTeam: game.awayTeamId,
          venue: game.venueId,
          scheduledTime: game.scheduledTime,
          conflicts: gameConflicts,
        });

        game.conflicts = gameConflicts.map(c => c.type);
      }
    }

    return conflicts;
  }

  /**
   * Apply heat policy to scheduled games
   */
  private async applyHeatPolicy(
    games: ScheduledGame[],
    venues: Venue[]
  ): Promise<void> {
    const venueMap = new Map(venues.map(v => [v.id, v]));

    await Promise.all(games.map(async (game) => {
      const venue = venueMap.get(game.venueId);
      if (venue && venue.type === 'OUTDOOR') {
        try {
          const heatResult = await heatPolicyService.checkGameScheduling(
            { id: uuidv4() }, // Mock game object
            venue,
            game.scheduledTime
          );

          if (heatResult.warningLevel !== HeatWarningLevel.NONE) {
            game.heatWarning = heatResult.warningLevel;
          }
        } catch (error) {
          logger.error('Heat policy check failed for game', {
            gameNumber: game.gameNumber,
            venueId: game.venueId,
            error: error.message,
          });
        }
      }
    }));
  }

  /**
   * Calculate generation statistics
   */
  private calculateStatistics(
    games: ScheduledGame[],
    venues: Venue[],
    startTime: number
  ): ScheduleGenerationResult['statistics'] {
    const venueUtilization: Record<string, number> = {};
    
    venues.forEach(venue => {
      const gamesAtVenue = games.filter(g => g.venueId === venue.id).length;
      venueUtilization[venue.id] = gamesAtVenue;
    });

    return {
      totalGames: games.length,
      gamesScheduled: games.filter(g => g.conflicts.length === 0).length,
      gamesWithConflicts: games.filter(g => g.conflicts.length > 0).length,
      gamesWithHeatWarnings: games.filter(g => g.heatWarning && g.heatWarning !== HeatWarningLevel.NONE).length,
      venueUtilization,
      generationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Generate warnings based on schedule analysis
   */
  private generateWarnings(games: ScheduledGame[], conflicts: any[]): string[] {
    const warnings: string[] = [];

    if (conflicts.length > 0) {
      warnings.push(`${conflicts.length} games have scheduling conflicts that need resolution`);
    }

    const heatWarnings = games.filter(g => g.heatWarning && g.heatWarning !== HeatWarningLevel.NONE);
    if (heatWarnings.length > 0) {
      warnings.push(`${heatWarnings.length} games have heat policy warnings`);
    }

    const venueUsage = _.groupBy(games, 'venueId');
    const overusedVenues = Object.entries(venueUsage).filter(([_, gamesAtVenue]) => gamesAtVenue.length > 20);
    if (overusedVenues.length > 0) {
      warnings.push(`${overusedVenues.length} venues are heavily utilized - consider adding more venues`);
    }

    return warnings;
  }

  /**
   * Log the schedule generation process
   */
  private async logGeneration(
    season: Season,
    params: ScheduleGenerationParams,
    games: ScheduledGame[],
    conflicts: any[],
    statistics: ScheduleGenerationResult['statistics'],
    logId: string
  ): Promise<void> {
    try {
      const db = getDB();
      await db('schedule_generation_logs').insert({
        id: logId,
        season_id: season.id,
        organization_id: season.organization_id,
        algorithm: params.algorithm,
        parameters: params,
        games_generated: games.length,
        conflicts_detected: conflicts.length,
        generation_time_ms: statistics.generationTimeMs,
        status: conflicts.length === 0 ? 'SUCCESS' : 'PARTIAL',
        created_by: 'system', // TODO: Get actual user
        created_at: new Date(),
        updated_at: new Date(),
      });
    } catch (error) {
      logger.error('Failed to log schedule generation', {
        logId,
        error: error.message,
      });
    }
  }

  /**
   * Validate generation inputs
   */
  private async validateInputs(
    season: Season,
    teams: TeamInfo[],
    params: ScheduleGenerationParams
  ): Promise<void> {
    if (teams.length < 2) {
      throw new Error('At least 2 teams are required for schedule generation');
    }

    if (params.divisionIds.length === 0) {
      throw new Error('At least one division must be specified');
    }

    if (params.preferredDays.length === 0) {
      throw new Error('At least one preferred day must be specified');
    }

    if (params.preferredTimes.length === 0) {
      throw new Error('At least one preferred time must be specified');
    }

    // Validate season dates
    if (moment(season.end_date).isBefore(season.start_date)) {
      throw new Error('Season end date must be after start date');
    }
  }

  /**
   * Get divisions by IDs
   */
  private async getDivisionsByIds(divisionIds: string[], organizationId: string): Promise<Division[]> {
    const db = getDB();
    return db('divisions')
      .whereIn('id', divisionIds)
      .where('organization_id', organizationId);
  }
}

// Export singleton access
export const scheduleGenerator = ScheduleGeneratorService.getInstance;