import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { TenantDatabase, logger } from '../config/database';
import { UserModel, User, COPPAUser } from '../models/user.model';

export interface ParentalConsentRequest {
  childId: string;
  parentEmail: string;
  parentFirstName: string;
  parentLastName: string;
  parentPhone?: string;
  consentType: ConsentType;
  dataPermissions: DataPermissions;
  verificationMethod: 'EMAIL' | 'DIGITAL_SIGNATURE' | 'CREDIT_CARD' | 'GOVERNMENT_ID' | 'VIDEO_CALL';
}

export interface DataPermissions {
  basicInfo: boolean;
  communication: boolean;
  photos: boolean;
  performanceTracking: boolean;
  marketing: boolean;
  locationTracking: boolean;
  thirdPartySharing: boolean;
}

export interface ConsentType {
  registration: boolean;
  teamParticipation: boolean;
  photoVideo: boolean;
  communication: boolean;
  marketing: boolean;
}

export interface AgeVerificationResult {
  isMinor: boolean;
  age: number;
  requiresCOPPA: boolean;
  parentalConsentRequired: boolean;
  verificationMethod: string;
  restrictions: string[];
}

export interface ConsentVerificationResult {
  isValid: boolean;
  consentId?: string;
  verificationMethod: string;
  consentDate: Date;
  expiryDate?: Date;
  permissions: DataPermissions;
}

export class COPPAService {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static readonly COPPA_AGE_THRESHOLD = 13;
  private static readonly CONSENT_VALIDITY_PERIOD = 365 * 24 * 60 * 60 * 1000; // 1 year
  private static readonly DATA_RETENTION_PERIOD = 3 * 365 * 24 * 60 * 60 * 1000; // 3 years

  /**
   * Verify user age and determine COPPA requirements
   */
  static async verifyAge(birthDate: string): Promise<AgeVerificationResult> {
    const birth = new Date(birthDate);
    const today = new Date();
    
    // Calculate exact age
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    const isMinor = age < this.COPPA_AGE_THRESHOLD;
    const restrictions = [];

    if (isMinor) {
      restrictions.push(
        'Parental consent required for registration',
        'Limited data collection permitted',
        'Enhanced privacy protections apply',
        'Restricted communication features',
        'No marketing communications without explicit consent'
      );
    }

    logger.info(`Age verification: ${age} years old, COPPA protected: ${isMinor}`);

    return {
      isMinor,
      age,
      requiresCOPPA: isMinor,
      parentalConsentRequired: isMinor,
      verificationMethod: 'BIRTH_DATE_CALCULATION',
      restrictions,
    };
  }

  /**
   * Initiate parental consent process
   */
  static async initiateParentalConsent(
    tenantId: string,
    consentRequest: ParentalConsentRequest
  ): Promise<{ consentId: string; verificationUrl?: string }> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      // Verify child exists and is under 13
      const child = await UserModel.findById(tenantId, consentRequest.childId);
      if (!child) {
        throw new Error('Child user not found');
      }

      if (child.age >= this.COPPA_AGE_THRESHOLD) {
        throw new Error('Parental consent not required for users 13 and older');
      }

      // Generate consent ID
      const consentId = crypto.randomUUID();
      const verificationToken = this.generateSecureToken();

      // Create consent record
      const consentRecord = {
        id: consentId,
        child_id: consentRequest.childId,
        parent_email: consentRequest.parentEmail,
        parent_first_name: consentRequest.parentFirstName,
        parent_last_name: consentRequest.parentLastName,
        parent_phone: consentRequest.parentPhone,
        consent_type: JSON.stringify(consentRequest.consentType),
        data_permissions: JSON.stringify(consentRequest.dataPermissions),
        verification_method: consentRequest.verificationMethod,
        verification_token: verificationToken,
        status: 'PENDING',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        created_at: new Date(),
      };

      // Store in temporary consent table (not in schema, would need to create)
      // For now, using Redis for temporary storage
      const consentKey = `coppa_consent:${consentId}`;
      await this.storeConsentRequest(consentKey, consentRecord);

      let verificationUrl: string | undefined;

