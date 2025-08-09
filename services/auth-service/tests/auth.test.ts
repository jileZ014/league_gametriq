import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/index';
import { UserModel } from '../src/models/user.model';
import { JWTService } from '../src/services/jwt.service';
import { COPPAService } from '../src/services/coppa.service';
import { TenantDatabase } from '../src/config/database';

// Mock external dependencies
jest.mock('../src/config/database');
jest.mock('../src/models/user.model');
jest.mock('../src/services/jwt.service');
jest.mock('../src/services/coppa.service');

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockJWTService = JWTService as jest.Mocked<typeof JWTService>;
const mockCOPPAService = COPPAService as jest.Mocked<typeof COPPAService>;
const mockTenantDatabase = TenantDatabase as jest.Mocked<typeof TenantDatabase>;

// Test data
const testTenant = 'test-tenant';
const testUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewBqnOPmTSuKVKy.',
  first_name: 'John',
  last_name: 'Doe',
  birth_date: '1990-01-01',
  age: 33,
  gender: 'MALE' as const,
  phone: '+1234567890',
  status: 'ACTIVE' as const,
  role: 'PLAYER' as const,
  email_verified: true,
  phone_verified: false,
  mfa_enabled: false,
  mfa_secret: null,
  mfa_backup_codes: null,
  last_login: new Date(),
  timezone: 'America/Phoenix',
  preferences: {},
  password_changed_at: new Date(),
  force_password_change: false,
  failed_login_attempts: 0,
  locked_until: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const testMinor = {
  ...testUser,
  id: '123e4567-e89b-12d3-a456-426614174001',
  email: 'minor@example.com',
  birth_date: '2015-01-01',
  age: 9,
  status: 'PENDING_VERIFICATION' as const,
};

const testTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 900,
  tokenType: 'Bearer',
};

