import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';

import { BracketController } from './controllers/bracket.controller';
import { logger } from './config/database';
import { authMiddleware, tenantMiddleware, gameServiceRateLimit } from './middleware/auth.middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
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
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'game-service',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      features: {
        game_management_v1: process.env.FEATURE_GAME_MANAGEMENT_V1 === 'true',
        bracket_system: process.env.FEATURE_BRACKET_SYSTEM === 'true',
        real_time_scoring: process.env.FEATURE_REAL_TIME_SCORING === 'true',
        websocket_support: process.env.FEATURE_WEBSOCKET_SUPPORT === 'true',
      },
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'game-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'game-service',
  });
});

// API versioning
const v1Router = express.Router();

// Apply rate limiting to all v1 routes
v1Router.use(gameServiceRateLimit);

// Apply authentication middleware to all protected routes
v1Router.use(authMiddleware);

// Bracket management endpoints
v1Router.post('/brackets', BracketController.createBracket);
v1Router.get('/brackets', BracketController.getBrackets);
v1Router.get('/brackets/:bracketId', BracketController.getBracket);
v1Router.delete('/brackets/:bracketId', BracketController.deleteBracket);
v1Router.get('/brackets/:bracketId/visualization', BracketController.getBracketVisualization);
v1Router.post('/brackets/:bracketId/games/:gameId/result', BracketController.updateGameResult);
v1Router.get('/brackets/:bracketId/conflicts', BracketController.detectConflicts);
v1Router.put('/brackets/:bracketId/schedule', BracketController.rescheduleBracket);
v1Router.post('/brackets/:bracketId/simulate', BracketController.simulateBracket);

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

// Graceful shutdown handling
let server: any;

async function startServer(): Promise<void> {
  try {
    // TODO: Initialize database connections
    logger.info('Database connections would be initialized here');

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Game service started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check available at: http://localhost:${PORT}/health`);
      logger.info('Feature flags:', {
        game_management_v1: process.env.FEATURE_GAME_MANAGEMENT_V1 === 'true',
        bracket_system: process.env.FEATURE_BRACKET_SYSTEM === 'true',
        real_time_scoring: process.env.FEATURE_REAL_TIME_SCORING === 'true',
        websocket_support: process.env.FEATURE_WEBSOCKET_SUPPORT === 'true',
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
        // TODO: Close database connections
        logger.info('Database connections would be closed here');

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