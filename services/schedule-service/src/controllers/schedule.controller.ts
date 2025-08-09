import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import moment from 'moment-timezone';
import icalGenerator from 'ical-generator';
import { v4 as uuidv4 } from 'uuid';

import {
  SeasonModel,
  DivisionModel,
  VenueModel,
  GameModel,
  VenueAvailabilityModel,
  BlackoutDateModel,
  Season,
  Division,
  Venue,
  Game,
  VenueAvailability,
  BlackoutDate,
} from '../models/schedule.model';
import { ScheduleGeneratorService, ScheduleGenerationParams, TeamInfo } from '../services/generator.service';
import { ConflictDetectorService } from '../services/conflict-detector.service';
import { heatPolicyService, checkHeatPolicy } from '../utils/heat-policy';
import { logger, CacheService, withTransaction } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Validation rules
const seasonValidation = [
  body('name').isString().isLength({ min: 1, max: 255 }).trim(),
  body('league_id').isUUID().withMessage('League ID must be a valid UUID'),
  body('start_date').isISO8601().toDate(),
  body('end_date').isISO8601().toDate(),
  body('registration_start').isISO8601().toDate(),
  body('registration_deadline').isISO8601().toDate(),
  body('registration_fee').isFloat({ min: 0 }),
  body('currency').isLength({ min: 3, max: 3 }),
];

const divisionValidation = [
  body('name').isString().isLength({ min: 1, max: 255 }).trim(),
  body('code').isString().isLength({ min: 1, max: 10 }).trim(),
  body('min_age').isInt({ min: 6, max: 18 }),
  body('max_age').isInt({ min: 6, max: 18 }),
  body('skill_level').isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'COMPETITIVE']),
  body('gender').isIn(['MALE', 'FEMALE', 'COED']),
  body('max_teams').isInt({ min: 1 }),
  body('max_players_per_team').isInt({ min: 5 }),
];

const venueValidation = [
  body('name').isString().isLength({ min: 1, max: 255 }).trim(),
  body('venue_code').isString().isLength({ min: 1, max: 20 }).trim(),
  body('type').isIn(['INDOOR', 'OUTDOOR', 'HYBRID']),
  body('address').isString().isLength({ min: 1, max: 500 }).trim(),
  body('city').isString().isLength({ min: 1, max: 100 }).trim(),
  body('state').isString().isLength({ min: 2, max: 2 }).trim(),
  body('zip_code').isString().isLength({ min: 5, max: 10 }).trim(),
  body('capacity').isInt({ min: 1 }),
  body('rental_cost_per_hour').isFloat({ min: 0 }),
];

export class ScheduleController {
  // Health check endpoint
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'schedule-service',
        version: '1.0.0',
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Season management endpoints
  static async getSeasons(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, league_id } = req.query;
      const organizationId = req.organizationId!;

      const seasons = await SeasonModel.findAll(organizationId, {
        status,
        league_id,
      });

