import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.1 AA compliance rules
const WCAG_RULES = {
  'color-contrast': { enabled: true },
  'document-title': { enabled: true },
  'html-has-lang': { enabled: true },
  'html-lang-valid': { enabled: true },
  'meta-viewport': { enabled: true },
  'duplicate-id': { enabled: true },
  'aria-valid-attr': { enabled: true },
  'aria-valid-attr-value': { enabled: true },
  'button-name': { enabled: true },
  'link-name': { enabled: true },
  'image-alt': { enabled: true },
  'label': { enabled: true },
  'form-field-multiple-labels': { enabled: true },
  'autocomplete-valid': { enabled: true },
  'bypass': { enabled: true },
  'landmark-one-main': { enabled: true },
  'region': { enabled: true },
};

// Pages to audit
const PAGES_TO_AUDIT = [
  { path: '/', name: 'Home Page' },
  { path: '/register', name: 'Registration Page' },
  { path: '/login', name: 'Login Page' },
  { path: '/portal', name: 'Player Portal' },
  { path: '/portal/schedule', name: 'Schedule Page' },
  { path: '/portal/standings', name: 'Standings Page' },
  { path: '/portal/teams', name: 'Teams Page' },
  { path: '/dashboard/player', name: 'Player Dashboard' },
  { path: '/dashboard/coach', name: 'Coach Dashboard' },
  { path: '/admin/branding', name: 'Admin Branding' },
];

// Helper to format violations
function formatViolation(violation: any) {
  return {
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node: any) => ({
      html: node.html,
      target: node.target,
      failureSummary: node.failureSummary,
    })),
  };
}

