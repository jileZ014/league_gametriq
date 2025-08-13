const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'Performance Tests',
  testMatch: ['**/*.performance.spec.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/performance-setup.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  testTimeout: 300000, // 5 minutes for performance tests
  maxWorkers: 1,
  coverageDirectory: '../coverage/performance',
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/*.performance.spec.ts',
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