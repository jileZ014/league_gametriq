import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RegistrationController } from './controllers/registration.controller';
import { authMiddleware } from './middleware/auth.middleware';
import { logger } from './config/database';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: any;
      jwtPayload?: any;
    }
  }
}

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3004;

// Initialize controller
const registrationController = new RegistrationController();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'registration-service',
    timestamp: new Date().toISOString()
  });
});

// Registration routes
const registrationRouter = express.Router();

// Public routes (no auth required for initial registration)
registrationRouter.post('/orders', registrationController.createOrder.bind(registrationController));

// Protected routes
registrationRouter.use(authMiddleware);

registrationRouter.get('/orders/:orderId', registrationController.getOrder.bind(registrationController));
registrationRouter.put('/orders/:orderId', registrationController.updateOrder.bind(registrationController));
registrationRouter.post('/orders/:orderId/discount', registrationController.applyDiscount.bind(registrationController));
registrationRouter.post('/orders/:orderId/waivers', registrationController.signWaiver.bind(registrationController));
registrationRouter.get('/orders/:orderId/waivers', registrationController.getOrderWaivers.bind(registrationController));
registrationRouter.get('/orders/:orderId/audit', registrationController.getOrderAuditTrail.bind(registrationController));
registrationRouter.post('/orders/:orderId/cancel', registrationController.cancelOrder.bind(registrationController));
registrationRouter.get('/orders/:orderId/coppa-compliance', registrationController.checkCOPPACompliance.bind(registrationController));

// User registration history
registrationRouter.get('/users/:userId/registrations', registrationController.getUserRegistrations.bind(registrationController));

// Mount routes
app.use('/api/v1/registration', registrationRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Registration service started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});