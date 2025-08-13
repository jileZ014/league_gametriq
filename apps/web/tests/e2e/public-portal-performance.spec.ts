import { test, expect, Page } from '@playwright/test';

// Performance budgets from Sprint 6 plan
const PERFORMANCE_BUDGETS = {
  FIRST_CONTENTFUL_PAINT: {
    desktop: 2000,
    mobile: 2500,
  },
  LARGEST_CONTENTFUL_PAINT: {
    desktop: 3000,
    mobile: 4000,
  },
  TIME_TO_INTERACTIVE: {
    desktop: 4000,
    mobile: 5000,
  },
  CUMULATIVE_LAYOUT_SHIFT: 0.1,
  BUNDLE_SIZE: {
    desktop: 500 * 1024, // 500KB
    mobile: 400 * 1024,  // 400KB
  },
  API_P95_RESPONSE: 100, // ms
};

// Network conditions
const NETWORK_CONDITIONS = {
  '4G': { download: 10000, upload: 3000, latency: 20 },
  '3G': { download: 1600, upload: 768, latency: 150 },
  'slow-3G': { download: 400, upload: 400, latency: 400 },
};

// Test routes for public portal
const PUBLIC_ROUTES = [
  '/portal',
  '/portal/teams',
  '/portal/schedule',
  '/portal/standings',
];

// Helper to measure performance metrics
async function measurePerformanceMetrics(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const paintEntries = performance.getEntriesByType('paint');
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    const lcp = performance.getEntriesByType('largest-contentful-paint')[0];
    
    return {
      firstContentfulPaint: fcp ? fcp.startTime : null,
      largestContentfulPaint: lcp ? lcp.startTime : null,
      domContentLoaded: navEntries[0]?.domContentLoadedEventEnd - navEntries[0]?.fetchStart,
      loadComplete: navEntries[0]?.loadEventEnd - navEntries[0]?.fetchStart,
      timeToInteractive: navEntries[0]?.domInteractive - navEntries[0]?.fetchStart,
    };
  });
}

// Helper to measure Cumulative Layout Shift
async function measureCLS(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let cls = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).hadRecentInput) continue;
          cls += (entry as any).value;
        }
      });
      
      observer.observe({ type: 'layout-shift', buffered: true });
      
      // Wait a bit then resolve with the CLS value
      setTimeout(() => {
        observer.disconnect();
        resolve(cls);
      }, 2000);
    });
  });
}

