// Staging Environment Configuration for MVP Access Pack
// Generated for Phoenix Flight Youth League Demo

export const stagingConfig = {
  environment: 'staging',
  appName: 'gametriq-staging',
  region: 'us-west-2',
  domain: 'staging.gametriq.app',
  
  // Feature Flags for Sprint 4 MVP
  featureFlags: {
    public_portal_v1: {
      enabled: true,
      rollout: 100,
      description: 'Public-facing league pages',
      cache_ttl: 300, // 5 minutes
      features: ['standings', 'schedules', 'results', 'teams', 'ics_export']
    },
    playoffs_v1: {
      enabled: true,
      rollout: 100,
      description: 'Tournament bracket management',
      max_teams: 32,
      formats: ['single_elim', 'double_elim'],
      features: ['seeding', 'auto_advance', 'bracket_viz']
    },
    ref_assign_v1: {
      enabled: true,
      rollout: 100,
      description: 'Officials assignment engine',
      auto_assign: true,
      constraint_levels: ['strict', 'balanced', 'relaxed'],
      features: ['availability', 'optimizer', 'payroll_export']
    },
    reports_v1: {
      enabled: true,
      rollout: 100,
      description: 'Data exports and reporting',
      formats: ['csv', 'json', 'pdf', 'xlsx'],
      rate_limit: '10/hour/user',
      features: ['async_generation', 'signed_urls']
    },
    ops_hardening_v1: {
      enabled: true,
      description: 'Production operational features',
      features: ['backups', 'slos', 'cost_alerts', 'pii_scrubbing']
    }
  },

  // Infrastructure Configuration
  infrastructure: {
    vpc: {
      cidr: '10.0.0.0/16',
      publicSubnets: ['10.0.1.0/24', '10.0.2.0/24'],
      privateSubnets: ['10.0.10.0/24', '10.0.11.0/24']
    },
    eks: {
      clusterVersion: '1.28',
      nodeGroups: {
        general: {
          instanceTypes: ['t3.medium'],
          minSize: 2,
          maxSize: 4,
          desiredSize: 2
        }
      }
    },
    rds: {
      engine: 'postgres',
      engineVersion: '15.4',
      instanceClass: 'db.t3.medium',
      allocatedStorage: 100,
      multiAZ: false,
      backupRetentionPeriod: 7
    },
    redis: {
      nodeType: 'cache.t3.micro',
      numCacheNodes: 1,
      automaticFailoverEnabled: false
    },
    s3: {
      buckets: {
        static: 'gametriq-staging-static',
        uploads: 'gametriq-staging-uploads',
        exports: 'gametriq-staging-exports',
        backups: 'gametriq-staging-backups'
      }
    },
    cloudfront: {
      enabled: true,
      priceClass: 'PriceClass_100',
      cacheBehaviors: {
        public: {
          ttl: 300,
          compress: true
        },
        api: {
          ttl: 0,
          compress: false
        }
      }
    }
  },

  // Service Configuration
  services: {
    authService: {
      replicas: 2,
      cpu: '250m',
      memory: '512Mi',
      port: 3001,
      healthCheck: '/health'
    },
    userService: {
      replicas: 2,
      cpu: '250m',
      memory: '512Mi',
      port: 3002,
      healthCheck: '/health'
    },
    teamService: {
      replicas: 2,
      cpu: '250m',
      memory: '512Mi',
      port: 3003,
      healthCheck: '/health'
    },
    scheduleService: {
      replicas: 2,
      cpu: '500m',
      memory: '1Gi',
      port: 3004,
      healthCheck: '/health'
    },
    gameService: {
      replicas: 2,
      cpu: '500m',
      memory: '1Gi',
      port: 3005,
      healthCheck: '/health',
      websocket: {
        enabled: true,
        port: 3006
      }
    },
    paymentService: {
      replicas: 2,
      cpu: '250m',
      memory: '512Mi',
      port: 3007,
      healthCheck: '/health'
    },
    notificationService: {
      replicas: 2,
      cpu: '250m',
      memory: '512Mi',
      port: 3008,
      healthCheck: '/health'
    },
    reportingService: {
      replicas: 2,
      cpu: '500m',
      memory: '1Gi',
      port: 3009,
      healthCheck: '/health'
    }
  },

  // Security Configuration
  security: {
    tls: {
      enabled: true,
      certManager: true,
      issuer: 'letsencrypt-staging'
    },
    cors: {
      origins: [
        'https://staging.gametriq.app',
        'http://localhost:3000',
        'http://localhost:4200'
      ]
    },
    rateLimit: {
      public: {
        windowMs: 60000,
        max: 100
      },
      api: {
        windowMs: 60000,
        max: 1000
      }
    },
    waf: {
      enabled: true,
      rules: ['AWS-AWSManagedRulesCommonRuleSet']
    }
  },

  // Monitoring Configuration
  monitoring: {
    prometheus: {
      enabled: true,
      retention: '7d'
    },
    grafana: {
      enabled: true,
      adminUser: 'admin'
    },
    elasticSearch: {
      enabled: true,
      retention: '7d'
    },
    alerts: {
      channels: ['email', 'slack'],
      rules: {
        highErrorRate: {
          threshold: 0.01,
          duration: '5m'
        },
        highLatency: {
          threshold: 1000,
          duration: '5m'
        },
        lowAvailability: {
          threshold: 0.99,
          duration: '5m'
        }
      }
    }
  },

  // Demo Configuration
  demo: {
    organization: {
      id: 'org-phoenix-flight',
      name: 'Phoenix Flight Youth Basketball',
      timezone: 'America/Phoenix',
      settings: {
        heatSafetyEnabled: true,
        heatThreshold: 105,
        coppaCompliant: true,
        safeSportIntegrated: true
      }
    },
    seedData: {
      leagues: 2,
      divisions: 6,
      teams: 48,
      players: 576,
      games: 240,
      officials: 20,
      venues: 8
    },
    testAccounts: [
      {
        email: 'admin@phoenixflight.demo',
        password: 'Demo2024!',
        role: 'SUPER_ADMIN'
      },
      {
        email: 'manager@phoenixflight.demo',
        password: 'Demo2024!',
        role: 'LEAGUE_MANAGER'
      },
      {
        email: 'coach@suns.demo',
        password: 'Demo2024!',
        role: 'COACH'
      },
      {
        email: 'parent@phoenixflight.demo',
        password: 'Demo2024!',
        role: 'PARENT'
      },
      {
        email: 'referee@phoenixflight.demo',
        password: 'Demo2024!',
        role: 'OFFICIAL'
      }
    ]
  },

  // Environment Variables
  env: {
    NODE_ENV: 'staging',
    LOG_LEVEL: 'debug',
    DATABASE_URL: 'postgresql://gametriq:staging@rds-staging.amazonaws.com:5432/gametriq',
    REDIS_URL: 'redis://elasticache-staging.amazonaws.com:6379',
    JWT_SECRET: 'staging-jwt-secret-2024',
    STRIPE_SECRET_KEY: 'sk_test_staging_key',
    STRIPE_WEBHOOK_SECRET: 'whsec_staging_secret',
    AWS_REGION: 'us-west-2',
    AWS_BUCKET_STATIC: 'gametriq-staging-static',
    AWS_BUCKET_UPLOADS: 'gametriq-staging-uploads',
    AWS_BUCKET_EXPORTS: 'gametriq-staging-exports',
    SENDGRID_API_KEY: 'SG.staging_key',
    TWILIO_ACCOUNT_SID: 'AC_staging_sid',
    TWILIO_AUTH_TOKEN: 'staging_token',
    SENTRY_DSN: 'https://staging@sentry.io/gametriq',
    PUBLIC_URL: 'https://staging.gametriq.app',
    WEBSOCKET_URL: 'wss://staging.gametriq.app/ws',
    ENABLE_FEATURE_FLAGS: 'true',
    ENABLE_DEMO_MODE: 'true'
  }
};

// Export deployment commands
export const deploymentCommands = {
  setup: 'npm run deploy:staging:setup',
  deploy: 'npm run deploy:staging',
  seed: 'npm run seed:staging',
  test: 'npm run test:staging',
  teardown: 'npm run deploy:staging:teardown'
};