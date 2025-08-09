import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { logger } from '../config/database';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  organizationId?: string;
  tenantId?: string;
  userRole?: string;
  permissions?: string[];
}

// Rate limiting for game service endpoints
export const gameServiceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use tenant ID + IP for rate limiting
    const tenantId = (req as AuthenticatedRequest).tenantId || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `${tenantId}:${ip}`;
  },
});

/**
 * Middleware to extract tenant information from request
 */
export const tenantMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Extract tenant ID from header or URL parameter
    const tenantId = req.headers['x-tenant-id'] as string || 
                    req.params.tenantId || 
                    req.query.tenantId as string;

    if (tenantId) {
      req.tenantId = tenantId;
      
      // Validate UUID format for tenant ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid tenant ID format',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Tenant middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Authentication middleware for protected endpoints
 */
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid Bearer token in the Authorization header',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Extract user information from token
      req.userId = decoded.sub || decoded.userId;
      req.organizationId = decoded.organizationId || decoded.org_id;
      req.userRole = decoded.role;
      req.permissions = decoded.permissions || [];

      // Validate required fields
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Invalid token: missing user ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!req.organizationId) {
        res.status(401).json({
          success: false,
          error: 'Invalid token: missing organization ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Set tenant ID if not already set
      if (!req.tenantId) {
        req.tenantId = req.organizationId;
      }

      // Validate tenant access
      if (req.tenantId && req.organizationId !== req.tenantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied: tenant mismatch',
          message: 'You do not have access to this tenant',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.debug('User authenticated', {
        userId: req.userId,
        organizationId: req.organizationId,
        tenantId: req.tenantId,
        role: req.userRole,
        endpoint: `${req.method} ${req.path}`,
      });

      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (jwtError instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'The provided token is invalid.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      throw jwtError; // Re-throw unexpected errors
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient privileges',
        message: `This endpoint requires one of the following roles: ${allowedRoles.join(', ')}`,
        userRole: req.userRole,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  };
};

/**
 * Permission-based access control middleware
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.permissions || !req.permissions.includes(permission)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This endpoint requires the '${permission}' permission`,
        userPermissions: req.permissions,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  };
};

/**
 * Organization admin access control
 */
export const requireOrgAdmin = requireRole(['ORGANIZATION_ADMIN', 'SUPER_ADMIN']);

/**
 * League admin access control
 */
export const requireLeagueAdmin = requireRole(['LEAGUE_ADMIN', 'ORGANIZATION_ADMIN', 'SUPER_ADMIN']);

/**
 * Content management permissions
 */
export const requireContentManagement = requirePermission('content:manage');

/**
 * Game management permissions
 */
export const requireGameManagement = requirePermission('games:manage');

/**
 * Bracket management permissions
 */
export const requireBracketManagement = requirePermission('brackets:manage');