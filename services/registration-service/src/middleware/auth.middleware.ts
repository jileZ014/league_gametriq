import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/database';

interface JWTPayload {
  userId: string;
  tenantId: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

/**
 * Auth middleware to verify JWT tokens
 * In production, this would verify the JWT token and extract user information
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication Required',
        message: 'No valid authentication token provided'
      });
      return;
    }

    const token = authHeader.substring(7);

    // In production, this would:
    // 1. Verify the JWT token signature
    // 2. Check token expiration
    // 3. Check token blacklist
    // 4. Extract user information
    // 5. Verify user permissions

    // For now, mock implementation
    try {
      // Mock JWT verification
      const payload: JWTPayload = {
        userId: 'user123',
        tenantId: req.headers['x-tenant-id'] as string || 'default',
        role: 'PARENT',
        sessionId: 'session123',
        iat: Date.now() - 3600000,
        exp: Date.now() + 3600000
      };

      // Check token expiration
      if (payload.exp < Date.now()) {
        res.status(401).json({
          error: 'Token Expired',
          message: 'Authentication token has expired'
        });
        return;
      }

      // Attach user information to request
      req.user = {
        id: payload.userId,
        role: payload.role
      };
      req.tenantId = payload.tenantId;
      req.jwtPayload = payload;

      logger.info('Request authenticated', {
        user_id: payload.userId,
        tenant_id: payload.tenantId,
        path: req.path
      });

      next();

    } catch (error) {
      logger.error('JWT verification failed:', error);
      res.status(401).json({
        error: 'Invalid Token',
        message: 'Authentication token is invalid'
      });
      return;
    }

  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication Error',
      message: 'An error occurred during authentication'
    });
  }
}

/**
 * Role-based access control middleware
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      res.status(401).json({
        error: 'Authentication Required',
        message: 'User not authenticated'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Access Denied',
        message: 'You do not have permission to access this resource'
      });
      return;
    }

    next();
  };
}

/**
 * Tenant isolation middleware
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenantId) {
    res.status(400).json({
      error: 'Tenant Required',
      message: 'Tenant ID is required for this operation'
    });
    return;
  }

  next();
}