test.describe('Public Portal Performance - Desktop', () => {
  test.use({
    viewport: { width: 1440, height: 900 },
  });

  for (const route of PUBLIC_ROUTES) {
    test(`should meet performance budgets for ${route}`, async ({ page }) => {
      // Enable Modern UI
      await page.goto(`${route}?PUBLIC_PORTAL_MODERN=1`);
      await page.waitForLoadState('networkidle');

      // Measure performance metrics
      const metrics = await measurePerformanceMetrics(page);
      console.log(`📊 Performance metrics for ${route}:`, metrics);

      // Assert performance budgets
      if (metrics.firstContentfulPaint) {
        expect(metrics.firstContentfulPaint).toBeLessThan(
          PERFORMANCE_BUDGETS.FIRST_CONTENTFUL_PAINT.desktop
        );
      }

      if (metrics.largestContentfulPaint) {
        expect(metrics.largestContentfulPaint).toBeLessThan(
          PERFORMANCE_BUDGETS.LARGEST_CONTENTFUL_PAINT.desktop
        );
      }

      if (metrics.timeToInteractive) {
        expect(metrics.timeToInteractive).toBeLessThan(
          PERFORMANCE_BUDGETS.TIME_TO_INTERACTIVE.desktop
        );
      }

      // Measure CLS
      const cls = await measureCLS(page);
      console.log(`📐 Cumulative Layout Shift: ${cls}`);
      expect(cls).toBeLessThan(PERFORMANCE_BUDGETS.CUMULATIVE_LAYOUT_SHIFT);
    });
  }

  test('should optimize bundle size for modern UI', async ({ page }) => {
    await page.goto('/portal?PUBLIC_PORTAL_MODERN=1');
    
    // Track network requests
    const resources: { url: string; size: number }[] = [];
    
    page.on('response', (response) => {
      const url = response.url();
      const headers = response.headers();
      const size = parseInt(headers['content-length'] || '0');
      
      if (url.includes('.js') || url.includes('.css')) {
        resources.push({ url, size });
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Calculate total bundle size
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    console.log(`📦 Total bundle size: ${(totalSize / 1024).toFixed(2)}KB`);

    // Log largest resources
    const sortedResources = resources.sort((a, b) => b.size - a.size).slice(0, 5);
    console.log('🎯 Largest resources:');
    sortedResources.forEach(r => {
      console.log(`   - ${r.url.split('/').pop()}: ${(r.size / 1024).toFixed(2)}KB`);
    });

    expect(totalSize).toBeLessThan(PERFORMANCE_BUDGETS.BUNDLE_SIZE.desktop);
  });

  test('should handle concurrent users efficiently', async ({ browser }) => {
    const userCount = 10;
    const contexts = [];
    const pages = [];

    console.log(`👥 Simulating ${userCount} concurrent users...`);

    // Create multiple browser contexts
    for (let i = 0; i < userCount; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    // Navigate all pages simultaneously
    const startTime = Date.now();
    const navigationPromises = pages.map((page, index) => 
      page.goto(`/portal?PUBLIC_PORTAL_MODERN=1&user=${index}`)
    );

    await Promise.all(navigationPromises);
    const totalTime = Date.now() - startTime;

    console.log(`⏱️ All ${userCount} users loaded in ${totalTime}ms`);
    console.log(`📊 Average load time per user: ${(totalTime / userCount).toFixed(2)}ms`);

    // Clean up
    for (const context of contexts) {
      await context.close();
    }

    // Average load time should still be reasonable
    expect(totalTime / userCount).toBeLessThan(PERFORMANCE_BUDGETS.LARGEST_CONTENTFUL_PAINT.desktop);
  });
});

test.describe('Public Portal Performance - Mobile', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
  });

  for (const route of PUBLIC_ROUTES) {
    test(`should meet mobile performance budgets for ${route}`, async ({ page }) => {
      // Enable Modern UI
      await page.goto(`${route}?PUBLIC_PORTAL_MODERN=1`);
      await page.waitForLoadState('networkidle');

      // Measure performance metrics
      const metrics = await measurePerformanceMetrics(page);
      console.log(`📱 Mobile performance metrics for ${route}:`, metrics);

      // Assert mobile performance budgets
      if (metrics.firstContentfulPaint) {
        expect(metrics.firstContentfulPaint).toBeLessThan(
          PERFORMANCE_BUDGETS.FIRST_CONTENTFUL_PAINT.mobile
        );
      }

      if (metrics.largestContentfulPaint) {
        expect(metrics.largestContentfulPaint).toBeLessThan(
          PERFORMANCE_BUDGETS.LARGEST_CONTENTFUL_PAINT.mobile
        );
      }

      if (metrics.timeToInteractive) {
        expect(metrics.timeToInteractive).toBeLessThan(
          PERFORMANCE_BUDGETS.TIME_TO_INTERACTIVE.mobile
        );
      }
    });
  }

  test('should optimize for slow 3G networks', async ({ page, context }) => {
    // Simulate slow 3G
    await context.route('**/*', (route) => {
      setTimeout(() => route.continue(), NETWORK_CONDITIONS['slow-3G'].latency);
    });

    const startTime = Date.now();
    await page.goto('/portal?PUBLIC_PORTAL_MODERN=1');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    console.log(`📡 Slow 3G load time: ${loadTime}ms`);
    
    // Should still be usable on slow networks
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
  });
});

test.describe('Public Portal Performance - Real-time Updates', () => {
  test('should handle real-time score updates efficiently', async ({ page }) => {
    await page.goto('/portal?PUBLIC_PORTAL_MODERN=1');
    await page.waitForLoadState('networkidle');

    // Simulate real-time updates
    const updateCount = 50;
    const startTime = Date.now();

    for (let i = 0; i < updateCount; i++) {
      await page.evaluate((score) => {
        // Simulate score update
        const scoreElements = document.querySelectorAll('.score-display');
        scoreElements.forEach(el => {
          if (el.textContent) {
            el.textContent = score.toString();
          }
        });
      }, i);

      // Small delay between updates
      await page.waitForTimeout(100);
    }

    const totalTime = Date.now() - startTime;
    const avgUpdateTime = totalTime / updateCount;

    console.log(`⚡ Real-time update performance:`);
    console.log(`   - Total updates: ${updateCount}`);
    console.log(`   - Total time: ${totalTime}ms`);
    console.log(`   - Average update time: ${avgUpdateTime.toFixed(2)}ms`);

    // Updates should be fast
    expect(avgUpdateTime).toBeLessThan(PERFORMANCE_BUDGETS.API_P95_RESPONSE);
  });

  test('should maintain smooth animations during updates', async ({ page }) => {
    await page.goto('/portal?PUBLIC_PORTAL_MODERN=1');
    await page.waitForLoadState('networkidle');

    // Measure animation frame rate
    const frameData = await page.evaluate(() => {
      return new Promise((resolve) => {
        const frames: number[] = [];
        let lastTime = performance.now();
        let frameCount = 0;

        function measureFrame() {
          const currentTime = performance.now();
          const delta = currentTime - lastTime;
          frames.push(delta);
          lastTime = currentTime;
          frameCount++;

          if (frameCount < 60) {
            requestAnimationFrame(measureFrame);
          } else {
            const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
            const fps = 1000 / avgFrameTime;
            resolve({ avgFrameTime, fps, frameCount });
          }
        }

        requestAnimationFrame(measureFrame);
      });
    });

    console.log(`🎬 Animation performance:`, frameData);
    
    // Should maintain at least 30 FPS
    expect((frameData as any).fps).toBeGreaterThan(30);
  });
});

test.describe('Public Portal Performance - API Response Times', () => {
  test('should meet API response time budgets', async ({ page }) => {
    const apiCalls: { url: string; duration: number }[] = [];

    // Intercept API calls
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        const timing = response.request().timing();
        if (timing) {
          apiCalls.push({
            url,
            duration: timing.responseEnd - timing.requestStart,
          });
        }
      }
    });

    // Navigate through different pages to trigger API calls
    for (const route of PUBLIC_ROUTES) {
      await page.goto(`${route}?PUBLIC_PORTAL_MODERN=1`);
      await page.waitForLoadState('networkidle');
    }

    if (apiCalls.length > 0) {
      // Calculate P95 response time
      const sortedDurations = apiCalls.map(c => c.duration).sort((a, b) => a - b);
      const p95Index = Math.floor(sortedDurations.length * 0.95);
      const p95ResponseTime = sortedDurations[p95Index];

      console.log(`📡 API Performance:`);
      console.log(`   - Total API calls: ${apiCalls.length}`);
      console.log(`   - P95 response time: ${p95ResponseTime.toFixed(2)}ms`);
      console.log(`   - Fastest: ${sortedDurations[0].toFixed(2)}ms`);
      console.log(`   - Slowest: ${sortedDurations[sortedDurations.length - 1].toFixed(2)}ms`);

      expect(p95ResponseTime).toBeLessThan(PERFORMANCE_BUDGETS.API_P95_RESPONSE);
    }
  });
});

