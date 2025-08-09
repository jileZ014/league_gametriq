import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from '../services/jwt.service';
import { UserModel, User } from '../models/user.model';
import { COPPAService } from '../services/coppa.service';
import { logger } from '../config/database';
import rateLimit from 'express-rate-limit';

// Extend Express Request type to include user and tenant information
declare global {
  namespace Express {
    interface Request {
      user?: User;
      jwtPayload?: JWTPayload;
      tenantId?: string;
      isMinor?: boolean;
      deviceFingerprint?: string;
    }
  }
}

export interface AuthOptions {
  optional?: boolean;
  roles?: User['role'][];
  minAge?: number;
  requireMFA?: boolean;
  requireEmailVerification?: boolean;
  allowMinors?: boolean;
  requireParentalConsent?: boolean;
}

/**
 * Main authentication middleware
 */
export function authenticate(options: AuthOptions = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        if (options.optional) {
          return next();
        }
        return sendAuthError(res, 'Missing or invalid authorization header', 401);
      }

      const token = authHeader.substring(7);
      
      // Validate token format
      if (!JWTService.isValidTokenFormat(token)) {
        if (options.optional) {
          return next();
        }
        return sendAuthError(res, 'Invalid token format', 401);
      }

      // Verify and decode token
      const jwtPayload = await JWTService.verifyAccessToken(token);
      if (!jwtPayload) {
        if (options.optional) {
          return next();
        }
        return sendAuthError(res, 'Invalid or expired token', 401);
      }

      // Get user from database
      const user = await UserModel.findById(jwtPayload.tenantId, jwtPayload.userId);
      if (!user) {
        return sendAuthError(res, 'User not found', 401);
      }

      // Check user status
      if (user.status !== 'ACTIVE') {
        return sendAuthError(res, `Account is ${user.status.toLowerCase()}`, 403);
      }

      // Check role permissions
      if (options.roles && !options.roles.includes(user.role)) {
        return sendAuthError(res, 'Insufficient permissions', 403);
      }

      // Check age requirements
      if (options.minAge && user.age < options.minAge) {
        return sendAuthError(res, `Minimum age requirement not met (${options.minAge})`, 403);
      }

      // Check minor restrictions
      if (user.age < 13 && !options.allowMinors) {
        return sendAuthError(res, 'Access restricted for users under 13', 403);
      }

      // Check MFA requirement
      if (options.requireMFA && !user.mfa_enabled && user.age >= 18) {
        return sendAuthError(res, 'Multi-factor authentication required', 403);
      }

      // Check email verification requirement
      if (options.requireEmailVerification && !user.email_verified) {
        return sendAuthError(res, 'Email verification required', 403);
      }

      // Check parental consent for minors
      if (options.requireParentalConsent && user.age < 13) {
        const consentCheck = await COPPAService.checkParentalConsent(jwtPayload.tenantId, user.id);
        if (!consentCheck.hasValidConsent) {
          return sendAuthError(res, 'Parental consent required', 403);
        }
      }

      // Create device fingerprint
      const deviceFingerprint = JWTService.createDeviceFingerprint(
        req.headers['user-agent'],
        req.headers['accept-language'] as string
      );

      // Attach user information to request
      req.user = user;
      req.jwtPayload = jwtPayload;
      req.tenantId = jwtPayload.tenantId;
      req.isMinor = user.age < 13;
      req.deviceFingerprint = deviceFingerprint;

      // Log successful authentication
      logger.debug(`User authenticated: ${user.id} (${user.email})`);

      next();
    } catch (error) {
      logger.error('Authentication middleware error:', error);
      return sendAuthError(res, 'Authentication failed', 500);
    }
  };
}

/**
 * Middleware to extract tenant ID from request
 */
export function extractTenant(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract tenant ID from subdomain, header, or path parameter
    const tenantId = 
      req.headers['x-tenant-id'] as string ||
      req.params.tenantId ||
      extractTenantFromSubdomain(req.hostname) ||
      'default';

    req.tenantId = tenantId;
    next();
  };
}

/**
 * Middleware to check specific permissions
 */
export function requirePermission(permission: string): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return sendAuthError(res, 'Authentication required', 401);
    }

    // Check if user has required permission (would be expanded based on RBAC system)
    const hasPermission = await checkUserPermission(req.user, permission);
    if (!hasPermission) {
      return sendAuthError(res, `Permission '${permission}' required`, 403);
    }

    next();
  };
}

/**
 * Middleware for COPPA compliance checks
 */
export function coppaCompliance(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.tenantId) {
      return next();
    }

    // Check if user is a minor
    if (req.user.age < 13) {
      // Verify parental consent for data access
      const consentCheck = await COPPAService.checkParentalConsent(req.tenantId, req.user.id);
      
      if (!consentCheck.hasValidConsent) {
        return sendAuthError(res, 'Valid parental consent required', 403);
      }

      // Add COPPA context to request
      req.isMinor = true;
      
      // Log COPPA-protected access
      logger.info(`COPPA-protected user access: ${req.user.id} - ${req.method} ${req.path}`);
    }

    next();
  };
}

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and system requests
    return req.path === '/health' || req.headers['x-system-request'] === 'true';
  },
});

