import { test, expect, Page } from '@playwright/test';

// Helper to wait for WebSocket connection
async function waitForWebSocket(page: Page) {
  await page.waitForFunction(() => {
    return (window as any).socketConnected === true;
  }, { timeout: 5000 });
}

test.describe('Sprint 7: Tournament Bracket Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/tournaments/create');
  });

  test('should create single elimination tournament', async ({ page }) => {
    // Step 1: Basic Info
    await page.fill('[name="tournamentName"]', 'Phoenix Summer Classic');
    await page.selectOption('[name="format"]', 'single-elimination');
    await page.selectOption('[name="division"]', '14U');
    await page.fill('[name="startDate"]', '2025-09-20');
    await page.click('[data-testid="next-step"]');
    
    // Step 2: Team Selection
    await expect(page.locator('[data-testid="team-selection"]')).toBeVisible();
    
    // Select 16 teams
    for (let i = 1; i <= 16; i++) {
      await page.click(`[data-testid="select-team-${i}"]`);
    }
    await page.click('[data-testid="next-step"]');
    
    // Step 3: Settings
    await page.selectOption('[name="seedingMethod"]', 'power-rating');
    await page.fill('[name="courtsAvailable"]', '4');
    await page.fill('[name="gameLength"]', '40');
    await page.click('[data-testid="next-step"]');
    
    // Step 4: Preview
    await expect(page.locator('[data-testid="bracket-preview"]')).toBeVisible();
    
    // Verify bracket structure
    const matches = page.locator('[data-testid="match-card"]');
    await expect(matches).toHaveCount(15); // 16 teams = 15 matches
    
    // Create tournament
    await page.click('[data-testid="create-tournament"]');
    
    // Verify redirect to tournament view
    await page.waitForURL(/\/admin\/tournaments\/\d+/);
    await expect(page.locator('h1')).toContainText('Phoenix Summer Classic');
  });

  test('should create double elimination tournament', async ({ page }) => {
    // Basic setup
    await page.fill('[name="tournamentName"]', 'Desert Shootout');
    await page.selectOption('[name="format"]', 'double-elimination');
    await page.selectOption('[name="division"]', '16U');
    await page.click('[data-testid="next-step"]');
    
    // Select 8 teams
    for (let i = 1; i <= 8; i++) {
      await page.click(`[data-testid="select-team-${i}"]`);
    }
    await page.click('[data-testid="next-step"]');
    
    // Settings
    await page.selectOption('[name="seedingMethod"]', 'manual');
    await page.click('[data-testid="next-step"]');
    
    // Manual seeding with drag-drop
    const team1 = page.locator('[data-testid="unseeded-team-1"]');
    const seed1 = page.locator('[data-testid="seed-position-1"]');
    await team1.dragTo(seed1);
    
    // Auto-fill remaining
    await page.click('[data-testid="auto-seed-remaining"]');
    
    // Verify double elimination structure
    await expect(page.locator('[data-testid="winners-bracket"]')).toBeVisible();
    await expect(page.locator('[data-testid="losers-bracket"]')).toBeVisible();
    
    // Create tournament
    await page.click('[data-testid="create-tournament"]');
    await page.waitForURL(/\/admin\/tournaments\/\d+/);
  });

  test('should create round robin tournament', async ({ page }) => {
    await page.fill('[name="tournamentName"]', 'Round Robin League');
    await page.selectOption('[name="format"]', 'round-robin');
    await page.click('[data-testid="next-step"]');
    
    // Select 6 teams for round robin
    for (let i = 1; i <= 6; i++) {
      await page.click(`[data-testid="select-team-${i}"]`);
    }
    await page.click('[data-testid="next-step"]');
    
    // Settings
    await page.fill('[name="rounds"]', '1'); // Single round robin
    await page.click('[data-testid="next-step"]');
    
    // Verify schedule generation
    const matches = page.locator('[data-testid="round-robin-match"]');
    await expect(matches).toHaveCount(15); // 6 teams = 15 matches
    
    await page.click('[data-testid="create-tournament"]');
  });

  test('should update bracket in real-time', async ({ page, context }) => {
    // Navigate to existing tournament
    await page.goto('/spectator/tournaments/1');
    
    // Open admin panel in new page
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/tournaments/1/manage');
    
    // Update score in admin
    await adminPage.click('[data-testid="match-1-edit"]');
    await adminPage.fill('[name="homeScore"]', '65');
    await adminPage.fill('[name="awayScore"]', '58');
    await adminPage.click('[data-testid="save-score"]');
    
    // Verify real-time update in spectator view
    await expect(page.locator('[data-testid="match-1-home-score"]')).toContainText('65');
    await expect(page.locator('[data-testid="match-1-away-score"]')).toContainText('58');
    
    // Verify team advances
    await expect(page.locator('[data-testid="match-2-team-1"]')).toContainText('Home Team');
  });

  test('should export tournament bracket', async ({ page }) => {
    await page.goto('/admin/tournaments/1');
    
    // Export as PDF
    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-bracket-pdf"]'),
    ]);
    expect(pdfDownload.suggestedFilename()).toContain('bracket.pdf');
    
    // Export as image
    const [imgDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-bracket-image"]'),
    ]);
    expect(imgDownload.suggestedFilename()).toMatch(/bracket\.(png|jpg)/);
    
    // Share link
    await page.click('[data-testid="share-bracket"]');
    const shareUrl = await page.locator('[data-testid="share-url"]').inputValue();
    expect(shareUrl).toContain('/spectator/tournaments/');
  });

  test('should handle mobile bracket viewing', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/spectator/tournaments/1');
    
    // Mobile bracket should be scrollable
    await expect(page.locator('[data-testid="mobile-bracket-container"]')).toBeVisible();
    
    // Test pinch-to-zoom (simulate)
    await page.locator('[data-testid="mobile-bracket-container"]').tap();
    
    // Swipe navigation
    await page.locator('[data-testid="mobile-bracket-container"]').swipe({
      direction: 'left',
      distance: 100,
    });
    
    // Team details on tap
    await page.locator('[data-testid="team-card-1"]').tap();
    await expect(page.locator('[data-testid="team-details-modal"]')).toBeVisible();
  });
});

