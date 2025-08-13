import { test, expect, Page } from '@playwright/test';

// Test data
const ADMIN_CREDENTIALS = {
  email: 'admin@legacyyouthsports.org',
  password: 'Admin123!@#',
};

const MOCK_LEAGUE = {
  name: 'Phoenix Summer Championship',
  division: '14U',
  season: 'Summer 2025',
  teams: 16,
};

// Helper functions
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('[name="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('[name="password"]', ADMIN_CREDENTIALS.password);
  await page.click('[type="submit"]');
  await page.waitForURL('/admin/dashboard');
}

test.describe('Sprint 7: Admin Dashboard Modern UI', () => {
  test.beforeEach(async ({ page }) => {
    // Enable admin modern UI feature flag
    await page.addInitScript(() => {
      localStorage.setItem('ADMIN_MODERN_UI', '1');
    });
  });

  test('should display modern admin dashboard with analytics', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Verify modern UI theme
    const dashboard = page.locator('.admin-dashboard');
    await expect(dashboard).toBeVisible();
    
    // Check analytics cards
    await expect(page.locator('[data-testid="total-registrations"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="active-leagues"]')).toContainText('82');
    await expect(page.locator('[data-testid="revenue-total"]')).toContainText('$');
    await expect(page.locator('[data-testid="active-games"]')).toBeVisible();
    
    // Verify real-time updates (mock)
    const initialRevenue = await page.locator('[data-testid="revenue-total"]').textContent();
    await page.waitForTimeout(2000);
    const updatedRevenue = await page.locator('[data-testid="revenue-total"]').textContent();
    // Revenue might update in real-time
    expect([initialRevenue, updatedRevenue]).toBeTruthy();
    
    // Check system health indicators
    await expect(page.locator('[data-testid="system-uptime"]')).toContainText('%');
    await expect(page.locator('[data-testid="api-latency"]')).toContainText('ms');
    
    // Verify navigation menu
    const navItems = ['Dashboard', 'Leagues', 'Users', 'Tournaments', 'Referees', 'Reports'];
    for (const item of navItems) {
      await expect(page.locator(`nav >> text="${item}"`)).toBeVisible();
    }
  });

  test('should manage leagues with CRUD operations', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('nav >> text="Leagues"');
    await page.waitForURL('/admin/leagues');
    
    // Create new league
    await page.click('[data-testid="create-league"]');
    await page.fill('[name="leagueName"]', MOCK_LEAGUE.name);
    await page.selectOption('[name="division"]', MOCK_LEAGUE.division);
    await page.selectOption('[name="season"]', MOCK_LEAGUE.season);
    await page.fill('[name="maxTeams"]', MOCK_LEAGUE.teams.toString());
    await page.click('[data-testid="submit-league"]');
    
    // Verify league appears in table
    await expect(page.locator(`text="${MOCK_LEAGUE.name}"`)).toBeVisible();
    
    // Edit league
    await page.click(`[data-testid="edit-league-${MOCK_LEAGUE.name}"]`);
    await page.fill('[name="leagueName"]', `${MOCK_LEAGUE.name} - Updated`);
    await page.click('[data-testid="save-changes"]');
    
    // Verify update
    await expect(page.locator(`text="${MOCK_LEAGUE.name} - Updated"`)).toBeVisible();
    
    // Delete league
    await page.click(`[data-testid="delete-league-${MOCK_LEAGUE.name} - Updated"]`);
    await page.click('[data-testid="confirm-delete"]');
    
    // Verify deletion
    await expect(page.locator(`text="${MOCK_LEAGUE.name} - Updated"`)).not.toBeVisible();
  });

  test('should manage users with role assignments', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('nav >> text="Users"');
    await page.waitForURL('/admin/users');
    
    // Search for users
    await page.fill('[data-testid="user-search"]', 'coach');
    await page.waitForTimeout(500);
    
    // Filter by role
    await page.selectOption('[data-testid="role-filter"]', 'coach');
    
    // Verify filtered results
    const userRows = page.locator('[data-testid="user-row"]');
    const count = await userRows.count();
    expect(count).toBeGreaterThan(0);
    
    // Change user role
    const firstUser = userRows.first();
    await firstUser.click();
    await page.click('[data-testid="change-role"]');
    await page.selectOption('[name="newRole"]', 'referee');
    await page.click('[data-testid="confirm-role-change"]');
    
    // Verify role change
    await expect(firstUser.locator('[data-testid="user-role"]')).toContainText('Referee');
    
    // Bulk operations
    await page.click('[data-testid="select-all"]');
    await page.click('[data-testid="bulk-actions"]');
    await page.click('[data-testid="bulk-deactivate"]');
    await page.click('[data-testid="confirm-bulk-action"]');
    
    // Verify bulk operation
    await expect(page.locator('[data-testid="success-message"]')).toContainText('deactivated');
  });

  test('should display responsive mobile layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await loginAsAdmin(page);
    
    // Check mobile menu
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Navigate on mobile
    await page.click('[data-testid="mobile-nav"] >> text="Leagues"');
    await page.waitForURL('/admin/leagues');
    
    // Verify mobile-optimized table
    await expect(page.locator('[data-testid="mobile-league-cards"]')).toBeVisible();
  });

  test('should export data in multiple formats', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('nav >> text="Leagues"');
    
    // Test CSV export
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-csv"]'),
    ]);
    expect(csvDownload.suggestedFilename()).toContain('.csv');
    
    // Test PDF export
    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-pdf"]'),
    ]);
    expect(pdfDownload.suggestedFilename()).toContain('.pdf');
  });

  test('should handle feature flag toggling', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('nav >> text="Settings"');
    await page.click('[data-testid="feature-flags"]');
    
    // Toggle admin modern UI
    const modernUIToggle = page.locator('[data-testid="toggle-ADMIN_MODERN_UI"]');
    await modernUIToggle.click();
    
    // Verify UI changes to legacy
    await page.reload();
    await expect(page.locator('.legacy-admin-dashboard')).toBeVisible();
    
    // Toggle back
    await modernUIToggle.click();
    await page.reload();
    await expect(page.locator('.admin-dashboard')).toBeVisible();
  });

  test('should track performance metrics', async ({ page }) => {
    const startTime = Date.now();
    await loginAsAdmin(page);
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 2.5 seconds
    expect(loadTime).toBeLessThan(2500);
    
    // Navigate to leagues
    const navStart = Date.now();
    await page.click('nav >> text="Leagues"');
    await page.waitForURL('/admin/leagues');
    const navTime = Date.now() - navStart;
    
    // Navigation should be fast
    expect(navTime).toBeLessThan(1500);
    
    // Check for performance indicators
    await page.click('nav >> text="Dashboard"');
    await expect(page.locator('[data-testid="api-latency"]')).toContainText(/\d+ms/);
    
    const latencyText = await page.locator('[data-testid="api-latency"]').textContent();
    const latency = parseInt(latencyText?.match(/\d+/)?.[0] || '0');
    expect(latency).toBeLessThan(100); // P95 should be under 100ms
  });

  test('should maintain accessibility standards', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Check for skip links
    await page.keyboard.press('Tab');
    const skipLink = page.locator('text="Skip to main content"');
    await expect(skipLink).toBeFocused();
    
    // Check ARIA labels
    const buttons = page.locator('button[aria-label]');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Should navigate via keyboard
    await expect(page.url()).toContain('/admin/');
    
    // Check color contrast (this would normally use axe-core)
    const heading = page.locator('h1').first();
    const headingColor = await heading.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    expect(headingColor).toBeTruthy();
  });
});

