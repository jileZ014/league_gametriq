import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';

import { ScheduleController } from './controllers/schedule.controller';
import { PublicController, publicRateLimit } from './controllers/public.controller';
import { OfficialsController } from './controllers/officials.controller';
import { ScheduleGeneratorService } from './services/generator.service';
import { ConflictDetectorService } from './services/conflict-detector.service';
import { OfficialsService } from './services/officials.service';
import { initializeConnections, closeConnections, logger } from './config/database';
import { authMiddleware, tenantMiddleware, scheduleRateLimit } from './middleware/auth.middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }

    // Production CORS configuration
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Tenant-Id',
    'X-Feature-Flag',
  ],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  }));
}

// Tenant extraction middleware (applies to all routes)
app.use(tenantMiddleware);

// Health check endpoint (no authentication required)
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    // TODO: Add database health check
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'schedule-service',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      features: {
        scheduling_v1: process.env.FEATURE_SCHEDULING_V1 === 'true',
        conflict_detection: process.env.FEATURE_CONFLICT_DETECTION === 'true',
        heat_policy: process.env.FEATURE_HEAT_POLICY === 'true',
      },
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'schedule-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'schedule-service',
  });
});

// API versioning
const v1Router = express.Router();

// Apply rate limiting to all v1 routes
v1Router.use(scheduleRateLimit);

// Apply authentication middleware to all protected routes
v1Router.use(authMiddleware);

// Season management endpoints
v1Router.get('/seasons', ScheduleController.getSeasons);
v1Router.post('/seasons', ScheduleController.createSeason);
v1Router.get('/seasons/:seasonId', ScheduleController.getSeason);
v1Router.put('/seasons/:seasonId', ScheduleController.updateSeason);
v1Router.delete('/seasons/:seasonId', ScheduleController.deleteSeason);

// Division management endpoints
v1Router.get('/seasons/:seasonId/divisions', ScheduleController.getDivisions);
v1Router.post('/seasons/:seasonId/divisions', ScheduleController.createDivision);
v1Router.get('/divisions/:divisionId', ScheduleController.getDivision);
v1Router.put('/divisions/:divisionId', ScheduleController.updateDivision);
v1Router.delete('/divisions/:divisionId', ScheduleController.deleteDivision);

// Venue management endpoints
v1Router.get('/venues', ScheduleController.getVenues);
v1Router.post('/venues', ScheduleController.createVenue);
v1Router.get('/venues/:venueId', ScheduleController.getVenue);
v1Router.put('/venues/:venueId', ScheduleController.updateVenue);
v1Router.delete('/venues/:venueId', ScheduleController.deleteVenue);

// Venue availability endpoints
v1Router.get('/venues/:venueId/availability', ScheduleController.getVenueAvailability);
v1Router.post('/venues/:venueId/availability', ScheduleController.setVenueAvailability);
v1Router.put('/venues/:venueId/availability/:availabilityId', ScheduleController.updateVenueAvailability);
v1Router.delete('/venues/:venueId/availability/:availabilityId', ScheduleController.deleteVenueAvailability);

// Schedule generation endpoints
v1Router.post('/seasons/:seasonId/generate-schedule', ScheduleController.generateSchedule);
v1Router.get('/seasons/:seasonId/schedule-preview', ScheduleController.getSchedulePreview);
v1Router.post('/seasons/:seasonId/publish-schedule', ScheduleController.publishSchedule);

// Schedule management endpoints
v1Router.get('/seasons/:seasonId/schedule', ScheduleController.getSchedule);
v1Router.get('/seasons/:seasonId/schedule/calendar', ScheduleController.getCalendarView);
v1Router.get('/seasons/:seasonId/schedule/export/ics', ScheduleController.exportScheduleICS);

// Game scheduling endpoints
v1Router.get('/games/:gameId', ScheduleController.getGame);
v1Router.put('/games/:gameId', ScheduleController.updateGame);
v1Router.post('/games/:gameId/reschedule', ScheduleController.rescheduleGame);
v1Router.delete('/games/:gameId', ScheduleController.cancelGame);

