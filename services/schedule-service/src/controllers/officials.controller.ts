import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { OfficialsService, Official, Availability, Assignment } from '../services/officials.service';
import { logger } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Validation rules
const officialValidation = [
  body('firstName').isString().isLength({ min: 1, max: 100 }).withMessage('First name is required'),
  body('lastName').isString().isLength({ min: 1, max: 100 }).withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').isString().isLength({ min: 10, max: 20 }).withMessage('Valid phone number is required'),
  body('certificationLevel').isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).withMessage('Invalid certification level'),
  body('specialties').isArray({ min: 1 }).withMessage('At least one specialty is required'),
  body('specialties.*').isIn(['REFEREE', 'SCOREKEEPER', 'CLOCK_OPERATOR']).withMessage('Invalid specialty'),
  body('maxGamesPerDay').isInt({ min: 1, max: 10 }).withMessage('Max games per day must be between 1 and 10'),
  body('maxGamesPerWeek').isInt({ min: 1, max: 30 }).withMessage('Max games per week must be between 1 and 30'),
  body('travelRadius').isFloat({ min: 0, max: 500 }).withMessage('Travel radius must be between 0 and 500 km'),
  body('hourlyRate').isFloat({ min: 0 }).withMessage('Hourly rate must be non-negative'),
  body('active').optional().isBoolean().withMessage('Active must be boolean'),
  body('notes').optional().isString().isLength({ max: 1000 }).withMessage('Notes too long'),
];

