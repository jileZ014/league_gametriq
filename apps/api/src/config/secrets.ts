import { Logger } from '@nestjs/common';

/**
 * Centralized secret management module
 * All secrets must be read from environment variables only
 * No hardcoded secrets are allowed in the codebase
 */

const logger = new Logger('SecretsConfig');

/**
 * Get JWT secret from environment
 * @throws Error if JWT_SECRET is not set
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    const error = 'JWT_SECRET environment variable is not set';
    logger.error(error);
    throw new Error(error);
  }
  
  if (secret.length < 32) {
    const error = 'JWT_SECRET must be at least 32 characters long';
    logger.error(error);
    throw new Error(error);
  }
  
  return secret;
}

/**
 * Get Stripe API secret key from environment
 * @param testMode - Whether to retrieve test or live key
 * @throws Error if the required Stripe secret key is not set
 */
export function getStripeSecret(testMode = true): string {
  const envKey = testMode ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_LIVE_SECRET_KEY';
  const secret = process.env[envKey];
  
  if (!secret) {
    const error = `${envKey} environment variable is not set`;
    logger.error(error);
    throw new Error(error);
  }
  
  // Validate Stripe secret key format
  const prefix = testMode ? 'sk_test_' : 'sk_live_';
  if (!secret.startsWith(prefix)) {
    const error = `${envKey} must start with '${prefix}'`;
    logger.error(error);
    throw new Error(error);
  }
  
  return secret;
}

/**
 * Get Stripe webhook secret from environment
 * @param testMode - Whether to retrieve test or live webhook secret
 * @throws Error if the required webhook secret is not set
 */
export function getStripeWebhookSecret(testMode = true): string {
  const envKey = testMode ? 'STRIPE_TEST_WEBHOOK_SECRET' : 'STRIPE_LIVE_WEBHOOK_SECRET';
  const secret = process.env[envKey];
  
  if (!secret) {
    const error = `${envKey} environment variable is not set`;
    logger.error(error);
    throw new Error(error);
  }
  
  // Validate webhook secret format
  if (!secret.startsWith('whsec_')) {
    const error = `${envKey} must start with 'whsec_'`;
    logger.error(error);
    throw new Error(error);
  }
  
  return secret;
}

/**
 * Get database password from environment
 * @throws Error if DATABASE_PASSWORD is not set
 */
export function getDatabasePassword(): string {
  const password = process.env.DATABASE_PASSWORD;
  
  if (!password) {
    const error = 'DATABASE_PASSWORD environment variable is not set';
    logger.error(error);
    throw new Error(error);
  }
  
  return password;
}

/**
 * Get Redis password from environment
 * @returns Redis password or undefined if not set (Redis can work without password)
 */
export function getRedisPassword(): string | undefined {
  return process.env.REDIS_PASSWORD;
}

/**
 * Get any custom secret from environment
 * @param key - The environment variable name
 * @param required - Whether the secret is required
 * @throws Error if required secret is not set
 */
export function getSecret(key: string, required = true): string | undefined {
  const value = process.env[key];
  
  if (required && !value) {
    const error = `${key} environment variable is not set`;
    logger.error(error);
    throw new Error(error);
  }
  
  return value;
}

/**
 * Validate all required secrets are present
 * Call this during application initialization
 */
export function validateSecrets(): void {
  logger.log('Validating required secrets...');
  
  try {
    // Validate JWT secret
    getJwtSecret();
    logger.log('JWT secret validated');
    
    // Validate Stripe secrets based on mode
    const isTestMode = process.env.STRIPE_TEST_MODE !== 'false';
    getStripeSecret(isTestMode);
    getStripeWebhookSecret(isTestMode);
    logger.log(`Stripe secrets validated (${isTestMode ? 'TEST' : 'LIVE'} mode)`);
    
    // Validate database password
    getDatabasePassword();
    logger.log('Database password validated');
    
    logger.log('All required secrets are present');
  } catch (error) {
    logger.error('Secret validation failed:', error.message);
    throw error;
  }
}

/**
 * Mask sensitive values for logging
 * Shows only first 4 and last 4 characters
 */
export function maskSecret(value: string): string {
  if (!value || value.length < 12) {
    return '****';
  }
  
  const start = value.substring(0, 4);
  const end = value.substring(value.length - 4);
  const masked = '*'.repeat(Math.max(4, value.length - 8));
  
  return `${start}${masked}${end}`;
}

/**
 * Get environment mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get environment mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get environment mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}