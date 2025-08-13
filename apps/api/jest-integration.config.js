const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'Integration Tests',
  testMatch: ['**/*.integration.spec.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/integration-setup.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  testTimeout: 30000,
  maxWorkers: 1, // Run tests serially to avoid database conflicts
  coverageDirectory: '../coverage/integration',
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/*.integration.spec.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.module.ts',
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};