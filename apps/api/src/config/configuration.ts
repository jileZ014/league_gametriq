/**
 * Safe environment variable parsing utilities
 */
const parseInt10 = (value: string | undefined, defaultValue: number): number => {
  if (!value || value.trim() === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const parseBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value || value.trim() === '') return defaultValue;
  return value.toLowerCase() === 'true';
};

export default () => ({
  port: parseInt10(process.env.PORT, 3000),
  environment: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt10(process.env.DB_PORT, 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'gametriq',
    synchronize: process.env.NODE_ENV === 'development',
    logging: parseBoolean(process.env.DB_LOGGING, false),
    ssl: parseBoolean(process.env.DB_SSL, false) ? {
      rejectUnauthorized: false,
    } : false,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt10(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt10(process.env.REDIS_DB, 0),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    algorithm: 'RS256',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },

  aws: {
    region: process.env.AWS_REGION || 'us-west-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
  },

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt10(process.env.EMAIL_PORT, 587),
    secure: parseBoolean(process.env.EMAIL_SECURE, false),
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@gametriq.app',
  },

  sms: {
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@gametriq.app',
  },

  security: {
    bcryptRounds: parseInt10(process.env.BCRYPT_ROUNDS, 10),
    sessionSecret: process.env.SESSION_SECRET || 'session-secret-change-in-production',
    corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3001',
    rateLimit: parseInt10(process.env.RATE_LIMIT, 100),
    pepper: process.env.PASSWORD_PEPPER || 'pepper-secret-change-in-production',
  },

  features: {
    publicPortal: parseBoolean(process.env.FEATURE_PUBLIC_PORTAL, false),
    playoffs: parseBoolean(process.env.FEATURE_PLAYOFFS, true),
    refAssign: parseBoolean(process.env.FEATURE_REF_ASSIGN, true),
    reports: parseBoolean(process.env.FEATURE_REPORTS, true),
    opsHardening: parseBoolean(process.env.FEATURE_OPS_HARDENING, false),
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    logLevel: process.env.LOG_LEVEL || 'info',
    prometheusEnabled: parseBoolean(process.env.PROMETHEUS_ENABLED, false),
  },
});