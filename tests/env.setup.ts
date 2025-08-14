// Environment setup for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

// Stripe test keys
process.env.STRIPE_SECRET_KEY = 'sk_test_basketball_league_test_key';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_basketball_league_test_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_basketball_league_webhook';

// Supabase test configuration
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key';

// JWT secrets for testing
process.env.JWT_SECRET = 'test-jwt-secret-basketball-league';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-basketball-league';

// Database test configuration
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/basketball_league_test';

// Redis test configuration
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Email testing
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';
process.env.SMTP_USER = 'test';
process.env.SMTP_PASS = 'test';

// AWS/S3 test configuration
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-west-2';
process.env.AWS_S3_BUCKET = 'basketball-league-test-bucket';

// Basketball-specific test configuration
process.env.DEFAULT_LEAGUE_ID = 'test-phoenix-youth-league';
process.env.DEFAULT_SEASON_ID = 'test-2024-summer-season';
process.env.HEAT_SAFETY_API_KEY = 'test-weather-api-key';

// Feature flags for testing
process.env.ENABLE_TOURNAMENT_BRACKETS = 'true';
process.env.ENABLE_LIVE_SCORING = 'true';
process.env.ENABLE_PAYMENT_PROCESSING = 'true';
process.env.ENABLE_REAL_TIME_UPDATES = 'true';
process.env.ENABLE_AI_ANALYTICS = 'false'; // Disabled in tests

// Rate limiting (disabled in tests)
process.env.RATE_LIMIT_ENABLED = 'false';

// Logging configuration
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests