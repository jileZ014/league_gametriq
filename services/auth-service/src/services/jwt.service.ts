import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { redisClient, logger } from '../config/database';
import { User } from '../models/user.model';

export interface JWTPayload {
  userId: string;
  email: string;
  role: User['role'];
  tenantId: string;
  isMinor: boolean;
  sessionId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  sub: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tenantId: string;
  iat: number;
  exp: number;
}

export class JWTService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes for security
  private static readonly REFRESH_TOKEN_EXPIRY = '30d'; // 30 days
  private static readonly ISSUER = 'gametriq-auth-service';
  private static readonly AUDIENCE = 'gametriq-platform';

  // JWT secrets from environment variables
  private static readonly ACCESS_TOKEN_SECRET = 
    process.env.JWT_ACCESS_SECRET || 'change-this-in-production-access';
  private static readonly REFRESH_TOKEN_SECRET = 
    process.env.JWT_REFRESH_SECRET || 'change-this-in-production-refresh';

  /**
   * Generate access and refresh token pair
   */
  static async generateTokenPair(
    user: User,
    tenantId: string,
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    const isMinor = user.age < 13;
    
    // Generate access token
    const accessTokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId,
      isMinor,
      sessionId,
      iss: this.ISSUER,
      aud: this.AUDIENCE,
      sub: user.id,
    };

    const accessToken = jwt.sign(accessTokenPayload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      algorithm: 'HS256',
    });

    // Generate refresh token
    const refreshTokenPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      sessionId,
      tenantId,
    };

    const refreshToken = jwt.sign(refreshTokenPayload, this.REFRESH_TOKEN_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      algorithm: 'HS256',
    });

    // Store refresh token in Redis with metadata
    const refreshTokenKey = `refresh_token:${sessionId}`;
    const tokenMetadata = {
      userId: user.id,
      tenantId,
      ipAddress,
      userAgent,
      issuedAt: new Date().toISOString(),
    };

    await redisClient.setEx(
      refreshTokenKey,
      30 * 24 * 60 * 60, // 30 days in seconds
      JSON.stringify(tokenMetadata)
    );

    // Track active sessions for user (for session management)
    const userSessionsKey = `user_sessions:${user.id}`;
    await redisClient.sAdd(userSessionsKey, sessionId);
    await redisClient.expire(userSessionsKey, 30 * 24 * 60 * 60);

    // Calculate expiry time
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    logger.info(`Generated token pair for user ${user.id}, session ${sessionId}`);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify and decode access token
   */
  static async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: this.ISSUER,
        audience: this.AUDIENCE,
        algorithms: ['HS256'],
      }) as JWTPayload;

      // Check if session is still active in Redis
      const sessionKey = `refresh_token:${decoded.sessionId}`;
      const sessionExists = await redisClient.exists(sessionKey);

      if (!sessionExists) {
        logger.warn(`Access token used with expired session: ${decoded.sessionId}`);
        return null;
      }

      // Check if token is blacklisted
      const blacklistKey = `blacklist:${token}`;
      const isBlacklisted = await redisClient.exists(blacklistKey);

      if (isBlacklisted) {
        logger.warn(`Blacklisted access token used: ${decoded.userId}`);
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token:', error.message);
      } else {
        logger.error('Access token verification error:', error);
      }
      return null;
    }
  }

  /**
   * Verify and decode refresh token
   */
  static async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
        algorithms: ['HS256'],
      }) as RefreshTokenPayload;

      // Check if refresh token exists in Redis
      const refreshTokenKey = `refresh_token:${decoded.sessionId}`;
      const tokenMetadata = await redisClient.get(refreshTokenKey);

      if (!tokenMetadata) {
        logger.warn(`Refresh token not found in Redis: ${decoded.sessionId}`);
        return null;
      }

      // Verify token metadata
      const metadata = JSON.parse(tokenMetadata);
      if (metadata.userId !== decoded.userId || metadata.tenantId !== decoded.tenantId) {
        logger.warn(`Refresh token metadata mismatch: ${decoded.sessionId}`);
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Refresh token expired');
        // Clean up expired token from Redis
        try {
          const decoded = jwt.decode(token) as RefreshTokenPayload;
          if (decoded?.sessionId) {
            await this.revokeSession(decoded.sessionId, decoded.userId);
          }
        } catch (cleanupError) {
          logger.error('Error cleaning up expired refresh token:', cleanupError);
        }
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token:', error.message);
      } else {
        logger.error('Refresh token verification error:', error);
      }
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    const refreshPayload = await this.verifyRefreshToken(refreshToken);
    if (!refreshPayload) {
      return null;
    }

    try {
      // Get token metadata from Redis
      const refreshTokenKey = `refresh_token:${refreshPayload.sessionId}`;
      const tokenMetadata = await redisClient.get(refreshTokenKey);

      if (!tokenMetadata) {
        return null;
      }

      const metadata = JSON.parse(tokenMetadata);

      // For refresh, we need to get current user data
      // This would typically involve calling UserModel, but for JWT service isolation,
      // we'll create a minimal payload based on stored metadata
      const accessTokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: refreshPayload.userId,
        email: metadata.email || '', // Should be stored in metadata
        role: metadata.role || 'PLAYER', // Should be stored in metadata
        tenantId: refreshPayload.tenantId,
        isMinor: metadata.isMinor || false, // Should be stored in metadata
        sessionId: refreshPayload.sessionId,
        iss: this.ISSUER,
        aud: this.AUDIENCE,
        sub: refreshPayload.userId,
      };

      const newAccessToken = jwt.sign(accessTokenPayload, this.ACCESS_TOKEN_SECRET, {
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
        algorithm: 'HS256',
      });

      // Update last access time in metadata
      metadata.lastAccessAt = new Date().toISOString();
      await redisClient.setEx(
        refreshTokenKey,
        30 * 24 * 60 * 60, // Reset TTL
        JSON.stringify(metadata)
      );

      // Calculate expiry time
      const decoded = jwt.decode(newAccessToken) as any;
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      logger.info(`Refreshed access token for user ${refreshPayload.userId}`);

      return {
        accessToken: newAccessToken,
        refreshToken, // Return the same refresh token
        expiresIn,
        tokenType: 'Bearer',
      };
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      return null;
    }
  }

  /**
   * Blacklist access token (for logout)
   */
  static async blacklistAccessToken(token: string): Promise<boolean> {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded?.exp) {
        return false;
      }

      // Calculate TTL until token would naturally expire
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      if (ttl > 0) {
        const blacklistKey = `blacklist:${token}`;
        await redisClient.setEx(blacklistKey, ttl, 'blacklisted');
        logger.info(`Blacklisted access token for user ${decoded.userId}`);
      }

      return true;
    } catch (error) {
      logger.error('Error blacklisting access token:', error);
      return false;
    }
  }

  /**
   * Revoke refresh token and session
   */
  static async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      // Remove refresh token from Redis
      const refreshTokenKey = `refresh_token:${sessionId}`;
      await redisClient.del(refreshTokenKey);

      // Remove session from user's active sessions set
      const userSessionsKey = `user_sessions:${userId}`;
      await redisClient.sRem(userSessionsKey, sessionId);

      logger.info(`Revoked session ${sessionId} for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error revoking session:', error);
      return false;
    }
  }

  /**
   * Revoke all sessions for a user
   */
  static async revokeAllUserSessions(userId: string): Promise<boolean> {
    try {
      // Get all active sessions for user
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionIds = await redisClient.sMembers(userSessionsKey);

      // Remove all refresh tokens
      const pipeline = redisClient.multi();
      for (const sessionId of sessionIds) {
        const refreshTokenKey = `refresh_token:${sessionId}`;
        pipeline.del(refreshTokenKey);
      }
      
      // Clear user sessions set
      pipeline.del(userSessionsKey);
      await pipeline.exec();

      logger.info(`Revoked all sessions for user ${userId} (${sessionIds.length} sessions)`);
      return true;
    } catch (error) {
      logger.error('Error revoking all user sessions:', error);
      return false;
    }
  }

  /**
   * Get active sessions for a user
   */
  static async getUserActiveSessions(userId: string): Promise<Array<{
    sessionId: string;
    metadata: any;
  }>> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionIds = await redisClient.sMembers(userSessionsKey);

      const sessions = [];
      for (const sessionId of sessionIds) {
        const refreshTokenKey = `refresh_token:${sessionId}`;
        const metadataStr = await redisClient.get(refreshTokenKey);
        
        if (metadataStr) {
          sessions.push({
            sessionId,
            metadata: JSON.parse(metadataStr),
          });
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Error getting user active sessions:', error);
      return [];
    }
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create device fingerprint from request headers
   */
  static createDeviceFingerprint(userAgent?: string, acceptLanguage?: string): string {
    const data = `${userAgent || ''}:${acceptLanguage || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Validate token structure without verification
   */
  static isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    try {
      // Try to decode header and payload (without verification)
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      // Basic structure validation
      return header.alg && header.typ && payload.iss && payload.aud;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.exp ? new Date(decoded.exp * 1000) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired (without verification)
   */
  static isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    return expiration ? expiration <= new Date() : true;
  }

  /**
   * Get time until token expiration in seconds
   */
  static getTimeUntilExpiration(token: string): number {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return 0;
    
    const now = new Date();
    return Math.max(0, Math.floor((expiration.getTime() - now.getTime()) / 1000));
  }
}