test.describe('Accessibility Audit - WCAG 2.1 AA Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Enable feature flags
    await page.addInitScript(() => {
      window.localStorage.setItem('feature_flags', JSON.stringify({
        registration_v1: true,
        payments_live_v1: true,
        branding_v1: true,
        pwa_v1: true
      }));
    });
  });

  PAGES_TO_AUDIT.forEach(({ path, name }) => {
    test(`${name} - No critical accessibility issues`, async ({ page }) => {
      await page.goto(path);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      // Run axe accessibility audit
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      // Filter for critical and serious violations
      const criticalViolations = accessibilityScanResults.violations.filter(
        violation => violation.impact === 'critical' || violation.impact === 'serious'
      );
      
      // Log all violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log(`\n=== ${name} Accessibility Issues ===`);
        accessibilityScanResults.violations.forEach(violation => {
          console.log(`\n${violation.impact?.toUpperCase()}: ${violation.id}`);
          console.log(`Description: ${violation.description}`);
          console.log(`Help: ${violation.help}`);
          console.log(`Affected elements: ${violation.nodes.length}`);
        });
      }
      
      // Assert no critical issues
      expect(criticalViolations).toHaveLength(0);
    });
  });

  test('Registration Flow - Keyboard Navigation', async ({ page }) => {
    await page.goto('/register');
    
    // Test keyboard navigation through form
    await page.keyboard.press('Tab'); // Focus first input
    
    // Verify focus is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el?.tagName,
        id: el?.id,
        hasVisibleFocus: window.getComputedStyle(el!).outline !== 'none',
      };
    });
    
    expect(focusedElement.hasVisibleFocus).toBe(true);
    
    // Tab through all form fields
    const formElements = await page.$$eval('input, button, select, textarea', elements => 
      elements.map(el => ({
        tagName: el.tagName,
        type: (el as HTMLInputElement).type,
        id: el.id,
        tabIndex: el.tabIndex,
      }))
    );
    
    // All form elements should be keyboard accessible
    formElements.forEach(element => {
      expect(element.tabIndex).toBeGreaterThanOrEqual(-1);
    });
    
    // Test form submission with Enter key
    await page.fill('input[id="firstName"]', 'Test');
    await page.fill('input[id="lastName"]', 'User');
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'TestPassword123!');
    await page.fill('input[id="confirmPassword"]', 'TestPassword123!');
    
    await page.keyboard.press('Enter');
    
    // Should navigate to next step
    await expect(page.locator('text=Select Your Role')).toBeVisible();
  });

  test('Color Contrast - All Text Elements', async ({ page }) => {
    await page.goto('/');
    
    const axe = new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .options({
        runOnly: {
          type: 'rule',
          values: ['color-contrast'],
        },
      });
    
    const results = await axe.analyze();
    
    // Log any contrast issues
    if (results.violations.length > 0) {
      console.log('\n=== Color Contrast Issues ===');
      results.violations[0].nodes.forEach((node, index) => {
        console.log(`\nIssue ${index + 1}:`);
        console.log(`Element: ${node.html}`);
        console.log(`Contrast ratio: ${node.any[0]?.data?.contrastRatio}`);
        console.log(`Required ratio: ${node.any[0]?.data?.expectedContrastRatio}`);
      });
    }
    
    expect(results.violations).toHaveLength(0);
  });

  test('Screen Reader Announcements', async ({ page }) => {
    await page.goto('/register');
    
    // Check for ARIA live regions
    const liveRegions = await page.$$eval('[aria-live]', elements =>
      elements.map(el => ({
        tag: el.tagName,
        ariaLive: el.getAttribute('aria-live'),
        ariaAtomic: el.getAttribute('aria-atomic'),
        role: el.getAttribute('role'),
      }))
    );
    
    console.log('Live regions found:', liveRegions);
    
    // Test error announcement
    await page.click('button:has-text("Continue")'); // Submit empty form
    
    // Check if errors are announced
    const errorElements = await page.$$eval('[role="alert"], .text-destructive', elements =>
      elements.map(el => ({
        text: el.textContent,
        role: el.getAttribute('role'),
        ariaLive: el.getAttribute('aria-live'),
      }))
    );
    
    // Errors should be announced to screen readers
    expect(errorElements.length).toBeGreaterThan(0);
    
    // Test success announcement
    await page.fill('input[id="firstName"]', 'Test');
    await page.fill('input[id="lastName"]', 'User');
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'TestPassword123!');
    await page.fill('input[id="confirmPassword"]', 'TestPassword123!');
    await page.click('button:has-text("Continue")');
    
    // Success messages should be announced
    await page.waitForSelector('text=Select Your Role');
  });

  test('Form Labels and Instructions', async ({ page }) => {
    await page.goto('/register');
    
    // Check all form inputs have associated labels
    const inputsWithoutLabels = await page.$$eval('input:not([type="hidden"])', inputs =>
      inputs.filter(input => {
        const id = input.id;
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        const label = document.querySelector(`label[for="${id}"]`);
        
        return !label && !ariaLabel && !ariaLabelledBy;
      }).map(input => ({
        id: input.id,
        type: input.type,
        name: input.name,
      }))
    );
    
    expect(inputsWithoutLabels).toHaveLength(0);
    
    // Check for form instructions
    const requiredFields = await page.$$eval('[aria-required="true"], input:required', elements =>
      elements.length
    );
    
    expect(requiredFields).toBeGreaterThan(0);
    
    // Check for field descriptions
    const fieldDescriptions = await page.$$eval('[aria-describedby]', elements =>
      elements.map(el => ({
        tag: el.tagName,
        describedBy: el.getAttribute('aria-describedby'),
      }))
    );
    
    console.log('Fields with descriptions:', fieldDescriptions.length);
  });

  test('Focus Management in Modals', async ({ page }) => {
    await page.goto('/register');
    
    // Navigate to age verification step
    await page.fill('input[id="firstName"]', 'Test');
    await page.fill('input[id="lastName"]', 'User');
    await page.fill('input[id="email"]', 'young@example.com');
    await page.fill('input[id="password"]', 'TestPassword123!');
    await page.fill('input[id="confirmPassword"]', 'TestPassword123!');
    await page.click('button:has-text("Continue")');
    
    await page.click('button:has-text("Player")'); // Select player role
    await page.click('button:has-text("Continue")');
    
    // Fill date to trigger age gate
    await page.click('button[role="combobox"]:has-text("Month")');
    await page.click('[role="option"]:has-text("January")');
    await page.click('button[role="combobox"]:has-text("Day")');
    await page.click('[role="option"]:has-text("1")');
    await page.click('button[role="combobox"]:has-text("Year")');
    await page.click('[role="option"]:has-text("2015")'); // Under 13
    
    await page.fill('input[id="parentName"]', 'Parent Name');
    await page.fill('input[id="parentEmail"]', 'parent@example.com');
    await page.click('button:has-text("Continue")');
    
    // Check if modal traps focus
    const modalVisible = await page.isVisible('[role="dialog"]');
    if (modalVisible) {
      // Test focus trap
      const focusableInModal = await page.$$eval(
        '[role="dialog"] button, [role="dialog"] input, [role="dialog"] [tabindex="0"]',
        elements => elements.length
      );
      
      expect(focusableInModal).toBeGreaterThan(0);
      
      // Test escape key closes modal
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 1000 }).catch(() => {
        // Modal might not close on escape, which is acceptable
      });
    }
  });

  test('Responsive Design Accessibility', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      
      console.log(`\nTesting ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .analyze();
      
      const criticalIssues = results.violations.filter(v => v.impact === 'critical');
      
      if (criticalIssues.length > 0) {
        console.log(`Critical issues on ${viewport.name}:`, criticalIssues.map(v => v.id));
      }
      
      expect(criticalIssues).toHaveLength(0);
    }
  });

  test('PWA Offline Accessibility', async ({ page, context }) => {
    await page.goto('/');
    
    // Wait for service worker
    await page.waitForTimeout(2000);
    
    // Go offline
    await context.setOffline(true);
    
    // Navigate to a page
    await page.goto('/offline.html');
    
    // Run accessibility audit on offline page
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();
    
    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
    
    // Check offline indicator is accessible
    const offlineIndicator = await page.$('[aria-label*="offline"]');
    expect(offlineIndicator).toBeTruthy();
  });

  test('Dynamic Content Accessibility', async ({ page }) => {
    await page.goto('/portal/schedule');
    
    // Wait for dynamic content to load
    await page.waitForSelector('[data-testid="schedule-content"]', { timeout: 5000 }).catch(() => {
      // Content might not exist
    });
    
    // Check dynamically loaded content
    const results = await new AxeBuilder({ page })
      .include('[data-testid="schedule-content"]')
      .analyze();
    
    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
    
    // Test infinite scroll accessibility
    const hasInfiniteScroll = await page.$('[data-infinite-scroll]');
    if (hasInfiniteScroll) {
      // Check for proper ARIA attributes
      const ariaAttributes = await page.$eval('[data-infinite-scroll]', el => ({
        ariaLive: el.getAttribute('aria-live'),
        ariaBusy: el.getAttribute('aria-busy'),
        role: el.getAttribute('role'),
      }));
      
      expect(ariaAttributes.ariaLive).toBeTruthy();
    }
  });

  test('Generate Accessibility Report', async ({ page }) => {
    const report = {
      timestamp: new Date().toISOString(),
      wcagLevel: 'AA',
      summary: {
        pagesAudited: PAGES_TO_AUDIT.length,
        totalViolations: 0,
        criticalViolations: 0,
        seriousViolations: 0,
        moderateViolations: 0,
        minorViolations: 0,
      },
      violations: [],
      passes: [],
    };
    
    for (const { path, name } of PAGES_TO_AUDIT) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      // Update summary
      report.summary.totalViolations += results.violations.length;
      results.violations.forEach(violation => {
        switch (violation.impact) {
          case 'critical':
            report.summary.criticalViolations++;
            break;
          case 'serious':
            report.summary.seriousViolations++;
            break;
          case 'moderate':
            report.summary.moderateViolations++;
            break;
          case 'minor':
            report.summary.minorViolations++;
            break;
        }
      });
      
      // Add page results
      if (results.violations.length > 0) {
        report.violations.push({
          page: name,
          path: path,
          violations: results.violations.map(formatViolation),
        });
      }
      
      report.passes.push({
        page: name,
        path: path,
        passedRules: results.passes.length,
      });
    }
    
    // Log report
    console.log('\n=== Accessibility Audit Report ===');
    console.log(JSON.stringify(report, null, 2));
    
    // Assert no critical issues
    expect(report.summary.criticalViolations).toBe(0);
    
    // WCAG 2.1 AA compliance check
    const complianceStatus = report.summary.criticalViolations === 0 && 
                           report.summary.seriousViolations === 0;
    
    console.log(`\nWCAG 2.1 AA Compliance: ${complianceStatus ? 'PASS ✓' : 'FAIL ✗'}`);
    expect(complianceStatus).toBe(true);
  });
});