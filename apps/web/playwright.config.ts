import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

// Persistent mode configuration
const isPersistentMode = process.env.PERSISTENT_MODE === '1';
const isHeadless = process.env.HEADLESS !== '0';
const slowMo = process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0;
const recordVideo = process.env.RECORD_VIDEO === '1';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: !isPersistentMode, // Persistent mode runs sequentially
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : (isPersistentMode ? 1 : 0),
  /* Opt out of parallel tests on CI or persistent mode. */
  workers: process.env.CI ? 1 : (isPersistentMode ? 1 : undefined),
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { 
      outputFolder: 'artifacts/playwright/html',
      open: process.env.PWTEST_HTML_REPORT_OPEN || 'on-failure'
    }],
    ['list'],
    ['json', { outputFile: 'artifacts/playwright/results.json' }],
  ],
  /* Global timeout for entire test run */
  globalTimeout: isPersistentMode ? 10 * 60 * 1000 : undefined, // 10 minutes for persistent
  /* Output directory for artifacts */
  outputDir: 'artifacts/playwright/test-results',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Viewport - responsive for mobile testing */
    viewport: { width: 1440, height: 900 },

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: isPersistentMode ? 'on' : 'retain-on-failure',

    /* Screenshot settings */
    screenshot: {
      mode: isPersistentMode ? 'only-on-failure' : 'only-on-failure',
      fullPage: true
    },

    /* Video recording */
    video: recordVideo ? {
      mode: 'on',
      size: { width: 1440, height: 900 }
    } : 'retain-on-failure',

    /* Navigation timeout */
    navigationTimeout: 30 * 1000,
    
    /* Action timeout */
    actionTimeout: 15 * 1000,

    /* Locale and timezone for Phoenix market */
    locale: 'en-US',
    timezoneId: 'America/Phoenix',

    /* Permissions for PWA features */
    permissions: ['geolocation', 'notifications'],
    geolocation: { latitude: 33.4484, longitude: -112.0740 }, // Phoenix, AZ

    /* Feature flags enabled for tests */
    storageState: {
      cookies: [],
      origins: [{
        origin: 'http://localhost:3000',
        localStorage: [{
          name: 'feature_flags',
          value: JSON.stringify({
            registration_v1: true,
            payments_live_v1: true,
            branding_v1: true,
            pwa_v1: true,
            ui_modern_v1: process.env.UI_MODERN_V1 === '1'
          })
        }]
      }]
    },

    /* Slow motion for visual debugging */
    ...(slowMo > 0 && { slowMo })
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop Chromium - Primary testing browser
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enhanced args for persistent context
        launchOptions: isPersistentMode ? {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ]
        } : undefined
      },
    },
    
    // Mobile testing
    {
      name: 'iPhone 14',
      use: { ...devices['iPhone 14'] },
    },
    
    // Tablet testing for scorekeeping
    {
      name: 'iPad Pro',
      use: { ...devices['iPad Pro'] },
    },

    // Desktop Firefox for cross-browser validation
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  /* Test matching patterns */
  testMatch: [
    '**/tests/e2e/**/*.spec.ts',
    '**/tests/e2e/**/*.test.ts'
  ],

  /* Ignore test files */
  testIgnore: [
    '**/tests/e2e/**/*.skip.spec.ts',
    '**/node_modules/**'
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.SKIP_WEBSERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  /* Expect options */
  expect: {
    /* Maximum time expect() should wait for the condition to be met. */
    timeout: 10 * 1000,
    
    /* Threshold for screenshot comparisons */
    threshold: 0.2,
    
    /* Animation handling */
    animations: 'disabled',
  },

  /* Metadata for test reports */
  metadata: {
    framework: 'Next.js 14',
    platform: 'Basketball League Management',
    persistentMode: isPersistentMode,
    modernUI: process.env.UI_MODERN_V1 === '1',
    targetMarket: 'Phoenix, Arizona'
  }
});