test.describe('Public Portal Performance - Memory Management', () => {
  test('should not have memory leaks during navigation', async ({ page }) => {
    // Navigate through pages multiple times
    const iterations = 5;
    const memorySnapshots: number[] = [];

    for (let i = 0; i < iterations; i++) {
      for (const route of PUBLIC_ROUTES) {
        await page.goto(`${route}?PUBLIC_PORTAL_MODERN=1`);
        await page.waitForLoadState('networkidle');
      }

      // Take memory snapshot
      const memoryUsage = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      memorySnapshots.push(memoryUsage);
      console.log(`🧠 Memory after iteration ${i + 1}: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }

    // Memory should not continuously increase
    if (memorySnapshots.length > 2) {
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryIncrease = lastSnapshot - firstSnapshot;
      const percentIncrease = (memoryIncrease / firstSnapshot) * 100;

      console.log(`📈 Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${percentIncrease.toFixed(2)}%)`);
      
      // Memory increase should be less than 50%
      expect(percentIncrease).toBeLessThan(50);
    }
  });
});

test.describe('Public Portal Performance - Image Optimization', () => {
  test('should use optimized images and lazy loading', async ({ page }) => {
    await page.goto('/portal?PUBLIC_PORTAL_MODERN=1');
    await page.waitForLoadState('networkidle');

    const imageData = await page.evaluate(() => {
      const images = Array.from(document.images);
      return images.map(img => ({
        src: img.src,
        loading: img.loading,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.clientWidth,
        displayHeight: img.clientHeight,
      }));
    });

    console.log(`🖼️ Image optimization analysis:`);
    console.log(`   - Total images: ${imageData.length}`);

    const lazyLoadedImages = imageData.filter(img => img.loading === 'lazy');
    console.log(`   - Lazy loaded: ${lazyLoadedImages.length}`);

    // Check for oversized images
    const oversizedImages = imageData.filter(img => {
      if (img.naturalWidth > 0 && img.displayWidth > 0) {
        return img.naturalWidth > img.displayWidth * 2;
      }
      return false;
    });

    if (oversizedImages.length > 0) {
      console.log(`   ⚠️ Oversized images found: ${oversizedImages.length}`);
      oversizedImages.forEach(img => {
        console.log(`      - ${img.src.split('/').pop()}: ${img.naturalWidth}x${img.naturalHeight} displayed at ${img.displayWidth}x${img.displayHeight}`);
      });
    }

    // Most images should be lazy loaded
    if (imageData.length > 0) {
      const lazyLoadPercentage = (lazyLoadedImages.length / imageData.length) * 100;
      expect(lazyLoadPercentage).toBeGreaterThan(50);
    }
  });
});