const testJWTPayload = {
  userId: testUser.id,
  email: testUser.email,
  role: testUser.role,
  tenantId: testTenant,
  isMinor: false,
  sessionId: 'mock-session-id',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900,
  iss: 'gametriq-auth-service',
  aud: 'gametriq-platform',
  sub: testUser.id,
};

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database health checks
    mockTenantDatabase.withTenant.mockImplementation((tenantId, operation) => 
      operation({} as any)
    );
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/register', () => {
    const validRegistrationData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      first_name: 'Jane',
      last_name: 'Smith',
      birth_date: '1995-05-15',
      gender: 'FEMALE',
      role: 'PLAYER',
      timezone: 'America/Phoenix',
    };

    it('should register an adult user successfully', async () => {
      // Mock dependencies
      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue({ ...testUser, ...validRegistrationData });
      mockCOPPAService.verifyAge.mockResolvedValue({
        isMinor: false,
        age: 28,
        requiresCOPPA: false,
        parentalConsentRequired: false,
        verificationMethod: 'BIRTH_DATE_CALCULATION',
        restrictions: [],
      });
      mockJWTService.generateTokenPair.mockResolvedValue(testTokens);
      mockJWTService.generateSecureToken.mockReturnValue('mock-session-id');
      mockUserModel.createSession.mockResolvedValue({} as any);
      mockUserModel.update.mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(validRegistrationData.email);
      expect(response.body.tokens).toEqual(testTokens);
      expect(mockUserModel.create).toHaveBeenCalledTimes(1);
    });

    it('should register a minor user and require parental consent', async () => {
      const minorData = {
        ...validRegistrationData,
        birth_date: '2015-05-15',
        email: 'minor@example.com',
      };

      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue({ ...testMinor, ...minorData });
      mockCOPPAService.verifyAge.mockResolvedValue({
        isMinor: true,
        age: 9,
        requiresCOPPA: true,
        parentalConsentRequired: true,
        verificationMethod: 'BIRTH_DATE_CALCULATION',
        restrictions: ['Parental consent required for registration'],
      });

      const response = await request(app)
        .post('/api/v1/register')
        .send(minorData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.requires_parental_consent).toBe(true);
      expect(response.body.tokens).toBeUndefined();
    });

    it('should reject registration with invalid email', async () => {
      const invalidData = {
        ...validRegistrationData,
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/api/v1/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject registration for existing user', async () => {
      mockUserModel.findByEmail.mockResolvedValue(testUser);

      const response = await request(app)
        .post('/api/v1/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body.error).toBe('User Already Exists');
    });

    it('should reject weak password', async () => {
      const weakPasswordData = {
        ...validRegistrationData,
        password: '123',
      };

      const response = await request(app)
        .post('/api/v1/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('POST /api/v1/login', () => {
    const loginData = {
      email: testUser.email,
      password: 'correctpassword',
    };

    it('should login successfully with correct credentials', async () => {
      mockUserModel.authenticate.mockResolvedValue({ user: testUser });
      mockJWTService.generateSecureToken.mockReturnValue('mock-session-id');
      mockJWTService.generateTokenPair.mockResolvedValue(testTokens);
      mockUserModel.createSession.mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.tokens).toEqual(testTokens);
    });

    it('should require MFA token when MFA is enabled', async () => {
      const mfaUser = { ...testUser, mfa_enabled: true };
      mockUserModel.authenticate.mockResolvedValue({ user: mfaUser });

      const response = await request(app)
        .post('/api/v1/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.requires_mfa).toBe(true);
    });

    it('should verify MFA token when provided', async () => {
      const mfaUser = { ...testUser, mfa_enabled: true };
      mockUserModel.authenticate.mockResolvedValue({ user: mfaUser });
      mockUserModel.verifyMFA.mockResolvedValue(true);
      mockJWTService.generateSecureToken.mockReturnValue('mock-session-id');
      mockJWTService.generateTokenPair.mockResolvedValue(testTokens);
      mockUserModel.createSession.mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/login')
        .send({
          ...loginData,
          mfaToken: '123456',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tokens).toEqual(testTokens);
    });

    it('should check parental consent for minor users', async () => {
      mockUserModel.authenticate.mockResolvedValue({ user: testMinor });
      mockCOPPAService.checkParentalConsent.mockResolvedValue({
        hasValidConsent: false,
        permissions: {} as any,
      });

      const response = await request(app)
        .post('/api/v1/login')
        .send({
          email: testMinor.email,
          password: 'correctpassword',
        })
        .expect(403);

      expect(response.body.error).toBe('Parental Consent Required');
      expect(response.body.requires_parental_consent).toBe(true);
    });

    it('should reject invalid credentials', async () => {
      mockUserModel.authenticate.mockResolvedValue({ 
        user: null, 
        reason: 'Invalid credentials' 
      });

      const response = await request(app)
        .post('/api/v1/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Authentication Failed');
    });

    it('should reject login for inactive user', async () => {
      const inactiveUser = { ...testUser, status: 'SUSPENDED' as const };
      mockUserModel.authenticate.mockResolvedValue({ 
        user: null, 
        reason: 'Account not active' 
      });

      const response = await request(app)
        .post('/api/v1/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Authentication Failed');
    });
  });

  describe('POST /api/v1/refresh-token', () => {
    it('should refresh access token successfully', async () => {
      mockJWTService.refreshAccessToken.mockResolvedValue(testTokens);

      const response = await request(app)
        .post('/api/v1/refresh-token')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tokens).toEqual(testTokens);
    });

    it('should reject invalid refresh token', async () => {
      mockJWTService.refreshAccessToken.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error).toBe('Token Refresh Failed');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return user profile when authenticated', async () => {
      mockJWTService.isValidTokenFormat.mockReturnValue(true);
      mockJWTService.verifyAccessToken.mockResolvedValue(testJWTPayload);
      mockUserModel.findById.mockResolvedValue(testUser);

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should include COPPA information for minor users', async () => {
      const minorJWTPayload = { ...testJWTPayload, isMinor: true, userId: testMinor.id };
      mockJWTService.isValidTokenFormat.mockReturnValue(true);
      mockJWTService.verifyAccessToken.mockResolvedValue(minorJWTPayload);
      mockUserModel.findById.mockResolvedValue(testMinor);
      mockCOPPAService.checkParentalConsent.mockResolvedValue({
        hasValidConsent: true,
        permissions: {} as any,
        consentDate: new Date(),
        expiryDate: new Date(),
      });

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.coppa_info).toBeDefined();
      expect(response.body.user.coppa_info.hasValidConsent).toBe(true);
    });

    it('should reject request without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.error).toBe('Authentication Error');
    });

    it('should reject request with invalid token', async () => {
      mockJWTService.isValidTokenFormat.mockReturnValue(true);
      mockJWTService.verifyAccessToken.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Authentication Error');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      mockJWTService.blacklistAccessToken.mockResolvedValue(true);
      mockJWTService.revokeSession.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    const changePasswordData = {
      currentPassword: 'oldpassword',
      newPassword: 'NewSecurePass123!',
    };

    it('should change password successfully', async () => {
      mockJWTService.isValidTokenFormat.mockReturnValue(true);
      mockJWTService.verifyAccessToken.mockResolvedValue(testJWTPayload);
      mockUserModel.findById.mockResolvedValue(testUser);
      mockUserModel.authenticate.mockResolvedValue({ user: testUser });
      mockUserModel.updatePassword.mockResolvedValue(true);
      mockJWTService.revokeAllUserSessions.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(changePasswordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password changed successfully');
    });

    it('should reject incorrect current password', async () => {
      mockJWTService.isValidTokenFormat.mockReturnValue(true);
      mockJWTService.verifyAccessToken.mockResolvedValue(testJWTPayload);
      mockUserModel.findById.mockResolvedValue(testUser);
      mockUserModel.authenticate.mockResolvedValue({ 
        user: null, 
        reason: 'Invalid credentials' 
      });

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(changePasswordData)
        .expect(401);

      expect(response.body.error).toBe('Authentication Failed');
    });
  });

  describe('POST /api/v1/auth/mfa/enable', () => {
    const enableMFAData = {
      password: 'correctpassword',
    };

    it('should enable MFA for adult user', async () => {
      mockJWTService.isValidTokenFormat.mockReturnValue(true);
      mockJWTService.verifyAccessToken.mockResolvedValue(testJWTPayload);
      mockUserModel.findById.mockResolvedValue(testUser);
      mockUserModel.authenticate.mockResolvedValue({ user: testUser });
      mockUserModel.enableMFA.mockResolvedValue({
        secret: 'mock-secret',
        qrCodeUrl: 'mock-qr-url',
        backupCodes: ['CODE1', 'CODE2'],
      });

      const response = await request(app)
        .post('/api/v1/auth/mfa/enable')
        .set('Authorization', 'Bearer valid-token')
        .send(enableMFAData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.mfa.backupCodes).toBeDefined();
    });

    it('should reject MFA setup for users under 13', async () => {
      const minorJWTPayload = { ...testJWTPayload, isMinor: true, userId: testMinor.id };
      mockJWTService.isValidTokenFormat.mockReturnValue(true);
      mockJWTService.verifyAccessToken.mockResolvedValue(minorJWTPayload);
      mockUserModel.findById.mockResolvedValue(testMinor);

      const response = await request(app)
        .post('/api/v1/auth/mfa/enable')
        .set('Authorization', 'Bearer valid-token')
        .send(enableMFAData)
        .expect(403);

      expect(response.body.error).toBe('Age Restriction');
    });
  });

  describe('POST /api/v1/parental-consent', () => {
    const consentData = {
      childId: testMinor.id,
      parentEmail: 'parent@example.com',
      parentFirstName: 'John',
      parentLastName: 'Parent',
      consentType: {
        registration: true,
        teamParticipation: true,
        photoVideo: false,
        communication: true,
        marketing: false,
      },
      dataPermissions: {
        basicInfo: true,
        communication: true,
        photos: false,
        performanceTracking: true,
        marketing: false,
        locationTracking: false,
        thirdPartySharing: false,
      },
      verificationMethod: 'EMAIL',
    };

    it('should initiate parental consent process', async () => {
      mockUserModel.findById.mockResolvedValue(testMinor);
      mockCOPPAService.initiateParentalConsent.mockResolvedValue({
        consentId: 'mock-consent-id',
        verificationUrl: 'https://example.com/verify',
      });

      const response = await request(app)
        .post('/api/v1/parental-consent')
        .send(consentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.consent_id).toBe('mock-consent-id');
      expect(response.body.verification_url).toBeDefined();
    });

    it('should reject consent request for non-minor users', async () => {
      mockUserModel.findById.mockResolvedValue(testUser);

      const response = await request(app)
        .post('/api/v1/parental-consent')
        .send({ ...consentData, childId: testUser.id })
        .expect(400);

      expect(response.body.error).toBe('Age Restriction');
    });

    it('should reject consent request for non-existent child', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/parental-consent')
        .send(consentData)
        .expect(404);

      expect(response.body.error).toBe('Child Not Found');
    });
  });

  describe('POST /api/v1/parental-consent/:consentId/verify', () => {
    const verificationData = {
      token: 'verification-token',
    };

    it('should verify parental consent successfully', async () => {
      mockCOPPAService.verifyParentalConsent.mockResolvedValue({
        isValid: true,
        consentId: 'mock-consent-id',
        verificationMethod: 'EMAIL',
        consentDate: new Date(),
        expiryDate: new Date(),
        permissions: {} as any,
      });

      const response = await request(app)
        .post('/api/v1/parental-consent/mock-consent-id/verify')
        .send(verificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.consent.consent_id).toBe('mock-consent-id');
    });

    it('should reject invalid consent verification', async () => {
      mockCOPPAService.verifyParentalConsent.mockResolvedValue({
        isValid: false,
        verificationMethod: 'EMAIL',
        consentDate: new Date(),
        permissions: {} as any,
      });

      const response = await request(app)
        .post('/api/v1/parental-consent/mock-consent-id/verify')
        .send(verificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('should return healthy status when all services are up', async () => {
      // Mock the dynamic import and health check functions
      jest.doMock('../src/config/database', () => ({
        checkDatabaseHealth: jest.fn().mockResolvedValue(true),
        checkRedisHealth: jest.fn().mockResolvedValue(true),
      }));

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.services.database).toBe('healthy');
      expect(response.body.services.redis).toBe('healthy');
    });

    it('should return unhealthy status when database is down', async () => {
      jest.doMock('../src/config/database', () => ({
        checkDatabaseHealth: jest.fn().mockResolvedValue(false),
        checkRedisHealth: jest.fn().mockResolvedValue(true),
      }));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login endpoint', async () => {
      mockUserModel.authenticate.mockResolvedValue({ 
        user: null, 
        reason: 'Invalid credentials' 
      });

      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v1/login')
          .send({ email: 'test@example.com', password: 'wrong' });
      }

      const response = await request(app)
        .post('/api/v1/login')
        .send({ email: 'test@example.com', password: 'wrong' })
        .expect(429);

      expect(response.body.error).toBe('Too many authentication attempts');
    });

    it('should apply rate limiting to registration endpoint', async () => {
      mockUserModel.findByEmail.mockResolvedValue(testUser);

      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/v1/register')
          .send({
            email: `test${i}@example.com`,
            password: 'password',
            first_name: 'Test',
            last_name: 'User',
            birth_date: '1990-01-01',
            gender: 'MALE',
            role: 'PLAYER',
          });
      }

      const response = await request(app)
        .post('/api/v1/register')
        .send({
          email: 'final@example.com',
          password: 'password',
          first_name: 'Test',
          last_name: 'User',
          birth_date: '1990-01-01',
          gender: 'MALE',
          role: 'PLAYER',
        })
        .expect(429);

      expect(response.body.error).toBe('Too many registration attempts');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBeDefined();
    });

    it('should handle internal server errors gracefully', async () => {
      mockUserModel.findByEmail.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User',
          birth_date: '1990-01-01',
          gender: 'MALE',
          role: 'PLAYER',
        })
        .expect(500);

      expect(response.body.error).toBe('Registration Failed');
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });
});