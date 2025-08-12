import { 
  getJwtSecret, 
  getStripeSecret, 
  getStripeWebhookSecret, 
  getDatabasePassword,
  getRedisPassword,
  getSecret,
  validateSecrets,
  maskSecret,
  isProduction,
  isDevelopment,
  isTest
} from '../../../src/config/secrets';

describe('Secrets Configuration', () => {
  // Save original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getJwtSecret', () => {
    it('should return JWT secret when set', () => {
      const testSecret = 'test-jwt-secret-that-is-long-enough-32-chars';
      process.env.JWT_SECRET = testSecret;
      
      expect(getJwtSecret()).toBe(testSecret);
    });

    it('should throw error when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      
      expect(() => getJwtSecret()).toThrow('JWT_SECRET environment variable is not set');
    });

    it('should throw error when JWT_SECRET is too short', () => {
      process.env.JWT_SECRET = 'short-secret';
      
      expect(() => getJwtSecret()).toThrow('JWT_SECRET must be at least 32 characters long');
    });
  });

  describe('getStripeSecret', () => {
    it('should return test secret in test mode', () => {
      const testSecret = 'sk_test_1234567890abcdef';
      process.env.STRIPE_TEST_SECRET_KEY = testSecret;
      
      expect(getStripeSecret(true)).toBe(testSecret);
    });

    it('should return live secret in live mode', () => {
      const liveSecret = 'sk_live_1234567890abcdef';
      process.env.STRIPE_LIVE_SECRET_KEY = liveSecret;
      
      expect(getStripeSecret(false)).toBe(liveSecret);
    });

    it('should throw error when secret is not set', () => {
      delete process.env.STRIPE_TEST_SECRET_KEY;
      
      expect(() => getStripeSecret(true)).toThrow('STRIPE_TEST_SECRET_KEY environment variable is not set');
    });

    it('should throw error when secret has wrong prefix', () => {
      process.env.STRIPE_TEST_SECRET_KEY = 'sk_live_wrongprefix';
      
      expect(() => getStripeSecret(true)).toThrow("STRIPE_TEST_SECRET_KEY must start with 'sk_test_'");
    });

    it('should validate live key prefix correctly', () => {
      process.env.STRIPE_LIVE_SECRET_KEY = 'sk_test_wrongprefix';
      
      expect(() => getStripeSecret(false)).toThrow("STRIPE_LIVE_SECRET_KEY must start with 'sk_live_'");
    });
  });

  describe('getStripeWebhookSecret', () => {
    it('should return test webhook secret in test mode', () => {
      const testSecret = 'whsec_test1234567890';
      process.env.STRIPE_TEST_WEBHOOK_SECRET = testSecret;
      
      expect(getStripeWebhookSecret(true)).toBe(testSecret);
    });

    it('should return live webhook secret in live mode', () => {
      const liveSecret = 'whsec_live1234567890';
      process.env.STRIPE_LIVE_WEBHOOK_SECRET = liveSecret;
      
      expect(getStripeWebhookSecret(false)).toBe(liveSecret);
    });

    it('should throw error when webhook secret is not set', () => {
      delete process.env.STRIPE_TEST_WEBHOOK_SECRET;
      
      expect(() => getStripeWebhookSecret(true)).toThrow('STRIPE_TEST_WEBHOOK_SECRET environment variable is not set');
    });

    it('should throw error when webhook secret has wrong prefix', () => {
      process.env.STRIPE_TEST_WEBHOOK_SECRET = 'wrong_prefix_secret';
      
      expect(() => getStripeWebhookSecret(true)).toThrow("STRIPE_TEST_WEBHOOK_SECRET must start with 'whsec_'");
    });
  });

  describe('getDatabasePassword', () => {
    it('should return database password when set', () => {
      const dbPassword = 'secure-db-password';
      process.env.DATABASE_PASSWORD = dbPassword;
      
      expect(getDatabasePassword()).toBe(dbPassword);
    });

    it('should throw error when database password is not set', () => {
      delete process.env.DATABASE_PASSWORD;
      
      expect(() => getDatabasePassword()).toThrow('DATABASE_PASSWORD environment variable is not set');
    });
  });

  describe('getRedisPassword', () => {
    it('should return Redis password when set', () => {
      const redisPassword = 'redis-password';
      process.env.REDIS_PASSWORD = redisPassword;
      
      expect(getRedisPassword()).toBe(redisPassword);
    });

    it('should return undefined when Redis password is not set', () => {
      delete process.env.REDIS_PASSWORD;
      
      expect(getRedisPassword()).toBeUndefined();
    });
  });

  describe('getSecret', () => {
    it('should return secret value when set', () => {
      const secretValue = 'custom-secret-value';
      process.env.CUSTOM_SECRET = secretValue;
      
      expect(getSecret('CUSTOM_SECRET')).toBe(secretValue);
    });

    it('should throw error when required secret is not set', () => {
      delete process.env.MISSING_SECRET;
      
      expect(() => getSecret('MISSING_SECRET', true)).toThrow('MISSING_SECRET environment variable is not set');
    });

    it('should return undefined when optional secret is not set', () => {
      delete process.env.OPTIONAL_SECRET;
      
      expect(getSecret('OPTIONAL_SECRET', false)).toBeUndefined();
    });
  });

  describe('validateSecrets', () => {
    it('should validate all required secrets successfully', () => {
      // Set all required secrets
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-32-chars';
      process.env.STRIPE_TEST_MODE = 'true';
      process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_1234567890';
      process.env.STRIPE_TEST_WEBHOOK_SECRET = 'whsec_test1234567890';
      process.env.DATABASE_PASSWORD = 'db-password';
      
      expect(() => validateSecrets()).not.toThrow();
    });

    it('should throw error when JWT secret is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.STRIPE_TEST_MODE = 'true';
      process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_1234567890';
      process.env.STRIPE_TEST_WEBHOOK_SECRET = 'whsec_test1234567890';
      process.env.DATABASE_PASSWORD = 'db-password';
      
      expect(() => validateSecrets()).toThrow('JWT_SECRET environment variable is not set');
    });

    it('should validate live mode secrets when not in test mode', () => {
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-32-chars';
      process.env.STRIPE_TEST_MODE = 'false';
      process.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_1234567890';
      process.env.STRIPE_LIVE_WEBHOOK_SECRET = 'whsec_live1234567890';
      process.env.DATABASE_PASSWORD = 'db-password';
      
      expect(() => validateSecrets()).not.toThrow();
    });
  });

  describe('maskSecret', () => {
    it('should mask long secrets correctly', () => {
      const secret = 'sk_test_1234567890abcdefghijklmnop';
      const masked = maskSecret(secret);
      
      expect(masked).toBe('sk_t************************mnop');
      expect(masked).toContain('*');
      expect(masked.length).toBe(secret.length);
    });

    it('should mask short secrets completely', () => {
      expect(maskSecret('short')).toBe('****');
      expect(maskSecret('')).toBe('****');
      expect(maskSecret(null as any)).toBe('****');
    });

    it('should handle secrets of exactly 12 characters', () => {
      const secret = '123456789012';
      const masked = maskSecret(secret);
      
      expect(masked).toBe('1234****9012');
    });
  });

  describe('Environment helpers', () => {
    it('should correctly identify production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('should correctly identify development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
      expect(isDevelopment()).toBe(true);
      expect(isTest()).toBe(false);
    });

    it('should correctly identify test environment', () => {
      process.env.NODE_ENV = 'test';
      expect(isProduction()).toBe(false);
      expect(isDevelopment()).toBe(false);
      expect(isTest()).toBe(true);
    });
  });
});