/**
 * More strict rate limiting for registration endpoints
 */
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    error: 'Too many registration attempts',
    message: 'Please try again in an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting for password reset requests
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour per IP
  message: {
    error: 'Too many password reset attempts',
    message: 'Please try again in an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware to validate MFA token
 */
export function validateMFA(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.tenantId) {
      return sendAuthError(res, 'Authentication required', 401);
    }

    // Check if MFA is enabled for user
    if (!req.user.mfa_enabled) {
      return next(); // MFA not enabled, skip validation
    }

    // Extract MFA token from request
    const mfaToken = req.headers['x-mfa-token'] as string || req.body.mfaToken;
    if (!mfaToken) {
      return sendAuthError(res, 'MFA token required', 401);
    }

    // Verify MFA token
    const isValidMFA = await UserModel.verifyMFA(req.tenantId, req.user.id, mfaToken);
    if (!isValidMFA) {
      return sendAuthError(res, 'Invalid MFA token', 401);
    }

    logger.info(`MFA validated for user ${req.user.id}`);
    next();
  };
}

/**
 * Middleware to check session validity
 */
export function validateSession(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.jwtPayload) {
      return sendAuthError(res, 'Valid session required', 401);
    }

    // Check if session still exists in database
    const session = await UserModel.findSessionByRefreshToken(
      req.jwtPayload.tenantId,
      req.jwtPayload.sessionId
    );

    if (!session || !session.is_active) {
      return sendAuthError(res, 'Session expired or invalid', 401);
    }

    next();
  };
}

/**
 * Middleware for admin-only access
 */
export const requireAdmin = authenticate({
  roles: ['SYSTEM_ADMIN', 'ORG_ADMIN'],
  requireEmailVerification: true,
  requireMFA: false, // Will be enforced by user age check in authenticate
});

/**
 * Middleware for coach access
 */
export const requireCoach = authenticate({
  roles: ['COACH', 'ASSISTANT_COACH', 'LEAGUE_ADMIN', 'ORG_ADMIN', 'SYSTEM_ADMIN'],
  requireEmailVerification: true,
  minAge: 18,
});

/**
 * Middleware for parent access
 */
export const requireParent = authenticate({
  roles: ['PARENT'],
  requireEmailVerification: true,
});

/**
 * Middleware for player access (including minors)
 */
export const requirePlayer = authenticate({
  roles: ['PLAYER'],
  allowMinors: true,
  requireParentalConsent: true,
});

// Helper functions

function sendAuthError(res: Response, message: string, status: number): void {
  res.status(status).json({
    error: 'Authentication Error',
    message,
    timestamp: new Date().toISOString(),
  });
}

function extractTenantFromSubdomain(hostname: string): string | null {
  // Extract tenant from subdomain (e.g., phoenix.gametriq.com -> phoenix)
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0];
  }
  return null;
}

async function checkUserPermission(user: User, permission: string): Promise<boolean> {
  // Simple role-based permission checking
  // In a full implementation, this would use a more sophisticated RBAC system
  const rolePermissions: Record<string, string[]> = {
    'SYSTEM_ADMIN': ['*'], // All permissions
    'ORG_ADMIN': [
      'users.read', 'users.write', 'users.delete',
      'leagues.read', 'leagues.write', 'leagues.delete',
      'teams.read', 'teams.write', 'teams.delete',
      'games.read', 'games.write',
    ],
    'LEAGUE_ADMIN': [
      'leagues.read', 'leagues.write',
      'teams.read', 'teams.write',
      'games.read', 'games.write',
      'players.read',
    ],
    'COACH': [
      'teams.read',
      'players.read',
      'games.read', 'games.write',
    ],
    'ASSISTANT_COACH': [
      'teams.read',
      'players.read',
      'games.read',
    ],
    'PARENT': [
      'children.read',
      'games.read',
      'teams.read',
    ],
    'PLAYER': [
      'profile.read', 'profile.write',
      'teams.read',
      'games.read',
    ],
    'REFEREE': [
      'games.read', 'games.write',
    ],
    'SCOREKEEPER': [
      'games.read', 'games.write',
    ],
    'VOLUNTEER': [
      'games.read',
    ],
  };

  const userPermissions = rolePermissions[user.role] || [];
  
  // Check for wildcard permission
  if (userPermissions.includes('*')) {
    return true;
  }

  // Check for specific permission
  return userPermissions.includes(permission);
}

/**
 * Error handler for authentication errors
 */
export function authErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error.name === 'JsonWebTokenError') {
    return sendAuthError(res, 'Invalid token', 401);
  }

  if (error.name === 'TokenExpiredError') {
    return sendAuthError(res, 'Token expired', 401);
  }

  if (error.name === 'NotBeforeError') {
    return sendAuthError(res, 'Token not active', 401);
  }

  logger.error('Unhandled authentication error:', error);
  return sendAuthError(res, 'Authentication failed', 500);
}