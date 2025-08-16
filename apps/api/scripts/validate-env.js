#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Validates all required environment variables for the Basketball League API
 */

const requiredEnvVars = [
  // Core Application
  { name: 'NODE_ENV', defaultValue: 'development', type: 'string' },
  { name: 'PORT', defaultValue: '3000', type: 'number' },

  // Database
  { name: 'DB_HOST', defaultValue: 'localhost', type: 'string' },
  { name: 'DB_PORT', defaultValue: '5432', type: 'number' },
  { name: 'DB_USERNAME', defaultValue: 'postgres', type: 'string' },
  { name: 'DB_PASSWORD', defaultValue: 'postgres', type: 'string' },
  { name: 'DB_DATABASE', defaultValue: 'gametriq', type: 'string' },

  // Redis
  { name: 'REDIS_HOST', defaultValue: 'localhost', type: 'string' },
  { name: 'REDIS_PORT', defaultValue: '6379', type: 'number' },
  { name: 'REDIS_DB', defaultValue: '0', type: 'number' },

  // Security
  { name: 'JWT_SECRET', defaultValue: 'super-secret-key-change-in-production', type: 'string' },
  { name: 'BCRYPT_ROUNDS', defaultValue: '10', type: 'number' },
  { name: 'RATE_LIMIT', defaultValue: '100', type: 'number' },

  // Performance
  { name: 'WS_MAX_CONNECTIONS', defaultValue: '2000', type: 'number' },
  { name: 'WS_CONNECTION_TIMEOUT', defaultValue: '30000', type: 'number' },
];

const optionalEnvVars = [
  // External Services
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PUBLISHABLE_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'SENTRY_DSN',

  // Redis Cluster/Sentinel
  'REDIS_PASSWORD',
  'REDIS_CLUSTER_ENABLED',
  'REDIS_CLUSTER_NODES',
  'REDIS_SENTINEL_ENABLED',
  'REDIS_SENTINELS',
  'REDIS_SENTINEL_NAME',

  // Performance Tuning
  'DB_POOL_MAX',
  'DB_POOL_MIN',
  'DB_POOL_IDLE',
  'DB_POOL_ACQUIRE',
  'DB_POOL_EVICT',
  'REDIS_COMPRESSION',
  'REDIS_MAX_MEMORY',
  'TOURNAMENT_MODE',
  'AUTO_SCALING_ENABLED',
  'MIN_INSTANCES',
  'MAX_INSTANCES',

  // Feature Flags
  'FEATURE_PUBLIC_PORTAL',
  'FEATURE_PLAYOFFS',
  'FEATURE_REF_ASSIGN',
  'FEATURE_REPORTS',
  'FEATURE_OPS_HARDENING',
];

function validateEnvironment() {
  console.log('🏀 Basketball League API - Environment Validation');
  console.log('================================================\n');

  let hasErrors = false;
  let warnings = [];

  // Check required variables
  console.log('📋 Required Environment Variables:');
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar.name];
    const hasValue = value !== undefined && value !== '';
    const usingDefault = !hasValue;

    if (envVar.type === 'number' && hasValue) {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        console.log(`❌ ${envVar.name}: Invalid number value "${value}"`);
        hasErrors = true;
        continue;
      }
    }

    const displayValue = hasValue ? value : envVar.defaultValue;
    const status = usingDefault ? '🟡 DEFAULT' : '✅ SET';
    console.log(`   ${status} ${envVar.name}: ${displayValue}`);

    if (usingDefault && envVar.name.includes('SECRET')) {
      warnings.push(`${envVar.name} is using default value - change in production!`);
    }
  }

  // Check optional variables
  console.log('\n🔧 Optional Environment Variables:');
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar];
    const status = value ? '✅ SET' : '⭕ NOT SET';
    const displayValue = value ? (envVar.includes('SECRET') || envVar.includes('PASSWORD') ? '***' : value) : 'undefined';
    console.log(`   ${status} ${envVar}: ${displayValue}`);
  }

  // Show warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Security Warnings:');
    warnings.forEach(warning => console.log(`   🔒 ${warning}`));
  }

  // Environment-specific recommendations
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`\n🎯 Environment: ${nodeEnv.toUpperCase()}`);

  if (nodeEnv === 'production') {
    console.log('\n🚀 Production Checklist:');
    const productionChecks = [
      { check: 'JWT_SECRET changed from default', pass: process.env.JWT_SECRET !== 'super-secret-key-change-in-production' },
      { check: 'SESSION_SECRET changed from default', pass: process.env.SESSION_SECRET !== 'session-secret-change-in-production' },
      { check: 'PASSWORD_PEPPER changed from default', pass: process.env.PASSWORD_PEPPER !== 'pepper-secret-change-in-production' },
      { check: 'Database SSL enabled', pass: process.env.DB_SSL === 'true' },
      { check: 'Redis password set', pass: !!process.env.REDIS_PASSWORD },
      { check: 'Sentry DSN configured', pass: !!process.env.SENTRY_DSN },
    ];

    productionChecks.forEach(({ check, pass }) => {
      console.log(`   ${pass ? '✅' : '❌'} ${check}`);
      if (!pass) hasErrors = true;
    });
  }

  // Performance recommendations
  console.log('\n⚡ Performance Configuration:');
  const performanceChecks = [
    { setting: 'Rate Limit', value: process.env.RATE_LIMIT || '100', optimal: 'Consider higher for tournaments' },
    { setting: 'WebSocket Connections', value: process.env.WS_MAX_CONNECTIONS || '2000', optimal: 'Good for 1000+ concurrent users' },
    { setting: 'DB Pool Max', value: process.env.DB_POOL_MAX || '20', optimal: 'Increase for high traffic' },
    { setting: 'Redis Compression', value: process.env.REDIS_COMPRESSION || 'false', optimal: 'Enable for memory savings' },
  ];

  performanceChecks.forEach(({ setting, value, optimal }) => {
    console.log(`   📊 ${setting}: ${value} (${optimal})`);
  });

  // Final status
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ Environment validation FAILED');
    console.log('   Please fix the errors above before starting the application.');
    process.exit(1);
  } else {
    console.log('✅ Environment validation PASSED');
    console.log('   Application is ready to start!');
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment };