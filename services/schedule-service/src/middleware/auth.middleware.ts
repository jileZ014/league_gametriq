import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../config/database';

// Extended request interface with tenant and user information
export interface AuthenticatedRequest extends Request {
  tenantId?: string;
  userId?: string;
  userRoles?: string[];
  organizationId?: string;
  featureFlags?: Record<string, boolean>;
}

// Tenant extraction middleware
export const tenantMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Extract tenant ID from headers or subdomain
    const tenantId = req.headers['x-tenant-id'] as string || 
                     req.headers['x-organization-id'] as string ||
                     extractTenantFromHost(req.get('host') || '');

    if (!tenantId && process.env.NODE_ENV === 'production') {
      res.status(400).json({
        error: 'Missing Tenant',
        message: 'Tenant ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.tenantId = tenantId || 'default';
    req.organizationId = tenantId || 'default';
    
    logger.debug('Tenant extracted', { 
      tenantId: req.tenantId,
      host: req.get('host'),
      userAgent: req.get('user-agent')
    });

    next();
  } catch (error) {
    logger.error('Tenant extraction error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to extract tenant information',
      timestamp: new Date().toISOString(),
    });
  }
};

// Extract tenant from host (subdomain-based multi-tenancy)
function extractTenantFromHost(host: string): string {
  const parts = host.split('.');
  if (parts.length >= 3 && !['www', 'api', 'app'].includes(parts[0])) {
    return parts[0];
  }
  return '';
}

// Authentication middleware (simplified for schedule service)
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Bearer token is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // In a real implementation, you would:
    // 1. Verify JWT token
    // 2. Extract user ID and roles
    // 3. Check token expiration
    // 4. Validate against auth service
    
    // For now, we'll extract from a simple token format or make auth service call
    const decodedToken = await verifyToken(token);
    
    if (!decodedToken) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.userId = decodedToken.userId;
    req.userRoles = decodedToken.roles || [];
    
    // Extract feature flags
    req.featureFlags = {
      scheduling_v1: process.env.FEATURE_SCHEDULING_V1 === 'true',
      conflict_detection: process.env.FEATURE_CONFLICT_DETECTION === 'true',
      heat_policy: process.env.FEATURE_HEAT_POLICY === 'true',
    };

    logger.debug('User authenticated', { 
      userId: req.userId,
      roles: req.userRoles,
      tenantId: req.tenantId 
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
      timestamp: new Date().toISOString(),
    });
  }
};

// Token verification (simplified)
async function verifyToken(token: string): Promise<any> {
  try {
    // In production, this would call the auth service or verify JWT
    // For now, return a mock decoded token
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return {
        userId: 'test-user-id',
        roles: ['league.admin'],
        organizationId: 'test-org-id',
        exp: Date.now() + 3600000, // 1 hour
      };
    }

    // TODO: Implement actual JWT verification or auth service call
    // const response = await axios.post(`${process.env.AUTH_SERVICE_URL}/verify`, {
    //   token
    // });
    // return response.data;

    throw new Error('Token verification not implemented for production');
  } catch (error) {
    logger.error('Token verification failed:', error);
    return null;
  }
}

// Role-based access control middleware
export const requireRole = (requiredRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userRoles) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'User roles not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const hasRequiredRole = requiredRoles.some(role => 
      req.userRoles!.includes(role) || 
      req.userRoles!.includes('system.admin') || 
      req.userRoles!.includes('league.admin')
    );

    if (!hasRequiredRole) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required roles: ${requiredRoles.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

// Specific role middleware functions
export const requireAdmin = requireRole(['league.admin', 'system.admin']);
export const requireCoach = requireRole(['team.coach', 'league.admin', 'system.admin']);
export const requireReferee = requireRole(['referee', 'league.admin', 'system.admin']);

// Feature flag middleware
export const requireFeature = (featureName: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.featureFlags || !req.featureFlags[featureName]) {
      res.status(404).json({
        error: 'Feature Not Available',
        message: `Feature '${featureName}' is not enabled`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

// Rate limiting configurations
export const scheduleRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthenticatedRequest) => {
    // Use tenant + user ID for more granular rate limiting
    return `${req.tenantId || 'anonymous'}:${req.userId || req.ip}`;
  },
  skip: (req: AuthenticatedRequest) => {
    // Skip rate limiting for admin users
    return req.userRoles?.includes('system.admin') || false;
  },
});

export const scheduleGenerationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit schedule generation to 10 per hour per tenant
  message: {
    error: 'Too Many Requests',
    message: 'Schedule generation rate limit exceeded. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  keyGenerator: (req: AuthenticatedRequest) => {
    return `schedule_gen:${req.tenantId || 'anonymous'}`;
  },
});

export const conflictCheckRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit conflict checks to 50 per 5 minutes per tenant
  message: {
    error: 'Too Many Requests',
    message: 'Conflict check rate limit exceeded. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  keyGenerator: (req: AuthenticatedRequest) => {
    return `conflict_check:${req.tenantId || 'anonymous'}`;
  },
});

// Validation middleware helpers
export const validateTenant = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.tenantId) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Tenant ID is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

export const validateSeason = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const { seasonId } = req.params;
  
  if (!seasonId) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Season ID is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // TODO: Validate season belongs to tenant
  next();
};

export const validateVenue = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const { venueId } = req.params;
  
  if (!venueId) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Venue ID is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // TODO: Validate venue belongs to tenant
  next();
};