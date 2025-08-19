import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Smoke Tests', () => {
  test('should load home page and navigate to login', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Take screenshot of home page
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'home-page.png'),
      fullPage: true 
    });
    
    // Check that the page loads successfully
    await expect(page).toHaveTitle(/Gametriq/i);
    
    // Look for login link/button
    const loginLink = page.getByRole('link', { name: /login/i }).or(
      page.getByRole('button', { name: /login/i })
    ).first();
    
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    
    // Wait for navigation to login page
    await page.waitForURL('**/login');
    
    // Take screenshot of login page
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'login-page.png') 
    });
  });

  test('should login as coach and access dashboard', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill in login form (using test credentials)
    // Note: These are placeholder credentials - update with actual test user
    await page.getByRole('textbox', { name: /email/i }).fill('coach@test.com');
    await page.getByRole('textbox', { name: /password/i }).fill('Test123!');
    
    // Submit login form
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    
    // Take screenshot of dashboard
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'coach-dashboard.png'),
      fullPage: true 
    });
    
    // Verify dashboard elements are visible
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/dashboard/i);
    
    // Check for key dashboard sections
    const dashboardSections = [
      'schedule',
      'team',
      'standings',
      'stats'
    ];
    
    for (const section of dashboardSections) {
      const element = page.getByText(new RegExp(section, 'i')).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.screenshot({ 
          path: path.join('artifacts', 'playwright', 'screenshots', `dashboard-${section}.png`) 
        });
      }
    }
  });

  test('should navigate through main sections', async ({ page }) => {
    // Start from home page
    await page.goto('/');
    
    // Test navigation to public portal
    const portalLink = page.getByRole('link', { name: /portal|public/i }).first();
    if (await portalLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await portalLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ 
        path: path.join('artifacts', 'playwright', 'screenshots', 'public-portal.png') 
      });
    }
    
    // Test navigation to standings
    await page.goto('/portal/standings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'standings-page.png'),
      fullPage: true 
    });
    
    // Test navigation to schedule
    await page.goto('/portal/schedule');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'schedule-page.png'),
      fullPage: true 
    });
    
    // Test navigation to teams
    await page.goto('/portal/teams');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'teams-page.png'),
      fullPage: true 
    });
  });
});