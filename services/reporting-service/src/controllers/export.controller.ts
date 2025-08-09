import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';

import { ReportService, ReportParameters } from '../services/report.service';
import { logger } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { reportQueue } from '../index';

// Validation rules
const reportGenerationValidation = [
  body('reportType').isIn(['games', 'teams', 'players', 'standings', 'officials', 'financial', 'venues', 'attendance']).withMessage('Invalid report type'),
  body('format').isIn(['CSV', 'JSON', 'PDF', 'XLSX']).withMessage('Invalid format'),
  body('startDate').optional().isISO8601().toDate().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().toDate().withMessage('Invalid end date'),
  body('seasonId').optional().isUUID().withMessage('Season ID must be a valid UUID'),
  body('leagueId').optional().isUUID().withMessage('League ID must be a valid UUID'),
  body('divisionId').optional().isUUID().withMessage('Division ID must be a valid UUID'),
  body('teamIds').optional().isArray().withMessage('Team IDs must be an array'),
  body('teamIds.*').optional().isUUID().withMessage('Each team ID must be a valid UUID'),
  body('venueIds').optional().isArray().withMessage('Venue IDs must be an array'),
  body('venueIds.*').optional().isUUID().withMessage('Each venue ID must be a valid UUID'),
  body('maxRows').optional().isInt({ min: 1, max: 100000 }).withMessage('Max rows must be between 1 and 100,000'),
  body('includeArchived').optional().isBoolean().withMessage('Include archived must be boolean'),
  body('timezone').optional().isString().withMessage('Timezone must be a string'),
];

const batchExportValidation = [
  body('exports').isArray({ min: 1, max: 10 }).withMessage('Exports array must contain 1-10 items'),
  body('exports.*.reportType').isIn(['games', 'teams', 'players', 'standings', 'officials', 'financial', 'venues']),
  body('exports.*.format').isIn(['CSV', 'JSON', 'PDF', 'XLSX']),
  body('compressionFormat').optional().isIn(['zip', 'tar.gz']).withMessage('Invalid compression format'),
];

