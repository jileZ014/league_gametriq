/** @type {import('jest').Config} */
const config = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/apps/web/tests/setup.ts'
  ],
  
  // Module name mapping for path aliases
  moduleNameMapping: {
    // Root level aliases
    '^@/(.*)$': '<rootDir>/lib/$1',
    '^@/components/(.*)$': '<rootDir>/apps/web/src/components/$1',
    '^@/lib/(.*)$': ['<rootDir>/lib/$1', '<rootDir>/apps/web/src/lib/$1'],
    '^@/hooks/(.*)$': '<rootDir>/apps/web/src/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/lib/$1',
    '^@/types/(.*)$': '<rootDir>/apps/web/src/types/$1',
    '^@/styles/(.*)$': '<rootDir>/apps/web/src/styles/$1',
    
    // App-specific aliases
    '^@gametriq/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@gametriq/web/(.*)$': '<rootDir>/apps/web/src/$1',
    '^@gametriq/api/(.*)$': '<rootDir>/apps/api/src/$1',
    '^@gametriq/mobile/(.*)$': '<rootDir>/apps/mobile/src/$1',
    
    // Asset mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/mocks/fileMock.js',
    
    // Third-party mocks
    '^stripe$': '<rootDir>/tests/mocks/stripeMock.js',
    '^@stripe/(.*)$': '<rootDir>/tests/mocks/stripeMock.js',
    '^@supabase/(.*)$': '<rootDir>/tests/mocks/supabaseMock.js',
  },
  
  // File patterns to test
  testMatch: [
    '<rootDir>/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/apps/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/apps/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/lib/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/packages/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/apps/*/node_modules/',
    '<rootDir>/apps/*/.next/',
    '<rootDir>/apps/*/dist/',
    '<rootDir>/apps/*/build/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
    '<rootDir>/playwright-report/',
    '<rootDir>/test-results/',
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverage: false, // Enable only when needed
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json-summary',
  ],
  
  // Coverage collection patterns
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'apps/web/src/**/*.{ts,tsx}',
    'apps/api/src/**/*.{ts,tsx}',
    'packages/**/*.{ts,tsx}',
    // Exclude certain files from coverage
    '!**/*.d.ts',
    '!**/*.stories.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!apps/web/src/app/**/layout.tsx',
    '!apps/web/src/app/**/page.tsx',
    '!apps/web/src/app/**/loading.tsx',
    '!apps/web/src/app/**/error.tsx',
    '!apps/web/src/app/**/not-found.tsx',
  ],
  
  // Coverage thresholds for basketball league application
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Higher thresholds for critical basketball functionality
    'lib/stripe.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'lib/utils.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'apps/web/src/lib/**/*.ts': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  
  // Test timeout (important for payment processing tests)
  testTimeout: 10000, // 10 seconds
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',
  
  // Environment variables for testing
  setupFiles: ['<rootDir>/tests/env.setup.ts'],
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Preset for specific test types
  projects: [
    // Unit tests
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/lib/**/*.(test|spec).(ts|tsx)',
        '<rootDir>/apps/web/src/**/*.(test|spec).(ts|tsx)',
        '<rootDir>/packages/**/*.(test|spec).(ts|tsx)',
      ],
      testEnvironment: 'jsdom',
    },
    // Integration tests
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/tests/integration/**/*.(test|spec).(ts|tsx)',
        '<rootDir>/apps/api/src/**/*.integration.(test|spec).(ts|tsx)',
      ],
      testEnvironment: 'node',
      testTimeout: 30000, // Longer timeout for integration tests
    },
    // Basketball-specific tests
    {
      displayName: 'basketball',
      testMatch: [
        '<rootDir>/**/*basketball*.(test|spec).(ts|tsx)',
        '<rootDir>/**/*scoring*.(test|spec).(ts|tsx)',
        '<rootDir>/**/*tournament*.(test|spec).(ts|tsx)',
        '<rootDir>/**/*league*.(test|spec).(ts|tsx)',
      ],
      testEnvironment: 'jsdom',
    },
    // Payment processing tests
    {
      displayName: 'payments',
      testMatch: [
        '<rootDir>/**/*payment*.(test|spec).(ts|tsx)',
        '<rootDir>/**/*stripe*.(test|spec).(ts|tsx)',
        '<rootDir>/**/*billing*.(test|spec).(ts|tsx)',
      ],
      testEnvironment: 'jsdom',
      testTimeout: 15000, // Longer timeout for payment tests
    },
  ],
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'junit.xml',
      suiteName: 'Basketball League Management Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/test-results',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Basketball League Test Report',
    }],
  ],
  
  // Verbose output for debugging
  verbose: process.env.CI === 'true' || process.env.VERBOSE === 'true',
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
  ],
  
  // Basketball-specific test utilities
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
    // Test environment variables
    TEST_STRIPE_PUBLISHABLE_KEY: 'pk_test_basketball_league',
    TEST_SUPABASE_URL: 'https://test.supabase.co',
    TEST_SUPABASE_ANON_KEY: 'test_anon_key',
  },
};

module.exports = config;