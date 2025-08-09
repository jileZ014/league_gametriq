import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// MVP Access Pack - Automated Screenshot Generation
// Phoenix Flight Youth Basketball Demo

const STAGING_URL = 'https://staging.gametriq.app';
const SCREENSHOT_DIR = 'docs/phase3/demos/screenshots';

// Demo Credentials
const credentials = {
  admin: { email: 'admin@phoenixflight.demo', password: 'Demo2024!' },
  manager: { email: 'manager@phoenixflight.demo', password: 'Demo2024!' },
  coach: { email: 'coach1@suns.demo', password: 'Demo2024!' },
  parent: { email: 'parent1@phoenixflight.demo', password: 'Demo2024!' },
  referee: { email: 'ref1@phoenixflight.demo', password: 'Demo2024!' }
};

test.describe('MVP Access Pack - Screenshot Automation', () => {
  test.beforeAll(async () => {
    // Create screenshot directory
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.describe('Public Portal Journey', () => {
    test('01 - Public Homepage', async ({ page }) => {
      await page.goto(`${STAGING_URL}/phoenix-flight`);
      await page.waitForSelector('.league-header');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '01-public-homepage.png'),
        fullPage: true
      });
    });

    test('02 - League Standings', async ({ page }) => {
      await page.goto(`${STAGING_URL}/phoenix-flight/standings/u12`);
      await page.waitForSelector('.standings-table');
      
      // Highlight top teams
      await page.evaluate(() => {
        const rows = document.querySelectorAll('.standings-table tr:nth-child(-n+4)');
        rows.forEach(row => {
          (row as HTMLElement).style.backgroundColor = '#fffacd';
        });
      });
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-league-standings.png'),
        fullPage: false
      });
    });

    test('03 - Team Schedule', async ({ page }) => {
      await page.goto(`${STAGING_URL}/phoenix-flight/teams/suns/schedule`);
      await page.waitForSelector('.schedule-grid');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-team-schedule.png'),
        fullPage: false
      });
    });

    test('04 - Game Details', async ({ page }) => {
      await page.goto(`${STAGING_URL}/phoenix-flight/games/game-1`);
      await page.waitForSelector('.game-details');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-game-details.png'),
        fullPage: false
      });
    });

    test('05 - ICS Calendar Export', async ({ page }) => {
      await page.goto(`${STAGING_URL}/phoenix-flight/teams/suns/schedule`);
      await page.waitForSelector('.export-calendar-btn');
      
      // Click export button
      await page.click('.export-calendar-btn');
      await page.waitForSelector('.export-modal');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-ics-export.png'),
        fullPage: false
      });
    });
  });

  test.describe('Admin Journey - Playoffs', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await loginAs(page, 'admin');
    });

    test('06 - Playoff Dashboard', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin/playoffs`);
      await page.waitForSelector('.playoff-dashboard');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '06-playoff-dashboard.png'),
        fullPage: true
      });
    });

    test('07 - Generate Bracket', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin/playoffs/create`);
      await page.waitForSelector('.bracket-generator');
      
      // Configure bracket
      await page.selectOption('#division', 'div-u12');
      await page.selectOption('#format', 'single_elimination');
      await page.selectOption('#teams', '8');
      await page.check('#third-place');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '07-bracket-generator.png'),
        fullPage: false
      });
      
      // Generate bracket
      await page.click('.generate-bracket-btn');
      await page.waitForSelector('.bracket-preview');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '08-bracket-preview.png'),
        fullPage: true
      });
    });

    test('09 - Bracket Visualization', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin/playoffs/tourney-u12`);
      await page.waitForSelector('.tournament-bracket');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '09-bracket-visualization.png'),
        fullPage: true
      });
    });

    test('10 - Game Score Entry', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin/games/playoff-qf1/score`);
      await page.waitForSelector('.score-entry-form');
      
      // Enter scores
      await page.fill('#home-score', '52');
      await page.fill('#away-score', '48');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '10-score-entry.png'),
        fullPage: false
      });
      
      // Complete game
      await page.click('.complete-game-btn');
      await page.waitForSelector('.game-completed-modal');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '11-game-completed.png'),
        fullPage: false
      });
    });
  });

  test.describe('Officials Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
    });

    test('12 - Officials Dashboard', async ({ page }) => {
      await page.goto(`${STAGING_URL}/manager/officials`);
      await page.waitForSelector('.officials-dashboard');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '12-officials-dashboard.png'),
        fullPage: true
      });
    });

    test('13 - Availability Calendar', async ({ page }) => {
      await page.goto(`${STAGING_URL}/manager/officials/availability`);
      await page.waitForSelector('.availability-calendar');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '13-availability-calendar.png'),
        fullPage: false
      });
    });

    test('14 - Auto Assignment', async ({ page }) => {
      await page.goto(`${STAGING_URL}/manager/officials/assign`);
      await page.waitForSelector('.assignment-optimizer');
      
      // Select games for assignment
      await page.check('#game-5');
      await page.check('#game-6');
      await page.check('#game-7');
      await page.check('#game-8');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '14-assignment-setup.png'),
        fullPage: false
      });
      
      // Run optimizer
      await page.click('.run-optimizer-btn');
      await page.waitForSelector('.assignment-results');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '15-assignment-results.png'),
        fullPage: true
      });
    });

    test('16 - Payroll Export', async ({ page }) => {
      await page.goto(`${STAGING_URL}/manager/officials/payroll`);
      await page.waitForSelector('.payroll-export');
      
      // Set date range
      await page.fill('#start-date', '2024-03-01');
      await page.fill('#end-date', '2024-03-31');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '16-payroll-export.png'),
        fullPage: false
      });
    });
  });

  test.describe('Reports & Analytics', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
    });

    test('17 - Reports Dashboard', async ({ page }) => {
      await page.goto(`${STAGING_URL}/manager/reports`);
      await page.waitForSelector('.reports-dashboard');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '17-reports-dashboard.png'),
        fullPage: true
      });
    });

    test('18 - League Health Metrics', async ({ page }) => {
      await page.goto(`${STAGING_URL}/manager/reports/health`);
      await page.waitForSelector('.health-metrics');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '18-health-metrics.png'),
        fullPage: true
      });
    });

    test('19 - Revenue Report', async ({ page }) => {
      await page.goto(`${STAGING_URL}/manager/reports/revenue`);
      await page.waitForSelector('.revenue-chart');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '19-revenue-report.png'),
        fullPage: false
      });
    });

    test('20 - Export Center', async ({ page }) => {
      await page.goto(`${STAGING_URL}/manager/exports`);
      await page.waitForSelector('.export-center');
      
      // Show export options
      await page.click('.export-type-dropdown');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '20-export-center.png'),
        fullPage: false
      });
    });
  });

  test.describe('Mobile Experience', () => {
    test.use({
      viewport: { width: 375, height: 812 }, // iPhone 12 viewport
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });

    test('21 - Mobile Homepage', async ({ page }) => {
      await page.goto(`${STAGING_URL}/phoenix-flight`);
      await page.waitForSelector('.league-header');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '21-mobile-homepage.png'),
        fullPage: true
      });
    });

    test('22 - Mobile Standings', async ({ page }) => {
      await page.goto(`${STAGING_URL}/phoenix-flight/standings/u12`);
      await page.waitForSelector('.standings-table');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '22-mobile-standings.png'),
        fullPage: false
      });
    });

    test('23 - Mobile Bracket', async ({ page }) => {
      await page.goto(`${STAGING_URL}/phoenix-flight/playoffs/u12`);
      await page.waitForSelector('.tournament-bracket');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '23-mobile-bracket.png'),
        fullPage: false
      });
    });

    test('24 - Mobile Score Entry', async ({ page }) => {
      await loginAs(page, 'coach');
      await page.goto(`${STAGING_URL}/coach/games/live`);
      await page.waitForSelector('.live-scoring');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '24-mobile-scoring.png'),
        fullPage: false
      });
    });
  });

  test.describe('Production Operations', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('25 - Operations Dashboard', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin/operations`);
      await page.waitForSelector('.ops-dashboard');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '25-ops-dashboard.png'),
        fullPage: true
      });
    });

    test('26 - SLO Monitor', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin/operations/slo`);
      await page.waitForSelector('.slo-monitor');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '26-slo-monitor.png'),
        fullPage: false
      });
    });

    test('27 - Cost Analytics', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin/operations/costs`);
      await page.waitForSelector('.cost-analytics');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '27-cost-analytics.png'),
        fullPage: false
      });
    });

    test('28 - Backup Status', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin/operations/backups`);
      await page.waitForSelector('.backup-status');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '28-backup-status.png'),
        fullPage: false
      });
    });
  });

  test.describe('Feature Highlights', () => {
    test('29 - Heat Safety Alert', async ({ page }) => {
      await page.goto(`${STAGING_URL}/phoenix-flight`);
      
      // Simulate heat warning
      await page.evaluate(() => {
        const alert = document.createElement('div');
        alert.className = 'heat-safety-alert';
        alert.innerHTML = `
          <div style="background: #ff6b6b; color: white; padding: 15px; border-radius: 8px;">
            <h3>⚠️ Heat Advisory Active</h3>
            <p>Current Temperature: 108°F</p>
            <p>All outdoor games postponed until 7:00 PM</p>
          </div>
        `;
        document.body.prepend(alert);
      });
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '29-heat-safety.png'),
        fullPage: false
      });
    });

    test('30 - COPPA Compliance', async ({ page }) => {
      await page.goto(`${STAGING_URL}/register`);
      await page.waitForSelector('.registration-form');
      
      // Fill partial form to show COPPA
      await page.fill('#player-name', 'Test Player');
      await page.fill('#date-of-birth', '2012-01-01');
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '30-coppa-compliance.png'),
        fullPage: false
      });
    });
  });
});

