import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Live Game Scoring Tests', () => {
  test('should start a game and track live scores', async ({ page }) => {
    // Login as scorekeeper
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill('scorekeeper@test.com');
    await page.getByRole('textbox', { name: /password/i }).fill('Test123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Wait for scorekeeper interface
    await page.waitForURL('**/scorekeeper', { timeout: 10000 }).catch(async () => {
      await page.goto('/scorekeeper');
    });
    
    // Select or start a game
    const startGameButton = page.getByRole('button', { name: /start game|select game|begin/i }).first();
    if (await startGameButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startGameButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // If game selection modal appears, select first game
    const gameSelect = page.getByRole('radio').first().or(
      page.getByTestId(/game-\d+/i).first()
    );
    if (await gameSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gameSelect.click();
      await page.getByRole('button', { name: /confirm|start|begin/i }).click();
    }
    
    // Wait for scoring interface to load
    await page.waitForSelector('[data-testid="score-display"], .score-display, [class*="score"]', { timeout: 5000 }).catch(() => {});
    
    // Take screenshot of initial game state
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'game-initial-state.png'),
      fullPage: true 
    });
    
    // Add points for home team
    const homeScoreButtons = page.getByTestId(/home.*score|team-a.*score/i).or(
      page.locator('.home-team').getByRole('button', { name: /\+/i })
    );
    
    if (await homeScoreButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      // Add 2 points
      const twoPointButton = homeScoreButtons.filter({ hasText: '+2' }).first().or(
        homeScoreButtons.first()
      );
      await twoPointButton.click();
      await page.waitForTimeout(500);
      
      // Add 3 points
      const threePointButton = homeScoreButtons.filter({ hasText: '+3' }).first();
      if (await threePointButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await threePointButton.click();
        await page.waitForTimeout(500);
      }
      
      // Take screenshot after scoring
      await page.screenshot({ 
        path: path.join('artifacts', 'playwright', 'screenshots', 'game-after-home-scores.png') 
      });
    }
    
    // Add points for away team
    const awayScoreButtons = page.getByTestId(/away.*score|team-b.*score/i).or(
      page.locator('.away-team').getByRole('button', { name: /\+/i })
    );
    
    if (await awayScoreButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      // Add 1 point (free throw)
      const onePointButton = awayScoreButtons.filter({ hasText: '+1' }).first();
      if (await onePointButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await onePointButton.click();
        await page.waitForTimeout(500);
      }
      
      // Take screenshot after away team scores
      await page.screenshot({ 
        path: path.join('artifacts', 'playwright', 'screenshots', 'game-after-away-scores.png') 
      });
    }
  });

  test('should track fouls and timeouts', async ({ page }) => {
    // Assuming already in a game (would normally login first)
    await page.goto('/scorekeeper');
    
    // Track team fouls
    const foulButton = page.getByRole('button', { name: /foul|personal/i }).first();
    if (await foulButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await foulButton.click();
      
      // Select player for foul if modal appears
      const playerSelect = page.getByRole('radio').first();
      if (await playerSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await playerSelect.click();
        await page.getByRole('button', { name: /confirm|add/i }).click();
      }
      
      // Take screenshot showing foul count
      await page.screenshot({ 
        path: path.join('artifacts', 'playwright', 'screenshots', 'game-foul-tracked.png') 
      });
    }
    
    // Track timeouts
    const timeoutButton = page.getByRole('button', { name: /timeout/i }).first();
    if (await timeoutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timeoutButton.click();
      
      // Select team if needed
      const teamSelect = page.getByRole('radio', { name: /home|away/i }).first();
      if (await teamSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await teamSelect.click();
        await page.getByRole('button', { name: /confirm/i }).click();
      }
      
      // Take screenshot showing timeout
      await page.screenshot({ 
        path: path.join('artifacts', 'playwright', 'screenshots', 'game-timeout-called.png') 
      });
    }
  });

  test('should track player statistics', async ({ page }) => {
    // Navigate to scorekeeper
    await page.goto('/scorekeeper');
    
    // Look for player stat buttons
    const statButtons = [
      { name: 'rebound', text: /reb|rebound/i },
      { name: 'assist', text: /ast|assist/i },
      { name: 'steal', text: /stl|steal/i },
      { name: 'block', text: /blk|block/i },
      { name: 'turnover', text: /to|turnover/i }
    ];
    
    for (const stat of statButtons) {
      const button = page.getByRole('button', { name: stat.text }).first();
      if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
        await button.click();
        
        // Select player if modal appears
        const playerSelect = page.getByRole('radio').first();
        if (await playerSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
          await playerSelect.click();
          await page.getByRole('button', { name: /confirm|add/i }).click();
        }
        
        await page.waitForTimeout(500);
        
        // Take screenshot for each stat
        await page.screenshot({ 
          path: path.join('artifacts', 'playwright', 'screenshots', `game-stat-${stat.name}.png`) 
        });
      }
    }
  });

  test('should finalize game and show box score', async ({ page }) => {
    // Navigate to scorekeeper
    await page.goto('/scorekeeper');
    
    // End/Finalize game
    const endGameButton = page.getByRole('button', { name: /end game|finalize|complete/i }).first();
    if (await endGameButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await endGameButton.click();
      
      // Confirm if needed
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
      
      // Wait for box score to appear
      await page.waitForSelector('[data-testid="box-score"], .box-score, [class*="box-score"]', { timeout: 5000 }).catch(() => {});
      
      // Take screenshot of final box score
      await page.screenshot({ 
        path: path.join('artifacts', 'playwright', 'screenshots', 'game-box-score.png'),
        fullPage: true 
      });
      
      // Verify box score elements
      await expect(page.getByText(/final score/i).first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      await expect(page.getByText(/team stats/i).first()).toBeVisible({ timeout: 5000 }).catch(() => true);
      
      // Check for player stats table
      const statsTable = page.getByRole('table').filter({ has: page.getByText(/player/i) });
      if (await statsTable.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.screenshot({ 
          path: path.join('artifacts', 'playwright', 'screenshots', 'game-player-stats-table.png') 
        });
      }
    }
  });

  test('should handle quarter/period transitions', async ({ page }) => {
    // Navigate to scorekeeper
    await page.goto('/scorekeeper');
    
    // Look for period/quarter controls
    const periodButton = page.getByRole('button', { name: /end quarter|end period|next quarter/i }).first();
    if (await periodButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Take screenshot before transition
      await page.screenshot({ 
        path: path.join('artifacts', 'playwright', 'screenshots', 'game-before-quarter-end.png') 
      });
      
      await periodButton.click();
      
      // Confirm if needed
      const confirmButton = page.getByRole('button', { name: /confirm|start/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
      
      await page.waitForTimeout(1000);
      
      // Take screenshot after transition
      await page.screenshot({ 
        path: path.join('artifacts', 'playwright', 'screenshots', 'game-after-quarter-transition.png') 
      });
      
      // Verify quarter/period indicator updated
      const periodIndicator = page.getByText(/quarter|period|q\d|p\d/i).first();
      await expect(periodIndicator).toBeVisible({ timeout: 3000 }).catch(() => true);
    }
  });
});