import { Knex } from 'knex';
import { TenantDatabase, logger } from '../config/database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import speakeasy from 'speakeasy';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'ARCHIVED';
  role: 'SYSTEM_ADMIN' | 'ORG_ADMIN' | 'LEAGUE_ADMIN' | 'COACH' | 'ASSISTANT_COACH' | 'PARENT' | 'PLAYER' | 'REFEREE' | 'SCOREKEEPER' | 'VOLUNTEER';
  email_verified: boolean;
  phone_verified: boolean;
  mfa_enabled: boolean;
  mfa_secret?: string;
  mfa_backup_codes?: string[];
  last_login?: Date;
  timezone: string;
  preferences: Record<string, any>;
  password_changed_at?: Date;
  force_password_change: boolean;
  failed_login_attempts: number;
  locked_until?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface COPPAUser {
  id: string;
  user_id: string;
  parent_id?: string;
  encrypted_first_name: string;
  encrypted_last_name: string;
  encrypted_birth_date: string;
  parental_consents: Record<string, any>;
  consent_date?: Date;
  consent_method?: string;
  parent_verification_method?: string;
  data_permissions: Record<string, any>;
  marketing_consent: boolean;
  communication_consent: boolean;
  photo_consent: boolean;
  data_retention_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserSession {
  id: string;
  user_id: string;
  refresh_token: string;
  device_fingerprint?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EmailVerificationToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthAuditLog {
  id: string;
  user_id?: string;
  event_type: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  success: boolean;
  failure_reason?: string;
  created_at: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: User['gender'];
  phone?: string;
  role: User['role'];
  timezone?: string;
}

export interface UpdateUserInput {
  first_name?: string;
  last_name?: string;
  phone?: string;
  timezone?: string;
  preferences?: Record<string, any>;
}

export class UserModel {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Create a new user with COPPA compliance checks
   */
  static async create(tenantId: string, userData: CreateUserInput): Promise<User> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const age = this.calculateAge(userData.birth_date);
      const isMinor = age < 13;

      // Hash password
      const password_hash = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

      // Prepare user data
      const userRecord = {
        ...userData,
        password_hash,
        age,
        status: 'PENDING_VERIFICATION' as const,
        email_verified: false,
        phone_verified: false,
        mfa_enabled: false,
        timezone: userData.timezone || 'America/Phoenix',
        preferences: {},
        force_password_change: false,
        failed_login_attempts: 0,
      };

      const trx = await tenantDb.transaction();

      try {
        // Insert user
        const [user] = await trx('users')
          .insert(userRecord)
          .returning('*');

        // If user is under 13, create COPPA record with encrypted data
        if (isMinor) {
          await this.createCOPPARecord(trx, user.id, {
            first_name: userData.first_name,
            last_name: userData.last_name,
            birth_date: userData.birth_date,
          });
        }

        // Log user creation
        await this.logAuthEvent(trx, {
          user_id: user.id,
          event_type: 'USER_CREATED',
          success: true,
          metadata: { is_minor: isMinor, role: userData.role },
        });

        await trx.commit();

        logger.info(`User created: ${user.id} (age: ${age}, minor: ${isMinor})`);
        return user;

      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  }

  /**
   * Find user by email
   */
  static async findByEmail(tenantId: string, email: string): Promise<User | null> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const user = await tenantDb('users')
        .where({ email: email.toLowerCase() })
        .first();

      return user || null;
    });
  }

  /**
   * Find user by ID
   */
  static async findById(tenantId: string, id: string): Promise<User | null> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const user = await tenantDb('users')
        .where({ id })
        .first();

      return user || null;
    });
  }

  /**
   * Authenticate user with password
   */
  static async authenticate(
    tenantId: string,
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: User | null; reason?: string }> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const user = await this.findByEmail(tenantId, email);

      if (!user) {
        await this.logAuthEvent(tenantDb, {
          event_type: 'LOGIN_FAILED',
          success: false,
          failure_reason: 'USER_NOT_FOUND',
          metadata: { email },
          ip_address: ipAddress,
          user_agent: userAgent,
        });
        return { user: null, reason: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.locked_until && user.locked_until > new Date()) {
        await this.logAuthEvent(tenantDb, {
          user_id: user.id,
          event_type: 'LOGIN_BLOCKED',
          success: false,
          failure_reason: 'ACCOUNT_LOCKED',
          ip_address: ipAddress,
          user_agent: userAgent,
        });
        return { user: null, reason: 'Account temporarily locked' };
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        // Increment failed attempts
        const failedAttempts = user.failed_login_attempts + 1;
        const updateData: any = { failed_login_attempts: failedAttempts };

        // Lock account if too many failed attempts
        if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
          updateData.locked_until = new Date(Date.now() + this.LOCKOUT_DURATION);
        }

        await tenantDb('users')
          .where({ id: user.id })
          .update(updateData);

        await this.logAuthEvent(tenantDb, {
          user_id: user.id,
          event_type: 'LOGIN_FAILED',
          success: false,
          failure_reason: 'INVALID_PASSWORD',
          ip_address: ipAddress,
          user_agent: userAgent,
        });

        return { user: null, reason: 'Invalid credentials' };
      }

      // Check user status
      if (user.status !== 'ACTIVE') {
        await this.logAuthEvent(tenantDb, {
          user_id: user.id,
          event_type: 'LOGIN_BLOCKED',
          success: false,
          failure_reason: 'ACCOUNT_INACTIVE',
          ip_address: ipAddress,
          user_agent: userAgent,
        });
        return { user: null, reason: 'Account not active' };
      }

      // Reset failed attempts and update last login
      await tenantDb('users')
        .where({ id: user.id })
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_login: new Date(),
        });

      await this.logAuthEvent(tenantDb, {
        user_id: user.id,
        event_type: 'LOGIN_SUCCESS',
        success: true,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return { user };
    });
  }

  /**
   * Update user information
   */
  static async update(
    tenantId: string,
    userId: string,
    updateData: UpdateUserInput
  ): Promise<User | null> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const [updatedUser] = await tenantDb('users')
        .where({ id: userId })
        .update({
          ...updateData,
          updated_at: new Date(),
        })
        .returning('*');

      if (updatedUser) {
        await this.logAuthEvent(tenantDb, {
          user_id: userId,
          event_type: 'USER_UPDATED',
          success: true,
          metadata: { updated_fields: Object.keys(updateData) },
        });
      }

      return updatedUser || null;
    });
  }

  /**
   * Update user password
   */
  static async updatePassword(
    tenantId: string,
    userId: string,
    newPassword: string
  ): Promise<boolean> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const password_hash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      const result = await tenantDb('users')
        .where({ id: userId })
        .update({
          password_hash,
          password_changed_at: new Date(),
          force_password_change: false,
          failed_login_attempts: 0,
          locked_until: null,
        });

      if (result) {
        await this.logAuthEvent(tenantDb, {
          user_id: userId,
          event_type: 'PASSWORD_CHANGED',
          success: true,
        });
      }

      return result > 0;
    });
  }

  /**
   * Enable MFA for user
   */
  static async enableMFA(tenantId: string, userId: string): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const user = await this.findById(tenantId, userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate MFA secret
      const secret = speakeasy.generateSecret({
        name: `GameTriq (${user.email})`,
        issuer: 'GameTriq League Management',
        length: 32,
      });

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Update user with MFA settings
      await tenantDb('users')
        .where({ id: userId })
        .update({
          mfa_secret: secret.base32,
          mfa_backup_codes: JSON.stringify(backupCodes),
          mfa_enabled: true,
        });

      await this.logAuthEvent(tenantDb, {
        user_id: userId,
        event_type: 'MFA_ENABLED',
        success: true,
      });

      return {
        secret: secret.base32!,
        qrCodeUrl: secret.otpauth_url!,
        backupCodes,
      };
    });
  }

  /**
   * Verify MFA token
   */
  static async verifyMFA(
    tenantId: string,
    userId: string,
    token: string,
    isBackupCode: boolean = false
  ): Promise<boolean> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const user = await this.findById(tenantId, userId);
      if (!user || !user.mfa_enabled) {
        return false;
      }

      let isValid = false;

      if (isBackupCode) {
        // Verify backup code
        const backupCodes = user.mfa_backup_codes || [];
        const codeIndex = backupCodes.indexOf(token.toUpperCase());
        
        if (codeIndex !== -1) {
          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          await tenantDb('users')
            .where({ id: userId })
            .update({ mfa_backup_codes: JSON.stringify(backupCodes) });
          
          isValid = true;
        }
      } else {
        // Verify TOTP token
        isValid = speakeasy.totp.verify({
          secret: user.mfa_secret!,
          encoding: 'base32',
          token,
          window: 2, // Allow 2 steps tolerance
        });
      }

      await this.logAuthEvent(tenantDb, {
        user_id: userId,
        event_type: 'MFA_VERIFICATION',
        success: isValid,
        failure_reason: isValid ? undefined : 'INVALID_TOKEN',
        metadata: { is_backup_code: isBackupCode },
      });

      return isValid;
    });
  }

  /**
   * Create user session
   */
  static async createSession(
    tenantId: string,
    userId: string,
    refreshToken: string,
    deviceFingerprint?: string,
    ipAddress?: string,
    userAgent?: string,
    expiresAt?: Date
  ): Promise<UserSession> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const sessionData = {
        user_id: userId,
        refresh_token: refreshToken,
        device_fingerprint: deviceFingerprint,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        is_active: true,
      };

      const [session] = await tenantDb('user_sessions')
        .insert(sessionData)
        .returning('*');

      await this.logAuthEvent(tenantDb, {
        user_id: userId,
        event_type: 'SESSION_CREATED',
        success: true,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return session;
    });
  }

  /**
   * Find active session by refresh token
   */
  static async findSessionByRefreshToken(tenantId: string, refreshToken: string): Promise<UserSession | null> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const session = await tenantDb('user_sessions')
        .where({
          refresh_token: refreshToken,
          is_active: true,
        })
        .where('expires_at', '>', new Date())
        .first();

      return session || null;
    });
  }

  /**
   * Invalidate session
   */
  static async invalidateSession(tenantId: string, refreshToken: string): Promise<boolean> {
    return TenantDatabase.withTenant(tenantId, async (tenantDb) => {
      const result = await tenantDb('user_sessions')
        .where({ refresh_token: refreshToken })
        .update({ is_active: false });

      if (result) {
        const session = await tenantDb('user_sessions')
          .where({ refresh_token: refreshToken })
          .first();

        if (session) {
          await this.logAuthEvent(tenantDb, {
            user_id: session.user_id,
            event_type: 'SESSION_INVALIDATED',
            success: true,
          });
        }
      }

      return result > 0;
    });
  }

  /**
   * Calculate age from birth date
   */
  private static calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Create COPPA record for users under 13
   */
  private static async createCOPPARecord(
    trx: Knex.Transaction,
    userId: string,
    personalData: { first_name: string; last_name: string; birth_date: string }
  ): Promise<void> {
    const encryptionKey = process.env.COPPA_ENCRYPTION_KEY || 'default-key-change-in-production';
    
    const coppaRecord = {
      user_id: userId,
      encrypted_first_name: this.encrypt(personalData.first_name, encryptionKey),
      encrypted_last_name: this.encrypt(personalData.last_name, encryptionKey),
      encrypted_birth_date: this.encrypt(personalData.birth_date, encryptionKey),
      parental_consents: {},
      data_permissions: {
        basic_info: false,
        communication: false,
        photos: false,
        performance_tracking: false,
        marketing: false,
      },
      marketing_consent: false,
      communication_consent: true, // Required for service
      photo_consent: false,
      data_retention_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };

    await trx('coppa_users').insert(coppaRecord);
  }

  /**
   * Simple encryption for COPPA data
   */
  private static encrypt(text: string, key: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Log authentication events
   */
  private static async logAuthEvent(
    db: Knex | Knex.Transaction,
    event: Omit<AuthAuditLog, 'id' | 'created_at'>
  ): Promise<void> {
    await db('auth_audit_log').insert({
      ...event,
      created_at: new Date(),
    });
  }
}