      res.status(200).json({
        success: true,
        data: seasons,
        count: seasons.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get seasons error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seasons',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async getSeason(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const organizationId = req.organizationId!;

      const season = await SeasonModel.findById(seasonId, organizationId);
      
      if (!season) {
        res.status(404).json({
          success: false,
          error: 'Season not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: season,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get season error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve season',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async createSeason(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const seasonData: Partial<Season> = {
        id: uuidv4(),
        ...req.body,
        organization_id: req.organizationId!,
        slug: req.body.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      };

      const season = await SeasonModel.create(seasonData);

      logger.info('Season created', {
        seasonId: season.id,
        name: season.name,
        organizationId: req.organizationId,
        createdBy: req.userId,
      });

      res.status(201).json({
        success: true,
        data: season,
        message: 'Season created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Create season error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create season',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async updateSeason(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { seasonId } = req.params;
      const organizationId = req.organizationId!;

      const season = await SeasonModel.update(seasonId, organizationId, req.body);
      
      if (!season) {
        res.status(404).json({
          success: false,
          error: 'Season not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Invalidate cache
      await CacheService.del(CacheService.scheduleKey(seasonId));

      logger.info('Season updated', {
        seasonId,
        organizationId,
        updatedBy: req.userId,
      });

      res.status(200).json({
        success: true,
        data: season,
        message: 'Season updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Update season error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update season',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async deleteSeason(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const organizationId = req.organizationId!;

      const deleted = await SeasonModel.delete(seasonId, organizationId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Season not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Invalidate cache
      await CacheService.del(CacheService.scheduleKey(seasonId));

      logger.info('Season deleted', {
        seasonId,
        organizationId,
        deletedBy: req.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Season deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Delete season error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete season',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Division management endpoints
  static async getDivisions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const organizationId = req.organizationId!;

      const divisions = await DivisionModel.findBySeasonId(seasonId, organizationId);

      res.status(200).json({
        success: true,
        data: divisions,
        count: divisions.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get divisions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve divisions',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async getDivision(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { divisionId } = req.params;
      const organizationId = req.organizationId!;

      const division = await DivisionModel.findById(divisionId, organizationId);
      
      if (!division) {
        res.status(404).json({
          success: false,
          error: 'Division not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: division,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get division error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve division',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async createDivision(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { seasonId } = req.params;

      // Get season to validate and get league_id
      const season = await SeasonModel.findById(seasonId, req.organizationId!);
      if (!season) {
        res.status(404).json({
          success: false,
          error: 'Season not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const divisionData: Partial<Division> = {
        id: uuidv4(),
        ...req.body,
        league_id: season.league_id,
        organization_id: req.organizationId!,
      };

      const division = await DivisionModel.create(divisionData);

      logger.info('Division created', {
        divisionId: division.id,
        name: division.name,
        seasonId,
        organizationId: req.organizationId,
        createdBy: req.userId,
      });

      res.status(201).json({
        success: true,
        data: division,
        message: 'Division created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Create division error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create division',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async updateDivision(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { divisionId } = req.params;
      const organizationId = req.organizationId!;

      const division = await DivisionModel.update(divisionId, organizationId, req.body);
      
      if (!division) {
        res.status(404).json({
          success: false,
          error: 'Division not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Division updated', {
        divisionId,
        organizationId,
        updatedBy: req.userId,
      });

      res.status(200).json({
        success: true,
        data: division,
        message: 'Division updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Update division error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update division',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async deleteDivision(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { divisionId } = req.params;
      const organizationId = req.organizationId!;

      const deleted = await DivisionModel.delete(divisionId, organizationId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Division not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Division deleted', {
        divisionId,
        organizationId,
        deletedBy: req.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Division deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Delete division error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete division',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Venue management endpoints
  static async getVenues(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { active, type } = req.query;
      const organizationId = req.organizationId!;

      const venues = await VenueModel.findAll(organizationId, {
        active: active !== undefined ? active === 'true' : undefined,
        type,
      });

      res.status(200).json({
        success: true,
        data: venues,
        count: venues.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get venues error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve venues',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async getVenue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { venueId } = req.params;
      const organizationId = req.organizationId!;

      const venue = await VenueModel.findById(venueId, organizationId);
      
      if (!venue) {
        res.status(404).json({
          success: false,
          error: 'Venue not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: venue,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get venue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve venue',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async createVenue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const venueData: Partial<Venue> = {
        id: uuidv4(),
        ...req.body,
        organization_id: req.organizationId!,
        active: req.body.active !== undefined ? req.body.active : true,
        country: req.body.country || 'US',
      };

      const venue = await VenueModel.create(venueData);

      logger.info('Venue created', {
        venueId: venue.id,
        name: venue.name,
        organizationId: req.organizationId,
        createdBy: req.userId,
      });

      res.status(201).json({
        success: true,
        data: venue,
        message: 'Venue created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Create venue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create venue',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async updateVenue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { venueId } = req.params;
      const organizationId = req.organizationId!;

      const venue = await VenueModel.update(venueId, organizationId, req.body);
      
      if (!venue) {
        res.status(404).json({
          success: false,
          error: 'Venue not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Venue updated', {
        venueId,
        organizationId,
        updatedBy: req.userId,
      });

      res.status(200).json({
        success: true,
        data: venue,
        message: 'Venue updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Update venue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update venue',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async deleteVenue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { venueId } = req.params;
      const organizationId = req.organizationId!;

      // Check if venue has scheduled games
      const games = await GameModel.findBySeasonId('', organizationId); // TODO: Fix this query
      const hasGames = games.some(game => game.venue_id === venueId && game.status !== 'CANCELLED');
      
      if (hasGames) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete venue with scheduled games',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const deleted = await VenueModel.delete(venueId, organizationId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Venue not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Venue deleted', {
        venueId,
        organizationId,
        deletedBy: req.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Venue deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Delete venue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete venue',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Venue availability endpoints
  static async getVenueAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { venueId } = req.params;
      
      const availability = await VenueAvailabilityModel.findByVenueId(venueId);

      res.status(200).json({
        success: true,
        data: availability,
        count: availability.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get venue availability error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve venue availability',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async setVenueAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { venueId } = req.params;

      const availabilityData: Partial<VenueAvailability> = {
        id: uuidv4(),
        venue_id: venueId,
        ...req.body,
      };

      const availability = await VenueAvailabilityModel.create(availabilityData);

      res.status(201).json({
        success: true,
        data: availability,
        message: 'Venue availability set successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Set venue availability error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set venue availability',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async updateVenueAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    // TODO: Implement venue availability update
    res.status(501).json({
      success: false,
      error: 'Not implemented',
      timestamp: new Date().toISOString(),
    });
  }

  static async deleteVenueAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    // TODO: Implement venue availability deletion
    res.status(501).json({
      success: false,
      error: 'Not implemented',
      timestamp: new Date().toISOString(),
    });
  }

  // Schedule generation endpoints
  static async generateSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const organizationId = req.organizationId!;

      // Get season
      const season = await SeasonModel.findById(seasonId, organizationId);
      if (!season) {
        res.status(404).json({
          success: false,
          error: 'Season not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Generate schedule parameters from request
      const params: ScheduleGenerationParams = {
        seasonId,
        divisionIds: req.body.divisionIds || [],
        algorithm: req.body.algorithm || 'ROUND_ROBIN',
        preferredDays: req.body.preferredDays || ['SATURDAY', 'SUNDAY'],
        preferredTimes: req.body.preferredTimes || ['09:00', '11:00', '13:00', '15:00'],
        gameDurationMinutes: req.body.gameDurationMinutes || 120,
        bufferMinutes: req.body.bufferMinutes || 30,
        maxGamesPerDay: req.body.maxGamesPerDay || 5,
        maxGamesPerWeek: req.body.maxGamesPerWeek || 2,
        enforceHeatPolicy: req.body.enforceHeatPolicy !== false,
        allowOverlappingDivisions: req.body.allowOverlappingDivisions || false,
        respectBlackoutDates: req.body.respectBlackoutDates !== false,
        venue_preferences: req.body.venue_preferences || [],
      };

      // Get teams (this would typically come from team service)
      const teams: TeamInfo[] = req.body.teams || [];

      const generator = ScheduleGeneratorService.getInstance();
      const result = await generator.generateSchedule(season, teams, params);

      logger.info('Schedule generation completed', {
        seasonId,
        success: result.success,
        gamesGenerated: result.statistics.totalGames,
        organizationId,
        requestedBy: req.userId,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: result.success ? 'Schedule generated successfully' : 'Schedule generation completed with issues',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Generate schedule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate schedule',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async getSchedulePreview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      
      // Get cached schedule or return empty
      const cacheKey = CacheService.scheduleKey(seasonId);
      const cachedSchedule = await CacheService.get(cacheKey);

      res.status(200).json({
        success: true,
        data: cachedSchedule || { games: [], conflicts: [], warnings: [] },
        message: cachedSchedule ? 'Schedule preview available' : 'No schedule preview available',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get schedule preview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve schedule preview',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async publishSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const organizationId = req.organizationId!;

      // Get cached schedule
      const cacheKey = CacheService.scheduleKey(seasonId);
      const schedule = await CacheService.get(cacheKey);

      if (!schedule || !schedule.games || schedule.games.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No schedule available to publish. Generate a schedule first.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Persist games to database
      await withTransaction(async (trx) => {
        const gamesData = schedule.games.map((game: any) => ({
          id: uuidv4(),
          season_id: seasonId,
          home_team_id: game.homeTeamId,
          away_team_id: game.awayTeamId,
          venue_id: game.venueId,
          game_number: game.gameNumber,
          game_type: 'REGULAR',
          scheduled_time: game.scheduledTime,
          status: 'SCHEDULED',
          home_score: 0,
          away_score: 0,
          heat_policy_applied: !!game.heatWarning,
          created_by: req.userId!,
          organization_id: organizationId,
        }));

        await trx('games').insert(gamesData);
      });

      // Update season status
      await SeasonModel.update(seasonId, organizationId, {
        status: 'ACTIVE',
      });

      // Clear cache
      await CacheService.del(cacheKey);

      logger.info('Schedule published', {
        seasonId,
        gamesPublished: schedule.games.length,
        organizationId,
        publishedBy: req.userId,
      });

      res.status(200).json({
        success: true,
        message: `Schedule published successfully with ${schedule.games.length} games`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Publish schedule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish schedule',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Schedule viewing endpoints
  static async getSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const { division_id, team_id, venue_id } = req.query;
      const organizationId = req.organizationId!;

      let games = await GameModel.findBySeasonId(seasonId, organizationId);

      // Apply filters
      if (division_id) {
        // TODO: Join with teams to filter by division
      }
      if (team_id) {
        games = games.filter(game => 
          game.home_team_id === team_id || game.away_team_id === team_id
        );
      }
      if (venue_id) {
        games = games.filter(game => game.venue_id === venue_id);
      }

      res.status(200).json({
        success: true,
        data: games,
        count: games.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get schedule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve schedule',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async getCalendarView(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const { view = 'month', date } = req.query;
      const organizationId = req.organizationId!;

      const games = await GameModel.findBySeasonId(seasonId, organizationId);

      // Convert to calendar format
      const calendarEvents = games.map(game => ({
        id: game.id,
        title: `${game.home_team_id} vs ${game.away_team_id}`,
        start: moment(game.scheduled_time).tz('America/Phoenix').toISOString(),
        end: moment(game.scheduled_time).add(2, 'hours').tz('America/Phoenix').toISOString(),
        venue: game.venue_id,
        status: game.status,
        gameNumber: game.game_number,
      }));

      res.status(200).json({
        success: true,
        data: {
          view,
          events: calendarEvents,
        },
        count: calendarEvents.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get calendar view error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve calendar view',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async exportScheduleICS(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const organizationId = req.organizationId!;

      const season = await SeasonModel.findById(seasonId, organizationId);
      if (!season) {
        res.status(404).json({
          success: false,
          error: 'Season not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const games = await GameModel.findBySeasonId(seasonId, organizationId);

      // Create ICS calendar
      const cal = icalGenerator({
        domain: 'gametriq.com',
        name: `${season.name} Schedule`,
        description: `Basketball league schedule for ${season.name}`,
        timezone: 'America/Phoenix',
      });

      // Add games as events
      games.forEach(game => {
        cal.createEvent({
          start: moment(game.scheduled_time).tz('America/Phoenix').toDate(),
          end: moment(game.scheduled_time).add(2, 'hours').tz('America/Phoenix').toDate(),
          summary: `${game.home_team_id} vs ${game.away_team_id}`,
          description: `Game ${game.game_number} - ${game.game_type}`,
          location: game.venue_id, // TODO: Get venue name
          uid: game.id,
          sequence: 0,
          status: 'CONFIRMED',
        });
      });

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${season.name}-schedule.ics"`);
      res.status(200).send(cal.toString());
    } catch (error) {
      logger.error('Export schedule ICS error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export schedule',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Game management endpoints
  static async getGame(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;
      const organizationId = req.organizationId!;

      const game = await GameModel.findById(gameId, organizationId);
      
      if (!game) {
        res.status(404).json({
          success: false,
          error: 'Game not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: game,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get game error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve game',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async updateGame(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;
      const organizationId = req.organizationId!;

      const game = await GameModel.update(gameId, organizationId, req.body);
      
      if (!game) {
        res.status(404).json({
          success: false,
          error: 'Game not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: game,
        message: 'Game updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Update game error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update game',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async rescheduleGame(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;
      const { newTime, newVenueId, reason } = req.body;
      const organizationId = req.organizationId!;

      // Get current game
      const game = await GameModel.findById(gameId, organizationId);
      if (!game) {
        res.status(404).json({
          success: false,
          error: 'Game not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check for conflicts with new time/venue
      const conflicts = await ConflictDetectorService.getInstance().detectGameConflicts(
        newVenueId || game.venue_id,
        new Date(newTime),
        120, // 2 hours
        [game.home_team_id, game.away_team_id],
        gameId
      );

      if (conflicts.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Rescheduling would create conflicts',
          conflicts,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Update game
      const updateData: any = {
        scheduled_time: new Date(newTime),
        notes: `${game.notes || ''}\nRescheduled: ${reason}`,
      };
      
      if (newVenueId) {
        updateData.venue_id = newVenueId;
      }

      const updatedGame = await GameModel.update(gameId, organizationId, updateData);

      // TODO: Send notifications about reschedule

      logger.info('Game rescheduled', {
        gameId,
        oldTime: game.scheduled_time,
        newTime,
        oldVenue: game.venue_id,
        newVenue: newVenueId,
        reason,
        rescheduledBy: req.userId,
      });

      res.status(200).json({
        success: true,
        data: updatedGame,
        message: 'Game rescheduled successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Reschedule game error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reschedule game',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async cancelGame(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;
      const { reason } = req.body;
      const organizationId = req.organizationId!;

      const game = await GameModel.update(gameId, organizationId, {
        status: 'CANCELLED',
        cancelled_reason: reason,
      });
      
      if (!game) {
        res.status(404).json({
          success: false,
          error: 'Game not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // TODO: Send cancellation notifications

      logger.info('Game cancelled', {
        gameId,
        reason,
        cancelledBy: req.userId,
      });

      res.status(200).json({
        success: true,
        data: game,
        message: 'Game cancelled successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cancel game error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel game',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Conflict detection endpoints
  static async validateSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.body;
      const organizationId = req.organizationId!;

      const conflicts = await ConflictDetectorService.getInstance().detectSeasonConflicts(
        seasonId,
        organizationId
      );

      res.status(200).json({
        success: true,
        data: {
          conflicts,
          hasConflicts: conflicts.length > 0,
          criticalConflicts: conflicts.filter(c => c.severity === 'CRITICAL').length,
          highConflicts: conflicts.filter(c => c.severity === 'HIGH').length,
        },
        message: conflicts.length === 0 ? 'No conflicts detected' : `${conflicts.length} conflicts detected`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Validate schedule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate schedule',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async getConflicts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { season_id, severity } = req.query;
      const organizationId = req.organizationId!;

      if (!season_id) {
        res.status(400).json({
          success: false,
          error: 'Season ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let conflicts = await ConflictDetectorService.getInstance().detectSeasonConflicts(
        season_id as string,
        organizationId
      );

      // Filter by severity if specified
      if (severity) {
        conflicts = conflicts.filter(c => c.severity === severity);
      }

      res.status(200).json({
        success: true,
        data: conflicts,
        count: conflicts.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get conflicts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve conflicts',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async resolveConflicts(req: AuthenticatedRequest, res: Response): Promise<void> {
    // TODO: Implement conflict resolution
    res.status(501).json({
      success: false,
      error: 'Conflict resolution not yet implemented',
      timestamp: new Date().toISOString(),
    });
  }

  // Blackout dates management
  static async getBlackoutDates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const organizationId = req.organizationId!;

      const blackoutDates = await BlackoutDateModel.findBySeasonId(seasonId, organizationId);

      res.status(200).json({
        success: true,
        data: blackoutDates,
        count: blackoutDates.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get blackout dates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve blackout dates',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async createBlackoutDate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;

      const blackoutDateData: Partial<BlackoutDate> = {
        id: uuidv4(),
        season_id: seasonId,
        organization_id: req.organizationId!,
        created_by: req.userId!,
        ...req.body,
      };

      const blackoutDate = await BlackoutDateModel.create(blackoutDateData);

      res.status(201).json({
        success: true,
        data: blackoutDate,
        message: 'Blackout date created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Create blackout date error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create blackout date',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async deleteBlackoutDate(req: AuthenticatedRequest, res: Response): Promise<void> {
    // TODO: Implement blackout date deletion
    res.status(501).json({
      success: false,
      error: 'Not implemented',
      timestamp: new Date().toISOString(),
    });
  }

  // Heat policy endpoints
  static async getHeatWarnings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { venueId } = req.params;
      const { startDate, endDate } = req.query;
      const organizationId = req.organizationId!;

      const venue = await VenueModel.findById(venueId, organizationId);
      if (!venue) {
        res.status(404).json({
          success: false,
          error: 'Venue not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const warnings = await heatPolicyService.getHeatWarnings(
        [venue],
        new Date(startDate as string),
        new Date(endDate as string)
      );

      const venueWarnings = warnings.get(venueId) || [];

      res.status(200).json({
        success: true,
        data: venueWarnings,
        count: venueWarnings.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get heat warnings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve heat warnings',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async performHeatCheck(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;
      const organizationId = req.organizationId!;

      const game = await GameModel.findById(gameId, organizationId);
      if (!game) {
        res.status(404).json({
          success: false,
          error: 'Game not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const venue = await VenueModel.findById(game.venue_id, organizationId);
      if (!venue) {
        res.status(404).json({
          success: false,
          error: 'Venue not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const heatCheck = await checkHeatPolicy(game, venue, game.scheduled_time);

      res.status(200).json({
        success: true,
        data: heatCheck,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Perform heat check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform heat check',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Reporting endpoints
  static async getScheduleUtilization(req: AuthenticatedRequest, res: Response): Promise<void> {
    // TODO: Implement schedule utilization report
    res.status(501).json({
      success: false,
      error: 'Not implemented',
      timestamp: new Date().toISOString(),
    });
  }

  static async getVenueUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
    // TODO: Implement venue usage report
    res.status(501).json({
      success: false,
      error: 'Not implemented',
      timestamp: new Date().toISOString(),
    });
  }

  static async getConflictSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    // TODO: Implement conflict summary report
    res.status(501).json({
      success: false,
      error: 'Not implemented',
      timestamp: new Date().toISOString(),
    });
  }
}

// Apply validation middleware to routes
ScheduleController.createSeason = [
  ...seasonValidation,
  ScheduleController.createSeason,
] as any;

ScheduleController.updateSeason = [
  ...seasonValidation.map(rule => rule.optional()),
  ScheduleController.updateSeason,
] as any;

ScheduleController.createDivision = [
  ...divisionValidation,
  ScheduleController.createDivision,
] as any;

ScheduleController.updateDivision = [
  ...divisionValidation.map(rule => rule.optional()),
  ScheduleController.updateDivision,
] as any;

ScheduleController.createVenue = [
  ...venueValidation,
  ScheduleController.createVenue,
] as any;

ScheduleController.updateVenue = [
  ...venueValidation.map(rule => rule.optional()),
  ScheduleController.updateVenue,
] as any;