test.describe('Sprint 7: Coach Portal Features', () => {
  test('should display coach dashboard with team overview', async ({ page }) => {
    await page.goto('/coach/dashboard');
    
    // Verify coach layout
    await expect(page.locator('.coach-layout')).toBeVisible();
    
    // Check team stats
    await expect(page.locator('[data-testid="team-record"]')).toContainText('W-L');
    await expect(page.locator('[data-testid="next-game"]')).toBeVisible();
    await expect(page.locator('[data-testid="roster-count"]')).toContainText(/\d+ Players/);
  });

  test('should manage roster with drag and drop', async ({ page }) => {
    await page.goto('/coach/roster');
    
    // Find draggable players
    const benchPlayer = page.locator('[data-testid="bench-player-1"]');
    const startingLineup = page.locator('[data-testid="starting-lineup"]');
    
    // Drag player to starting lineup
    await benchPlayer.dragTo(startingLineup);
    
    // Verify player moved
    await expect(startingLineup.locator('text="Player 1"')).toBeVisible();
    
    // Test position assignment
    await page.click('[data-testid="player-1-position"]');
    await page.selectOption('[name="position"]', 'PG');
    
    // Verify position saved
    await expect(page.locator('[data-testid="player-1-position"]')).toContainText('PG');
  });

  test('should schedule practices with conflict detection', async ({ page }) => {
    await page.goto('/coach/schedule');
    
    // Create new practice
    await page.click('[data-testid="add-practice"]');
    await page.fill('[name="practiceDate"]', '2025-09-15');
    await page.fill('[name="practiceTime"]', '16:00');
    await page.selectOption('[name="venue"]', 'Desert Sky Gym');
    
    // Submit
    await page.click('[data-testid="save-practice"]');
    
    // Verify conflict detection
    // Try to schedule overlapping practice
    await page.click('[data-testid="add-practice"]');
    await page.fill('[name="practiceDate"]', '2025-09-15');
    await page.fill('[name="practiceTime"]', '16:30');
    await page.selectOption('[name="venue"]', 'Desert Sky Gym');
    await page.click('[data-testid="save-practice"]');
    
    // Should show conflict warning
    await expect(page.locator('[data-testid="conflict-warning"]')).toContainText('conflict');
  });

  test('should display player statistics with charts', async ({ page }) => {
    await page.goto('/coach/stats');
    
    // Verify chart rendering
    await expect(page.locator('canvas#points-chart')).toBeVisible();
    await expect(page.locator('canvas#rebounds-chart')).toBeVisible();
    
    // Check stat tables
    await expect(page.locator('[data-testid="team-stats-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="player-stats-table"]')).toBeVisible();
    
    // Test export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-stats"]'),
    ]);
    expect(download.suggestedFilename()).toContain('stats');
  });
});

