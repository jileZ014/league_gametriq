import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { BracketService, Team, BracketConfiguration } from '../services/bracket.service';
import { logger } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Validation rules
const bracketConfigValidation = [
  body('type').isIn(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION']).withMessage('Invalid bracket type'),
  body('teamCount').isInt({ min: 4, max: 32 }).withMessage('Team count must be between 4 and 32'),
  body('includeThirdPlaceMatch').isBoolean().withMessage('Include third place match must be boolean'),
  body('seedFromStandings').isBoolean().withMessage('Seed from standings must be boolean'),
  body('timezone').isString().isLength({ min: 1 }).withMessage('Timezone is required'),
  body('tournamentName').isString().isLength({ min: 1, max: 255 }).withMessage('Tournament name is required'),
  body('venueIds').isArray({ min: 1 }).withMessage('At least one venue ID is required'),
  body('startDate').isISO8601().toDate().withMessage('Invalid start date'),
  body('gameDurationMinutes').isInt({ min: 60, max: 240 }).withMessage('Game duration must be between 60 and 240 minutes'),
  body('bufferMinutes').isInt({ min: 0, max: 120 }).withMessage('Buffer minutes must be between 0 and 120'),
  body('preferredTimes').isArray({ min: 1 }).withMessage('At least one preferred time is required'),
  body('preferredDays').isArray({ min: 1 }).withMessage('At least one preferred day is required'),
];

const teamValidation = [
  body('teams').isArray({ min: 4 }).withMessage('At least 4 teams are required'),
  body('teams.*.id').isUUID().withMessage('Team ID must be a valid UUID'),
  body('teams.*.name').isString().isLength({ min: 1 }).withMessage('Team name is required'),
  body('teams.*.seed').optional().isInt({ min: 1 }).withMessage('Seed must be a positive integer'),
  body('teams.*.wins').optional().isInt({ min: 0 }).withMessage('Wins must be non-negative'),
  body('teams.*.losses').optional().isInt({ min: 0 }).withMessage('Losses must be non-negative'),
  body('teams.*.pointDifferential').optional().isNumeric().withMessage('Point differential must be numeric'),
];

const gameResultValidation = [
  body('winnerId').isUUID().withMessage('Winner ID must be a valid UUID'),
  body('homeScore').isInt({ min: 0 }).withMessage('Home score must be non-negative integer'),
  body('awayScore').isInt({ min: 0 }).withMessage('Away score must be non-negative integer'),
];

export class BracketController {
  // POST /api/v1/brackets
  static async createBracket(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { configuration, teams } = req.body;
      const organizationId = req.organizationId!;

      // Validate teams match configuration
      if (teams.length !== configuration.teamCount) {
        res.status(400).json({
          success: false,
          error: `Team count mismatch: expected ${configuration.teamCount}, got ${teams.length}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const bracketService = BracketService.getInstance();
      const bracket = await bracketService.createBracket(configuration, teams);
      bracket.organizationId = organizationId;

      logger.info('Bracket created', {
        bracketId: bracket.id,
        tournamentName: bracket.name,
        type: bracket.type,
        teamCount: bracket.teamCount,
        organizationId,
        createdBy: req.userId,
      });

      res.status(201).json({
        success: true,
        data: bracket,
        message: 'Tournament bracket created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Create bracket error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create bracket',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/brackets/:bracketId
  static async getBracket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { bracketId } = req.params;
      const { visualization = 'false' } = req.query;

      // TODO: Implement bracket retrieval from database
      // For now, return a mock response
      res.status(501).json({
        success: false,
        error: 'Bracket retrieval not yet implemented - requires database integration',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get bracket error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve bracket',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/brackets/:bracketId/visualization
  static async getBracketVisualization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { bracketId } = req.params;

      // TODO: Get bracket from database first
      // For now, return mock visualization data
      const mockBracket = {
        id: bracketId,
        name: 'Championship Tournament',
        type: 'SINGLE_ELIMINATION',
        status: 'ACTIVE',
        teamCount: 8,
        rounds: 3,
        champion: null,
        runnerUp: null,
        thirdPlace: null,
        visualization: [
          {
            round: 1,
            name: 'First Round',
            games: [
              {
                id: 'game-1',
                gameNumber: 1,
                position: 1,
                homeTeam: { id: 'team-1', name: 'Eagles', seed: 1 },
                awayTeam: { id: 'team-8', name: 'Hawks', seed: 8 },
                winner: { id: 'team-1', name: 'Eagles' },
                score: { home: 85, away: 72 },
                scheduledTime: new Date().toISOString(),
                status: 'COMPLETED',
              },
              // More games...
            ],
          },
          // More rounds...
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.status(200).json({
        success: true,
        data: mockBracket,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get bracket visualization error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve bracket visualization',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // POST /api/v1/brackets/:bracketId/games/:gameId/result
  static async updateGameResult(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { bracketId, gameId } = req.params;
      const { winnerId, homeScore, awayScore } = req.body;

      // TODO: Implement game result update
      // 1. Retrieve bracket from database
      // 2. Update game result
      // 3. Advance winner using BracketService
      // 4. Save updated bracket

      res.status(501).json({
        success: false,
        error: 'Game result update not yet implemented - requires database integration',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Update game result error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update game result',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/brackets/:bracketId/conflicts
  static async detectConflicts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { bracketId } = req.params;

      // TODO: Get bracket from database
      // For now, return example conflict detection
      const mockConflicts = {
        hasConflicts: false,
        conflicts: [],
      };

      res.status(200).json({
        success: true,
        data: mockConflicts,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Detect conflicts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect conflicts',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // PUT /api/v1/brackets/:bracketId/schedule
  static async rescheduleBracket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { bracketId } = req.params;
      const { startDate, venueIds, preferredTimes, preferredDays } = req.body;

      // TODO: Implement bracket rescheduling
      res.status(501).json({
        success: false,
        error: 'Bracket rescheduling not yet implemented',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Reschedule bracket error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reschedule bracket',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/brackets
  static async getBrackets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { status, type, tournament } = req.query;

      // TODO: Implement bracket listing from database
      const mockBrackets = [
        {
          id: 'bracket-1',
          name: 'Spring Championship',
          type: 'SINGLE_ELIMINATION',
          status: 'ACTIVE',
          teamCount: 16,
          rounds: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      res.status(200).json({
        success: true,
        data: mockBrackets,
        count: mockBrackets.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get brackets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve brackets',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // DELETE /api/v1/brackets/:bracketId
  static async deleteBracket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { bracketId } = req.params;
      const organizationId = req.organizationId!;

      // TODO: Implement bracket deletion
      res.status(501).json({
        success: false,
        error: 'Bracket deletion not yet implemented',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Delete bracket error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete bracket',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // POST /api/v1/brackets/:bracketId/simulate
  static async simulateBracket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { bracketId } = req.params;
      const { seed } = req.body; // Random seed for reproducible simulations

      // TODO: Implement bracket simulation
      // This would simulate game outcomes based on team strength/seeding
      const mockSimulation = {
        champion: { id: 'team-1', name: 'Eagles', probability: 0.35 },
        runnerUp: { id: 'team-4', name: 'Tigers', probability: 0.28 },
        thirdPlace: { id: 'team-2', name: 'Lions', probability: 0.22 },
        simulationRuns: 1000,
        confidence: 0.95,
        expectedGamesPlayed: 15,
        estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };

      res.status(200).json({
        success: true,
        data: mockSimulation,
        message: 'Bracket simulation completed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Simulate bracket error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to simulate bracket',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Apply validation middleware to routes
BracketController.createBracket = [
  ...bracketConfigValidation,
  ...teamValidation,
  BracketController.createBracket,
] as any;

BracketController.updateGameResult = [
  param('bracketId').isUUID().withMessage('Bracket ID must be a valid UUID'),
  param('gameId').isUUID().withMessage('Game ID must be a valid UUID'),
  ...gameResultValidation,
  BracketController.updateGameResult,
] as any;

BracketController.getBracket = [
  param('bracketId').isUUID().withMessage('Bracket ID must be a valid UUID'),
  BracketController.getBracket,
] as any;

BracketController.getBracketVisualization = [
  param('bracketId').isUUID().withMessage('Bracket ID must be a valid UUID'),
  BracketController.getBracketVisualization,
] as any;

BracketController.detectConflicts = [
  param('bracketId').isUUID().withMessage('Bracket ID must be a valid UUID'),
  BracketController.detectConflicts,
] as any;

BracketController.rescheduleBracket = [
  param('bracketId').isUUID().withMessage('Bracket ID must be a valid UUID'),
  BracketController.rescheduleBracket,
] as any;

BracketController.deleteBracket = [
  param('bracketId').isUUID().withMessage('Bracket ID must be a valid UUID'),
  BracketController.deleteBracket,
] as any;

BracketController.simulateBracket = [
  param('bracketId').isUUID().withMessage('Bracket ID must be a valid UUID'),
  BracketController.simulateBracket,
] as any;