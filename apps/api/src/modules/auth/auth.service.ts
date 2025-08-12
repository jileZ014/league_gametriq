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
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { MfaSecret } from './entities/mfa-secret.entity';
import { Session } from './entities/session.entity';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';

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
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password with pepper
    const pepper = this.configService.get('security.pepper');
    const hashedPassword = await bcrypt.hash(
      registerDto.password + pepper,
      this.configService.get('security.bcryptRounds'),
    );

    // Create user
    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      id: uuidv4(),
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.userRepository.save(user);

    // Remove password from response
    delete user.password;

    return {
      message: 'Registration successful',
      user,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const pepper = this.configService.get('security.pepper');
    const isPasswordValid = await bcrypt.compare(
      password + pepper,
      user.password,
    );

    if (!isPasswordValid) {
      // Log failed attempt
      await this.logFailedAttempt(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new ForbiddenException('Account is temporarily locked');
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
    // Check for MFA
    if (user.mfaEnabled) {
      return {
        requiresMfa: true,
        tempToken: await this.generateTempToken(user),
      };
    }

    // Create session
    const session = await this.createSession(user.id, ipAddress, userAgent);

    // Generate tokens
    const tokens = await this.generateTokens(user, session.id);

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken, session.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
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
        'emailVerified',
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
      this.configService.get('security.bcryptRounds'),
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
      this.configService.get('security.bcryptRounds'),
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

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Gametriq (${user.email})`,
      issuer: 'Gametriq Basketball League',
    });

    // Save secret
    const mfaSecret = this.mfaSecretRepository.create({
      userId,
      secret: secret.base32,
      backupCodes: this.generateBackupCodes(),
    });
    await this.mfaSecretRepository.save(mfaSecret);

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: mfaSecret.backupCodes,
    };
  }

  async verifyMfa(userId: string, token: string) {
    const mfaSecret = await this.mfaSecretRepository.findOne({
      where: { userId },
    });

    if (!mfaSecret) {
      throw new NotFoundException('MFA not set up');
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: mfaSecret.secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps for clock skew
    });

    if (!verified) {
      // Check backup codes
      const backupCodeIndex = mfaSecret.backupCodes.indexOf(token);
      if (backupCodeIndex === -1) {
        throw new BadRequestException('Invalid MFA token');
      }

      // Remove used backup code
      mfaSecret.backupCodes.splice(backupCodeIndex, 1);
      await this.mfaSecretRepository.save(mfaSecret);
    }

    // Enable MFA on first successful verification
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user.mfaEnabled) {
      user.mfaEnabled = true;
      await this.userRepository.save(user);
    }

    return { verified: true };
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

  // Private helper methods
  private async generateTokens(user: any, sessionId: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('jwt.refreshTokenExpiry'),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

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
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

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
    // Check concurrent session limit
    const activeSessions = await this.sessionRepository.count({
      where: { userId, isActive: true },
    });

    if (activeSessions >= 3) {
      // Revoke oldest session
      const oldestSession = await this.sessionRepository.findOne({
        where: { userId, isActive: true },
        order: { createdAt: 'ASC' },
      });

      if (oldestSession) {
        await this.revokeSession(userId, oldestSession.id);
      }
    }

    const session = this.sessionRepository.create({
      userId,
      ipAddress,
      userAgent,
      isActive: true,
    });

    return this.sessionRepository.save(session);
  }

  private async logFailedAttempt(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    user.lastFailedLogin = new Date();

    // Lock account after 5 failed attempts
    if (user.failedLoginAttempts >= 5) {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + 30); // 30 minutes lockout
      user.lockoutUntil = lockoutUntil;
    }

    await this.userRepository.save(user);
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }
}