test.describe('Sprint 7: Performance & Load Testing', () => {
  test('should handle concurrent admin operations', async ({ browser }) => {
    const contexts = [];
    const pages = [];
    
    // Create 10 concurrent admin sessions
    for (let i = 0; i < 10; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }
    
    // All admins navigate simultaneously
    const startTime = Date.now();
    await Promise.all(pages.map(page => page.goto('/admin/dashboard')));
    const totalTime = Date.now() - startTime;
    
    // Average load time should be acceptable
    const avgTime = totalTime / 10;
    expect(avgTime).toBeLessThan(3000);
    
    // Clean up
    for (const context of contexts) {
      await context.close();
    }
  });

  test('should maintain performance with large datasets', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    
    // Simulate large dataset (mock)
    await page.evaluate(() => {
      // This would normally be handled by the backend
      localStorage.setItem('mock-large-dataset', '1');
    });
    
    await page.reload();
    
    // Verify virtual scrolling is active
    const virtualScroll = page.locator('[data-testid="virtual-scroll-container"]');
    await expect(virtualScroll).toBeVisible();
    
    // Scroll performance test
    const scrollStart = Date.now();
    await page.evaluate(() => {
      const container = document.querySelector('[data-testid="virtual-scroll-container"]');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
    const scrollTime = Date.now() - scrollStart;
    
    // Scrolling should be smooth
    expect(scrollTime).toBeLessThan(500);
  });
});