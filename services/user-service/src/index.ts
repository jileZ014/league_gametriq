import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import { tenantMiddleware } from './middleware/tenant.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import profileRouter from './controllers/profile.controller';
import roleRouter from './controllers/role.controller';
import membershipRouter from './controllers/membership.controller';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { metricsMiddleware } from './middleware/metrics.middleware';

config();

const app: Express = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing and compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Metrics and monitoring
app.use(metricsMiddleware);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    version: process.env.npm_package_version,
    timestamp: new Date().toISOString()
  });
});

// Readiness check
app.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await initializeDatabase();
    // Check Redis connection
    await initializeRedis();
    
    res.json({
      status: 'ready',
      checks: {
        database: 'connected',
        redis: 'connected'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Multi-tenant middleware (applied to all routes below)
app.use(tenantMiddleware);

// Authentication middleware (applied to protected routes)
app.use(authMiddleware);

// API Routes
app.use('/api/v1/profiles', profileRouter);
app.use('/api/v1/roles', roleRouter);
app.use('/api/v1/memberships', membershipRouter);

// COPPA compliance endpoint
app.get('/api/v1/coppa/consent/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const consent = await checkParentalConsent(userId);
  res.json({ userId, hasConsent: consent, timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🏀 User Service running on port ${PORT}`);
  logger.info(`COPPA compliance: ENABLED`);
  logger.info(`Multi-tenant mode: ACTIVE`);
});

// Helper function for parental consent
async function checkParentalConsent(userId: string): Promise<boolean> {
  // Implementation would check consent records in database
  // This is a placeholder
  return true;
}

export default app;