import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';

import { AuthController } from './controllers/auth.controller';
import { 
  authenticate, 
  extractTenant,
  authRateLimit,
  registrationRateLimit,
  passwordResetRateLimit,
  requireAdmin,
  requireCoach,
  requireParent,
  requirePlayer,
  coppaCompliance,
  authErrorHandler,
} from './middleware/auth.middleware';
import { initializeConnections, closeConnections, logger } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
    'X-MFA-Token',
    'X-Device-ID',
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
app.use(extractTenant());

// Health check endpoint (no authentication required)
app.get('/health', AuthController.healthCheck);
app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'auth-service',
  });
});

// API versioning
const v1Router = express.Router();

// Public endpoints (no authentication required)
v1Router.post('/register', registrationRateLimit, AuthController.register);
v1Router.post('/login', authRateLimit, AuthController.login);
v1Router.post('/refresh-token', AuthController.refreshToken);

// Password reset endpoints
v1Router.post('/forgot-password', passwordResetRateLimit, async (req, res) => {
  // TODO: Implement password reset functionality
  res.status(501).json({ message: 'Password reset functionality not yet implemented' });
});
v1Router.post('/reset-password', async (req, res) => {
  // TODO: Implement password reset functionality
  res.status(501).json({ message: 'Password reset functionality not yet implemented' });
});

// Email verification endpoints
v1Router.post('/resend-verification', authRateLimit, async (req, res) => {
  // TODO: Implement email verification functionality
  res.status(501).json({ message: 'Email verification functionality not yet implemented' });
});
v1Router.get('/verify-email/:token', async (req, res) => {
  // TODO: Implement email verification functionality
  res.status(501).json({ message: 'Email verification functionality not yet implemented' });
});

// COPPA compliance endpoints
v1Router.post('/parental-consent', AuthController.requestParentalConsent);
v1Router.post('/parental-consent/:consentId/verify', AuthController.verifyParentalConsent);

// Protected endpoints (authentication required)
const protectedRouter = express.Router();

// Apply authentication middleware to all protected routes
protectedRouter.use(authenticate());
protectedRouter.use(coppaCompliance());

// User profile endpoints
protectedRouter.get('/profile', AuthController.getProfile);
protectedRouter.put('/profile', AuthController.updateProfile);
protectedRouter.post('/logout', AuthController.logout);
protectedRouter.post('/change-password', AuthController.changePassword);

// MFA endpoints (adults only)
protectedRouter.post('/mfa/enable', AuthController.enableMFA);
protectedRouter.post('/mfa/verify', AuthController.verifyMFA);
protectedRouter.post('/mfa/disable', async (req, res) => {
  // TODO: Implement MFA disable functionality
  res.status(501).json({ message: 'MFA disable functionality not yet implemented' });
});

// Session management endpoints
protectedRouter.get('/sessions', async (req, res) => {
  // TODO: Implement session list functionality
  res.status(501).json({ message: 'Session management functionality not yet implemented' });
});
protectedRouter.delete('/sessions/:sessionId', async (req, res) => {
  // TODO: Implement session revoke functionality
  res.status(501).json({ message: 'Session management functionality not yet implemented' });
});
protectedRouter.delete('/sessions', async (req, res) => {
  // TODO: Implement revoke all sessions functionality
  res.status(501).json({ message: 'Session management functionality not yet implemented' });
});

// Admin endpoints
const adminRouter = express.Router();
adminRouter.use(requireAdmin);

// User management endpoints (admin only)
adminRouter.get('/users', async (req, res) => {
  // TODO: Implement user list functionality
  res.status(501).json({ message: 'User management functionality not yet implemented' });
});
adminRouter.get('/users/:userId', async (req, res) => {
  // TODO: Implement get user functionality
  res.status(501).json({ message: 'User management functionality not yet implemented' });
});
adminRouter.put('/users/:userId', async (req, res) => {
  // TODO: Implement update user functionality
  res.status(501).json({ message: 'User management functionality not yet implemented' });
});
adminRouter.delete('/users/:userId', async (req, res) => {
  // TODO: Implement delete user functionality
  res.status(501).json({ message: 'User management functionality not yet implemented' });
});

// Tenant management endpoints (system admin only)
adminRouter.post('/tenants', async (req, res) => {
  // TODO: Implement tenant creation functionality
  res.status(501).json({ message: 'Tenant management functionality not yet implemented' });
});
adminRouter.get('/tenants', async (req, res) => {
  // TODO: Implement tenant list functionality
  res.status(501).json({ message: 'Tenant management functionality not yet implemented' });
});

// Audit and compliance endpoints (admin only)
adminRouter.get('/audit-logs', async (req, res) => {
  // TODO: Implement audit log functionality
  res.status(501).json({ message: 'Audit log functionality not yet implemented' });
});
adminRouter.get('/compliance-report', async (req, res) => {
  // TODO: Implement compliance reporting functionality
  res.status(501).json({ message: 'Compliance reporting functionality not yet implemented' });
});

// Mount routers
v1Router.use('/auth', protectedRouter);
v1Router.use('/admin', adminRouter);
app.use('/api/v1', v1Router);

// Error handling middleware
app.use(authErrorHandler);

// Generic error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
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

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Auth service started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check available at: http://localhost:${PORT}/health`);
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