      // Send verification based on method
      switch (consentRequest.verificationMethod) {
        case 'EMAIL':
          verificationUrl = await this.sendEmailVerification(consentRecord, verificationToken);
          break;
        
        case 'DIGITAL_SIGNATURE':
          verificationUrl = await this.generateDigitalSignatureUrl(consentRecord, verificationToken);
          break;

        case 'CREDIT_CARD':
          verificationUrl = await this.initiateCreditCardVerification(consentRecord);
          break;

        case 'GOVERNMENT_ID':
          verificationUrl = await this.generateIDVerificationUrl(consentRecord);
          break;

        case 'VIDEO_CALL':
          // Schedule video call (would integrate with scheduling system)
          await this.scheduleVideoVerification(consentRecord);
          break;

        default:
          throw new Error('Unsupported verification method');
      }

      // Log consent initiation
      await this.logCOPPAEvent(tenantDb, {
        event_type: 'CONSENT_INITIATED',
        child_id: consentRequest.childId,
        parent_email: consentRequest.parentEmail,
        verification_method: consentRequest.verificationMethod,
        consent_id: consentId,
        success: true,
      });

      logger.info(`Initiated parental consent for child ${consentRequest.childId}, method: ${consentRequest.verificationMethod}`);

      return { consentId, verificationUrl };
    });
  }

  /**
   * Verify parental consent
   */
  static async verifyParentalConsent(
    tenantId: string,
    consentId: string,
    verificationData: any
  ): Promise<ConsentVerificationResult> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      // Retrieve consent request
      const consentKey = `coppa_consent:${consentId}`;
      const consentRecord = await this.getConsentRequest(consentKey);

      if (!consentRecord) {
        throw new Error('Consent request not found or expired');
      }

      if (consentRecord.status !== 'PENDING') {
        throw new Error('Consent request already processed');
      }

      let isValid = false;
      let verificationMethod = consentRecord.verification_method;

      // Verify based on method
      switch (verificationMethod) {
        case 'EMAIL':
          isValid = await this.verifyEmailConsent(consentRecord, verificationData);
          break;

        case 'DIGITAL_SIGNATURE':
          isValid = await this.verifyDigitalSignature(consentRecord, verificationData);
          break;

        case 'CREDIT_CARD':
          isValid = await this.verifyCreditCardConsent(consentRecord, verificationData);
          break;

        case 'GOVERNMENT_ID':
          isValid = await this.verifyGovernmentID(consentRecord, verificationData);
          break;

        case 'VIDEO_CALL':
          isValid = await this.verifyVideoCallConsent(consentRecord, verificationData);
          break;

        default:
          throw new Error('Unsupported verification method');
      }

      const consentDate = new Date();
      const expiryDate = new Date(consentDate.getTime() + this.CONSENT_VALIDITY_PERIOD);

      if (isValid) {
        // Update child's COPPA record
        await this.updateChildCOPPARecord(
          tenantDb,
          consentRecord.child_id,
          {
            parental_consents: JSON.parse(consentRecord.consent_type),
            consent_date: consentDate,
            consent_method: verificationMethod,
            parent_verification_method: verificationMethod,
            data_permissions: JSON.parse(consentRecord.data_permissions),
          }
        );

        // Update consent status
        consentRecord.status = 'VERIFIED';
        consentRecord.verified_at = consentDate;
        await this.storeConsentRequest(consentKey, consentRecord);

        // Update user status to active
        await tenantDb('users')
          .where({ id: consentRecord.child_id })
          .update({ status: 'ACTIVE' });

        await this.logCOPPAEvent(tenantDb, {
          event_type: 'CONSENT_VERIFIED',
          child_id: consentRecord.child_id,
          parent_email: consentRecord.parent_email,
          verification_method: verificationMethod,
          consent_id: consentId,
          success: true,
        });

        logger.info(`Parental consent verified for child ${consentRecord.child_id}`);
      } else {
        await this.logCOPPAEvent(tenantDb, {
          event_type: 'CONSENT_VERIFICATION_FAILED',
          child_id: consentRecord.child_id,
          parent_email: consentRecord.parent_email,
          verification_method: verificationMethod,
          consent_id: consentId,
          success: false,
          failure_reason: 'VERIFICATION_FAILED',
        });
      }

      return {
        isValid,
        consentId: isValid ? consentId : undefined,
        verificationMethod,
        consentDate,
        expiryDate: isValid ? expiryDate : undefined,
        permissions: JSON.parse(consentRecord.data_permissions),
      };
    });
  }

  /**
   * Check if parental consent is valid and current
   */
  static async checkParentalConsent(
    tenantId: string,
    childId: string,
    dataType?: string
  ): Promise<{
    hasValidConsent: boolean;
    permissions: DataPermissions;
    consentDate?: Date;
    expiryDate?: Date;
  }> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const coppaRecord = await tenantDb('coppa_users')
        .where({ user_id: childId })
        .first();

      if (!coppaRecord) {
        return {
          hasValidConsent: false,
          permissions: this.getDefaultPermissions(),
        };
      }

      const consentDate = coppaRecord.consent_date;
      const hasConsent = !!consentDate;
      const permissions = coppaRecord.data_permissions || this.getDefaultPermissions();

      // Check if consent is still valid (not expired)
      let isValid = hasConsent;
      if (hasConsent && consentDate) {
        const expiryDate = new Date(consentDate.getTime() + this.CONSENT_VALIDITY_PERIOD);
        isValid = new Date() <= expiryDate;
      }

      // Check specific data type permission if requested
      if (isValid && dataType && permissions[dataType as keyof DataPermissions] === false) {
        isValid = false;
      }

      return {
        hasValidConsent: isValid,
        permissions,
        consentDate: consentDate ? new Date(consentDate) : undefined,
        expiryDate: consentDate ? new Date(consentDate.getTime() + this.CONSENT_VALIDITY_PERIOD) : undefined,
      };
    });
  }

  /**
   * Revoke parental consent
   */
  static async revokeParentalConsent(
    tenantId: string,
    childId: string,
    parentId: string,
    reason?: string
  ): Promise<boolean> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      // Verify parent relationship
      const coppaRecord = await tenantDb('coppa_users')
        .where({ user_id: childId, parent_id: parentId })
        .first();

      if (!coppaRecord) {
        throw new Error('Parent-child relationship not found');
      }

      // Update COPPA record to revoke consent
      await tenantDb('coppa_users')
        .where({ user_id: childId })
        .update({
          parental_consents: JSON.stringify({}),
          data_permissions: JSON.stringify(this.getMinimalPermissions()),
          consent_revoked_at: new Date(),
          consent_revocation_reason: reason || 'PARENT_REQUEST',
        });

      // Update child user status
      await tenantDb('users')
        .where({ id: childId })
        .update({ status: 'SUSPENDED' });

      await this.logCOPPAEvent(tenantDb, {
        event_type: 'CONSENT_REVOKED',
        child_id: childId,
        parent_id: parentId,
        success: true,
        metadata: { reason },
      });

      logger.info(`Parental consent revoked for child ${childId} by parent ${parentId}`);
      return true;
    });
  }

  /**
   * Schedule data deletion for child user
   */
  static async scheduleChildDataDeletion(
    tenantId: string,
    childId: string,
    deletionDate?: Date
  ): Promise<boolean> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const scheduledDate = deletionDate || new Date(Date.now() + this.DATA_RETENTION_PERIOD);

      await tenantDb('coppa_users')
        .where({ user_id: childId })
        .update({
          data_retention_date: scheduledDate,
          deletion_scheduled: true,
        });

      await this.logCOPPAEvent(tenantDb, {
        event_type: 'DATA_DELETION_SCHEDULED',
        child_id: childId,
        success: true,
        metadata: { scheduled_date: scheduledDate },
      });

      logger.info(`Scheduled data deletion for child ${childId} on ${scheduledDate}`);
      return true;
    });
  }

  // Private helper methods

  private static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private static getDefaultPermissions(): DataPermissions {
    return {
      basicInfo: false,
      communication: true, // Required for service
      photos: false,
      performanceTracking: false,
      marketing: false,
      locationTracking: false,
      thirdPartySharing: false,
    };
  }

  private static getMinimalPermissions(): DataPermissions {
    return {
      basicInfo: false,
      communication: false,
      photos: false,
      performanceTracking: false,
      marketing: false,
      locationTracking: false,
      thirdPartySharing: false,
    };
  }

  private static async storeConsentRequest(key: string, data: any): Promise<void> {
    const { redisClient } = await import('../config/database');
    await redisClient.setEx(key, 7 * 24 * 60 * 60, JSON.stringify(data)); // 7 days
  }

  private static async getConsentRequest(key: string): Promise<any> {
    const { redisClient } = await import('../config/database');
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  private static async sendEmailVerification(
    consentRecord: any,
    verificationToken: string
  ): Promise<string> {
    const verificationUrl = `${process.env.FRONTEND_URL}/coppa/verify?consent=${consentRecord.id}&token=${verificationToken}`;

    // Configure email transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const emailContent = `
      <h2>Parental Consent Required - GameTriq Basketball League</h2>
      <p>Dear ${consentRecord.parent_first_name} ${consentRecord.parent_last_name},</p>
      
      <p>Your consent is required for your child to participate in our basketball league platform. 
      We are committed to protecting your child's privacy in accordance with COPPA regulations.</p>
      
      <p><strong>Child Information:</strong></p>
      <ul>
        <li>Child ID: ${consentRecord.child_id}</li>
        <li>Consent Type: ${Object.keys(JSON.parse(consentRecord.consent_type)).filter(k => JSON.parse(consentRecord.consent_type)[k]).join(', ')}</li>
      </ul>
      
      <p>Please click the link below to provide your consent:</p>
      <p><a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">Provide Consent</a></p>
      
      <p>This link will expire in 7 days. If you did not request this, please contact our support team.</p>
      
      <p>Best regards,<br>GameTriq Basketball League Team</p>
    `;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: consentRecord.parent_email,
      subject: 'Parental Consent Required - GameTriq Basketball League',
      html: emailContent,
    });

    return verificationUrl;
  }

  private static async generateDigitalSignatureUrl(
    consentRecord: any,
    verificationToken: string
  ): Promise<string> {
    // In a real implementation, this would integrate with a digital signature provider
    return `${process.env.FRONTEND_URL}/coppa/digital-signature?consent=${consentRecord.id}&token=${verificationToken}`;
  }

  private static async initiateCreditCardVerification(consentRecord: any): Promise<string> {
    // In a real implementation, this would integrate with payment processor for verification
    return `${process.env.FRONTEND_URL}/coppa/credit-card-verify?consent=${consentRecord.id}`;
  }

  private static async generateIDVerificationUrl(consentRecord: any): Promise<string> {
    // In a real implementation, this would integrate with ID verification service
    return `${process.env.FRONTEND_URL}/coppa/id-verification?consent=${consentRecord.id}`;
  }

  private static async scheduleVideoVerification(consentRecord: any): Promise<void> {
    // In a real implementation, this would integrate with scheduling system
    logger.info(`Video verification scheduled for consent ${consentRecord.id}`);
  }

  private static async verifyEmailConsent(consentRecord: any, verificationData: any): Promise<boolean> {
    return verificationData.token === consentRecord.verification_token;
  }

  private static async verifyDigitalSignature(consentRecord: any, verificationData: any): Promise<boolean> {
    // Verify digital signature (would integrate with signature provider)
    return verificationData.signature && verificationData.signatureValid === true;
  }

  private static async verifyCreditCardConsent(consentRecord: any, verificationData: any): Promise<boolean> {
    // Verify credit card authorization (would integrate with payment processor)
    return verificationData.authorizationCode && verificationData.verified === true;
  }

  private static async verifyGovernmentID(consentRecord: any, verificationData: any): Promise<boolean> {
    // Verify government ID (would integrate with ID verification service)
    return verificationData.idVerified === true && verificationData.confidence > 0.8;
  }

  private static async verifyVideoCallConsent(consentRecord: any, verificationData: any): Promise<boolean> {
    // Verify video call consent (manual verification by staff)
    return verificationData.staffVerified === true && verificationData.staffId;
  }

  private static async updateChildCOPPARecord(
    tenantDb: any,
    childId: string,
    updateData: any
  ): Promise<void> {
    await tenantDb('coppa_users')
      .where({ user_id: childId })
      .update({
        ...updateData,
        updated_at: new Date(),
      });
  }

  private static async logCOPPAEvent(
    db: any,
    event: {
      event_type: string;
      child_id?: string;
      parent_id?: string;
      parent_email?: string;
      verification_method?: string;
      consent_id?: string;
      success: boolean;
      failure_reason?: string;
      metadata?: any;
    }
  ): Promise<void> {
    await db('auth_audit_log').insert({
      user_id: event.child_id,
      event_type: event.event_type,
      success: event.success,
      failure_reason: event.failure_reason,
      metadata: JSON.stringify({
        ...event.metadata,
        parent_id: event.parent_id,
        parent_email: event.parent_email,
        verification_method: event.verification_method,
        consent_id: event.consent_id,
      }),
      created_at: new Date(),
    });
  }
}