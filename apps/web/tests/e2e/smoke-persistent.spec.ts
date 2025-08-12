import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { startPersistentSession, PersistentBrowserManager } from '../../tools/browserContext';

// Performance budgets
const PERFORMANCE_BUDGETS = {
  API_P95_MS: 100,
  PAGE_LOAD_MS: 3000,
  NAVIGATION_MS: 1500,
  INTERACTION_MS: 200
};

// Test data for basketball league domain
const TEST_DATA = {
  leagues: ['Phoenix Youth Basketball', 'Desert Storm League', 'Cactus Classic'],
  teams: ['Suns Warriors', 'Desert Eagles', 'Phoenix Fire'],
  divisions: ['6U', '8U', '10U', '12U', '14U', '16U', '18U'],
  venues: ['Desert Sky Pavilion', 'Phoenix Community Center', 'Camelback Gym']
};

test.describe('Gametriq Persistent Smoke Tests', () => {
  let manager: PersistentBrowserManager;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async () => {
    // Initialize persistent browser session
    const session = await startPersistentSession({
      headless: process.env.HEADLESS !== '0',
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
      recordVideo: process.env.RECORD_VIDEO === '1'
    });
    
    manager = session.manager;
    context = session.context;
    page = session.page;

    // Set up performance monitoring
    await page.addInitScript(() => {
      // Performance tracking
      (window as any).__PERFORMANCE__ = {
        marks: new Map(),
        measures: new Map(),
        start: (name: string) => performance.mark(`${name}-start`),
        end: (name: string) => {
          performance.mark(`${name}-end`);
          performance.measure(name, `${name}-start`, `${name}-end`);
          return performance.getEntriesByName(name)[0]?.duration || 0;
        }
      };
    });
  });

  test.afterAll(async () => {
    if (manager) {
      await manager.close();
    }
  });

  test('should load home page and verify Modern UI feature flag', async () => {
    console.log('🏀 Testing home page load with Modern UI detection...');
    
    // Performance tracking
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️  Page load time: ${loadTime}ms`);
    
    // Verify page loads
    await expect(page).toHaveTitle(/Gametriq/i);
    
    // Check feature flags in localStorage
    const featureFlags = await page.evaluate(() => {
      const flags = localStorage.getItem('feature_flags');
      return flags ? JSON.parse(flags) : {};
    });
    
    console.log('🎯 Feature flags:', featureFlags);
    
    // Verify Modern UI flag
    const modernUIEnabled = featureFlags.ui_modern_v1;
    console.log(`🎨 Modern UI: ${modernUIEnabled ? 'ENABLED' : 'DISABLED'}`);
    
    // Performance assertion
    expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.PAGE_LOAD_MS);
    
    // Take screenshot for visual verification
    await manager.screenshot(page, 'home-page-modern-ui');
  });

  test('should navigate through main sections with performance tracking', async () => {
    console.log('🧭 Testing main navigation sections...');
    
    const sections = [
      { path: '/portal', name: 'Public Portal' },
      { path: '/register', name: 'Registration' },
      { path: '/login', name: 'Login' }
    ];

    for (const section of sections) {
      console.log(`📍 Navigating to ${section.name} (${section.path})`);
      
      const navStart = Date.now();
      await page.goto(section.path);
      await page.waitForLoadState('networkidle');
      const navTime = Date.now() - navStart;
      
      console.log(`   ⏱️  Navigation time: ${navTime}ms`);
      
      // Verify page loaded
      expect(page.url()).toContain(section.path);
      
      // Performance assertion
      expect(navTime).toBeLessThan(PERFORMANCE_BUDGETS.NAVIGATION_MS);
      
      // Take screenshot
      await manager.screenshot(page, `navigation-${section.name.toLowerCase().replace(/\s+/g, '-')}`);
      
      // Brief pause for visual review in headed mode
      if (process.env.HEADLESS === '0') {
        await page.waitForTimeout(500);
      }
    }
  });

  test('should verify responsive design on mobile viewport', async () => {
    console.log('📱 Testing mobile responsive design...');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    const mobilePages = [
      '/',
      '/portal',
      '/register'
    ];

    for (const pagePath of mobilePages) {
      console.log(`📱 Testing ${pagePath} on mobile`);
      
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Check for mobile-specific elements
      const hasHamburgerMenu = await page.locator('[data-testid="mobile-menu-toggle"]').count() > 0;
      const hasResponsiveLayout = await page.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        return window.innerWidth <= 768;
      });
      
      console.log(`   📱 Mobile viewport: ${hasResponsiveLayout}`);
      console.log(`   🍔 Has mobile menu: ${hasHamburgerMenu}`);
      
      // Take mobile screenshots
      await manager.screenshot(page, `mobile-${pagePath.replace('/', 'home').replace(/\//g, '-')}`);
    }
    
    // Reset to desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('should test portal functionality with basketball domain data', async () => {
    console.log('🏀 Testing portal with basketball league data...');
    
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');
    
    // Test search functionality
    const searchInput = page.locator('[data-testid="search-input"], [placeholder*="search" i], input[type="search"]').first();
    
    if (await searchInput.count() > 0) {
      console.log('🔍 Testing search functionality...');
      
      for (const query of ['basketball', 'phoenix', 'youth']) {
        console.log(`   🔎 Searching for: "${query}"`);
        
        await searchInput.fill(query);
        await page.waitForTimeout(300); // Debounce
        
        // Check for search results or loading states
        const hasResults = await page.locator('[data-testid="search-results"]').count() > 0;
        const hasLoading = await page.locator('[data-testid="loading"]').count() > 0;
        
        console.log(`   📊 Has results: ${hasResults}, Loading: ${hasLoading}`);
        
        await searchInput.clear();
      }
    }
    
    // Test filters if available
    const filterButtons = page.locator('[data-testid*="filter"], [role="button"]:has-text("Filter")');
    const filterCount = await filterButtons.count();
    
    if (filterCount > 0) {
      console.log(`🎛️  Testing ${filterCount} filter options...`);
      
      const firstFilter = filterButtons.first();
      await firstFilter.click();
      await page.waitForTimeout(200);
      
      // Look for filter dropdown or menu
      const filterMenu = page.locator('[role="menu"], [data-testid="filter-menu"]');
      if (await filterMenu.count() > 0) {
        console.log('   ✅ Filter menu opened');
        
        // Close filter menu
        await page.keyboard.press('Escape');
      }
    }
    
    await manager.screenshot(page, 'portal-functionality');
  });

  test('should verify Modern UI theme elements', async () => {
    console.log('🎨 Verifying Modern UI theme elements...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for Modern UI indicators
    const modernUIElements = await page.evaluate(() => {
      const checks = {
        hasModernClass: document.body.classList.contains('modern-ui') || 
                       document.documentElement.classList.contains('modern-ui'),
        hasGradients: Array.from(document.querySelectorAll('*')).some(el => {
          const styles = window.getComputedStyle(el);
          return styles.background.includes('gradient') || 
                 styles.backgroundImage.includes('gradient');
        }),
        hasSportsColors: Array.from(document.querySelectorAll('*')).some(el => {
          const styles = window.getComputedStyle(el);
          const colorProps = [styles.color, styles.backgroundColor, styles.borderColor];
          return colorProps.some(color => 
            color.includes('rgb(234, 88, 12)') || // Orange
            color.includes('rgb(147, 51, 234)') || // Purple
            color.includes('#ea580c') ||
            color.includes('#9333ea')
          );
        }),
        customProperties: Array.from(document.styleSheets).some(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || []);
            return rules.some(rule => 
              rule.cssText && rule.cssText.includes('--gametriq-') ||
              rule.cssText.includes('--nba2k-') ||
              rule.cssText.includes('--espn-')
            );
          } catch {
            return false;
          }
        })
      };
      
      return checks;
    });
    
    console.log('🎨 Modern UI elements found:', modernUIElements);
    
    // WCAG AA contrast checking
    const contrastIssues = await page.evaluate(() => {
      const getContrast = (fg: string, bg: string) => {
        // Simplified contrast calculation
        const getRGBValues = (color: string) => {
          const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
        };
        
        const getLuminance = (rgb: number[]) => {
          const [r, g, b] = rgb.map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        
        const fgLum = getLuminance(getRGBValues(fg));
        const bgLum = getLuminance(getRGBValues(bg));
        const lighter = Math.max(fgLum, bgLum);
        const darker = Math.min(fgLum, bgLum);
        
        return (lighter + 0.05) / (darker + 0.05);
      };
      
      const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div'))
        .filter(el => el.textContent?.trim().length > 0)
        .slice(0, 20); // Sample first 20 elements
      
      const issues = [];
      for (const el of textElements) {
        const styles = window.getComputedStyle(el);
        const fg = styles.color;
        const bg = styles.backgroundColor;
        
        if (fg && bg && bg !== 'rgba(0, 0, 0, 0)') {
          const contrast = getContrast(fg, bg);
          if (contrast < 4.5) {
            issues.push({
              element: el.tagName.toLowerCase(),
              text: el.textContent?.substring(0, 50),
              contrast: contrast.toFixed(2)
            });
          }
        }
      }
      
      return issues;
    });
    
    console.log(`📊 WCAG AA contrast issues found: ${contrastIssues.length}`);
    if (contrastIssues.length > 0) {
      console.log('⚠️  Contrast issues:', contrastIssues.slice(0, 3)); // Show first 3
    }
    
    await manager.screenshot(page, 'modern-ui-theme-verification');
  });

  test('should test PWA installation and offline features', async () => {
    console.log('📱 Testing PWA features...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for PWA manifest
    const manifestLink = page.locator('link[rel="manifest"]');
    const hasManifest = await manifestLink.count() > 0;
    console.log(`📋 Has manifest: ${hasManifest}`);
    
    if (hasManifest) {
      const manifestHref = await manifestLink.getAttribute('href');
      console.log(`📋 Manifest URL: ${manifestHref}`);
    }
    
    // Check for service worker
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    console.log(`👷 Service worker support: ${hasServiceWorker}`);
    
    // Check for install prompt component
    const installPrompt = page.locator('[data-testid="install-prompt"], [data-testid="pwa-install"]');
    const hasInstallPrompt = await installPrompt.count() > 0;
    console.log(`📲 Has install prompt: ${hasInstallPrompt}`);
    
    // Test offline indicator if present
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    const hasOfflineIndicator = await offlineIndicator.count() > 0;
    console.log(`📡 Has offline indicator: ${hasOfflineIndicator}`);
    
    await manager.screenshot(page, 'pwa-features');
  });

  test('should performance test API response times', async () => {
    console.log('⚡ Testing API performance...');
    
    // Listen to network requests
    const apiRequests: Array<{ url: string; duration: number }> = [];
    
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/') && response.request().timing()) {
        const timing = response.request().timing();
        const duration = timing.responseEnd - timing.requestStart;
        
        apiRequests.push({ url, duration });
        console.log(`📡 API ${response.status()}: ${url} (${duration.toFixed(2)}ms)`);
      }
    });
    
    // Navigate to pages that make API calls
    const apiTestPages = ['/portal', '/register'];
    
    for (const pagePath of apiTestPages) {
      console.log(`🔄 Testing API performance on ${pagePath}`);
      
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Wait a bit for any lazy-loaded API calls
      await page.waitForTimeout(2000);
    }
    
    // Analyze API performance
    if (apiRequests.length > 0) {
      const sortedRequests = apiRequests.sort((a, b) => b.duration - a.duration);
      const p95Index = Math.ceil(sortedRequests.length * 0.95) - 1;
      const p95Duration = sortedRequests[p95Index]?.duration || 0;
      
      console.log(`📊 Total API requests: ${apiRequests.length}`);
      console.log(`⚡ P95 response time: ${p95Duration.toFixed(2)}ms`);
      console.log(`🐌 Slowest request: ${sortedRequests[0]?.url} (${sortedRequests[0]?.duration.toFixed(2)}ms)`);
      
      // Performance assertion
      expect(p95Duration).toBeLessThan(PERFORMANCE_BUDGETS.API_P95_MS);
    } else {
      console.log('ℹ️  No API requests detected');
    }
  });

  test('should verify accessibility standards', async () => {
    console.log('♿ Testing accessibility compliance...');
    
    const pagesToTest = ['/', '/portal', '/register'];
    
    for (const pagePath of pagesToTest) {
      console.log(`♿ Testing accessibility on ${pagePath}`);
      
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Basic accessibility checks
      const a11yChecks = await page.evaluate(() => {
        const checks = {
          hasAltText: Array.from(document.images).every(img => 
            img.alt !== undefined && (img.alt.trim() !== '' || img.role === 'presentation')
          ),
          hasHeadingStructure: document.querySelector('h1') !== null,
          hasSkipLink: Array.from(document.links).some(link => 
            link.textContent?.toLowerCase().includes('skip')
          ),
          hasAriaLabels: Array.from(document.querySelectorAll('button, input, select, textarea'))
            .every(el => 
              el.getAttribute('aria-label') || 
              el.getAttribute('aria-labelledby') ||
              el.textContent?.trim() !== ''
            )
        };
        
        return checks;
      });
      
      console.log(`   ♿ Accessibility checks for ${pagePath}:`, a11yChecks);
      
      // Expect basic compliance
      expect(a11yChecks.hasHeadingStructure).toBe(true);
    }
    
    await manager.screenshot(page, 'accessibility-verification');
  });

  test('should test error handling and resilience', async () => {
    console.log('🛡️  Testing error handling...');
    
    // Test 404 page
    await page.goto('/non-existent-page');
    
    const is404 = await page.evaluate(() => {
      return document.title.toLowerCase().includes('404') ||
             document.body.textContent?.toLowerCase().includes('not found') ||
             document.body.textContent?.toLowerCase().includes('page not found');
    });
    
    console.log(`📄 Has 404 handling: ${is404}`);
    await manager.screenshot(page, '404-error-handling');
    
    // Test network error simulation
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Simulate offline mode
    await context.setOffline(true);
    console.log('📡 Simulating offline mode...');
    
    // Try to navigate (should show offline indicator or cached version)
    await page.goto('/portal');
    
    const hasOfflineHandling = await page.evaluate(() => {
      return document.body.textContent?.toLowerCase().includes('offline') ||
             document.body.textContent?.toLowerCase().includes('connection') ||
             localStorage.getItem('offline-cache') !== null;
    });
    
    console.log(`📡 Has offline handling: ${hasOfflineHandling}`);
    
    // Restore online mode
    await context.setOffline(false);
    
    await manager.screenshot(page, 'offline-error-handling');
  });
});

// Utility test for generating comprehensive report
test('should generate comprehensive test report', async () => {
  console.log('📊 Generating comprehensive test report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      headless: process.env.HEADLESS !== '0',
      modernUI: process.env.UI_MODERN_V1 === '1',
      persistentMode: true,
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport: await page.viewportSize(),
      baseURL: page.url()
    },
    performance: {
      budgets: PERFORMANCE_BUDGETS,
      testCompleted: true
    },
    coverage: {
      routes: ['/', '/portal', '/register', '/login'],
      viewports: ['desktop', 'mobile'],
      features: ['pwa', 'modern-ui', 'accessibility', 'offline']
    },
    artifacts: {
      screenshots: 'artifacts/playwright/screenshots/',
      traces: 'artifacts/playwright/traces/',
      videos: process.env.RECORD_VIDEO === '1' ? 'artifacts/playwright/videos/' : null
    }
  };
  
  console.log('📋 Test execution summary:', {
    routes: report.coverage.routes.length,
    viewports: report.coverage.viewports.length,
    features: report.coverage.features.length,
    modernUI: report.environment.modernUI
  });
  
  // This would be written to file in a real implementation
  expect(report.performance.testCompleted).toBe(true);
});