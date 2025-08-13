const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'E2E Tests',
  testMatch: ['**/*.e2e-spec.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/e2e-setup.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  testTimeout: 60000,
  maxWorkers: 1,
  coverageDirectory: '../coverage/e2e',
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.spec.ts',
    '!src/**/*.e2e-spec.ts',
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