// Helper function for login
async function loginAs(page: Page, role: keyof typeof credentials) {
  await page.goto(`${STAGING_URL}/login`);
  await page.fill('#email', credentials[role].email);
  await page.fill('#password', credentials[role].password);
  await page.click('.login-btn');
  await page.waitForNavigation();
}

// Generate screenshot index
test.afterAll(async () => {
  const indexContent = `
# MVP Access Pack - Screenshot Index

## Public Portal (No Auth)
- 01-public-homepage.png - League homepage
- 02-league-standings.png - Current standings
- 03-team-schedule.png - Team schedule view
- 04-game-details.png - Game information
- 05-ics-export.png - Calendar export

## Playoff Management
- 06-playoff-dashboard.png - Tournament overview
- 07-bracket-generator.png - Bracket configuration
- 08-bracket-preview.png - Generated bracket
- 09-bracket-visualization.png - Interactive bracket
- 10-score-entry.png - Game score entry
- 11-game-completed.png - Winner advancement

## Officials Management
- 12-officials-dashboard.png - Officials overview
- 13-availability-calendar.png - Availability settings
- 14-assignment-setup.png - Assignment configuration
- 15-assignment-results.png - Optimized assignments
- 16-payroll-export.png - Payroll generation

## Reports & Analytics
- 17-reports-dashboard.png - Reporting center
- 18-health-metrics.png - League health
- 19-revenue-report.png - Financial overview
- 20-export-center.png - Data exports

## Mobile Experience
- 21-mobile-homepage.png - Mobile homepage
- 22-mobile-standings.png - Mobile standings
- 23-mobile-bracket.png - Mobile bracket view
- 24-mobile-scoring.png - Mobile score entry

## Production Operations
- 25-ops-dashboard.png - Operations overview
- 26-slo-monitor.png - SLO compliance
- 27-cost-analytics.png - Cost tracking
- 28-backup-status.png - Backup health

## Feature Highlights
- 29-heat-safety.png - Phoenix heat safety
- 30-coppa-compliance.png - Youth protection
`;

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'index.md'),
    indexContent
  );
});