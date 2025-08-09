import { Request, Response } from 'express';
import Joi from 'joi';
import crypto from 'crypto';
import qrcode from 'qrcode';
import { UserModel, CreateUserInput, UpdateUserInput } from '../models/user.model';
import { JWTService } from '../services/jwt.service';
import { COPPAService, ParentalConsentRequest } from '../services/coppa.service';
import { TenantDatabase, logger } from '../config/database';

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  birth_date: Joi.date().iso().required(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  role: Joi.string().valid('COACH', 'ASSISTANT_COACH', 'PARENT', 'PLAYER', 'REFEREE', 'SCOREKEEPER', 'VOLUNTEER').required(),
  timezone: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  mfaToken: Joi.string().optional(),
  rememberMe: Joi.boolean().default(false),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const resetPasswordRequestSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

const enableMFASchema = Joi.object({
  password: Joi.string().required(),
});

const verifyMFASchema = Joi.object({
  token: Joi.string().required(),
});

const parentalConsentSchema = Joi.object({
  childId: Joi.string().uuid().required(),
  parentEmail: Joi.string().email().required(),
  parentFirstName: Joi.string().min(2).max(50).required(),
  parentLastName: Joi.string().min(2).max(50).required(),
  parentPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  consentType: Joi.object({
    registration: Joi.boolean().default(true),
    teamParticipation: Joi.boolean().default(true),
    photoVideo: Joi.boolean().default(false),
    communication: Joi.boolean().default(true),
    marketing: Joi.boolean().default(false),
  }).required(),
  dataPermissions: Joi.object({
    basicInfo: Joi.boolean().default(true),
    communication: Joi.boolean().default(true),
    photos: Joi.boolean().default(false),
    performanceTracking: Joi.boolean().default(true),
    marketing: Joi.boolean().default(false),
    locationTracking: Joi.boolean().default(false),
    thirdPartySharing: Joi.boolean().default(false),
  }).required(),
  verificationMethod: Joi.string().valid('EMAIL', 'DIGITAL_SIGNATURE', 'CREDIT_CARD', 'GOVERNMENT_ID', 'VIDEO_CALL').default('EMAIL'),
});

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId || 'default';
      
      // Validate request body
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
        });
        return;
      }

      const userData: CreateUserInput = value;

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(tenantId, userData.email);
      if (existingUser) {
        res.status(409).json({
          error: 'User Already Exists',
          message: 'A user with this email already exists',
        });
        return;
      }

      // Verify age for COPPA compliance
      const ageVerification = await COPPAService.verifyAge(userData.birth_date);

      // Create user
      const user = await UserModel.create(tenantId, userData);

      // If user is under 13, require parental consent
      if (ageVerification.requiresCOPPA) {
        res.status(201).json({
          success: true,
          message: 'User registered successfully. Parental consent required.',
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            age: user.age,
            status: user.status,
            role: user.role,
            requires_parental_consent: true,
          },
          ageVerification,
        });
        return;
      }

      // Generate session for users 13 and older
      const sessionId = JWTService.generateSecureToken();
      const tokens = await JWTService.generateTokenPair(
        user,
        tenantId,
        sessionId,
        req.ip,
        req.headers['user-agent']
      );

      // Create session in database
      await UserModel.createSession(
        tenantId,
        user.id,
        tokens.refreshToken,
        JWTService.createDeviceFingerprint(req.headers['user-agent'], req.headers['accept-language'] as string),
        req.ip,
        req.headers['user-agent']
      );

      // Update user status to active
      await UserModel.update(tenantId, user.id, { status: 'ACTIVE' } as UpdateUserInput);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          age: user.age,
          status: 'ACTIVE',
          role: user.role,
          mfa_enabled: user.mfa_enabled,
        },
        tokens,
      });

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration Failed',
        message: 'An error occurred during registration',
      });
    }
  }

  /**
   * User login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId || 'default';
      
      // Validate request body
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
        });
        return;
      }

      const { email, password, mfaToken, rememberMe } = value;

      // Authenticate user
      const authResult = await UserModel.authenticate(
        tenantId,
        email,
        password,
        req.ip,
        req.headers['user-agent']
      );

      if (!authResult.user) {
        res.status(401).json({
          error: 'Authentication Failed',
          message: authResult.reason || 'Invalid credentials',
        });
        return;
      }

      const user = authResult.user;

      // Check MFA requirement
      if (user.mfa_enabled) {
        if (!mfaToken) {
          res.status(200).json({
            success: false,
            message: 'MFA token required',
            requires_mfa: true,
            user_id: user.id,
          });
          return;
        }

        // Verify MFA token
        const isMFAValid = await UserModel.verifyMFA(tenantId, user.id, mfaToken);
        if (!isMFAValid) {
          res.status(401).json({
            error: 'Authentication Failed',
            message: 'Invalid MFA token',
          });
          return;
        }
      }

      // Check COPPA compliance for minors
      if (user.age < 13) {
        const consentCheck = await COPPAService.checkParentalConsent(tenantId, user.id);
        if (!consentCheck.hasValidConsent) {
          res.status(403).json({
            error: 'Parental Consent Required',
            message: 'Valid parental consent is required for users under 13',
            requires_parental_consent: true,
            user_id: user.id,
          });
          return;
        }
      }

      // Generate tokens
      const sessionId = JWTService.generateSecureToken();
      const tokens = await JWTService.generateTokenPair(
        user,
        tenantId,
        sessionId,
        req.ip,
        req.headers['user-agent']
      );

      // Create session
      const sessionExpiry = rememberMe 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

      await UserModel.createSession(
        tenantId,
        user.id,
        tokens.refreshToken,
        JWTService.createDeviceFingerprint(req.headers['user-agent'], req.headers['accept-language'] as string),
        req.ip,
        req.headers['user-agent'],
        sessionExpiry
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          age: user.age,
          mfa_enabled: user.mfa_enabled,
          last_login: new Date(),
        },
        tokens,
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: 'Login Failed',
        message: 'An error occurred during login',
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = refreshTokenSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
        });
        return;
      }

      const { refreshToken } = value;

      // Refresh tokens
      const newTokens = await JWTService.refreshAccessToken(refreshToken);
      if (!newTokens) {
        res.status(401).json({
          error: 'Token Refresh Failed',
          message: 'Invalid or expired refresh token',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        tokens: newTokens,
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Token Refresh Failed',
        message: 'An error occurred during token refresh',
      });
    }
  }

  /**
   * User logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const accessToken = authHeader.substring(7);
        await JWTService.blacklistAccessToken(accessToken);
      }

      // If refresh token is provided, revoke session
      const refreshToken = req.body.refreshToken;
      if (refreshToken && req.jwtPayload) {
        await JWTService.revokeSession(req.jwtPayload.sessionId, req.jwtPayload.userId);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout Failed',
        message: 'An error occurred during logout',
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication Required',
          message: 'User not authenticated',
        });
        return;
      }

      const user = req.user;
      const tenantId = req.tenantId!;

      // Get additional COPPA information for minors
      let coppaInfo = null;
      if (user.age < 13) {
        const consentCheck = await COPPAService.checkParentalConsent(tenantId, user.id);
        coppaInfo = {
          hasValidConsent: consentCheck.hasValidConsent,
          permissions: consentCheck.permissions,
          consentDate: consentCheck.consentDate,
          expiryDate: consentCheck.expiryDate,
        };
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          birth_date: user.birth_date,
          age: user.age,
          gender: user.gender,
          phone: user.phone,
          role: user.role,
          status: user.status,
          email_verified: user.email_verified,
          phone_verified: user.phone_verified,
          mfa_enabled: user.mfa_enabled,
          last_login: user.last_login,
          timezone: user.timezone,
          preferences: user.preferences,
          created_at: user.created_at,
          coppa_info: coppaInfo,
        },
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        error: 'Profile Retrieval Failed',
        message: 'An error occurred while retrieving profile',
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.tenantId) {
        res.status(401).json({
          error: 'Authentication Required',
          message: 'User not authenticated',
        });
        return;
      }

      const allowedUpdates = ['first_name', 'last_name', 'phone', 'timezone', 'preferences'];
      const updateData: Partial<UpdateUserInput> = {};

      // Filter allowed fields
      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          updateData[field as keyof UpdateUserInput] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'No valid fields to update',
        });
        return;
      }

      const updatedUser = await UserModel.update(req.tenantId, req.user.id, updateData);
      if (!updatedUser) {
        res.status(404).json({
          error: 'User Not Found',
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          phone: updatedUser.phone,
          timezone: updatedUser.timezone,
          preferences: updatedUser.preferences,
          updated_at: updatedUser.updated_at,
        },
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        error: 'Profile Update Failed',
        message: 'An error occurred while updating profile',
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.tenantId) {
        res.status(401).json({
          error: 'Authentication Required',
          message: 'User not authenticated',
        });
        return;
      }

      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
        });
        return;
      }

      const { currentPassword, newPassword } = value;

      // Verify current password
      const authResult = await UserModel.authenticate(
        req.tenantId,
        req.user.email,
        currentPassword
      );

      if (!authResult.user) {
        res.status(401).json({
          error: 'Authentication Failed',
          message: 'Current password is incorrect',
        });
        return;
      }

      // Update password
      const success = await UserModel.updatePassword(req.tenantId, req.user.id, newPassword);
      if (!success) {
        res.status(500).json({
          error: 'Password Change Failed',
          message: 'Failed to update password',
        });
        return;
      }

      // Revoke all existing sessions (force re-login)
      await JWTService.revokeAllUserSessions(req.user.id);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please log in again.',
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        error: 'Password Change Failed',
        message: 'An error occurred while changing password',
      });
    }
  }

  /**
   * Enable MFA
   */
  static async enableMFA(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.tenantId) {
        res.status(401).json({
          error: 'Authentication Required',
          message: 'User not authenticated',
        });
        return;
      }

      // Check if user is old enough for MFA
      if (req.user.age < 13) {
        res.status(403).json({
          error: 'Age Restriction',
          message: 'MFA is not available for users under 13',
        });
        return;
      }

      const { error, value } = enableMFASchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
        });
        return;
      }

      const { password } = value;

      // Verify password
      const authResult = await UserModel.authenticate(
        req.tenantId,
        req.user.email,
        password
      );

      if (!authResult.user) {
        res.status(401).json({
          error: 'Authentication Failed',
          message: 'Password is incorrect',
        });
        return;
      }

      // Enable MFA
      const mfaSetup = await UserModel.enableMFA(req.tenantId, req.user.id);

      // Generate QR code
      const qrCodeDataUrl = await qrcode.toDataURL(mfaSetup.qrCodeUrl);

      res.status(200).json({
        success: true,
        message: 'MFA enabled successfully',
        mfa: {
          secret: mfaSetup.secret,
          qrCodeUrl: qrCodeDataUrl,
          backupCodes: mfaSetup.backupCodes,
        },
      });

    } catch (error) {
      logger.error('Enable MFA error:', error);
      res.status(500).json({
        error: 'MFA Setup Failed',
        message: 'An error occurred while setting up MFA',
      });
    }
  }

  /**
   * Verify MFA token
   */
  static async verifyMFA(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.tenantId) {
        res.status(401).json({
          error: 'Authentication Required',
          message: 'User not authenticated',
        });
        return;
      }

      const { error, value } = verifyMFASchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
        });
        return;
      }

      const { token } = value;

      // Verify MFA token
      const isValid = await UserModel.verifyMFA(req.tenantId, req.user.id, token);

      res.status(200).json({
        success: true,
        valid: isValid,
        message: isValid ? 'MFA token is valid' : 'Invalid MFA token',
      });

    } catch (error) {
      logger.error('Verify MFA error:', error);
      res.status(500).json({
        error: 'MFA Verification Failed',
        message: 'An error occurred while verifying MFA token',
      });
    }
  }

  /**
   * Request parental consent for minor
   */
  static async requestParentalConsent(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId || 'default';

      const { error, value } = parentalConsentSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
        });
        return;
      }

      const consentRequest: ParentalConsentRequest = value;

      // Verify child exists and is under 13
      const child = await UserModel.findById(tenantId, consentRequest.childId);
      if (!child) {
        res.status(404).json({
          error: 'Child Not Found',
          message: 'Child user not found',
        });
        return;
      }

      if (child.age >= 13) {
        res.status(400).json({
          error: 'Age Restriction',
          message: 'Parental consent is only required for users under 13',
        });
        return;
      }

      // Initiate consent process
      const result = await COPPAService.initiateParentalConsent(tenantId, consentRequest);

      res.status(200).json({
        success: true,
        message: 'Parental consent request initiated',
        consent_id: result.consentId,
        verification_url: result.verificationUrl,
      });

    } catch (error) {
      logger.error('Request parental consent error:', error);
      res.status(500).json({
        error: 'Consent Request Failed',
        message: 'An error occurred while requesting parental consent',
      });
    }
  }

  /**
   * Verify parental consent
   */
  static async verifyParentalConsent(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId || 'default';
      const { consentId } = req.params;
      const verificationData = req.body;

      if (!consentId) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Consent ID is required',
        });
        return;
      }

      const result = await COPPAService.verifyParentalConsent(
        tenantId,
        consentId,
        verificationData
      );

      if (result.isValid) {
        res.status(200).json({
          success: true,
          message: 'Parental consent verified successfully',
          consent: {
            consent_id: result.consentId,
            verification_method: result.verificationMethod,
            consent_date: result.consentDate,
            expiry_date: result.expiryDate,
            permissions: result.permissions,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Consent verification failed',
        });
      }

    } catch (error) {
      logger.error('Verify parental consent error:', error);
      res.status(500).json({
        error: 'Consent Verification Failed',
        message: 'An error occurred while verifying parental consent',
      });
    }
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const { checkDatabaseHealth, checkRedisHealth } = await import('../config/database');
      
      const dbHealth = await checkDatabaseHealth();
      const redisHealth = await checkRedisHealth();

      const isHealthy = dbHealth && redisHealth;

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealth ? 'healthy' : 'unhealthy',
          redis: redisHealth ? 'healthy' : 'unhealthy',
        },
      });

    } catch (error) {
      logger.error('Health check error:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  }
}