export class ExportController {
  // POST /api/v1/reports/generate
  static async generateReport(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const { reportType, ...parameters } = req.body;

      // For large reports, use async processing
      const estimatedSize = await ExportController.estimateReportSize(reportType, parameters, organizationId);
      const useAsyncProcessing = estimatedSize > 1000 || parameters.format === 'PDF';

      if (useAsyncProcessing && process.env.FEATURE_ASYNC_PROCESSING === 'true') {
        // Queue the report for background processing
        const job = await reportQueue.add('generateReport', {
          reportType,
          parameters: {
            ...parameters,
            timezone: parameters.timezone || 'America/Phoenix',
          },
          organizationId,
          requestedBy: req.userId,
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        });

        logger.info('Report queued for async generation', {
          jobId: job.id,
          reportType,
          organizationId,
          requestedBy: req.userId,
        });

        res.status(202).json({
          success: true,
          data: {
            reportId: job.id?.toString(),
            status: 'QUEUED',
            estimatedCompletionTime: new Date(Date.now() + (estimatedSize * 100)), // Rough estimate
            statusUrl: `/api/v1/reports/${job.id}/status`,
          },
          message: 'Report generation queued. Check status for completion.',
          timestamp: new Date().toISOString(),
        });
      } else {
        // Process synchronously for small reports
        const reportService = ReportService.getInstance();
        const result = await reportService.generateReport(
          reportType,
          {
            ...parameters,
            timezone: parameters.timezone || 'America/Phoenix',
          },
          organizationId,
          req.userId!
        );

        if (result.status === 'FAILED') {
          res.status(500).json({
            success: false,
            error: result.error,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: {
            reportId: result.id,
            status: result.status,
            downloadUrl: result.downloadUrl,
            fileSize: result.fileSize,
            recordCount: result.recordCount,
            expiresAt: result.expiresAt,
          },
          message: 'Report generated successfully',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Generate report error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/reports/:reportId/status
  static async getReportStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;

      // Check if it's a queue job
      if (reportId.match(/^\d+$/)) {
        const job = await reportQueue.getJob(reportId);
        
        if (!job) {
          res.status(404).json({
            success: false,
            error: 'Report not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const status = await job.getState();
        const progress = job.progress();

        let responseStatus: string;
        switch (status) {
          case 'waiting':
          case 'delayed':
            responseStatus = 'QUEUED';
            break;
          case 'active':
            responseStatus = 'PROCESSING';
            break;
          case 'completed':
            responseStatus = 'COMPLETED';
            break;
          case 'failed':
            responseStatus = 'FAILED';
            break;
          default:
            responseStatus = 'UNKNOWN';
        }

        const result = {
          reportId,
          status: responseStatus,
          progress,
          queuedAt: job.timestamp,
          processedAt: job.processedOn,
          completedAt: job.finishedOn,
        };

        if (status === 'completed' && job.returnvalue) {
          Object.assign(result, {
            downloadUrl: job.returnvalue.downloadUrl,
            fileSize: job.returnvalue.fileSize,
            recordCount: job.returnvalue.recordCount,
            expiresAt: job.returnvalue.expiresAt,
          });
        }

        if (status === 'failed' && job.failedReason) {
          Object.assign(result, {
            error: job.failedReason,
          });
        }

        res.status(200).json({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Check file-based report
        const reportService = ReportService.getInstance();
        const result = await reportService.getReportStatus(reportId);

        if (!result) {
          res.status(404).json({
            success: false,
            error: 'Report not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Get report status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get report status',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/reports/:reportId/download
  static async downloadReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { token, format } = req.query;

      // TODO: Validate download token

      const reportService = ReportService.getInstance();
      const result = await reportService.getReportStatus(reportId);

      if (!result || !result.filePath) {
        res.status(404).json({
          success: false,
          error: 'Report file not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if file exists
      try {
        await fs.access(result.filePath);
      } catch {
        res.status(404).json({
          success: false,
          error: 'Report file no longer available',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const filename = path.basename(result.filePath);
      const mimeType = ExportController.getMimeType(format as string || path.extname(filename));

      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache',
      });

      const fileStream = await fs.readFile(result.filePath);
      res.status(200).send(fileStream);
    } catch (error) {
      logger.error('Download report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download report',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // DELETE /api/v1/reports/:reportId
  static async deleteReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;

      const reportService = ReportService.getInstance();
      const deleted = await reportService.deleteReport(reportId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Report not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Report deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Delete report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete report',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Direct export endpoints for small datasets

  // GET /api/v1/exports/games
  static async exportGames(req: AuthenticatedRequest, res: Response): Promise<void> {
    await ExportController.handleDirectExport('games', req, res);
  }

  // GET /api/v1/exports/teams
  static async exportTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    await ExportController.handleDirectExport('teams', req, res);
  }

  // GET /api/v1/exports/players
  static async exportPlayers(req: AuthenticatedRequest, res: Response): Promise<void> {
    await ExportController.handleDirectExport('players', req, res);
  }

  // GET /api/v1/exports/standings
  static async exportStandings(req: AuthenticatedRequest, res: Response): Promise<void> {
    await ExportController.handleDirectExport('standings', req, res);
  }

  // GET /api/v1/exports/officials
  static async exportOfficials(req: AuthenticatedRequest, res: Response): Promise<void> {
    await ExportController.handleDirectExport('officials', req, res);
  }

  // GET /api/v1/exports/venues
  static async exportVenues(req: AuthenticatedRequest, res: Response): Promise<void> {
    await ExportController.handleDirectExport('venues', req, res);
  }

  // Analytics endpoints

  // GET /api/v1/analytics/games
  static async getGameAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { start_date, end_date, season_id } = req.query;

      // Mock analytics data
      const analytics = {
        totalGames: 156,
        completedGames: 142,
        cancelledGames: 8,
        upcomingGames: 6,
        averageScore: 68.5,
        highestScoringGame: {
          homeTeam: 'Eagles',
          awayTeam: 'Hawks',
          homeScore: 92,
          awayScore: 88,
          date: new Date().toISOString(),
        },
        gamesByType: {
          regular: 140,
          playoff: 12,
          championship: 4,
        },
        gamesByVenue: [
          { venue: 'Main Gym', games: 78 },
          { venue: 'East Gym', games: 56 },
          { venue: 'West Gym', games: 22 },
        ],
        trendsOverTime: [], // Would contain time series data
      };

      res.status(200).json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get game analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get game analytics',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/analytics/teams
  static async getTeamAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Mock team analytics
      const analytics = {
        totalTeams: 24,
        activeTeams: 22,
        averagePlayersPerTeam: 11.5,
        teamPerformance: [
          { team: 'Eagles', wins: 8, losses: 2, winPercentage: 0.8 },
          { team: 'Hawks', wins: 7, losses: 3, winPercentage: 0.7 },
        ],
        divisionBreakdown: [
          { division: 'U12 Boys', teams: 8 },
          { division: 'U12 Girls', teams: 6 },
          { division: 'U14 Boys', teams: 10 },
        ],
      };

      res.status(200).json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get team analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get team analytics',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/analytics/officials
  static async getOfficialsAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Mock officials analytics
      const analytics = {
        totalOfficials: 15,
        activeOfficials: 12,
        totalGamesWorked: 284,
        averageGamesPerOfficial: 18.9,
        totalPayouts: 12750.00,
        officialsByLevel: {
          beginner: 3,
          intermediate: 6,
          advanced: 4,
          expert: 2,
        },
        topOfficials: [
          { name: 'John Smith', gamesWorked: 28, totalPay: 1260.00, rating: 4.8 },
          { name: 'Jane Doe', gamesWorked: 32, totalPay: 1600.00, rating: 4.9 },
        ],
      };

      res.status(200).json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get officials analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get officials analytics',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/analytics/financial
  static async getFinancialAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Mock financial analytics
      const analytics = {
        totalRevenue: 45000.00,
        totalExpenses: 18750.00,
        netProfit: 26250.00,
        revenueBySource: {
          registrations: 35000.00,
          merchandise: 5000.00,
          concessions: 3000.00,
          sponsorships: 2000.00,
        },
        expensesByCategory: {
          officials: 12750.00,
          venues: 4000.00,
          equipment: 1500.00,
          administration: 500.00,
        },
        profitMargin: 0.583,
        trendsOverTime: [], // Would contain time series data
      };

      res.status(200).json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get financial analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get financial analytics',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // POST /api/v1/exports/batch
  static async createBatchExport(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const { exports, compressionFormat = 'zip' } = req.body;
      const batchId = uuidv4();

      // TODO: Implement actual batch processing
      res.status(202).json({
        success: true,
        data: {
          batchId,
          status: 'PROCESSING',
          totalExports: exports.length,
          statusUrl: `/api/v1/exports/batch/${batchId}/status`,
        },
        message: 'Batch export started',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Create batch export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create batch export',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/exports/batch/:batchId/status
  static async getBatchStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;

      // TODO: Implement actual batch status checking
      const mockStatus = {
        batchId,
        status: 'COMPLETED',
        totalExports: 3,
        completedExports: 3,
        failedExports: 0,
        downloadUrl: `/api/v1/exports/batch/${batchId}/download`,
        expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)),
      };

      res.status(200).json({
        success: true,
        data: mockStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Get batch status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get batch status',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // GET /api/v1/exports/batch/:batchId/download
  static async downloadBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;

      // TODO: Implement actual batch download
      res.status(501).json({
        success: false,
        error: 'Batch download not yet implemented',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Download batch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download batch',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Helper methods

  private static async handleDirectExport(reportType: string, req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { format = 'CSV', ...queryParams } = req.query;

      const parameters: ReportParameters = {
        format: format as 'CSV' | 'JSON' | 'PDF' | 'XLSX',
        timezone: 'America/Phoenix',
        maxRows: 5000, // Limit direct exports
        ...queryParams,
      };

      const reportService = ReportService.getInstance();
      const result = await reportService.generateReport(reportType, parameters, organizationId, req.userId!);

      if (result.status === 'FAILED') {
        res.status(500).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Stream the file directly
      if (result.filePath) {
        const filename = path.basename(result.filePath);
        const mimeType = ExportController.getMimeType(parameters.format);

        res.set({
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, no-cache',
        });

        const fileStream = await fs.readFile(result.filePath);
        res.status(200).send(fileStream);

        // Clean up the temporary file after sending
        setTimeout(async () => {
          try {
            await fs.unlink(result.filePath!);
          } catch (error) {
            logger.warn('Failed to cleanup temporary file', { filePath: result.filePath, error });
          }
        }, 1000);
      } else {
        res.status(500).json({
          success: false,
          error: 'File generation failed',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error(`Direct export ${reportType} error:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to export ${reportType}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private static async estimateReportSize(reportType: string, parameters: ReportParameters, organizationId: string): Promise<number> {
    // Mock estimation logic - in practice, query database for count
    const baseSizes: Record<string, number> = {
      games: 500,
      teams: 50,
      players: 300,
      standings: 25,
      officials: 20,
      financial: 200,
      venues: 10,
      attendance: 100,
    };

    return baseSizes[reportType] || 100;
  }

  private static getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'CSV': 'text/csv',
      'JSON': 'application/json',
      'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'PDF': 'application/pdf',
      'csv': 'text/csv',
      'json': 'application/json',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'pdf': 'application/pdf',
    };

    return mimeTypes[format] || 'application/octet-stream';
  }
}

// Apply validation middleware to routes
ExportController.generateReport = [
  ...reportGenerationValidation,
  ExportController.generateReport,
] as any;

ExportController.createBatchExport = [
  ...batchExportValidation,
  ExportController.createBatchExport,
] as any;

ExportController.getReportStatus = [
  param('reportId').isString().isLength({ min: 1 }).withMessage('Report ID is required'),
  ExportController.getReportStatus,
] as any;

ExportController.downloadReport = [
  param('reportId').isString().isLength({ min: 1 }).withMessage('Report ID is required'),
  ExportController.downloadReport,
] as any;

ExportController.deleteReport = [
  param('reportId').isString().isLength({ min: 1 }).withMessage('Report ID is required'),
  ExportController.deleteReport,
] as any;

ExportController.getBatchStatus = [
  param('batchId').isUUID().withMessage('Batch ID must be a valid UUID'),
  ExportController.getBatchStatus,
] as any;

ExportController.downloadBatch = [
  param('batchId').isUUID().withMessage('Batch ID must be a valid UUID'),
  ExportController.downloadBatch,
] as any;