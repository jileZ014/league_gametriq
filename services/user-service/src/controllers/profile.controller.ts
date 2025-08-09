import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import moment from 'moment';

import { UserProfileModel } from '../models/user-profile.model';
import { ConsentService } from '../services/consent.service';
import { RedisService } from '../services/redis.service';
import { KafkaService } from '../services/kafka.service';
import { logger } from '../config/database';
import { 
  calculateAge, 
  isMinor, 
  sanitizeProfileData, 
  validateProfileData,
  hashPII,
  encryptPII,
  decryptPII
} from '../utils/profile.utils';
import { 
  ProfileCreatedEvent, 
  ProfileUpdatedEvent, 
  ProfileDeletedEvent,
  ConsentRequiredEvent,
  DataExportRequestedEvent
} from '../events/profile.events';

interface AuthenticatedRequest extends Request {
  userId: string;
  tenantId: string;
  userRole: string;
  userPermissions: string[];
  consentStatus?: string;
}

export class ProfileController {
  private static userProfileModel = new UserProfileModel();
  private static consentService = new ConsentService();
  private static redisService = new RedisService();
  private static kafkaService = new KafkaService();

  /**
   * Health check endpoint
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check database connectivity
      const dbCheck = await ProfileController.userProfileModel.healthCheck();
      
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'user-service',
        version: process.env.npm_package_version || '2.0.0',
        checks: {
          database: dbCheck ? 'ok' : 'error',
          redis: ProfileController.redisService.isConnected() ? 'ok' : 'error',
          kafka: ProfileController.kafkaService.isConnected() ? 'ok' : 'error'
        }
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user's own profile
   */
  static async getMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, tenantId } = req;
      const cacheKey = `profile:${tenantId}:${userId}`;

      // Try to get from cache first
      let profile = await ProfileController.redisService.get(cacheKey);
      
      if (!profile) {
        // Get from database
        profile = await ProfileController.userProfileModel.getProfile(userId, tenantId);
        
        if (!profile) {
          res.status(404).json({
            error: 'Profile not found',
            message: 'User profile does not exist',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Cache for 5 minutes
        await ProfileController.redisService.setex(cacheKey, 300, JSON.stringify(profile));
      } else {
        profile = JSON.parse(profile);
      }

      // Decrypt sensitive data for the user
      profile = decryptPII(profile);

      // Remove internal fields
      const sanitizedProfile = sanitizeProfileData(profile, 'owner');

      res.status(200).json({
        profile: sanitizedProfile,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting user profile:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve profile',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get public profile (limited data)
   */
  static async getPublicProfile(req: Request, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const { tenantId } = req.query as { tenantId: string };

      if (!tenantId) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'tenantId is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const profile = await ProfileController.userProfileModel.getPublicProfile(profileId, tenantId);

      if (!profile) {
        res.status(404).json({
          error: 'Profile not found',
          message: 'Public profile does not exist',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Return only public fields
      const publicProfile = sanitizeProfileData(profile, 'public');

      res.status(200).json({
        profile: publicProfile,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting public profile:', {
        error,
        profileId: req.params.profileId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve public profile',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update user's own profile
   */
  static updateMyProfileValidation = [
    body('firstName').optional().isString().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().isString().trim().isLength({ min: 1, max: 50 }),
    body('dateOfBirth').optional().isISO8601().toDate(),
    body('phone').optional().isMobilePhone('any'),
    body('address.street').optional().isString().trim().isLength({ max: 100 }),
    body('address.city').optional().isString().trim().isLength({ max: 50 }),
    body('address.state').optional().isString().trim().isLength({ max: 50 }),
    body('address.zipCode').optional().isString().trim().isLength({ max: 10 }),
    body('address.country').optional().isString().trim().isLength({ max: 50 }),
    body('emergencyContacts').optional().isArray({ max: 3 }),
    body('emergencyContacts.*.name').optional().isString().trim().isLength({ max: 100 }),
    body('emergencyContacts.*.phone').optional().isMobilePhone('any'),
    body('emergencyContacts.*.relationship').optional().isString().trim().isLength({ max: 50 }),
    body('medicalInfo.allergies').optional().isString().trim().isLength({ max: 500 }),
    body('medicalInfo.medications').optional().isString().trim().isLength({ max: 500 }),
    body('medicalInfo.conditions').optional().isString().trim().isLength({ max: 500 }),
    body('preferences.language').optional().isString().isIn(['en', 'es', 'fr']),
    body('preferences.timezone').optional().isString(),
    body('preferences.notifications.email').optional().isBoolean(),
    body('preferences.notifications.sms').optional().isBoolean(),
    body('preferences.notifications.push').optional().isBoolean()
  ];

  static async updateMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { userId, tenantId, consentStatus } = req;
      const updateData = req.body;

      // Get current profile
      const currentProfile = await ProfileController.userProfileModel.getProfile(userId, tenantId);
      
      if (!currentProfile) {
        res.status(404).json({
          error: 'Profile not found',
          message: 'User profile does not exist',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user is a minor and needs parental consent for certain updates
      if (currentProfile.dateOfBirth && isMinor(currentProfile.dateOfBirth)) {
        const sensitiveFields = ['dateOfBirth', 'phone', 'address', 'medicalInfo'];
        const hasSensitiveChanges = sensitiveFields.some(field => updateData[field] !== undefined);
        
        if (hasSensitiveChanges && consentStatus !== 'granted') {
          // Request parental consent
          const consentRequest = await ProfileController.consentService.requestParentalConsent({
            childUserId: userId,
            tenantId,
            requestType: 'profile_update',
            requestData: updateData,
            expiresAt: moment().add(7, 'days').toDate()
          });

          // Publish event
          await ProfileController.kafkaService.publishEvent(new ConsentRequiredEvent({
            userId,
            tenantId,
            consentRequestId: consentRequest.id,
            requestType: 'profile_update',
            timestamp: new Date()
          }));

          res.status(202).json({
            message: 'Parental consent required for this profile update',
            consentRequestId: consentRequest.id,
            status: 'pending_consent',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      // Validate profile data
      const validationErrors = validateProfileData(updateData);
      if (validationErrors.length > 0) {
        res.status(400).json({
          error: 'Profile Validation Error',
          details: validationErrors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Encrypt sensitive data
      const encryptedUpdateData = encryptPII(updateData);

      // Update profile
      const updatedProfile = await ProfileController.userProfileModel.updateProfile(
        userId, 
        tenantId, 
        encryptedUpdateData
      );

      // Clear cache
      const cacheKey = `profile:${tenantId}:${userId}`;
      await ProfileController.redisService.del(cacheKey);

      // Publish profile updated event
      await ProfileController.kafkaService.publishEvent(new ProfileUpdatedEvent({
        userId,
        tenantId,
        changes: Object.keys(updateData),
        timestamp: new Date(),
        updatedBy: userId
      }));

      // Return sanitized profile
      const sanitizedProfile = sanitizeProfileData(decryptPII(updatedProfile), 'owner');

      res.status(200).json({
        profile: sanitizedProfile,
        message: 'Profile updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error updating user profile:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update profile',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete user's own profile (COPPA compliant)
   */
  static async deleteMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, tenantId, consentStatus } = req;

      // Get current profile
      const currentProfile = await ProfileController.userProfileModel.getProfile(userId, tenantId);
      
      if (!currentProfile) {
        res.status(404).json({
          error: 'Profile not found',
          message: 'User profile does not exist',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user is a minor and needs parental consent for deletion
      if (currentProfile.dateOfBirth && isMinor(currentProfile.dateOfBirth) && consentStatus !== 'granted') {
        // Request parental consent for deletion
        const consentRequest = await ProfileController.consentService.requestParentalConsent({
          childUserId: userId,
          tenantId,
          requestType: 'profile_deletion',
          requestData: { action: 'delete_profile' },
          expiresAt: moment().add(7, 'days').toDate()
        });

        // Publish event
        await ProfileController.kafkaService.publishEvent(new ConsentRequiredEvent({
          userId,
          tenantId,
          consentRequestId: consentRequest.id,
          requestType: 'profile_deletion',
          timestamp: new Date()
        }));

        res.status(202).json({
          message: 'Parental consent required for profile deletion',
          consentRequestId: consentRequest.id,
          status: 'pending_consent',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Perform soft delete (COPPA compliance - keep audit trail)
      await ProfileController.userProfileModel.softDeleteProfile(userId, tenantId);

      // Clear cache
      const cacheKey = `profile:${tenantId}:${userId}`;
      await ProfileController.redisService.del(cacheKey);

      // Publish profile deleted event
      await ProfileController.kafkaService.publishEvent(new ProfileDeletedEvent({
        userId,
        tenantId,
        deletionType: 'soft',
        timestamp: new Date(),
        deletedBy: userId
      }));

      res.status(200).json({
        message: 'Profile deleted successfully',
        status: 'deleted',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error deleting user profile:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete profile',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Export user's data (GDPR/COPPA compliance)
   */
  static async exportMyData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, tenantId } = req;

      // Check for existing export request in last 24 hours
      const existingExport = await ProfileController.userProfileModel.getRecentDataExport(userId, tenantId);
      
      if (existingExport) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Data export request already in progress or completed within last 24 hours',
          existingExportId: existingExport.id,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create export request
      const exportRequest = await ProfileController.userProfileModel.createDataExportRequest({
        userId,
        tenantId,
        requestedBy: userId,
        status: 'pending',
        requestedAt: new Date()
      });

      // Publish data export requested event
      await ProfileController.kafkaService.publishEvent(new DataExportRequestedEvent({
        userId,
        tenantId,
        exportRequestId: exportRequest.id,
        requestedBy: userId,
        timestamp: new Date()
      }));

      res.status(202).json({
        message: 'Data export request created',
        exportRequestId: exportRequest.id,
        status: 'pending',
        estimatedCompletionTime: moment().add(24, 'hours').toISOString(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error creating data export request:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create data export request',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get children profiles (for parents)
   */
  static async getChildrenProfiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, tenantId } = req;

      const childrenProfiles = await ProfileController.userProfileModel.getChildrenProfiles(userId, tenantId);

      // Decrypt and sanitize children profiles
      const sanitizedProfiles = childrenProfiles.map(profile => {
        const decryptedProfile = decryptPII(profile);
        return sanitizeProfileData(decryptedProfile, 'parent');
      });

      res.status(200).json({
        children: sanitizedProfiles,
        count: sanitizedProfiles.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting children profiles:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve children profiles',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create child profile (for parents)
   */
  static createChildProfileValidation = [
    body('firstName').isString().trim().isLength({ min: 1, max: 50 }),
    body('lastName').isString().trim().isLength({ min: 1, max: 50 }),
    body('dateOfBirth').isISO8601().toDate(),
    body('relationship').isString().isIn(['child', 'dependent', 'ward']),
    body('email').optional().isEmail(),
    body('phone').optional().isMobilePhone('any'),
    body('address').optional().isObject(),
    body('medicalInfo').optional().isObject(),
    body('emergencyContacts').optional().isArray({ max: 3 })
  ];

  static async createChildProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { userId, tenantId } = req;
      const childData = req.body;

      // Verify user is eligible to create child profiles
      const parentProfile = await ProfileController.userProfileModel.getProfile(userId, tenantId);
      
      if (!parentProfile || isMinor(parentProfile.dateOfBirth)) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Only adult users can create child profiles',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify the child is actually a minor
      if (!isMinor(childData.dateOfBirth)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Child profile date of birth indicates adult age',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create child user ID
      const childUserId = uuidv4();

      // Prepare child profile data
      const childProfileData = {
        id: childUserId,
        tenantId,
        parentUserId: userId,
        ...childData,
        userType: 'child',
        consentStatus: 'granted', // Parent is providing consent
        consentGrantedBy: userId,
        consentGrantedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Encrypt sensitive data
      const encryptedChildData = encryptPII(childProfileData);

      // Create child profile
      const childProfile = await ProfileController.userProfileModel.createChildProfile(encryptedChildData);

      // Create parental consent record
      await ProfileController.consentService.grantParentalConsent({
        childUserId,
        parentUserId: userId,
        tenantId,
        consentType: 'profile_creation',
        consentMethod: 'parent_action',
        grantedAt: new Date()
      });

      // Publish profile created event
      await ProfileController.kafkaService.publishEvent(new ProfileCreatedEvent({
        userId: childUserId,
        tenantId,
        parentUserId: userId,
        userType: 'child',
        timestamp: new Date(),
        createdBy: userId
      }));

      // Return sanitized child profile
      const sanitizedProfile = sanitizeProfileData(decryptPII(childProfile), 'parent');

      res.status(201).json({
        profile: sanitizedProfile,
        message: 'Child profile created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error creating child profile:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create child profile',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update child profile (for parents)
   */
  static async updateChildProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, tenantId } = req;
      const { childId } = req.params;
      const updateData = req.body;

      // Verify parent-child relationship
      const isParent = await ProfileController.userProfileModel.verifyParentChildRelationship(
        userId,
        childId,
        tenantId
      );

      if (!isParent) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to update this child profile',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate profile data
      const validationErrors = validateProfileData(updateData);
      if (validationErrors.length > 0) {
        res.status(400).json({
          error: 'Profile Validation Error',
          details: validationErrors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Encrypt sensitive data
      const encryptedUpdateData = encryptPII(updateData);

      // Update child profile
      const updatedProfile = await ProfileController.userProfileModel.updateProfile(
        childId,
        tenantId,
        encryptedUpdateData
      );

      // Clear cache
      const cacheKey = `profile:${tenantId}:${childId}`;
      await ProfileController.redisService.del(cacheKey);

      // Publish profile updated event
      await ProfileController.kafkaService.publishEvent(new ProfileUpdatedEvent({
        userId: childId,
        tenantId,
        changes: Object.keys(updateData),
        timestamp: new Date(),
        updatedBy: userId
      }));

      // Return sanitized profile
      const sanitizedProfile = sanitizeProfileData(decryptPII(updatedProfile), 'parent');

      res.status(200).json({
        profile: sanitizedProfile,
        message: 'Child profile updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error updating child profile:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId,
        childId: req.params.childId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update child profile',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete child profile (for parents)
   */
  static async deleteChildProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, tenantId } = req;
      const { childId } = req.params;

      // Verify parent-child relationship
      const isParent = await ProfileController.userProfileModel.verifyParentChildRelationship(
        userId,
        childId,
        tenantId
      );

      if (!isParent) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to delete this child profile',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Perform soft delete
      await ProfileController.userProfileModel.softDeleteProfile(childId, tenantId);

      // Clear cache
      const cacheKey = `profile:${tenantId}:${childId}`;
      await ProfileController.redisService.del(cacheKey);

      // Publish profile deleted event
      await ProfileController.kafkaService.publishEvent(new ProfileDeletedEvent({
        userId: childId,
        tenantId,
        deletionType: 'soft',
        timestamp: new Date(),
        deletedBy: userId
      }));

      res.status(200).json({
        message: 'Child profile deleted successfully',
        status: 'deleted',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error deleting child profile:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId,
        childId: req.params.childId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete child profile',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user's organizations
   */
  static async getMyOrganizations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, tenantId } = req;

      const organizations = await ProfileController.userProfileModel.getUserOrganizations(userId, tenantId);

      res.status(200).json({
        organizations,
        count: organizations.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting user organizations:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve organizations',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Join an organization
   */
  static async joinOrganization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, tenantId } = req;
      const { orgId } = req.params;

      const membership = await ProfileController.userProfileModel.joinOrganization(userId, orgId, tenantId);

      res.status(201).json({
        membership,
        message: 'Successfully joined organization',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error joining organization:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId,
        orgId: req.params.orgId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to join organization',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Leave an organization
   */
  static async leaveOrganization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, tenantId } = req;
      const { orgId } = req.params;

      await ProfileController.userProfileModel.leaveOrganization(userId, orgId, tenantId);

      res.status(200).json({
        message: 'Successfully left organization',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error leaving organization:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId,
        orgId: req.params.orgId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to leave organization',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Search profiles (with privacy controls)
   */
  static async searchProfiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, tenantId, userPermissions } = req;
      const { 
        query, 
        page = 1, 
        limit = 10, 
        orgId, 
        ageGroup, 
        role 
      } = req.query as any;

      // Check if user has search permissions
      if (!userPermissions.includes('profile:search')) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions for profile search',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const searchResults = await ProfileController.userProfileModel.searchProfiles({
        query,
        tenantId,
        organizationId: orgId,
        ageGroup,
        role,
        searcherId: userId,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50) // Max 50 results per page
      });

      // Sanitize search results
      const sanitizedResults = searchResults.profiles.map(profile => 
        sanitizeProfileData(profile, 'search')
      );

      res.status(200).json({
        profiles: sanitizedResults,
        pagination: {
          page: parseInt(page),
          limit: Math.min(parseInt(limit), 50),
          total: searchResults.total,
          pages: Math.ceil(searchResults.total / Math.min(parseInt(limit), 50))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error searching profiles:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search profiles',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get profile by ID (with appropriate access controls)
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, tenantId, userPermissions } = req;
      const { profileId } = req.params;

      const profile = await ProfileController.userProfileModel.getProfile(profileId, tenantId);

      if (!profile) {
        res.status(404).json({
          error: 'Profile not found',
          message: 'User profile does not exist',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Determine access level
      let accessLevel = 'public';
      
      if (profileId === userId) {
        accessLevel = 'owner';
      } else if (userPermissions.includes('profile:read:all')) {
        accessLevel = 'admin';
      } else if (await ProfileController.userProfileModel.verifyParentChildRelationship(userId, profileId, tenantId)) {
        accessLevel = 'parent';
      } else if (await ProfileController.userProfileModel.checkSameOrganization(userId, profileId, tenantId)) {
        accessLevel = 'organization';
      }

      // Decrypt and sanitize profile based on access level
      const decryptedProfile = accessLevel === 'public' ? profile : decryptPII(profile);
      const sanitizedProfile = sanitizeProfileData(decryptedProfile, accessLevel);

      res.status(200).json({
        profile: sanitizedProfile,
        accessLevel,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting profile:', {
        error,
        userId: req.userId,
        tenantId: req.tenantId,
        profileId: req.params.profileId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve profile',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Admin-only methods
  static async getConsentAuditRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req;
      const { page = 1, limit = 50, startDate, endDate } = req.query as any;

      const auditRecords = await ProfileController.consentService.getConsentAuditRecords({
        tenantId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100)
      });

      res.status(200).json({
        records: auditRecords.records,
        pagination: {
          page: parseInt(page),
          limit: Math.min(parseInt(limit), 100),
          total: auditRecords.total,
          pages: Math.ceil(auditRecords.total / Math.min(parseInt(limit), 100))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting consent audit records:', {
        error,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve consent audit records',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async getProfileAuditRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req;
      const { page = 1, limit = 50, userId, startDate, endDate } = req.query as any;

      const auditRecords = await ProfileController.userProfileModel.getProfileAuditRecords({
        tenantId,
        userId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100)
      });

      res.status(200).json({
        records: auditRecords.records,
        pagination: {
          page: parseInt(page),
          limit: Math.min(parseInt(limit), 100),
          total: auditRecords.total,
          pages: Math.ceil(auditRecords.total / Math.min(parseInt(limit), 100))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting profile audit records:', {
        error,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve profile audit records',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async getDataExportAuditRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req;
      const { page = 1, limit = 50, startDate, endDate } = req.query as any;

      const auditRecords = await ProfileController.userProfileModel.getDataExportAuditRecords({
        tenantId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100)
      });

      res.status(200).json({
        records: auditRecords.records,
        pagination: {
          page: parseInt(page),
          limit: Math.min(parseInt(limit), 100),
          total: auditRecords.total,
          pages: Math.ceil(auditRecords.total / Math.min(parseInt(limit), 100))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting data export audit records:', {
        error,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve data export audit records',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async getPendingConsents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req;
      const { page = 1, limit = 50 } = req.query as any;

      const pendingConsents = await ProfileController.consentService.getPendingConsents({
        tenantId,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100)
      });

      res.status(200).json({
        consents: pendingConsents.consents,
        pagination: {
          page: parseInt(page),
          limit: Math.min(parseInt(limit), 100),
          total: pendingConsents.total,
          pages: Math.ceil(pendingConsents.total / Math.min(parseInt(limit), 100))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting pending consents:', {
        error,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve pending consents',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async getExpiredConsents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req;
      const { page = 1, limit = 50 } = req.query as any;

      const expiredConsents = await ProfileController.consentService.getExpiredConsents({
        tenantId,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100)
      });

      res.status(200).json({
        consents: expiredConsents.consents,
        pagination: {
          page: parseInt(page),
          limit: Math.min(parseInt(limit), 100),
          total: expiredConsents.total,
          pages: Math.ceil(expiredConsents.total / Math.min(parseInt(limit), 100))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting expired consents:', {
        error,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve expired consents',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async sendConsentReminders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req;

      const reminderResult = await ProfileController.consentService.sendBulkConsentReminders(tenantId);

      res.status(200).json({
        message: 'Consent reminders sent successfully',
        remindersSent: reminderResult.remindersSent,
        failed: reminderResult.failed,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error sending consent reminders:', {
        error,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to send consent reminders',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async cleanupExpiredData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req;

      const cleanupResult = await ProfileController.userProfileModel.cleanupExpiredData(tenantId);

      res.status(200).json({
        message: 'Data cleanup completed successfully',
        profilesCleaned: cleanupResult.profilesCleaned,
        dataRemoved: cleanupResult.dataRemoved,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error cleaning up expired data:', {
        error,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to cleanup expired data',
        timestamp: new Date().toISOString()
      });
    }
  }

  static async getDataRetentionReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req;

      const report = await ProfileController.userProfileModel.getDataRetentionReport(tenantId);

      res.status(200).json({
        report,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting data retention report:', {
        error,
        tenantId: req.tenantId
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate data retention report',
        timestamp: new Date().toISOString()
      });
    }
  }
}