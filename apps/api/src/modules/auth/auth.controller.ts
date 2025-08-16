import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  Patch,
  Delete,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EnableMfaDto } from './dto/enable-mfa.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private hashIpAddress(ipAddress: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ipAddress + 'salt').digest('hex');
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 requests per 5 minutes (stricter for youth platform)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid registration data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto, @Req() req: any) {
    // Additional security headers for youth platform
    req.res.setHeader('X-Content-Type-Options', 'nosniff');
    req.res.setHeader('X-Frame-Options', 'DENY');
    req.res.setHeader('X-XSS-Protection', '1; mode=block');
    
    return this.authService.register(registerDto, req.ip);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 requests per 5 minutes (stricter for security)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    // Enhanced security headers
    req.res.setHeader('X-Content-Type-Options', 'nosniff');
    req.res.setHeader('X-Frame-Options', 'DENY');
    req.res.setHeader('X-XSS-Protection', '1; mode=block');
    req.res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    return this.authService.login(req.user, req.ip, req.headers['user-agent']);
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: any) {
    return this.authService.refreshTokens(
      req.user.sub,
      refreshTokenDto.refreshToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password successfully changed' })
  @ApiResponse({ status: 400, description: 'Invalid password data' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.sub,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 900000 } }) // 2 requests per 15 minutes (very strict)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto, @Req() req: any) {
    // Log password reset attempt for security monitoring
    console.log('[SECURITY_AUDIT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      eventType: 'PASSWORD_RESET_REQUEST',
      email: forgotPasswordDto.email,
      ipHash: this.hashIpAddress(req.ip),
    }));
    
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 requests per hour
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto, @Req() req: any) {
    // Log password reset completion for security monitoring
    console.log('[SECURITY_AUDIT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      eventType: 'PASSWORD_RESET_COMPLETED',
      token: resetPasswordDto.token.substring(0, 8) + '***', // Log partial token
      ipHash: this.hashIpAddress(req.ip),
    }));
    
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 requests per hour
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable MFA for user' })
  @ApiResponse({ status: 200, description: 'MFA setup initiated' })
  async enableMfa(@CurrentUser() user: any, @Req() req: any) {
    // COPPA: Restrict MFA methods for minors
    if (user.isMinor) {
      console.log('[SECURITY_AUDIT]', JSON.stringify({
        timestamp: new Date().toISOString(),
        eventType: 'MINOR_MFA_ENABLE_ATTEMPT',
        userId: user.sub,
        ipHash: this.hashIpAddress(req.ip),
      }));
    }
    
    return this.authService.enableMfa(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify MFA token' })
  @ApiResponse({ status: 200, description: 'MFA successfully verified' })
  @ApiResponse({ status: 400, description: 'Invalid MFA token' })
  async verifyMfa(
    @CurrentUser() user: any,
    @Body() verifyMfaDto: VerifyMfaDto,
    @Req() req: any,
  ) {
    // Enhanced logging for MFA verification
    console.log('[SECURITY_AUDIT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      eventType: 'MFA_VERIFICATION_ATTEMPT',
      userId: user.sub,
      isMinor: user.isMinor,
      ipHash: this.hashIpAddress(req.ip),
    }));
    
    return this.authService.verifyMfa(user.sub, verifyMfaDto.token);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA for user' })
  @ApiResponse({ status: 200, description: 'MFA successfully disabled' })
  async disableMfa(
    @CurrentUser() user: any,
    @Body() verifyMfaDto: VerifyMfaDto,
  ) {
    return this.authService.disableMfa(user.sub, verifyMfaDto.token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active sessions' })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved' })
  async getSessions(@CurrentUser() user: any, @Req() req: any) {
    // Enhanced monitoring for session access
    if (user.isMinor) {
      console.log('[SECURITY_AUDIT]', JSON.stringify({
        timestamp: new Date().toISOString(),
        eventType: 'MINOR_SESSION_ACCESS',
        userId: user.sub,
        ipHash: this.hashIpAddress(req.ip),
      }));
    }
    
    return this.authService.getActiveSessions(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session successfully revoked' })
  async revokeSession(
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const sessionId = req.params.sessionId;
    return this.authService.revokeSession(user.sub, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  @ApiResponse({ status: 200, description: 'All other sessions revoked' })
  async revokeAllSessions(@CurrentUser() user: any, @Req() req: any) {
    return this.authService.revokeAllSessions(user.sub, req.sessionId);
  }
}