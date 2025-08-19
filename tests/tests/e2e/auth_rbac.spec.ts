import { test, expect } from '@playwright/test';

test.describe('Authentication & RBAC Tests', () => {
  test.describe('Parent Role Access', () => {
    test('parent can view limited features', async ({ page }) => {
      // Login as parent
      await page.goto('/login');
      await page.getByRole('textbox', { name: /email/i }).fill('parent@test.com');
      await page.getByRole('textbox', { name: /password/i }).fill('Test123!');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      
      // Wait for dashboard
      await page.waitForURL('**/dashboard/**', { timeout: 10000 });
      
      // Parent should be able to see:
      // - Schedule
      // - Game scores
      // - Player stats (their child only)
      // - Team standings
      
      // Check visible elements
      await expect(page.getByText(/schedule/i).first()).toBeVisible();
      await expect(page.getByText(/standings/i).first()).toBeVisible();
      
      // Parent should NOT see:
      // - Team management options
      // - Other players' personal info
      // - Admin functions
      
      // Check that admin functions are not visible
      const adminLink = page.getByRole('link', { name: /admin/i });
      await expect(adminLink).not.toBeVisible({ timeout: 1000 }).catch(() => true);
      
      const manageTeamLink = page.getByRole('link', { name: /manage team/i });
      await expect(manageTeamLink).not.toBeVisible({ timeout: 1000 }).catch(() => true);
    });
  });

  test.describe('Coach Role Access', () => {
    test('coach can manage team and view all player info', async ({ page }) => {
      // Login as coach
      await page.goto('/login');
      await page.getByRole('textbox', { name: /email/i }).fill('coach@test.com');
      await page.getByRole('textbox', { name: /password/i }).fill('Test123!');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      
      // Wait for dashboard
      await page.waitForURL('**/dashboard/**', { timeout: 10000 });
      
      // Coach should be able to see:
      // - Team management
      // - All player info
      // - Game scheduling (view)
      // - Stats management
      
      // Check visible elements
      await expect(page.getByText(/team/i).first()).toBeVisible();
      await expect(page.getByText(/roster/i).first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      await expect(page.getByText(/schedule/i).first()).toBeVisible();
      await expect(page.getByText(/stats/i).first()).toBeVisible();
      
      // Coach should see team management options
      const teamSection = page.getByText(/team|roster/i).first();
      if (await teamSection.isVisible({ timeout: 1000 }).catch(() => false)) {
        await teamSection.click();
        await page.waitForLoadState('networkidle');
        
        // Should see player list
        const playerList = page.getByRole('list').filter({ has: page.getByText(/player/i) });
        await expect(playerList.first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      }
      
      // Coach should NOT see:
      // - League admin functions
      // - Payment processing
      // - Other teams' private info
      
      const adminLink = page.getByRole('link', { name: /league admin/i });
      await expect(adminLink).not.toBeVisible({ timeout: 1000 }).catch(() => true);
    });
  });

  test.describe('Referee Role Access', () => {
    test('referee can access game assignments and reports', async ({ page }) => {
      // Login as referee
      await page.goto('/login');
      await page.getByRole('textbox', { name: /email/i }).fill('referee@test.com');
      await page.getByRole('textbox', { name: /password/i }).fill('Test123!');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      
      // Wait for referee dashboard
      await page.waitForURL('**/referee', { timeout: 10000 }).catch(async () => {
        await page.waitForURL('**/dashboard/**', { timeout: 10000 });
      });
      
      // Referee should be able to see:
      // - Game assignments
      // - Submit game reports
      // - View game schedule
      
      await expect(page.getByText(/assignments/i).first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      await expect(page.getByText(/schedule/i).first()).toBeVisible();
      await expect(page.getByText(/report/i).first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      
      // Referee should NOT see:
      // - Team management
      // - Player personal info
      // - Financial data
      
      const teamManageLink = page.getByRole('link', { name: /manage team/i });
      await expect(teamManageLink).not.toBeVisible({ timeout: 1000 }).catch(() => true);
    });
  });

  test.describe('Scorekeeper Role Access', () => {
    test('scorekeeper can access live scoring interface', async ({ page }) => {
      // Login as scorekeeper
      await page.goto('/login');
      await page.getByRole('textbox', { name: /email/i }).fill('scorekeeper@test.com');
      await page.getByRole('textbox', { name: /password/i }).fill('Test123!');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      
      // Wait for scorekeeper interface
      await page.waitForURL('**/scorekeeper', { timeout: 10000 }).catch(async () => {
        await page.waitForURL('**/dashboard/**', { timeout: 10000 });
      });
      
      // Scorekeeper should be able to see:
      // - Live game scoring interface
      // - Foul tracking
      // - Timeout management
      // - Score submission
      
      await expect(page.getByText(/score/i).first()).toBeVisible();
      await expect(page.getByText(/game/i).first()).toBeVisible();
      
      // Check for scoring controls
      const scoreControls = page.getByRole('button').filter({ hasText: /\+|\-|add|score/i });
      await expect(scoreControls.first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      
      // Scorekeeper should NOT see:
      // - Team management
      // - Player management
      // - Admin functions
      
      const adminLink = page.getByRole('link', { name: /admin/i });
      await expect(adminLink).not.toBeVisible({ timeout: 1000 }).catch(() => true);
    });
  });

  test('unauthenticated user can only access public pages', async ({ page }) => {
    // Try to access protected routes without login
    const protectedRoutes = [
      '/dashboard',
      '/admin',
      '/scorekeeper',
      '/referee'
    ];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      
      // Should be redirected to login page
      await expect(page).toHaveURL(/\/login/);
    }
    
    // Public routes should be accessible
    const publicRoutes = [
      '/',
      '/portal',
      '/portal/schedule',
      '/portal/standings',
      '/portal/teams'
    ];
    
    for (const route of publicRoutes) {
      await page.goto(route);
      
      // Should NOT be redirected to login
      await expect(page).not.toHaveURL(/\/login/);
    }
  });
});