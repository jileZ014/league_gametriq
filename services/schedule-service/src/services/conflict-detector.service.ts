import moment from 'moment-timezone';
import { logger, getDB, CacheService } from '../config/database';
import { GameModel, VenueModel } from '../models/schedule.model';

// Conflict types
export enum ConflictType {
  VENUE_DOUBLE_BOOKING = 'VENUE_DOUBLE_BOOKING',
  TEAM_DOUBLE_BOOKING = 'TEAM_DOUBLE_BOOKING',
  OFFICIAL_DOUBLE_BOOKING = 'OFFICIAL_DOUBLE_BOOKING',
  VENUE_UNAVAILABLE = 'VENUE_UNAVAILABLE',
  TRAVEL_TIME_CONFLICT = 'TRAVEL_TIME_CONFLICT',
  BLACKOUT_DATE = 'BLACKOUT_DATE',
  HEAT_POLICY_VIOLATION = 'HEAT_POLICY_VIOLATION',
  INSUFFICIENT_REST_TIME = 'INSUFFICIENT_REST_TIME',
}

// Conflict severity levels
export enum ConflictSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Conflict resolution strategies
export enum ResolutionStrategy {
  RESCHEDULE_GAME = 'RESCHEDULE_GAME',
  CHANGE_VENUE = 'CHANGE_VENUE',
  SWAP_HOME_AWAY = 'SWAP_HOME_AWAY',
  SPLIT_GAME_TIME = 'SPLIT_GAME_TIME',
  MANUAL_RESOLUTION = 'MANUAL_RESOLUTION',
}

// Conflict definition
export interface ScheduleConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  affectedGames: string[];
  affectedTeams: string[];
  affectedVenues: string[];
  affectedOfficials: string[];
  scheduledTime: Date;
  suggestedResolution: ResolutionStrategy;
  resolutionOptions: ConflictResolutionOption[];
  metadata: Record<string, any>;
  createdAt: Date;
}

// Resolution option
export interface ConflictResolutionOption {
  strategy: ResolutionStrategy;
  description: string;
  impact: string;
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  alternativeTime?: Date;
  alternativeVenue?: string;
  tradeoffs: string[];
}

// Conflict detection parameters
export interface ConflictDetectionParams {
  seasonId: string;
  organizationId: string;
  checkVenueConflicts: boolean;
  checkTeamConflicts: boolean;
  checkOfficialConflicts: boolean;
  checkTravelTime: boolean;
  checkRestTime: boolean;
  checkHeatPolicy: boolean;
  minRestHours: number;
  maxTravelMinutes: number;
  bufferMinutes: number;
}

// Team schedule info
interface TeamScheduleInfo {
  teamId: string;
  games: Array<{
    gameId: string;
    scheduledTime: Date;
    venueId: string;
    isHome: boolean;
  }>;
}

// Official schedule info
interface OfficialScheduleInfo {
  officialId: string;
  assignments: Array<{
    gameId: string;
    scheduledTime: Date;
    venueId: string;
    role: string;
  }>;
}

export class ConflictDetectorService {
  private static instance: ConflictDetectorService;
  private initialized = false;

  constructor() {}

