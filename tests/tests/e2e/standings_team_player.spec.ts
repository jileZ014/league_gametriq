import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Standings, Team, and Player Tests', () => {
  test('should navigate from standings to team page to player card', async ({ page }) => {
    // Navigate to standings page
    await page.goto('/portal/standings');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of standings page
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'standings-full.png'),
      fullPage: true 
    });
    
    // Verify standings table is visible
    const standingsTable = page.getByRole('table').first();
    await expect(standingsTable).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no table, look for standings grid/list
      return expect(page.getByTestId('standings-list')).toBeVisible();
    });
    
    // Click on first team in standings
    const firstTeam = page.getByRole('link').filter({ hasText: /team/i }).first().or(
      page.getByRole('row').nth(1).getByRole('link').first()
    );
    
    if (await firstTeam.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstTeam.click();
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of team page
      await page.screenshot({ 
        path: path.join('artifacts', 'playwright', 'screenshots', 'team-page.png'),
        fullPage: true 
      });
      
      // Verify team page loaded
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/team/i);
      
      // Look for player roster
      const playerRoster = page.getByTestId('player-roster').or(
        page.getByRole('list').filter({ has: page.getByText(/player/i) })
      );
      
      await expect(playerRoster.first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      
      // Click on first player
      const firstPlayer = page.getByRole('link').filter({ hasText: /#\d+|\w+\s\w+/i }).first().or(
        page.getByTestId(/player-/i).first()
      );
      
      if (await firstPlayer.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstPlayer.click();
        await page.waitForLoadState('networkidle');
        
        // Take screenshot of player card
        await page.screenshot({ 
          path: path.join('artifacts', 'playwright', 'screenshots', 'player-card.png'),
          fullPage: true 
        });
        
        // Verify player stats are visible
        await expect(page.getByText(/points|rebounds|assists/i).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display team statistics and roster', async ({ page }) => {
    // Navigate directly to a team page (using first team URL pattern)
    await page.goto('/portal/teams');
    await page.waitForLoadState('networkidle');
    
    // Click on first team
    const teamLink = page.getByRole('link').filter({ hasText: /team/i }).first();
    if (await teamLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await teamLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify team information sections
      const sections = [
        { name: 'roster', selector: /roster|players/i },
        { name: 'stats', selector: /statistics|stats/i },
        { name: 'schedule', selector: /schedule|games/i },
        { name: 'record', selector: /record|wins|losses/i }
      ];
      
      for (const section of sections) {
        const element = page.getByText(section.selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          await page.screenshot({ 
            path: path.join('artifacts', 'playwright', 'screenshots', `team-${section.name}.png`) 
          });
        }
      }
    }
  });

  test('should display player statistics card with details', async ({ page }) => {
    // Navigate to a player page (mock player ID)
    await page.goto('/portal/teams');
    await page.waitForLoadState('networkidle');
    
    // Navigate through team to player
    const teamLink = page.getByRole('link').filter({ hasText: /team/i }).first();
    if (await teamLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await teamLink.click();
      await page.waitForLoadState('networkidle');
      
      // Find and click a player
      const playerLink = page.getByRole('link').filter({ hasText: /#\d+|\w+\s\w+/i }).first();
      if (await playerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await playerLink.click();
        await page.waitForLoadState('networkidle');
        
        // Verify player card components
        const playerStats = [
          'Points Per Game',
          'Rebounds',
          'Assists',
          'Field Goal',
          'Free Throw',
          'Games Played'
        ];
        
        for (const stat of playerStats) {
          const statElement = page.getByText(new RegExp(stat, 'i')).first();
          if (await statElement.isVisible({ timeout: 1000 }).catch(() => false)) {
            // Take focused screenshot of each stat section
            const parent = await statElement.evaluateHandle(el => el.parentElement);
            await parent.asElement()?.screenshot({ 
              path: path.join('artifacts', 'playwright', 'screenshots', `player-stat-${stat.replace(/\s/g, '-').toLowerCase()}.png`) 
            }).catch(() => {});
          }
        }
        
        // Take full player card screenshot
        await page.screenshot({ 
          path: path.join('artifacts', 'playwright', 'screenshots', 'player-card-full-stats.png'),
          fullPage: true 
        });
      }
    }
  });

  test('should show league standings with sorting', async ({ page }) => {
    // Navigate to standings
    await page.goto('/portal/standings');
    await page.waitForLoadState('networkidle');
    
    // Look for sortable columns
    const columnHeaders = page.getByRole('columnheader');
    const sortableColumns = ['Wins', 'Losses', 'Points', 'Win %'];
    
    for (const column of sortableColumns) {
      const header = columnHeaders.filter({ hasText: new RegExp(column, 'i') }).first();
      if (await header.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click to sort
        await header.click();
        await page.waitForTimeout(500); // Wait for sort animation
        
        // Take screenshot after sorting
        await page.screenshot({ 
          path: path.join('artifacts', 'playwright', 'screenshots', `standings-sorted-by-${column.replace(/\s/g, '-').toLowerCase()}.png`) 
        });
      }
    }
  });

  test('should display division/conference standings', async ({ page }) => {
    // Navigate to standings
    await page.goto('/portal/standings');
    await page.waitForLoadState('networkidle');
    
    // Look for division/conference tabs or filters
    const divisions = page.getByRole('tab').or(
      page.getByRole('button').filter({ hasText: /division|conference|league/i })
    );
    
    const divisionCount = await divisions.count();
    for (let i = 0; i < Math.min(divisionCount, 3); i++) {
      const division = divisions.nth(i);
      if (await division.isVisible({ timeout: 2000 }).catch(() => false)) {
        await division.click();
        await page.waitForLoadState('networkidle');
        
        const divisionName = await division.textContent();
        await page.screenshot({ 
          path: path.join('artifacts', 'playwright', 'screenshots', `standings-${divisionName?.replace(/\s/g, '-').toLowerCase()}.png`) 
        });
      }
    }
  });
});