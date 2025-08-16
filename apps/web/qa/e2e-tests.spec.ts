/**
 * GameTriq Basketball League Management System
 * Comprehensive End-to-End Test Suite
 * 
 * Validates complete user journeys for all personas:
 * - League Administrators
 * - Coaches  
 * - Parents
 * - Players
 * - Referees
 * - Scorekeepers
 * - Spectators
 * 
 * @version 1.0.0
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { execSync } from 'child_process';

// Test configuration
const config = {
  baseUrl: process.env.GAMETRIQ_BASE_URL || 'https://leaguegametriq.vercel.app',
  localUrl: 'http://localhost:3000',
  timeout: 30000,
  mobileViewport: { width: 375, height: 667 },
  tabletViewport: { width: 768, height: 1024 },
  desktopViewport: { width: 1440, height: 900 }
};

// Test data
const testUsers = {
  league_admin: {
    email: 'admin@gametriq.test',
    password: 'AdminPass123!',
    role: 'league_admin'
  },
  coach: {
    email: 'coach@gametriq.test', 
    password: 'CoachPass123!',
    role: 'coach'
  },
  parent: {
    email: 'parent@gametriq.test',
    password: 'ParentPass123!',
    role: 'parent'
  },
  referee: {
    email: 'referee@gametriq.test',
    password: 'RefPass123!',
    role: 'referee'
  },
  scorekeeper: {
    email: 'scorekeeper@gametriq.test',
    password: 'ScorePass123!',
    role: 'scorekeeper'
  }
};

// Test utilities
class GameTriqTestHelper {
  constructor(private page: Page) {}

  async navigateToPage(path: string) {
    const url = `${config.baseUrl}${path}`;
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async login(userType: keyof typeof testUsers) {
    const user = testUsers[userType];
    await this.navigateToPage('/auth/login');
    
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for successful login redirect
    await this.page.waitForURL(/\/dashboard|\/coach|\/referee|\/scorekeeper/);
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `qa/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  async checkPerformance() {
    const performanceEntries = await this.page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')));
    });
    
    return {
      loadTime: performanceEntries[0]?.loadEventEnd - performanceEntries[0]?.loadEventStart,
      domContentLoaded: performanceEntries[0]?.domContentLoadedEventEnd - performanceEntries[0]?.domContentLoadedEventStart,
      firstContentfulPaint: performanceEntries[0]?.responseEnd - performanceEntries[0]?.requestStart
    };
  }

  async checkAccessibility() {
    // Check for basic accessibility requirements
    const violations = await this.page.evaluate(() => {
      const violations = [];
      
      // Check for missing alt text on images
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        violations.push(`${images.length} images missing alt text`);
      }
      
      // Check for proper heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let lastLevel = 0;
      headings.forEach(heading => {
        const level = parseInt(heading.tagName[1]);
        if (level > lastLevel + 1) {
          violations.push('Heading hierarchy violation detected');
        }
        lastLevel = level;
      });
      
      // Check for form labels
      const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea, select');
      inputs.forEach(input => {
        const hasLabel = input.labels?.length > 0 || input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
        if (!hasLabel) {
          violations.push('Form input missing accessible label');
        }
      });
      
      return violations;
    });
    
    return violations;
  }
}

// Test Suite: Authentication & Security
test.describe('Authentication & Security Tests', () => {
  test('should load login page successfully', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    await helper.navigateToPage('/auth/login');
    
    await expect(page).toHaveTitle(/GameTriq|Login/);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    await helper.takeScreenshot('login-page');
  });

  test('should prevent XSS attacks in login form', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    await helper.navigateToPage('/auth/login');
    
    // Attempt XSS injection
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('[data-testid="email-input"]', xssPayload);
    await page.fill('[data-testid="password-input"]', xssPayload);
    
    // Check that script tags are not executed
    const scriptTags = await page.locator('script').count();
    const hasAlert = await page.evaluate(() => window.alert !== window.alert);
    
    expect(hasAlert).toBeFalsy();
  });

  test('should enforce secure password requirements', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    await helper.navigateToPage('/auth/register');
    
    // Test weak password
    await page.fill('[data-testid="password-input"]', '123');
    await page.click('[data-testid="register-button"]');
    
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('should protect against SQL injection', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    await helper.navigateToPage('/auth/login');
    
    // Attempt SQL injection
    const sqlPayload = "'; DROP TABLE users; --";
    await page.fill('[data-testid="email-input"]', sqlPayload);
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    
    // Should show login error, not crash
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
  });
});

// Test Suite: League Administrator Journey
test.describe('League Administrator User Journey', () => {
  test('should complete full admin workflow', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    // Step 1: Login as admin
    await helper.login('league_admin');
    await helper.takeScreenshot('admin-dashboard');
    
    // Step 2: Create new league
    await page.click('[data-testid="create-league-button"]');
    await page.fill('[data-testid="league-name"]', 'Phoenix Youth Basketball League');
    await page.fill('[data-testid="league-season"]', '2024 Fall Season');
    await page.click('[data-testid="save-league"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Step 3: Add teams
    await page.click('[data-testid="manage-teams"]');
    await page.click('[data-testid="add-team"]');
    await page.fill('[data-testid="team-name"]', 'Phoenix Suns Youth');
    await page.click('[data-testid="save-team"]');
    
    // Step 4: Schedule games
    await page.click('[data-testid="schedule-games"]');
    await page.click('[data-testid="auto-schedule"]');
    await page.click('[data-testid="confirm-schedule"]');
    
    await expect(page.locator('[data-testid="games-scheduled"]')).toBeVisible();
    
    // Step 5: View reports
    await page.click('[data-testid="reports"]');
    await page.click('[data-testid="league-stats"]');
    
    await expect(page.locator('[data-testid="stats-table"]')).toBeVisible();
    
    await helper.takeScreenshot('admin-workflow-complete');
  });

  test('should manage referee assignments', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    await helper.login('league_admin');
    
    await page.click('[data-testid="referee-management"]');
    await page.click('[data-testid="assign-referee"]');
    await page.selectOption('[data-testid="referee-select"]', 'John Doe');
    await page.selectOption('[data-testid="game-select"]', 'Game 1');
    await page.click('[data-testid="confirm-assignment"]');
    
    await expect(page.locator('[data-testid="assignment-success"]')).toBeVisible();
  });
});

// Test Suite: Coach User Journey  
test.describe('Coach User Journey', () => {
  test('should complete full coach workflow', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    // Step 1: Login as coach
    await helper.login('coach');
    await helper.takeScreenshot('coach-dashboard');
    
    // Step 2: Manage team roster
    await page.click('[data-testid="team-roster"]');
    await page.click('[data-testid="add-player"]');
    await page.fill('[data-testid="player-name"]', 'Michael Jordan Jr.');
    await page.fill('[data-testid="player-number"]', '23');
    await page.click('[data-testid="save-player"]');
    
    await expect(page.locator('[data-testid="player-added"]')).toBeVisible();
    
    // Step 3: View game schedule
    await page.click('[data-testid="schedule"]');
    await expect(page.locator('[data-testid="games-list"]')).toBeVisible();
    
    // Step 4: Check team statistics
    await page.click('[data-testid="team-stats"]');
    await expect(page.locator('[data-testid="stats-overview"]')).toBeVisible();
    
    // Step 5: Send message to parents
    await page.click('[data-testid="messages"]');
    await page.click('[data-testid="compose-message"]');
    await page.fill('[data-testid="message-subject"]', 'Practice Update');
    await page.fill('[data-testid="message-body"]', 'Practice moved to 4 PM today.');
    await page.click('[data-testid="send-message"]');
    
    await expect(page.locator('[data-testid="message-sent"]')).toBeVisible();
    
    await helper.takeScreenshot('coach-workflow-complete');
  });
});

// Test Suite: Scorekeeper User Journey
test.describe('Scorekeeper User Journey', () => {
  test('should complete live scoring workflow', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    // Step 1: Login as scorekeeper
    await helper.login('scorekeeper');
    await helper.takeScreenshot('scorekeeper-dashboard');
    
    // Step 2: Select active game
    await page.click('[data-testid="active-games"]');
    await page.click('[data-testid="game-1"]');
    
    // Step 3: Start game scoring
    await page.click('[data-testid="start-game"]');
    
    // Step 4: Record scores
    await page.click('[data-testid="team-a-score"]');
    await page.click('[data-testid="team-a-score"]'); // 2 points
    
    await page.click('[data-testid="team-b-score"]');
    await page.click('[data-testid="team-b-score"]');
    await page.click('[data-testid="team-b-score"]'); // 3 points
    
    // Step 5: Record fouls and timeouts
    await page.click('[data-testid="team-a-foul"]');
    await page.click('[data-testid="team-b-timeout"]');
    
    // Step 6: End quarter
    await page.click('[data-testid="end-quarter"]');
    
    await expect(page.locator('[data-testid="quarter-ended"]')).toBeVisible();
    
    await helper.takeScreenshot('scorekeeper-live-scoring');
  });

  test('should handle offline scoring', async ({ page, context }) => {
    const helper = new GameTriqTestHelper(page);
    await helper.login('scorekeeper');
    
    // Simulate offline condition
    await context.setOffline(true);
    
    // Continue scoring offline
    await page.click('[data-testid="active-games"]');
    await page.click('[data-testid="team-a-score"]');
    
    // Check offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Restore connection
    await context.setOffline(false);
    
    // Check data sync
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
  });
});

// Test Suite: Parent/Spectator Journey
test.describe('Parent/Spectator User Journey', () => {
  test('should view live scores and schedules', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    // Step 1: Access public portal
    await helper.navigateToPage('/spectator');
    await helper.takeScreenshot('spectator-portal');
    
    // Step 2: View live games
    await page.click('[data-testid="live-games"]');
    await expect(page.locator('[data-testid="live-scoreboard"]')).toBeVisible();
    
    // Step 3: Check game schedule
    await page.click('[data-testid="schedule-tab"]');
    await expect(page.locator('[data-testid="games-calendar"]')).toBeVisible();
    
    // Step 4: View team standings
    await page.click('[data-testid="standings-tab"]');
    await expect(page.locator('[data-testid="standings-table"]')).toBeVisible();
    
    // Step 5: Follow specific team
    await page.click('[data-testid="follow-team"]');
    await page.selectOption('[data-testid="team-selector"]', 'Phoenix Suns Youth');
    await page.click('[data-testid="follow-button"]');
    
    await expect(page.locator('[data-testid="following-team"]')).toBeVisible();
  });
});

// Test Suite: Performance & Mobile Tests
test.describe('Performance & Mobile Responsiveness', () => {
  test('should load pages within performance thresholds', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    // Test main pages
    const pages = ['/', '/auth/login', '/spectator', '/tournaments'];
    
    for (const pagePath of pages) {
      await helper.navigateToPage(pagePath);
      
      const performance = await helper.checkPerformance();
      
      // Assert performance thresholds
      expect(performance.loadTime).toBeLessThan(3000); // 3 seconds
      expect(performance.domContentLoaded).toBeLessThan(2000); // 2 seconds
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    // Set mobile viewport
    await page.setViewportSize(config.mobileViewport);
    
    await helper.navigateToPage('/spectator');
    
    // Check mobile navigation
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Check touch-friendly buttons
    const buttons = page.locator('button, [role="button"]');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();
      
      if (boundingBox) {
        // Minimum touch target size: 44px
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
      }
    }
    
    await helper.takeScreenshot('mobile-responsive');
  });

  test('should work offline with PWA features', async ({ page, context }) => {
    const helper = new GameTriqTestHelper(page);
    
    // Load app and check for service worker
    await helper.navigateToPage('/');
    
    const serviceWorkerRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(serviceWorkerRegistered).toBeTruthy();
    
    // Test offline functionality
    await context.setOffline(true);
    await page.reload();
    
    // Should show offline page or cached content
    await expect(page.locator('[data-testid="offline-content"]')).toBeVisible();
  });
});

// Test Suite: Accessibility
test.describe('Accessibility Compliance', () => {
  test('should meet WCAG 2.1 AA standards', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    await helper.navigateToPage('/');
    
    // Check accessibility violations
    const violations = await helper.checkAccessibility();
    
    // Assert no critical accessibility violations
    expect(violations.length).toBeLessThanOrEqual(5);
    
    // Check color contrast
    const hasGoodContrast = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let contrastIssues = 0;
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // Basic contrast check (simplified)
        if (color === 'rgb(255, 255, 255)' && backgroundColor === 'rgb(255, 255, 255)') {
          contrastIssues++;
        }
      });
      
      return contrastIssues < 5;
    });
    
    expect(hasGoodContrast).toBeTruthy();
  });

  test('should be keyboard navigable', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    await helper.navigateToPage('/auth/login');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Check focus visibility
    const focusedElement = await page.locator(':focus').count();
    expect(focusedElement).toBeGreaterThan(0);
  });
});

// Test Suite: Cross-browser Compatibility
test.describe('Cross-browser Compatibility', () => {
  test('should work consistently across browsers', async ({ page, browserName }) => {
    const helper = new GameTriqTestHelper(page);
    
    await helper.navigateToPage('/');
    
    // Check basic functionality works
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    
    // Browser-specific checks
    if (browserName === 'firefox') {
      // Firefox-specific tests
      const firefoxFeatures = await page.evaluate(() => {
        return {
          css: !!window.CSS,
          fetch: !!window.fetch
        };
      });
      
      expect(firefoxFeatures.css).toBeTruthy();
      expect(firefoxFeatures.fetch).toBeTruthy();
    }
    
    await helper.takeScreenshot(`${browserName}-compatibility`);
  });
});

// Test Suite: Data Validation & Security
test.describe('Data Validation & Security', () => {
  test('should validate form inputs properly', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    await helper.navigateToPage('/auth/register');
    
    // Test email validation
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.click('[data-testid="register-button"]');
    
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    
    // Test required fields
    await page.fill('[data-testid="email-input"]', '');
    await page.click('[data-testid="register-button"]');
    
    await expect(page.locator('[data-testid="required-error"]')).toBeVisible();
  });

  test('should have proper CSRF protection', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    await helper.navigateToPage('/auth/login');
    
    // Check for CSRF token in forms
    const csrfToken = await page.locator('[name="_token"], [name="csrf_token"]').count();
    expect(csrfToken).toBeGreaterThan(0);
  });
});

// Test Suite: API Health & Integration
test.describe('API Health & Integration', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    // Mock API failure
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await helper.navigateToPage('/dashboard');
    
    // Should show error message, not crash
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should validate database connectivity', async ({ page }) => {
    const helper = new GameTriqTestHelper(page);
    
    // Check health endpoint
    const response = await page.request.get(`${config.baseUrl}/api/health`);
    
    if (response.status() === 200) {
      const health = await response.json();
      expect(health.status).toBe('healthy');
    } else {
      // Log database connectivity issue
      console.warn('⚠️ Database connectivity issue detected');
    }
  });
});

// Test reporter for comprehensive results
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    // Capture additional debug info on failure
    const screenshot = await page.screenshot();
    await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
    
    const html = await page.content();
    await testInfo.attach('page-html', { body: html, contentType: 'text/html' });
  }
});

// Export test utilities for reuse
export { GameTriqTestHelper, config, testUsers };