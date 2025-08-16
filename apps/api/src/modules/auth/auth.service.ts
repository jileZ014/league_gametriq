import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { MfaSecret } from './entities/mfa-secret.entity';
import { Session } from './entities/session.entity';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { AuditService } from './services/audit.service';
import { DataRetentionService } from './services/data-retention.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(MfaSecret)
    private mfaSecretRepository: Repository<MfaSecret>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private auditService: AuditService,
    private dataRetentionService: DataRetentionService,
  ) {}

  async register(registerDto: RegisterDto, ipAddress: string) {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // COPPA Compliance: Age verification
    const currentYear = new Date().getFullYear();
    const isMinor = registerDto.yearOfBirth && 
      (currentYear - parseInt(registerDto.yearOfBirth)) < 13;

    // COPPA: Require parental consent for minors
    if (isMinor && !registerDto.parentUserId) {
      throw new BadRequestException(
        'Parental consent required for users under 13. Please have a parent create an account first.'
      );
    }

    // Validate parent exists if provided
    if (registerDto.parentUserId) {
      const parentUser = await this.userRepository.findOne({
        where: { id: registerDto.parentUserId, role: 'parent' },
      });
      if (!parentUser) {
        throw new BadRequestException('Invalid parent user ID');
      }
    }

    // Enhanced password security with pepper
    const pepper = this.configService.get('security.pepper') || 'default-pepper';
    const saltRounds = this.configService.get('security.bcryptRounds') || 14; // Higher for youth platform
    const hashedPassword = await bcrypt.hash(
      registerDto.password + pepper,
      saltRounds,
    );

    // Hash IP address for privacy (COPPA requirement)
    const registrationIpHash = createHash('sha256')
      .update(ipAddress + this.configService.get('security.ipSalt', 'default-salt'))
      .digest('hex');

    // Create user with COPPA compliance
    const userData: any = {
      id: uuidv4(),
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phoneNumber: registerDto.phoneNumber,
      role: registerDto.role,
      organizationId: registerDto.organizationId,
      registrationIpHash,
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // COPPA: Handle minor data differently
    if (isMinor) {
      userData.isMinor = true;
      userData.birthYear = parseInt(registerDto.yearOfBirth);
      userData.parentEmail = registerDto.parentUserId ? 
        (await this.userRepository.findOne({ where: { id: registerDto.parentUserId } }))?.email : null;
      // Don't store full date of birth for minors
      userData.dateOfBirth = null;
    } else {
      userData.isMinor = false;
      userData.birthYear = registerDto.yearOfBirth ? parseInt(registerDto.yearOfBirth) : null;
      // Can store full date for adults if provided
      userData.dateOfBirth = registerDto.yearOfBirth ? 
        new Date(parseInt(registerDto.yearOfBirth), 0, 1) : null;
    }

    const user = this.userRepository.create(userData);
    await this.userRepository.save(user);

    // COPPA: Apply data minimization and schedule retention policies for minors
    if (isMinor) {
      await this.dataRetentionService.applyDataMinimization(user.id);
      await this.dataRetentionService.scheduleDataDeletion(user.id);
    }

    // Log registration for audit (required for youth platforms)
    await this.auditService.logSecurityEvent(
      user.id,
      'USER_REGISTERED',
      {
        isMinor,
        role: registerDto.role,
        parentUserId: registerDto.parentUserId,
      },
      ipAddress,
    );

    // Remove sensitive data from response
    const { password, registrationIpHash: _, ...userResponse } = user;

    return {
      message: isMinor ? 
        'Registration successful. Account requires parental verification.' : 
        'Registration successful.',
      user: userResponse,
      requiresParentalVerification: isMinor,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
      select: ['id', 'email', 'password', 'isActive', 'failedLoginAttempts', 'lockoutUntil', 'role', 'isMinor'],
    });

    if (!user) {
      // Use timing-safe comparison to prevent user enumeration
      const dummyHash = '$2b$14$dummyhashtopreventtimingattacks';
      await bcrypt.compare(password, dummyHash);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked BEFORE password check to prevent timing attacks
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new ForbiddenException('Account is temporarily locked');
    }

    // Enhanced password validation with pepper
    const pepper = this.configService.get('security.pepper') || 'default-pepper';
    const isPasswordValid = await bcrypt.compare(
      password + pepper,
      user.password,
    );

    if (!isPasswordValid) {
      // Log failed attempt with enhanced monitoring for minors
      await this.logFailedAttempt(user.id, user.isMinor);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Additional security check for weak passwords (legacy users)
    if (await this.isPasswordWeak(password)) {
      // Force password change for weak passwords
      const { password: _, ...result } = user;
      return {
        ...result,
        forcePasswordChange: true,
      };
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await this.userRepository.save(user);
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any, ipAddress: string, userAgent: string) {
    // COPPA: Additional security checks for minors
    if (user.isMinor) {
      // Check if minor has parental consent
      const hasValidConsent = await this.checkParentalConsent(user.id);
      if (!hasValidConsent) {
        throw new ForbiddenException(
          'Account requires valid parental consent to access the platform.'
        );
      }

      // Enhanced monitoring for minor logins
      await this.auditService.logSecurityEvent(
        user.id,
        'MINOR_LOGIN_ATTEMPT',
        { isMinor: true },
        ipAddress,
        userAgent,
      );
    }

    // Check for MFA (age-appropriate methods)
    if (user.mfaEnabled) {
      // For minors, ensure MFA method is appropriate (no SMS)
      if (user.isMinor) {
        const mfaSecret = await this.mfaSecretRepository.findOne({
          where: { userId: user.id },
        });
        if (mfaSecret?.mfaMethod === 'sms') {
          throw new BadRequestException(
            'SMS MFA not allowed for minors. Please use authenticator app.'
          );
        }
      }

      return {
        requiresMfa: true,
        tempToken: await this.generateTempToken(user),
        isMinor: user.isMinor,
      };
    }

    // Create session with appropriate timeout for user type
    const session = await this.createSession(user.id, ipAddress, userAgent);

    // Generate tokens with shorter expiry for minors
    const tokens = await this.generateTokens(user, session.id);

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken, session.id);

    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    // Log successful login
    await this.auditService.logSecurityEvent(
      user.id,
      'LOGIN_SUCCESS',
      {
        sessionId: session.id,
        isMinor: user.isMinor,
      },
      ipAddress,
      userAgent,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        isMinor: user.isMinor,
        requiresParentalSupervision: user.isMinor,
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    // Verify refresh token exists and is valid
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: {
        userId,
        token: refreshToken,
        expiresAt: MoreThan(new Date()),
        revoked: false,
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Rotate refresh token (security best practice)
    tokenRecord.revoked = true;
    tokenRecord.revokedAt = new Date();
    await this.refreshTokenRepository.save(tokenRecord);

    // Generate new tokens
    const tokens = await this.generateTokens(user, tokenRecord.sessionId);

    // Save new refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken, tokenRecord.sessionId);

    return tokens;
  }

  async logout(userId: string) {
    // Revoke all refresh tokens for user
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );

    // End all sessions
    await this.sessionRepository.update(
      { userId, isActive: true },
      { isActive: false, endedAt: new Date() },
    );

    return { message: 'Logout successful' };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'organizationId',
        'phoneNumber',
        'avatar',
        'mfaEnabled',
        'emailVerifiedAt',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const pepper = this.configService.get('security.pepper');
    const isPasswordValid = await bcrypt.compare(
      currentPassword + pepper,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword + pepper,
      this.configService.get('security.bcryptRounds') || 12,
    );

    // Update password
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await this.userRepository.save(user);

    // Revoke all refresh tokens (force re-login)
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await this.userRepository.save(user);

    // TODO: Send email with reset link
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const pepper = this.configService.get('security.pepper');
    const hashedPassword = await bcrypt.hash(
      newPassword + pepper,
      this.configService.get('security.bcryptRounds') || 12,
    );

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.passwordChangedAt = new Date();
    await this.userRepository.save(user);

    return { message: 'Password reset successful' };
  }

  async enableMfa(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // COPPA: Restrict MFA methods for minors
    if (user.isMinor) {
      // For minors, only allow TOTP (no SMS, email, or other methods)
      await this.auditService.logSecurityEvent(
        userId,
        'MINOR_MFA_SETUP',
        {
          userAge: user.getAge(),
          method: 'TOTP_ONLY',
          isMinor: true,
        },
      );
    }

    // Generate secret with enhanced security for minors
    const secret = speakeasy.generateSecret({
      name: `Gametriq Basketball (${user.email})`,
      issuer: 'Gametriq Basketball League',
      length: user.isMinor ? 32 : 20, // Longer secret for minors
    });

    // Save secret with enhanced security metadata
    const mfaSecret = this.mfaSecretRepository.create({
      userId,
      secret: secret.base32,
      backupCodes: this.generateBackupCodes(user.isMinor),
      mfaMethod: 'totp', // Only TOTP allowed
      isMinorAccount: user.isMinor,
      createdAt: new Date(),
    });
    await this.mfaSecretRepository.save(mfaSecret);

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Enhanced instructions for minors
    const instructions = user.isMinor
      ? 'Please use an authenticator app like Google Authenticator or Authy. SMS is not available for accounts under 13.'
      : 'Scan this QR code with your authenticator app.';

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: mfaSecret.backupCodes,
      instructions,
      isMinorAccount: user.isMinor,
      method: 'totp',
    };
  }

  async verifyMfa(userId: string, token: string) {
    const mfaSecret = await this.mfaSecretRepository.findOne({
      where: { userId },
    });

    if (!mfaSecret) {
      throw new NotFoundException('MFA not set up');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    // Enhanced security for minor MFA verification
    if (user?.isMinor) {
      await this.auditService.logSecurityEvent(
        userId,
        'MINOR_MFA_VERIFICATION',
        {
          isBackupCode: token.length > 6,
          isMinor: true,
        },
      );
    }

    let verificationMethod = 'totp';
    let verified = false;

    // Verify TOTP token
    verified = speakeasy.totp.verify({
      secret: mfaSecret.secret,
      encoding: 'base32',
      token,
      window: user?.isMinor ? 1 : 2, // Stricter window for minors
    });

    if (!verified) {
      // Check backup codes
      const backupCodeIndex = mfaSecret.backupCodes.indexOf(token.toUpperCase());
      if (backupCodeIndex === -1) {
        // Log failed MFA attempt
        await this.auditService.logSecurityEvent(
          userId,
          'MFA_VERIFICATION_FAILED',
          {
            isMinor: user?.isMinor,
            tokenLength: token.length,
          },
        );
        throw new BadRequestException('Invalid MFA token');
      }

      // Remove used backup code
      mfaSecret.backupCodes.splice(backupCodeIndex, 1);
      await this.mfaSecretRepository.save(mfaSecret);
      verificationMethod = 'backup_code';
      verified = true;

      // Alert if backup codes are running low
      if (mfaSecret.backupCodes.length <= 3) {
        await this.auditService.logSecurityEvent(
          userId,
          'LOW_BACKUP_CODES',
          {
            remaining: mfaSecret.backupCodes.length,
            isMinor: user?.isMinor,
          },
        );
      }
    }

    // Enable MFA on first successful verification
    if (!user.mfaEnabled) {
      user.mfaEnabled = true;
      await this.userRepository.save(user);

      await this.auditService.logSecurityEvent(
        userId,
        'MFA_ENABLED',
        {
          isMinor: user.isMinor,
          method: 'totp',
        },
      );
    }

    // Log successful verification
    await this.auditService.logSecurityEvent(
      userId,
      'MFA_VERIFICATION_SUCCESS',
      {
        method: verificationMethod,
        isMinor: user?.isMinor,
      },
    );

    return { 
      verified: true,
      method: verificationMethod,
      backupCodesRemaining: mfaSecret.backupCodes.length,
    };
  }

  async disableMfa(userId: string, token: string) {
    // Verify MFA token first
    await this.verifyMfa(userId, token);

    // Disable MFA
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    user.mfaEnabled = false;
    await this.userRepository.save(user);

    // Remove MFA secret
    await this.mfaSecretRepository.delete({ userId });

    return { message: 'MFA disabled successfully' };
  }

  async getActiveSessions(userId: string) {
    return this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.isActive = false;
    session.endedAt = new Date();
    await this.sessionRepository.save(session);

    // Revoke associated refresh tokens
    await this.refreshTokenRepository.update(
      { sessionId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );

    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(userId: string, currentSessionId: string) {
    // End all sessions except current
    await this.sessionRepository.update(
      { userId, isActive: true, id: currentSessionId ? { not: currentSessionId } : undefined },
      { isActive: false, endedAt: new Date() },
    );

    // Revoke all refresh tokens except current session
    await this.refreshTokenRepository.update(
      { userId, revoked: false, sessionId: currentSessionId ? { not: currentSessionId } : undefined },
      { revoked: true, revokedAt: new Date() },
    );

    return { message: 'All other sessions revoked successfully' };
  }

  // COPPA Privacy Control Methods
  async requestDataExport(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Enhanced audit logging for data export requests
    await this.auditService.logSecurityEvent(
      userId,
      'DATA_EXPORT_REQUESTED',
      {
        isMinor: user.isMinor,
        requestedBy: 'user', // Could be 'parent' for minors
      },
    );

    return this.dataRetentionService.getDataExportForUser(userId);
  }

  async requestDataDeletion(userId: string, dataTypes: string[]): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Enhanced audit logging for data deletion requests
    await this.auditService.logSecurityEvent(
      userId,
      'DATA_DELETION_REQUESTED',
      {
        isMinor: user.isMinor,
        dataTypes,
        requestedBy: 'user',
      },
    );

    return this.dataRetentionService.executeDataDeletion(userId, dataTypes);
  }

  async getPrivacySettings(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Return privacy settings with COPPA-appropriate defaults for minors
    const settings = {
      userId,
      isMinor: user.isMinor,
      dataMinimization: user.isMinor, // Always true for minors
      parentalNotifications: user.isMinor, // Always true for minors
      dataExportAllowed: true,
      marketingOptOut: user.isMinor, // Always opted out for minors
      analyticsOptOut: user.isMinor, // Always opted out for minors
      sessionTimeout: user.isMinor ? 300 : 900, // 5 min for minors, 15 for adults
      mfaRequired: user.mfaEnabled,
      dataRetentionPeriod: user.isMinor ? 365 : 2555, // 1 year vs 7 years
    };

    return settings;
  }

  async updatePrivacySettings(userId: string, settings: any): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // COPPA: Restrict certain settings for minors
    if (user.isMinor) {
      // Override settings that must be protected for minors
      settings.dataMinimization = true;
      settings.parentalNotifications = true;
      settings.marketingOptOut = true;
      settings.analyticsOptOut = true;

      await this.auditService.logSecurityEvent(
        userId,
        'MINOR_PRIVACY_SETTINGS_UPDATED',
        {
          isMinor: true,
          settingsUpdated: Object.keys(settings),
          enforcedRestrictions: [
            'dataMinimization',
            'parentalNotifications',
            'marketingOptOut',
            'analyticsOptOut',
          ],
        },
      );
    }

    // Log privacy settings update
    await this.auditService.logSecurityEvent(
      userId,
      'PRIVACY_SETTINGS_UPDATED',
      {
        isMinor: user.isMinor,
        settingsUpdated: Object.keys(settings),
      },
    );

    return { message: 'Privacy settings updated successfully', settings };
  }

  async getComplianceStatus(userId: string): Promise<any> {
    return this.dataRetentionService.checkComplianceStatus(userId);
  }

  // Private helper methods

  private async generateTempToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      type: 'mfa_pending',
    };

    return this.jwtService.sign(payload, { expiresIn: '5m' });
  }

  private async saveRefreshToken(
    userId: string,
    token: string,
    sessionId: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    const expiresAt = new Date();
    // Shorter refresh token lifetime for minors
    const refreshTokenDays = user?.isMinor ? 1 : 7; // 1 day for minors, 7 for adults
    expiresAt.setDate(expiresAt.getDate() + refreshTokenDays);

    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token,
      sessionId,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);
  }

  private async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    // Enhanced session limits based on user type
    const maxSessions = user?.isMinor ? 2 : 5; // Stricter limits for minors
    const activeSessions = await this.sessionRepository.count({
      where: { userId, isActive: true },
    });

    if (activeSessions >= maxSessions) {
      // Revoke oldest session
      const oldestSession = await this.sessionRepository.findOne({
        where: { userId, isActive: true },
        order: { createdAt: 'ASC' },
      });

      if (oldestSession) {
        await this.revokeSession(userId, oldestSession.id);
        
        await this.auditService.logSecurityEvent(
          userId,
          'SESSION_LIMIT_EXCEEDED',
          {
            isMinor: user?.isMinor,
            maxSessions,
            revokedSessionId: oldestSession.id,
          },
          ipAddress,
          userAgent,
        );
      }
    }

    // Enhanced session metadata for security monitoring
    const sessionData = {
      userId,
      ipAddress,
      userAgent: this.sanitizeUserAgent(userAgent),
      isActive: true,
      device: this.extractDevice(userAgent),
      browser: this.extractBrowser(userAgent),
      location: await this.getLocationFromIp(ipAddress),
    };

    const session = this.sessionRepository.create(sessionData);
    const savedSession = await this.sessionRepository.save(session);

    // Schedule automatic session timeout based on user type
    await this.scheduleSessionTimeout(savedSession.id, user?.isMinor);

    return savedSession;
  }

  private async logFailedAttempt(userId: string, isMinor: boolean = false) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    user.lastFailedLogin = new Date();

    // Stricter lockout policy for minors (3 attempts vs 5 for adults)
    const maxAttempts = isMinor ? 3 : 5;
    const lockoutDuration = isMinor ? 60 : 30; // 60 minutes for minors, 30 for adults

    if (user.failedLoginAttempts >= maxAttempts) {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + lockoutDuration);
      user.lockoutUntil = lockoutUntil;

      // Enhanced logging for lockouts
      await this.auditService.logSecurityEvent(
        userId,
        'ACCOUNT_LOCKED',
        {
          isMinor,
          attempts: user.failedLoginAttempts,
          lockoutDuration,
        },
      );
    }

    await this.userRepository.save(user);
  }

  private async isPasswordWeak(password: string): Promise<boolean> {
    // Check against common weak passwords
    const commonWeakPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '123456789', 'abc123'
    ];

    const lowerPassword = password.toLowerCase();
    
    // Check if password is too common
    if (commonWeakPasswords.includes(lowerPassword)) {
      return true;
    }

    // Check if password contains common patterns
    const weakPatterns = [
      /^[a-z]+$/, // all lowercase
      /^[A-Z]+$/, // all uppercase  
      /^[0-9]+$/, // all numbers
      /(.)\1{3,}/, // repeated characters (aaaa)
      /^(012|123|234|345|456|567|678|789|890)+/, // sequential numbers
      /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i, // sequential letters
    ];

    return weakPatterns.some(pattern => pattern.test(password));
  }

  private validatePasswordStrength(password: string, isMinor: boolean = false): string[] {
    const errors: string[] = [];
    
    // Enhanced requirements for youth platform
    const minLength = isMinor ? 10 : 8; // Longer passwords for minors
    
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    // Additional requirements for minors
    if (isMinor) {
      if (!/(?=.*[A-Z].*[A-Z])/.test(password)) {
        errors.push('Password must contain at least two uppercase letters');
      }
      
      if (!/(?=.*\d.*\d)/.test(password)) {
        errors.push('Password must contain at least two numbers');
      }
    }

    // Check for common weak patterns
    if (this.isPasswordWeak(password)) {
      errors.push('Password is too common or contains weak patterns');
    }

    return errors;
  }

  private generateBackupCodes(isMinorAccount: boolean = false): string[] {
    const codes = [];
    const codeCount = isMinorAccount ? 12 : 10; // More backup codes for minors
    const codeLength = isMinorAccount ? 10 : 8; // Longer codes for minors
    
    for (let i = 0; i < codeCount; i++) {
      // Use crypto for secure random generation
      const randomBytes = require('crypto').randomBytes(codeLength);
      const code = randomBytes.toString('hex').toUpperCase().substring(0, codeLength);
      codes.push(code);
    }
    return codes;
  }

  // COPPA Compliance Methods
  private async checkParentalConsent(userId: string): Promise<boolean> {
    // This would integrate with your parental consent system
    // For now, we'll check if a minor has an associated parent
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['parentalConsents'],
    });

    if (!user || !user.isMinor) {
      return true; // Adults don't need parental consent
    }

    // Check if there's valid parental consent
    if (user.parentalConsents && user.parentalConsents.length > 0) {
      const validConsent = user.parentalConsents.find(
        consent => consent.isActive && consent.expiresAt > new Date()
      );
      return !!validConsent;
    }

    return false;
  }


  // Enhanced token generation with age-appropriate expiry
  private async generateTokens(user: any, sessionId: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      sessionId,
      isMinor: user.isMinor,
    };

    // Shorter token expiry for minors (5 minutes vs 15 minutes)
    const accessTokenExpiry = user.isMinor ? '5m' : '15m';
    const expiresInSeconds = user.isMinor ? 300 : 900;

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiry,
    });

    // Shorter refresh token for minors (1 day vs 7 days)
    const refreshTokenExpiry = user.isMinor ? '1d' : 
      this.configService.get('jwt.refreshTokenExpiry', '7d');

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  // Session management helper methods
  private sanitizeUserAgent(userAgent: string): string {
    if (!userAgent) return 'unknown';
    return userAgent.replace(/\([^)]*\)/g, '(sanitized)').substring(0, 200);
  }

  private extractDevice(userAgent: string): string {
    if (!userAgent) return 'unknown';
    
    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Tablet')) return 'tablet';
    if (userAgent.includes('Desktop')) return 'desktop';
    
    return 'unknown';
  }

  private extractBrowser(userAgent: string): string {
    if (!userAgent) return 'unknown';
    
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    
    return 'unknown';
  }

  private async getLocationFromIp(ipAddress: string): Promise<string> {
    // In production, this would use a geolocation service
    // For youth platforms, minimize location tracking
    return 'general_region'; // Only store general region, not precise location
  }

  private async scheduleSessionTimeout(sessionId: string, isMinor: boolean = false): Promise<void> {
    // Schedule automatic session timeout
    const timeoutMinutes = isMinor ? 30 : 120; // 30 min for minors, 2 hours for adults
    
    // In production, this would use a job queue like Bull or similar
    setTimeout(async () => {
      try {
        const session = await this.sessionRepository.findOne({
          where: { id: sessionId, isActive: true },
        });
        
        if (session) {
          // Check if session has been active recently
          const inactiveMinutes = (Date.now() - session.lastActivity.getTime()) / (1000 * 60);
          
          if (inactiveMinutes >= timeoutMinutes) {
            session.isActive = false;
            session.endedAt = new Date();
            await this.sessionRepository.save(session);
            
            // Revoke associated refresh tokens
            await this.refreshTokenRepository.update(
              { sessionId, revoked: false },
              { revoked: true, revokedAt: new Date() },
            );
            
            await this.auditService.logSecurityEvent(
              session.userId,
              'SESSION_TIMEOUT',
              {
                sessionId,
                timeoutMinutes,
                isMinor,
              },
            );
          }
        }
      } catch (error) {
        console.error('[SESSION_TIMEOUT_ERROR]', error);
      }
    }, timeoutMinutes * 60 * 1000);
  }

  // Method to clean up expired sessions (should be run periodically)
  async cleanupExpiredSessions(): Promise<void> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24); // 24 hours ago
    
    // Find inactive sessions older than 24 hours
    const expiredSessions = await this.sessionRepository.find({
      where: {
        isActive: false,
        endedAt: LessThan(cutoffTime),
      },
    });
    
    // Clean up expired sessions and their refresh tokens
    for (const session of expiredSessions) {
      await this.refreshTokenRepository.delete({ sessionId: session.id });
      await this.sessionRepository.delete({ id: session.id });
    }
    
    await this.auditService.logSecurityEvent(
      'system',
      'SESSION_CLEANUP',
      {
        cleanedSessions: expiredSessions.length,
        cutoffTime: cutoffTime.toISOString(),
      },
    );
  }

  // Method to validate session activity (called by JWT strategy)
  async updateSessionActivity(sessionId: string): Promise<void> {
    if (!sessionId) return;
    
    await this.sessionRepository.update(
      { id: sessionId, isActive: true },
      { lastActivity: new Date() },
    );
  }
}