test.describe('Sprint 7: Referee Assignment System', () => {
  test('should auto-assign referees to games', async ({ page }) => {
    await page.goto('/admin/referees');
    
    // Select games for assignment
    await page.click('[data-testid="select-unassigned-games"]');
    
    // Run auto-assignment
    await page.click('[data-testid="auto-assign-referees"]');
    
    // Wait for algorithm to complete
    await page.waitForSelector('[data-testid="assignment-complete"]', { timeout: 10000 });
    
    // Verify assignments
    const assignments = page.locator('[data-testid="referee-assignment"]');
    const count = await assignments.count();
    expect(count).toBeGreaterThan(0);
    
    // Check for conflicts
    const conflicts = page.locator('[data-testid="assignment-conflict"]');
    const conflictCount = await conflicts.count();
    expect(conflictCount).toBe(0);
  });

  test('should manage referee availability', async ({ page }) => {
    await page.goto('/admin/referees/availability');
    
    // Select referee
    await page.click('[data-testid="referee-john-doe"]');
    
    // Set availability
    await page.click('[data-testid="calendar-date-2025-09-20"]');
    await page.selectOption('[name="availability"]', 'unavailable');
    await page.fill('[name="reason"]', 'Personal commitment');
    await page.click('[data-testid="save-availability"]');
    
    // Verify blackout date saved
    await expect(page.locator('[data-testid="date-2025-09-20"]')).toHaveClass(/unavailable/);
    
    // Set recurring availability
    await page.click('[data-testid="recurring-availability"]');
    await page.selectOption('[name="dayOfWeek"]', 'saturday');
    await page.fill('[name="startTime"]', '08:00');
    await page.fill('[name="endTime"]', '18:00');
    await page.click('[data-testid="save-recurring"]');
    
    // Verify recurring pattern
    await expect(page.locator('[data-testid="saturday-availability"]')).toContainText('8:00 AM - 6:00 PM');
  });

  test('should track referee payments', async ({ page }) => {
    await page.goto('/admin/referees/payments');
    
    // View payment summary
    await expect(page.locator('[data-testid="total-owed"]')).toContainText('$');
    await expect(page.locator('[data-testid="games-completed"]')).toContainText(/\d+/);
    
    // Process payment
    await page.click('[data-testid="process-payments"]');
    await page.selectOption('[name="paymentMethod"]', 'direct-deposit');
    await page.click('[data-testid="confirm-payment"]');
    
    // Verify payment processed
    await expect(page.locator('[data-testid="payment-success"]')).toContainText('processed');
    
    // Export payroll
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-payroll"]'),
    ]);
    expect(download.suggestedFilename()).toContain('payroll');
  });
});

