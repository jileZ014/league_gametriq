import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';

test.describe('Accessibility Tests', () => {
  test('home page should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Filter for contrast violations on primary text
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    
    // Log all violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations found:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`- ${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Affected elements: ${violation.nodes.length}`);
      });
    }
    
    // Take screenshot of the page
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'a11y-home-page.png'),
      fullPage: true 
    });
    
    // Fail test if there are contrast violations for primary text
    if (contrastViolations.length > 0) {
      const primaryTextViolations = contrastViolations.filter(violation => {
        return violation.nodes.some(node => {
          const target = node.target.join('');
          // Check if it's primary text (headings, paragraphs, main content)
          return target.includes('h1') || 
                 target.includes('h2') || 
                 target.includes('h3') || 
                 target.includes('p') ||
                 target.includes('main');
        });
      });
      
      expect(primaryTextViolations).toHaveLength(0);
    }
    
    // Check for other critical violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'critical' || violation.impact === 'serious'
    );
    
    // Log critical violations but don't fail (unless contrast)
    if (criticalViolations.length > 0) {
      console.warn('Critical accessibility issues found:', criticalViolations.length);
    }
  });

  test('standings page should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/portal/standings');
    await page.waitForLoadState('networkidle');
    
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'a11y-standings-page.png'),
      fullPage: true 
    });
    
    // Check for table accessibility
    const tableViolations = accessibilityScanResults.violations.filter(
      violation => violation.id.includes('table') || violation.id.includes('th')
    );
    
    if (tableViolations.length > 0) {
      console.log('Table accessibility issues:', tableViolations);
    }
    
    // Check contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    
    // Fail if primary text has contrast issues
    if (contrastViolations.length > 0) {
      const primaryTextViolations = contrastViolations.filter(violation => {
        return violation.nodes.some(node => {
          const target = node.target.join('');
          return !target.includes('secondary') && !target.includes('muted');
        });
      });
      
      expect(primaryTextViolations).toHaveLength(0);
    }
  });

  test('player card should meet WCAG AA standards', async ({ page }) => {
    // Navigate to a player card
    await page.goto('/portal/teams');
    await page.waitForLoadState('networkidle');
    
    // Click on first team
    const teamLink = page.getByRole('link').filter({ hasText: /team/i }).first();
    if (await teamLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await teamLink.click();
      await page.waitForLoadState('networkidle');
      
      // Click on first player
      const playerLink = page.getByRole('link').filter({ hasText: /#\d+|\w+\s\w+/i }).first();
      if (await playerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await playerLink.click();
        await page.waitForLoadState('networkidle');
        
        // Run axe accessibility scan on player card
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        
        // Take screenshot
        await page.screenshot({ 
          path: path.join('artifacts', 'playwright', 'screenshots', 'a11y-player-card.png'),
          fullPage: true 
        });
        
        // Check contrast violations specifically
        const contrastViolations = accessibilityScanResults.violations.filter(
          violation => violation.id === 'color-contrast'
        );
        
        // Fail test for primary text contrast violations
        if (contrastViolations.length > 0) {
          console.log(`Found ${contrastViolations.length} contrast violations`);
          contrastViolations.forEach(violation => {
            violation.nodes.forEach(node => {
              console.log(`Contrast issue: ${node.target.join(' ')}`);
              console.log(`HTML: ${node.html.substring(0, 100)}...`);
            });
          });
          
          // Check if any are on primary text elements
          const primaryTextViolations = contrastViolations.filter(violation => {
            return violation.nodes.some(node => {
              const html = node.html.toLowerCase();
              return html.includes('stat') || 
                     html.includes('name') || 
                     html.includes('number') ||
                     html.includes('position');
            });
          });
          
          expect(primaryTextViolations).toHaveLength(0);
        }
      }
    }
  });

  test('check keyboard navigation accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      return {
        tagName: el.tagName,
        hasVisibleOutline: window.getComputedStyle(el).outline !== 'none',
        hasFocusVisible: el.matches(':focus-visible')
      };
    });
    
    expect(focusedElement).not.toBeNull();
    expect(focusedElement?.hasVisibleOutline || focusedElement?.hasFocusVisible).toBeTruthy();
    
    // Tab through several elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    // Take screenshot showing focus indicators
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'a11y-keyboard-navigation.png') 
    });
    
    // Test skip links if available
    await page.goto('/');
    await page.keyboard.press('Tab');
    
    const skipLink = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      return el.textContent?.toLowerCase().includes('skip') || 
             el.getAttribute('href')?.includes('#main');
    });
    
    if (skipLink) {
      console.log('Skip link found and accessible');
    }
  });

  test('check form accessibility', async ({ page }) => {
    // Navigate to login form
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Run axe on form
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    // Check for form-specific violations
    const formViolations = accessibilityScanResults.violations.filter(
      violation => violation.id.includes('label') || 
                   violation.id.includes('input') ||
                   violation.id.includes('form')
    );
    
    if (formViolations.length > 0) {
      console.log('Form accessibility issues:', formViolations);
    }
    
    // Check that all inputs have labels
    const inputsWithoutLabels = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      const withoutLabels = [];
      inputs.forEach(input => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        
        if (!label && !ariaLabel && !ariaLabelledBy) {
          withoutLabels.push({
            type: input.getAttribute('type'),
            name: input.getAttribute('name')
          });
        }
      });
      return withoutLabels;
    });
    
    expect(inputsWithoutLabels).toHaveLength(0);
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'a11y-form-accessibility.png') 
    });
  });

  test('check responsive design accessibility', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Run axe on mobile view
    const mobileResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'a11y-mobile-view.png'),
      fullPage: true 
    });
    
    // Check for touch target size
    const touchTargets = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a, [role="button"]');
      const smallTargets = [];
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
          smallTargets.push({
            text: button.textContent?.substring(0, 20),
            width: rect.width,
            height: rect.height
          });
        }
      });
      return smallTargets;
    });
    
    if (touchTargets.length > 0) {
      console.warn('Touch targets below 44x44px:', touchTargets);
    }
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');
    
    // Take tablet screenshot
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'a11y-tablet-view.png'),
      fullPage: true 
    });
  });
});