  static getInstance(): ConflictDetectorService {
    if (!this.instance) {
      this.instance = new ConflictDetectorService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize cache service
    CacheService.initialize();
    
    this.initialized = true;
    logger.info('ConflictDetectorService initialized');
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    logger.info('ConflictDetectorService shutdown');
  }

  /**
   * Detect all conflicts for a season's schedule
   */
  async detectSeasonConflicts(
    seasonId: string,
    organizationId: string,
    params?: Partial<ConflictDetectionParams>
  ): Promise<ScheduleConflict[]> {
    const startTime = Date.now();
    
    const detectionParams: ConflictDetectionParams = {
      seasonId,
      organizationId,
      checkVenueConflicts: true,
      checkTeamConflicts: true,
      checkOfficialConflicts: true,
      checkTravelTime: true,
      checkRestTime: true,
      checkHeatPolicy: true,
      minRestHours: 12,
      maxTravelMinutes: 60,
      bufferMinutes: 30,
      ...params,
    };

    try {
      logger.info('Starting season conflict detection', {
        seasonId,
        organizationId,
        params: detectionParams,
      });

      // Check cache first
      const cacheKey = CacheService.conflictsKey(seasonId);
      const cachedResult = await CacheService.get<ScheduleConflict[]>(cacheKey);
      if (cachedResult && !params) {
        logger.info('Returning cached conflicts', { seasonId, count: cachedResult.length });
        return cachedResult;
      }

      const conflicts: ScheduleConflict[] = [];

      // Get all games for the season
      const games = await GameModel.findBySeasonId(seasonId, organizationId);
      
      if (games.length === 0) {
        return [];
      }

      // Run conflict detection in parallel
      const detectionTasks: Promise<ScheduleConflict[]>[] = [];

      if (detectionParams.checkVenueConflicts) {
        detectionTasks.push(this.detectVenueConflicts(games, detectionParams));
      }

      if (detectionParams.checkTeamConflicts) {
        detectionTasks.push(this.detectTeamConflicts(games, detectionParams));
      }

      if (detectionParams.checkOfficialConflicts) {
        detectionTasks.push(this.detectOfficialConflicts(games, detectionParams));
      }

      if (detectionParams.checkTravelTime) {
        detectionTasks.push(this.detectTravelTimeConflicts(games, detectionParams));
      }

      if (detectionParams.checkRestTime) {
        detectionTasks.push(this.detectRestTimeConflicts(games, detectionParams));
      }

      if (detectionParams.checkHeatPolicy) {
        detectionTasks.push(this.detectHeatPolicyConflicts(games, detectionParams));
      }

      // Wait for all detection tasks to complete
      const detectionResults = await Promise.all(detectionTasks);
      detectionResults.forEach(result => conflicts.push(...result));

      // Sort conflicts by severity and time
      conflicts.sort((a, b) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return a.scheduledTime.getTime() - b.scheduledTime.getTime();
      });

      // Cache the result for 30 minutes
      await CacheService.set(cacheKey, conflicts, 1800);

      const detectionTime = Date.now() - startTime;
      logger.info('Season conflict detection completed', {
        seasonId,
        conflictsFound: conflicts.length,
        detectionTimeMs: detectionTime,
      });

      return conflicts;
    } catch (error) {
      logger.error('Season conflict detection failed', {
        seasonId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Detect conflicts for a specific game
   */
  async detectGameConflicts(
    venueId: string,
    scheduledTime: Date,
    durationMinutes: number,
    teamIds: string[],
    excludeGameId?: string
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    const gameEndTime = moment(scheduledTime).add(durationMinutes, 'minutes').toDate();

    try {
      // Check venue conflicts
      const venueConflicts = await GameModel.findConflicts(
        venueId,
        scheduledTime,
        durationMinutes,
        excludeGameId
      );

      venueConflicts.forEach(conflictGame => {
        conflicts.push({
          id: `venue-${venueId}-${scheduledTime.getTime()}`,
          type: ConflictType.VENUE_DOUBLE_BOOKING,
          severity: ConflictSeverity.HIGH,
          description: `Venue double-booking detected`,
          affectedGames: [conflictGame.id],
          affectedTeams: teamIds,
          affectedVenues: [venueId],
          affectedOfficials: [],
          scheduledTime,
          suggestedResolution: ResolutionStrategy.RESCHEDULE_GAME,
          resolutionOptions: await this.generateResolutionOptions(
            ConflictType.VENUE_DOUBLE_BOOKING,
            venueId,
            scheduledTime,
            teamIds
          ),
          metadata: {
            conflictingGameId: conflictGame.id,
            conflictingGameTime: conflictGame.scheduled_time,
            venue: venueId,
          },
          createdAt: new Date(),
        });
      });

      // Check team conflicts
      for (const teamId of teamIds) {
        const teamConflicts = await this.findTeamConflicts(teamId, scheduledTime, durationMinutes, excludeGameId);
        
        teamConflicts.forEach(conflictGame => {
          conflicts.push({
            id: `team-${teamId}-${scheduledTime.getTime()}`,
            type: ConflictType.TEAM_DOUBLE_BOOKING,
            severity: ConflictSeverity.CRITICAL,
            description: `Team has another game scheduled`,
            affectedGames: [conflictGame.id],
            affectedTeams: [teamId],
            affectedVenues: [venueId],
            affectedOfficials: [],
            scheduledTime,
            suggestedResolution: ResolutionStrategy.RESCHEDULE_GAME,
            resolutionOptions: await this.generateResolutionOptions(
              ConflictType.TEAM_DOUBLE_BOOKING,
              venueId,
              scheduledTime,
              [teamId]
            ),
            metadata: {
              conflictingGameId: conflictGame.id,
              conflictingGameTime: conflictGame.scheduled_time,
              team: teamId,
            },
            createdAt: new Date(),
          });
        });
      }

      return conflicts;
    } catch (error) {
      logger.error('Game conflict detection failed', {
        venueId,
        scheduledTime,
        teamIds,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Detect venue conflicts
   */
  private async detectVenueConflicts(
    games: any[],
    params: ConflictDetectionParams
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    
    // Group games by venue
    const gamesByVenue = games.reduce((acc, game) => {
      if (!acc[game.venue_id]) {
        acc[game.venue_id] = [];
      }
      acc[game.venue_id].push(game);
      return acc;
    }, {});

    // Check each venue for conflicts
    for (const [venueId, venueGames] of Object.entries(gamesByVenue)) {
      const sortedGames = (venueGames as any[]).sort((a, b) => 
        new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
      );

      for (let i = 0; i < sortedGames.length - 1; i++) {
        const currentGame = sortedGames[i];
        const nextGame = sortedGames[i + 1];

        const currentEnd = moment(currentGame.scheduled_time)
          .add(120 + params.bufferMinutes, 'minutes'); // Assume 2 hours + buffer
        const nextStart = moment(nextGame.scheduled_time);

        if (nextStart.isBefore(currentEnd)) {
          conflicts.push({
            id: `venue-conflict-${currentGame.id}-${nextGame.id}`,
            type: ConflictType.VENUE_DOUBLE_BOOKING,
            severity: ConflictSeverity.HIGH,
            description: `Venue has overlapping games`,
            affectedGames: [currentGame.id, nextGame.id],
            affectedTeams: [
              currentGame.home_team_id,
              currentGame.away_team_id,
              nextGame.home_team_id,
              nextGame.away_team_id,
            ],
            affectedVenues: [venueId],
            affectedOfficials: [],
            scheduledTime: new Date(nextGame.scheduled_time),
            suggestedResolution: ResolutionStrategy.RESCHEDULE_GAME,
            resolutionOptions: await this.generateResolutionOptions(
              ConflictType.VENUE_DOUBLE_BOOKING,
              venueId,
              new Date(nextGame.scheduled_time),
              [nextGame.home_team_id, nextGame.away_team_id]
            ),
            metadata: {
              currentGameEnd: currentEnd.toISOString(),
              nextGameStart: nextStart.toISOString(),
              overlapMinutes: currentEnd.diff(nextStart, 'minutes'),
            },
            createdAt: new Date(),
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect team conflicts
   */
  private async detectTeamConflicts(
    games: any[],
    params: ConflictDetectionParams
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    
    // Create team schedules
    const teamSchedules = new Map<string, TeamScheduleInfo>();

    games.forEach(game => {
      // Add home team
      if (!teamSchedules.has(game.home_team_id)) {
        teamSchedules.set(game.home_team_id, { teamId: game.home_team_id, games: [] });
      }
      teamSchedules.get(game.home_team_id)!.games.push({
        gameId: game.id,
        scheduledTime: new Date(game.scheduled_time),
        venueId: game.venue_id,
        isHome: true,
      });

      // Add away team
      if (!teamSchedules.has(game.away_team_id)) {
        teamSchedules.set(game.away_team_id, { teamId: game.away_team_id, games: [] });
      }
      teamSchedules.get(game.away_team_id)!.games.push({
        gameId: game.id,
        scheduledTime: new Date(game.scheduled_time),
        venueId: game.venue_id,
        isHome: false,
      });
    });

    // Check each team for conflicts
    for (const [teamId, schedule] of teamSchedules) {
      const sortedGames = schedule.games.sort((a, b) => 
        a.scheduledTime.getTime() - b.scheduledTime.getTime()
      );

      for (let i = 0; i < sortedGames.length - 1; i++) {
        const currentGame = sortedGames[i];
        const nextGame = sortedGames[i + 1];

        const currentEnd = moment(currentGame.scheduledTime).add(120, 'minutes'); // 2 hours
        const nextStart = moment(nextGame.scheduledTime);

        // Check for overlapping games
        if (nextStart.isBefore(currentEnd)) {
          conflicts.push({
            id: `team-conflict-${teamId}-${currentGame.gameId}-${nextGame.gameId}`,
            type: ConflictType.TEAM_DOUBLE_BOOKING,
            severity: ConflictSeverity.CRITICAL,
            description: `Team has overlapping games`,
            affectedGames: [currentGame.gameId, nextGame.gameId],
            affectedTeams: [teamId],
            affectedVenues: [currentGame.venueId, nextGame.venueId],
            affectedOfficials: [],
            scheduledTime: nextGame.scheduledTime,
            suggestedResolution: ResolutionStrategy.RESCHEDULE_GAME,
            resolutionOptions: await this.generateResolutionOptions(
              ConflictType.TEAM_DOUBLE_BOOKING,
              nextGame.venueId,
              nextGame.scheduledTime,
              [teamId]
            ),
            metadata: {
              currentGameEnd: currentEnd.toISOString(),
              nextGameStart: nextStart.toISOString(),
              overlapMinutes: currentEnd.diff(nextStart, 'minutes'),
            },
            createdAt: new Date(),
          });
        }

        // Check for insufficient rest time
        const restHours = nextStart.diff(currentEnd, 'hours');
        if (restHours < params.minRestHours && restHours >= 0) {
          conflicts.push({
            id: `rest-conflict-${teamId}-${currentGame.gameId}-${nextGame.gameId}`,
            type: ConflictType.INSUFFICIENT_REST_TIME,
            severity: ConflictSeverity.MEDIUM,
            description: `Team has insufficient rest time between games`,
            affectedGames: [currentGame.gameId, nextGame.gameId],
            affectedTeams: [teamId],
            affectedVenues: [currentGame.venueId, nextGame.venueId],
            affectedOfficials: [],
            scheduledTime: nextGame.scheduledTime,
            suggestedResolution: ResolutionStrategy.RESCHEDULE_GAME,
            resolutionOptions: await this.generateResolutionOptions(
              ConflictType.INSUFFICIENT_REST_TIME,
              nextGame.venueId,
              nextGame.scheduledTime,
              [teamId]
            ),
            metadata: {
              currentGameEnd: currentEnd.toISOString(),
              nextGameStart: nextStart.toISOString(),
              restHours,
              minimumRestHours: params.minRestHours,
            },
            createdAt: new Date(),
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect official conflicts
   */
  private async detectOfficialConflicts(
    games: any[],
    params: ConflictDetectionParams
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    
    // TODO: Implement official assignment checking
    // This would require querying the game-service for official assignments
    // For now, return empty array as officials are managed by game-service
    
    return conflicts;
  }

  /**
   * Detect travel time conflicts
   */
  private async detectTravelTimeConflicts(
    games: any[],
    params: ConflictDetectionParams
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    
    // Get venue locations
    const venueIds = [...new Set(games.map(g => g.venue_id))];
    const venues = await VenueModel.findAll(params.organizationId, { active: true });
    const venueMap = new Map(venues.map(v => [v.id, v]));

    // Group games by team to check travel times
    const teamSchedules = new Map<string, any[]>();

    games.forEach(game => {
      [game.home_team_id, game.away_team_id].forEach(teamId => {
        if (!teamSchedules.has(teamId)) {
          teamSchedules.set(teamId, []);
        }
        teamSchedules.get(teamId)!.push(game);
      });
    });

    // Check travel times for each team
    for (const [teamId, teamGames] of teamSchedules) {
      const sortedGames = teamGames.sort((a, b) => 
        new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
      );

      for (let i = 0; i < sortedGames.length - 1; i++) {
        const currentGame = sortedGames[i];
        const nextGame = sortedGames[i + 1];

        const currentVenue = venueMap.get(currentGame.venue_id);
        const nextVenue = venueMap.get(nextGame.venue_id);

        if (currentVenue && nextVenue && currentVenue.id !== nextVenue.id) {
          // Estimate travel time (simplified calculation)
          const estimatedTravelMinutes = await this.estimateTravelTime(currentVenue, nextVenue);
          
          const currentEnd = moment(currentGame.scheduled_time).add(120, 'minutes');
          const nextStart = moment(nextGame.scheduled_time);
          const availableTravelTime = nextStart.diff(currentEnd, 'minutes');

          if (estimatedTravelMinutes > availableTravelTime && estimatedTravelMinutes > params.maxTravelMinutes) {
            conflicts.push({
              id: `travel-conflict-${teamId}-${currentGame.id}-${nextGame.id}`,
              type: ConflictType.TRAVEL_TIME_CONFLICT,
              severity: ConflictSeverity.MEDIUM,
              description: `Insufficient travel time between venues`,
              affectedGames: [currentGame.id, nextGame.id],
              affectedTeams: [teamId],
              affectedVenues: [currentGame.venue_id, nextGame.venue_id],
              affectedOfficials: [],
              scheduledTime: new Date(nextGame.scheduled_time),
              suggestedResolution: ResolutionStrategy.RESCHEDULE_GAME,
              resolutionOptions: await this.generateResolutionOptions(
                ConflictType.TRAVEL_TIME_CONFLICT,
                nextGame.venue_id,
                new Date(nextGame.scheduled_time),
                [teamId]
              ),
              metadata: {
                estimatedTravelMinutes,
                availableTravelTime,
                currentVenue: currentVenue.name,
                nextVenue: nextVenue.name,
              },
              createdAt: new Date(),
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect rest time conflicts
   */
  private async detectRestTimeConflicts(
    games: any[],
    params: ConflictDetectionParams
  ): Promise<ScheduleConflict[]> {
    // This is handled in detectTeamConflicts
    return [];
  }

  /**
   * Detect heat policy conflicts
   */
  private async detectHeatPolicyConflicts(
    games: any[],
    params: ConflictDetectionParams
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    
    // Get outdoor venues
    const venues = await VenueModel.findAll(params.organizationId, { type: 'OUTDOOR' });
    const outdoorVenueIds = new Set(venues.map(v => v.id));

    // Check games at outdoor venues during summer months
    const summerGames = games.filter(game => {
      const gameMonth = moment(game.scheduled_time).month();
      return outdoorVenueIds.has(game.venue_id) && gameMonth >= 4 && gameMonth <= 9; // May-October
    });

    for (const game of summerGames) {
      const gameTime = moment(game.scheduled_time);
      const gameHour = gameTime.hour();

      // Check if game is during dangerous heat hours (11 AM - 6 PM)
      if (gameHour >= 11 && gameHour <= 18) {
        conflicts.push({
          id: `heat-conflict-${game.id}`,
          type: ConflictType.HEAT_POLICY_VIOLATION,
          severity: ConflictSeverity.HIGH,
          description: `Game scheduled during dangerous heat hours`,
          affectedGames: [game.id],
          affectedTeams: [game.home_team_id, game.away_team_id],
          affectedVenues: [game.venue_id],
          affectedOfficials: [],
          scheduledTime: new Date(game.scheduled_time),
          suggestedResolution: ResolutionStrategy.RESCHEDULE_GAME,
          resolutionOptions: await this.generateResolutionOptions(
            ConflictType.HEAT_POLICY_VIOLATION,
            game.venue_id,
            new Date(game.scheduled_time),
            [game.home_team_id, game.away_team_id]
          ),
          metadata: {
            gameHour,
            dangerousHours: '11:00-18:00',
            month: gameTime.format('MMMM'),
          },
          createdAt: new Date(),
        });
      }
    }

    return conflicts;
  }

  /**
   * Generate resolution options for a conflict
   */
  private async generateResolutionOptions(
    conflictType: ConflictType,
    venueId: string,
    scheduledTime: Date,
    teamIds: string[]
  ): Promise<ConflictResolutionOption[]> {
    const options: ConflictResolutionOption[] = [];

    switch (conflictType) {
      case ConflictType.VENUE_DOUBLE_BOOKING:
        options.push(
          {
            strategy: ResolutionStrategy.RESCHEDULE_GAME,
            description: 'Reschedule game to a different time slot',
            impact: 'Teams and officials need to be notified',
            estimatedEffort: 'MEDIUM',
            tradeoffs: ['May affect team preparation', 'Requires notification to all stakeholders'],
          },
          {
            strategy: ResolutionStrategy.CHANGE_VENUE,
            description: 'Move game to an available venue',
            impact: 'Teams and spectators need new venue information',
            estimatedEffort: 'HIGH',
            tradeoffs: ['May increase travel time', 'Venue may not be optimal for division'],
          }
        );
        break;

      case ConflictType.TEAM_DOUBLE_BOOKING:
        options.push(
          {
            strategy: ResolutionStrategy.RESCHEDULE_GAME,
            description: 'Reschedule one of the conflicting games',
            impact: 'Critical - team cannot play two games simultaneously',
            estimatedEffort: 'HIGH',
            tradeoffs: ['Major schedule disruption', 'Affects multiple stakeholders'],
          }
        );
        break;

      case ConflictType.HEAT_POLICY_VIOLATION:
        options.push(
          {
            strategy: ResolutionStrategy.RESCHEDULE_GAME,
            description: 'Move game to earlier or later time outside dangerous heat hours',
            impact: 'Safety compliance required',
            estimatedEffort: 'MEDIUM',
            tradeoffs: ['Early morning games may have lower attendance', 'Evening games may conflict with other activities'],
          }
        );
        break;

      default:
        options.push({
          strategy: ResolutionStrategy.MANUAL_RESOLUTION,
          description: 'Requires manual review and resolution',
          impact: 'Depends on specific conflict details',
          estimatedEffort: 'HIGH',
          tradeoffs: ['Time-intensive', 'May require multiple stakeholder coordination'],
        });
    }

    return options;
  }

  /**
   * Find team conflicts for a specific game time
   */
  private async findTeamConflicts(
    teamId: string,
    scheduledTime: Date,
    durationMinutes: number,
    excludeGameId?: string
  ): Promise<any[]> {
    const db = getDB();
    const gameEndTime = moment(scheduledTime).add(durationMinutes, 'minutes').toDate();

    let query = db('games')
      .where((builder) => {
        builder
          .where('home_team_id', teamId)
          .orWhere('away_team_id', teamId);
      })
      .where('status', '!=', 'CANCELLED')
      .where((builder) => {
        builder
          .whereBetween('scheduled_time', [scheduledTime, gameEndTime])
          .orWhere((subBuilder) => {
            subBuilder
              .where('scheduled_time', '<=', scheduledTime)
              .whereRaw("scheduled_time + INTERVAL '120 minutes' > ?", [scheduledTime]);
          });
      });

    if (excludeGameId) {
      query = query.whereNot('id', excludeGameId);
    }

    return query;
  }

  /**
   * Estimate travel time between venues
   */
  private async estimateTravelTime(venue1: any, venue2: any): Promise<number> {
    // Simplified travel time estimation
    // In production, this would use Google Maps API or similar service
    
    // For now, estimate based on distance (very rough calculation)
    const lat1 = venue1.location?.coordinates?.[1] || 0;
    const lon1 = venue1.location?.coordinates?.[0] || 0;
    const lat2 = venue2.location?.coordinates?.[1] || 0;
    const lon2 = venue2.location?.coordinates?.[0] || 0;

    if (lat1 === 0 || lat2 === 0) {
      // Default estimate if no coordinates
      return 30; // 30 minutes
    }

    // Haversine formula for distance
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in miles

    // Estimate time: assume average speed of 30 mph in city
    const estimatedMinutes = Math.round(distance * 2); // 2 minutes per mile (rough estimate)
    
    return Math.max(estimatedMinutes, 15); // Minimum 15 minutes travel time
  }
}

// Export singleton instance
export const conflictDetector = new ConflictDetectorService();