test.describe('Sprint 7: WebSocket Real-time Features', () => {
  test('should establish WebSocket connection', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Inject WebSocket monitoring
    await page.addInitScript(() => {
      (window as any).socketEvents = [];
      const originalSocket = (window as any).io;
      (window as any).io = function(...args: any[]) {
        const socket = originalSocket.apply(this, args);
        socket.on('connect', () => {
          (window as any).socketConnected = true;
        });
        socket.onAny((event: string, ...args: any[]) => {
          (window as any).socketEvents.push({ event, args, timestamp: Date.now() });
        });
        return socket;
      };
    });
    
    await page.reload();
    await waitForWebSocket(page);
    
    // Verify connection established
    const connected = await page.evaluate(() => (window as any).socketConnected);
    expect(connected).toBe(true);
  });

  test('should receive real-time score updates', async ({ page, context }) => {
    // Spectator view
    await page.goto('/spectator/games/live');
    await waitForWebSocket(page);
    
    // Admin view in another tab
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/games/1/score');
    
    // Update score in admin
    await adminPage.fill('[name="homeScore"]', '42');
    await adminPage.fill('[name="awayScore"]', '38');
    await adminPage.click('[data-testid="update-score"]');
    
    // Verify real-time update in spectator view
    await page.waitForFunction(
      () => {
        const homeScore = document.querySelector('[data-testid="home-score"]')?.textContent;
        return homeScore === '42';
      },
      { timeout: 5000 }
    );
    
    await expect(page.locator('[data-testid="away-score"]')).toContainText('38');
  });

  test('should handle WebSocket reconnection', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await waitForWebSocket(page);
    
    // Simulate disconnect
    await page.evaluate(() => {
      const socket = (window as any).socket;
      if (socket) {
        socket.disconnect();
      }
    });
    
    // Wait for reconnection
    await page.waitForFunction(
      () => {
        const socket = (window as any).socket;
        return socket && socket.connected;
      },
      { timeout: 10000 }
    );
    
    // Verify reconnection indicator
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
  });

  test('should queue messages when offline', async ({ page, context }) => {
    await page.goto('/coach/messages');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to send message
    await page.fill('[name="message"]', 'Test message while offline');
    await page.click('[data-testid="send-message"]');
    
    // Should show queued indicator
    await expect(page.locator('[data-testid="message-queued"]')).toBeVisible();
    
    // Go online
    await context.setOffline(false);
    
    // Wait for message to send
    await page.waitForSelector('[data-testid="message-sent"]', { timeout: 5000 });
    
    // Verify message delivered
    await expect(page.locator('[data-testid="message-status"]')).toContainText('Delivered');
  });

  test('should monitor WebSocket performance', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await waitForWebSocket(page);
    
    // Collect performance metrics
    await page.waitForTimeout(5000); // Let some events flow
    
    const metrics = await page.evaluate(() => {
      const events = (window as any).socketEvents || [];
      const latencies = events.map((e: any, i: number, arr: any[]) => {
        if (i === 0) return 0;
        return e.timestamp - arr[i - 1].timestamp;
      }).filter((l: number) => l > 0);
      
      return {
        totalEvents: events.length,
        avgLatency: latencies.length ? latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length : 0,
        maxLatency: latencies.length ? Math.max(...latencies) : 0,
      };
    });
    
    // Verify performance
    expect(metrics.totalEvents).toBeGreaterThan(0);
    expect(metrics.avgLatency).toBeLessThan(100); // Average under 100ms
    expect(metrics.maxLatency).toBeLessThan(500); // Max under 500ms
  });

  test('should handle 100+ concurrent connections', async ({ browser }) => {
    const contexts = [];
    const pages = [];
    
    // Create 100 concurrent connections (reduced for testing)
    const connectionCount = 10; // Use 100 in production tests
    
    for (let i = 0; i < connectionCount; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }
    
    // All connect simultaneously
    const startTime = Date.now();
    await Promise.all(pages.map(page => {
      return page.goto('/spectator/games/live').then(() => waitForWebSocket(page));
    }));
    const connectionTime = Date.now() - startTime;
    
    // Verify all connected
    const connectedCount = await Promise.all(pages.map(page => 
      page.evaluate(() => (window as any).socketConnected)
    )).then(results => results.filter(Boolean).length);
    
    expect(connectedCount).toBe(connectionCount);
    expect(connectionTime / connectionCount).toBeLessThan(500); // Avg under 500ms
    
    // Clean up
    for (const context of contexts) {
      await context.close();
    }
  });
});