const availabilityValidation = [
  body('officialId').isUUID().withMessage('Official ID must be a valid UUID'),
  body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Day of week must be 0-6 (Sunday-Saturday)'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:mm format'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:mm format'),
  body('availabilityType').isIn(['AVAILABLE', 'PREFERRED', 'UNAVAILABLE']).withMessage('Invalid availability type'),
  body('recurring').isBoolean().withMessage('Recurring must be boolean'),
  body('specificDate').optional().isISO8601().toDate().withMessage('Invalid specific date'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes too long'),
];

const assignmentValidation = [
  body('gameIds').isArray({ min: 1 }).withMessage('At least one game ID is required'),
  body('gameIds.*').isUUID().withMessage('Each game ID must be a valid UUID'),
  body('constraints.requireCertificationLevel').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  body('constraints.preferredSpecialties').optional().isArray(),
  body('constraints.maxTravelDistance').optional().isFloat({ min: 0, max: 1000 }),
  body('constraints.minRestPeriodMinutes').optional().isInt({ min: 0, max: 1440 }),
  body('constraints.allowBackToBackGames').optional().isBoolean(),
  body('constraints.maxGamesPerOfficialPerDay').optional().isInt({ min: 1, max: 10 }),
  body('constraints.maxGamesPerOfficialPerWeek').optional().isInt({ min: 1, max: 50 }),
  body('constraints.requireConfirmationHours').optional().isInt({ min: 1, max: 168 }),
];

export class OfficialsController {
  // POST /api/v1/officials
  static async createOfficial(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const organizationId = req.organizationId!;
      const officialData = {
        ...req.body,
        organizationId,
        active: req.body.active !== undefined ? req.body.active : true,
      };

      const officialsService = OfficialsService.getInstance();
      const official = await officialsService.createOfficial(officialData);

      logger.info('Official created', {
        officialId: official.id,
        name: `${official.firstName} ${official.lastName}`,
        organizationId,
        createdBy: req.userId,
      });

      res.status(201).json({
        success: true,
        data: official,
        message: 'Official created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Create official error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create official',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/officials
  static async getOfficials(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { active, certification, specialty, search, page = '1', limit = '50' } = req.query;

      // TODO: Implement database query with filters
      const mockOfficials = [
        {
          id: 'official-1',
          organizationId,
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@example.com',
          phone: '555-1234',
          certificationLevel: 'ADVANCED',
          specialties: ['REFEREE', 'SCOREKEEPER'],
          maxGamesPerDay: 3,
          maxGamesPerWeek: 15,
          travelRadius: 50,
          hourlyRate: 45,
          active: true,
          notes: 'Experienced referee with 10 years in youth basketball',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      res.status(200).json({
        success: true,
        data: mockOfficials,
        count: mockOfficials.length,
        pagination: {
          page: parseInt(page as string, 10),
          limit: parseInt(limit as string, 10),
          total: mockOfficials.length,
          pages: 1,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get officials error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve officials',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/officials/:officialId
  static async getOfficial(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { officialId } = req.params;
      const organizationId = req.organizationId!;

      // TODO: Implement database query
      res.status(501).json({
        success: false,
        error: 'Official retrieval not yet implemented',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get official error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve official',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // PUT /api/v1/officials/:officialId
  static async updateOfficial(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { officialId } = req.params;
      const organizationId = req.organizationId!;

      // TODO: Implement update logic
      res.status(501).json({
        success: false,
        error: 'Official update not yet implemented',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Update official error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update official',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // DELETE /api/v1/officials/:officialId
  static async deleteOfficial(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { officialId } = req.params;
      const organizationId = req.organizationId!;

      // TODO: Implement soft delete logic
      res.status(501).json({
        success: false,
        error: 'Official deletion not yet implemented',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Delete official error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete official',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // POST /api/v1/officials/:officialId/availability
  static async setAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { officialId } = req.params;
      const availabilityData = {
        ...req.body,
        officialId,
      };

      const officialsService = OfficialsService.getInstance();
      const availability = await officialsService.setAvailability(availabilityData);

      res.status(201).json({
        success: true,
        data: availability,
        message: 'Availability set successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Set availability error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set availability',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/officials/:officialId/availability
  static async getAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { officialId } = req.params;
      const { date, week, month } = req.query;

      // TODO: Implement availability retrieval
      const mockAvailability = [
        {
          id: 'avail-1',
          officialId,
          dayOfWeek: 6, // Saturday
          startTime: '09:00',
          endTime: '17:00',
          availabilityType: 'AVAILABLE',
          recurring: true,
          notes: 'Available all day Saturdays',
        },
        {
          id: 'avail-2',
          officialId,
          dayOfWeek: 0, // Sunday
          startTime: '10:00',
          endTime: '16:00',
          availabilityType: 'PREFERRED',
          recurring: true,
          notes: 'Prefer afternoon games on Sundays',
        },
      ];

      res.status(200).json({
        success: true,
        data: mockAvailability,
        count: mockAvailability.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get availability error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve availability',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // POST /api/v1/assignments/optimize
  static async optimizeAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const organizationId = req.organizationId!;
      const { gameIds, constraints = {} } = req.body;

      // Set default constraints
      const defaultConstraints = {
        preferredSpecialties: ['REFEREE', 'SCOREKEEPER', 'CLOCK_OPERATOR'],
        minRestPeriodMinutes: 60,
        allowBackToBackGames: false,
        maxGamesPerOfficialPerDay: 3,
        maxGamesPerOfficialPerWeek: 15,
        requireConfirmationHours: 24,
        ...constraints,
      };

      // TODO: Get games, officials, and venues from database
      const mockGames = gameIds.map((id: string, index: number) => ({
        id,
        seasonId: 'season-1',
        homeTeamId: `team-${index * 2 + 1}`,
        awayTeamId: `team-${index * 2 + 2}`,
        venueId: 'venue-1',
        scheduledTime: new Date(Date.now() + (index * 2 * 60 * 60 * 1000)),
        status: 'SCHEDULED',
        gameNumber: index + 1,
        gameType: 'REGULAR',
        skillLevel: 'INTERMEDIATE' as const,
      }));

      const mockOfficials = [
        {
          id: 'official-1',
          organizationId,
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@example.com',
          phone: '555-1234',
          certificationLevel: 'ADVANCED' as const,
          specialties: ['REFEREE', 'SCOREKEEPER'],
          maxGamesPerDay: 3,
          maxGamesPerWeek: 15,
          travelRadius: 50,
          hourlyRate: 45,
          active: true,
          notes: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockVenues = [
        {
          id: 'venue-1',
          name: 'Main Gym',
          address: '123 Main St',
          city: 'Phoenix',
          state: 'AZ',
          latitude: 33.4484,
          longitude: -112.0740,
        },
      ];

      const officialsService = OfficialsService.getInstance();
      const result = await officialsService.optimizeAssignments(
        mockGames,
        mockOfficials,
        mockVenues,
        defaultConstraints,
        organizationId
      );

      logger.info('Assignment optimization completed', {
        success: result.success,
        assignedGames: result.assignments.length,
        unassignedGames: result.unassignedGames.length,
        conflicts: result.conflicts.length,
        organizationId,
        requestedBy: req.userId,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: result.success ? 'All games successfully assigned' : 'Assignment completed with issues',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Optimize assignments error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to optimize assignments',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/assignments
  static async getAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { 
        official_id, 
        game_id, 
        status, 
        start_date, 
        end_date,
        page = '1', 
        limit = '50' 
      } = req.query;

      // TODO: Implement database query with filters
      const mockAssignments = [
        {
          id: 'assignment-1',
          gameId: 'game-1',
          officialId: 'official-1',
          role: 'HEAD_REFEREE',
          status: 'CONFIRMED',
          assignedAt: new Date(),
          confirmedAt: new Date(),
          payRate: 45,
          estimatedPay: 90,
          actualPay: 90,
          createdBy: req.userId,
          game: {
            gameNumber: 1,
            scheduledTime: new Date(),
            homeTeam: 'Team A',
            awayTeam: 'Team B',
          },
          official: {
            firstName: 'John',
            lastName: 'Smith',
            email: 'john@example.com',
          },
        },
      ];

      res.status(200).json({
        success: true,
        data: mockAssignments,
        count: mockAssignments.length,
        pagination: {
          page: parseInt(page as string, 10),
          limit: parseInt(limit as string, 10),
          total: mockAssignments.length,
          pages: 1,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get assignments error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve assignments',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // PUT /api/v1/assignments/:assignmentId/status
  static async updateAssignmentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const { status, notes } = req.body;

      if (!['PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status',
          validStatuses: ['PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED'],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // TODO: Implement status update
      res.status(501).json({
        success: false,
        error: 'Assignment status update not yet implemented',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Update assignment status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update assignment status',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/officials/:officialId/availability-check
  static async checkAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { officialId } = req.params;
      const { game_time, duration = '120' } = req.query;

      if (!game_time) {
        res.status(400).json({
          success: false,
          error: 'game_time parameter is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const gameTime = new Date(game_time as string);
      const gameDuration = parseInt(duration as string, 10);

      const officialsService = OfficialsService.getInstance();
      const availability = await officialsService.checkAvailability(officialId, gameTime, gameDuration);

      res.status(200).json({
        success: true,
        data: availability,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Check availability error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check availability',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/payroll/export
  static async exportPayroll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { start_date, end_date, format = 'csv' } = req.query;

      if (!start_date || !end_date) {
        res.status(400).json({
          success: false,
          error: 'start_date and end_date parameters are required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);

      if (format !== 'csv') {
        res.status(400).json({
          success: false,
          error: 'Only CSV format is currently supported',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const officialsService = OfficialsService.getInstance();
      const csv = await officialsService.generatePayrollExport(startDate, endDate, organizationId);

      const filename = `payroll-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`;

      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });

      res.status(200).send(csv);
    } catch (error) {
      logger.error('Export payroll error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export payroll',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Apply validation middleware to routes
OfficialsController.createOfficial = [
  ...officialValidation,
  OfficialsController.createOfficial,
] as any;

OfficialsController.updateOfficial = [
  param('officialId').isUUID().withMessage('Official ID must be a valid UUID'),
  ...officialValidation.map(rule => rule.optional()),
  OfficialsController.updateOfficial,
] as any;

OfficialsController.setAvailability = [
  param('officialId').isUUID().withMessage('Official ID must be a valid UUID'),
  ...availabilityValidation.filter(rule => !rule.toString().includes('officialId')), // Remove officialId validation since it comes from params
  OfficialsController.setAvailability,
] as any;

OfficialsController.optimizeAssignments = [
  ...assignmentValidation,
  OfficialsController.optimizeAssignments,
] as any;

OfficialsController.getOfficial = [
  param('officialId').isUUID().withMessage('Official ID must be a valid UUID'),
  OfficialsController.getOfficial,
] as any;

OfficialsController.deleteOfficial = [
  param('officialId').isUUID().withMessage('Official ID must be a valid UUID'),
  OfficialsController.deleteOfficial,
] as any;

OfficialsController.getAvailability = [
  param('officialId').isUUID().withMessage('Official ID must be a valid UUID'),
  OfficialsController.getAvailability,
] as any;

OfficialsController.updateAssignmentStatus = [
  param('assignmentId').isUUID().withMessage('Assignment ID must be a valid UUID'),
  body('status').isIn(['PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED']).withMessage('Invalid status'),
  body('notes').optional().isString().isLength({ max: 1000 }).withMessage('Notes too long'),
  OfficialsController.updateAssignmentStatus,
] as any;

OfficialsController.checkAvailability = [
  param('officialId').isUUID().withMessage('Official ID must be a valid UUID'),
  query('game_time').isISO8601().withMessage('Invalid game time format'),
  OfficialsController.checkAvailability,
] as any;