// Conflict detection endpoints
v1Router.post('/schedule/validate', ScheduleController.validateSchedule);
v1Router.get('/conflicts', ScheduleController.getConflicts);
v1Router.post('/conflicts/resolve', ScheduleController.resolveConflicts);

// Blackout dates management
v1Router.get('/seasons/:seasonId/blackout-dates', ScheduleController.getBlackoutDates);
v1Router.post('/seasons/:seasonId/blackout-dates', ScheduleController.createBlackoutDate);
v1Router.delete('/blackout-dates/:blackoutDateId', ScheduleController.deleteBlackoutDate);

// Heat policy endpoints (Phoenix-specific)
v1Router.get('/venues/:venueId/heat-warnings', ScheduleController.getHeatWarnings);
v1Router.post('/games/:gameId/heat-check', ScheduleController.performHeatCheck);

// Reporting endpoints
v1Router.get('/seasons/:seasonId/reports/schedule-utilization', ScheduleController.getScheduleUtilization);
v1Router.get('/seasons/:seasonId/reports/venue-usage', ScheduleController.getVenueUsage);
v1Router.get('/seasons/:seasonId/reports/conflict-summary', ScheduleController.getConflictSummary);

// Officials management endpoints
v1Router.post('/officials', OfficialsController.createOfficial);
v1Router.get('/officials', OfficialsController.getOfficials);
v1Router.get('/officials/:officialId', OfficialsController.getOfficial);
v1Router.put('/officials/:officialId', OfficialsController.updateOfficial);
v1Router.delete('/officials/:officialId', OfficialsController.deleteOfficial);

// Official availability endpoints
v1Router.post('/officials/:officialId/availability', OfficialsController.setAvailability);
v1Router.get('/officials/:officialId/availability', OfficialsController.getAvailability);
v1Router.get('/officials/:officialId/availability-check', OfficialsController.checkAvailability);

// Assignment management endpoints
v1Router.post('/assignments/optimize', OfficialsController.optimizeAssignments);
v1Router.get('/assignments', OfficialsController.getAssignments);
v1Router.put('/assignments/:assignmentId/status', OfficialsController.updateAssignmentStatus);

// Payroll export endpoint
v1Router.get('/payroll/export', OfficialsController.exportPayroll);

// Mount v1 router
app.use('/api/v1', v1Router);

// Public API endpoints (no authentication required)
const publicRouter = express.Router();

// Apply public rate limiting
publicRouter.use(publicRateLimit);

// Public endpoints for external access
publicRouter.get('/:tenantId/standings', PublicController.getStandings);
publicRouter.get('/:tenantId/schedule', PublicController.getSchedule);
publicRouter.get('/:tenantId/teams/:teamId', PublicController.getTeamDetails);
publicRouter.get('/:tenantId/games/:gameId', PublicController.getGameDetails);
publicRouter.get('/:tenantId/calendar.ics', PublicController.getCalendarICS);

// Mount public router
app.use('/public', publicRouter);

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    tenantId: (req as any).tenantId,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown handling
let server: any;

async function startServer(): Promise<void> {
  try {
    // Initialize database connections
    await initializeConnections();
    logger.info('Database connections initialized');

    // Initialize schedule generator service
    await ScheduleGeneratorService.initialize();
    logger.info('Schedule generator service initialized');

    // Initialize conflict detector service
    await ConflictDetectorService.initialize();
    logger.info('Conflict detector service initialized');

    // Initialize officials service
    OfficialsService.getInstance();
    logger.info('Officials service initialized');

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Schedule service started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check available at: http://localhost:${PORT}/health`);
      logger.info('Feature flags:', {
        scheduling_v1: process.env.FEATURE_SCHEDULING_V1 === 'true',
        conflict_detection: process.env.FEATURE_CONFLICT_DETECTION === 'true',
        heat_policy: process.env.FEATURE_HEAT_POLICY === 'true',
      });
    });

    // Handle server errors
    server.on('error', (error: Error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new requests
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Cleanup services
        await ScheduleGeneratorService.shutdown();
        await ConflictDetectorService.shutdown();

        // Close database connections
        await closeConnections();
        logger.info('Database connections closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled promise rejection:', { reason, promise });
  process.exit(1);
});

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default app;
export { startServer, gracefulShutdown };