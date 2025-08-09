import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';
import Queue from 'bull';

import { ExportController } from './controllers/export.controller';
import { ReportService } from './services/report.service';
import { initializeConnections, closeConnections, logger } from './config/database';
import { authMiddleware, tenantMiddleware, reportingRateLimit } from './middleware/auth.middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

// Initialize Bull queue for async report generation
const reportQueue = new Queue('report generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

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
    const queueHealth = await reportQueue.checkHealth();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'reporting-service',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      queue: {
        waiting: await reportQueue.getWaiting().then(jobs => jobs.length),
        active: await reportQueue.getActive().then(jobs => jobs.length),
        completed: await reportQueue.getCompleted().then(jobs => jobs.length),
        failed: await reportQueue.getFailed().then(jobs => jobs.length),
      },
      features: {
        csv_export: process.env.FEATURE_CSV_EXPORT === 'true',
        json_export: process.env.FEATURE_JSON_EXPORT === 'true',
        pdf_export: process.env.FEATURE_PDF_EXPORT === 'true',
        async_processing: process.env.FEATURE_ASYNC_PROCESSING === 'true',
        s3_storage: process.env.FEATURE_S3_STORAGE === 'true',
      },
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'reporting-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'reporting-service',
  });
});

// API versioning
const v1Router = express.Router();

// Apply rate limiting to all v1 routes
v1Router.use(reportingRateLimit);

// Apply authentication middleware to all protected routes
v1Router.use(authMiddleware);

// Report generation endpoints
v1Router.post('/reports/generate', ExportController.generateReport);
v1Router.get('/reports/:reportId/status', ExportController.getReportStatus);
v1Router.get('/reports/:reportId/download', ExportController.downloadReport);
v1Router.delete('/reports/:reportId', ExportController.deleteReport);

// Direct export endpoints (for small datasets)
v1Router.get('/exports/games', ExportController.exportGames);
v1Router.get('/exports/teams', ExportController.exportTeams);
v1Router.get('/exports/players', ExportController.exportPlayers);
v1Router.get('/exports/standings', ExportController.exportStandings);
v1Router.get('/exports/officials', ExportController.exportOfficials);
v1Router.get('/exports/venues', ExportController.exportVenues);

// Analytics endpoints
v1Router.get('/analytics/games', ExportController.getGameAnalytics);
v1Router.get('/analytics/teams', ExportController.getTeamAnalytics);
v1Router.get('/analytics/officials', ExportController.getOfficialsAnalytics);
v1Router.get('/analytics/financial', ExportController.getFinancialAnalytics);

// Batch export endpoints
v1Router.post('/exports/batch', ExportController.createBatchExport);
v1Router.get('/exports/batch/:batchId/status', ExportController.getBatchStatus);
v1Router.get('/exports/batch/:batchId/download', ExportController.downloadBatch);

// Mount v1 router
app.use('/api/v1', v1Router);

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

// Process report queue jobs
reportQueue.process('generateReport', async (job) => {
  const { reportType, parameters, organizationId, requestedBy } = job.data;
  
  try {
    logger.info('Processing report generation job', {
      jobId: job.id,
      reportType,
      organizationId,
      requestedBy,
    });

    const reportService = ReportService.getInstance();
    const result = await reportService.generateReport(reportType, parameters, organizationId, requestedBy);

    logger.info('Report generation completed', {
      jobId: job.id,
      reportType,
      success: true,
      filePath: result.filePath,
    });

    return result;
  } catch (error) {
    logger.error('Report generation failed', {
      jobId: job.id,
      reportType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
});

// Queue event handlers
reportQueue.on('completed', (job, result) => {
  logger.info('Report job completed', { jobId: job.id, result });
});

reportQueue.on('failed', (job, error) => {
  logger.error('Report job failed', { jobId: job.id, error: error.message });
});

reportQueue.on('stalled', (job) => {
  logger.warn('Report job stalled', { jobId: job.id });
});

// Graceful shutdown handling
let server: any;

async function startServer(): Promise<void> {
  try {
    // Initialize database connections
    await initializeConnections();
    logger.info('Database connections initialized');

    // Initialize report service
    await ReportService.initialize();
    logger.info('Report service initialized');

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Reporting service started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check available at: http://localhost:${PORT}/health`);
      logger.info('Feature flags:', {
        csv_export: process.env.FEATURE_CSV_EXPORT === 'true',
        json_export: process.env.FEATURE_JSON_EXPORT === 'true',
        pdf_export: process.env.FEATURE_PDF_EXPORT === 'true',
        async_processing: process.env.FEATURE_ASYNC_PROCESSING === 'true',
        s3_storage: process.env.FEATURE_S3_STORAGE === 'true',
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
        // Close queue
        await reportQueue.close();
        logger.info('Report queue closed');

        // Cleanup report service
        await ReportService.shutdown();

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
export { startServer, gracefulShutdown, reportQueue };