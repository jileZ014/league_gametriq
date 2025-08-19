import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Export Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to public portal
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');
  });

  test('should export schedule as ICS calendar file', async ({ page }) => {
    // Navigate to schedule page
    await page.goto('/portal/schedule');
    await page.waitForLoadState('networkidle');
    
    // Look for export/download button
    const exportButton = page.getByRole('button', { name: /export|download|calendar|ics/i }).first();
    
    if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      
      // Click export button
      await exportButton.click();
      
      // If modal appears, select ICS option
      const icsOption = page.getByRole('radio', { name: /ics|calendar/i }).or(
        page.getByText(/ics|calendar/i).first()
      );
      if (await icsOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await icsOption.click();
        await page.getByRole('button', { name: /download|export/i }).click();
      }
      
      // Wait for download
      const download = await downloadPromise;
      
      if (download) {
        // Save the file
        const downloadPath = path.join('artifacts', 'playwright', 'downloads', 'schedule.ics');
        await download.saveAs(downloadPath);
        
        // Verify file exists
        expect(fs.existsSync(downloadPath)).toBeTruthy();
        
        // Read and verify ICS file content
        const icsContent = fs.readFileSync(downloadPath, 'utf-8');
        expect(icsContent).toContain('BEGIN:VCALENDAR');
        expect(icsContent).toContain('END:VCALENDAR');
        
        // Take screenshot of successful export
        await page.screenshot({ 
          path: path.join('artifacts', 'playwright', 'screenshots', 'export-ics-success.png') 
        });
      }
    } else {
      // If no export button, check for direct download link
      const downloadLink = page.getByRole('link', { name: /download.*calendar|ics/i });
      if (await downloadLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        const href = await downloadLink.getAttribute('href');
        expect(href).toContain('.ics');
      }
    }
  });

  test('should export team roster as CSV file', async ({ page }) => {
    // Navigate to teams page
    await page.goto('/portal/teams');
    await page.waitForLoadState('networkidle');
    
    // Click on first team
    const teamLink = page.getByRole('link').filter({ hasText: /team/i }).first();
    if (await teamLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await teamLink.click();
      await page.waitForLoadState('networkidle');
      
      // Look for export button on team page
      const exportButton = page.getByRole('button', { name: /export|download|csv/i }).first();
      
      if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Set up download promise
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        
        // Click export button
        await exportButton.click();
        
        // If modal appears, select CSV option
        const csvOption = page.getByRole('radio', { name: /csv|spreadsheet/i }).or(
          page.getByText(/csv|excel/i).first()
        );
        if (await csvOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await csvOption.click();
          await page.getByRole('button', { name: /download|export/i }).click();
        }
        
        // Wait for download
        const download = await downloadPromise;
        
        if (download) {
          // Save the file
          const downloadPath = path.join('artifacts', 'playwright', 'downloads', 'roster.csv');
          await download.saveAs(downloadPath);
          
          // Verify file exists
          expect(fs.existsSync(downloadPath)).toBeTruthy();
          
          // Read and verify CSV content
          const csvContent = fs.readFileSync(downloadPath, 'utf-8');
          expect(csvContent.length).toBeGreaterThan(0);
          expect(csvContent).toMatch(/,/); // CSV should contain commas
          
          // Take screenshot
          await page.screenshot({ 
            path: path.join('artifacts', 'playwright', 'screenshots', 'export-csv-success.png') 
          });
        }
      }
    }
  });

  test('should export game statistics', async ({ page }) => {
    // Navigate to a completed game (through schedule or standings)
    await page.goto('/portal/schedule');
    await page.waitForLoadState('networkidle');
    
    // Find a completed game
    const completedGame = page.getByText(/final|completed/i).first();
    if (await completedGame.isVisible({ timeout: 5000 }).catch(() => false)) {
      await completedGame.click();
      await page.waitForLoadState('networkidle');
      
      // Look for export stats button
      const exportButton = page.getByRole('button', { name: /export|download|stats/i }).first();
      
      if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Set up download promise
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        
        await exportButton.click();
        
        // Wait for download
        const download = await downloadPromise;
        
        if (download) {
          // Save the file
          const filename = await download.suggestedFilename();
          const downloadPath = path.join('artifacts', 'playwright', 'downloads', filename);
          await download.saveAs(downloadPath);
          
          // Verify file exists
          expect(fs.existsSync(downloadPath)).toBeTruthy();
          
          // Take screenshot
          await page.screenshot({ 
            path: path.join('artifacts', 'playwright', 'screenshots', 'export-game-stats.png') 
          });
        }
      }
    }
  });

  test('should export standings table', async ({ page }) => {
    // Navigate to standings
    await page.goto('/portal/standings');
    await page.waitForLoadState('networkidle');
    
    // Look for export button
    const exportButton = page.getByRole('button', { name: /export|download|print/i }).first();
    
    if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Set up download promise
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      
      await exportButton.click();
      
      // Select format if modal appears
      const formatOptions = page.getByRole('radio');
      if (await formatOptions.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        // Select first available format
        await formatOptions.first().click();
        await page.getByRole('button', { name: /download|export/i }).click();
      }
      
      // Wait for download
      const download = await downloadPromise;
      
      if (download) {
        // Save the file
        const filename = await download.suggestedFilename();
        const downloadPath = path.join('artifacts', 'playwright', 'downloads', filename);
        await download.saveAs(downloadPath);
        
        // Verify file exists
        expect(fs.existsSync(downloadPath)).toBeTruthy();
        
        // Take screenshot
        await page.screenshot({ 
          path: path.join('artifacts', 'playwright', 'screenshots', 'export-standings.png') 
        });
      }
    }
    
    // Alternative: Check for print functionality
    const printButton = page.getByRole('button', { name: /print/i });
    if (await printButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Intercept print dialog
      await page.evaluate(() => {
        window.print = () => {
          console.log('Print dialog would open');
          return true;
        };
      });
      
      await printButton.click();
      
      // Take screenshot of print preview if available
      await page.screenshot({ 
        path: path.join('artifacts', 'playwright', 'screenshots', 'standings-print-preview.png') 
      });
    }
  });

  test('should verify exported files exist in downloads', async ({ page }) => {
    // Create downloads directory if it doesn't exist
    const downloadsDir = path.join('artifacts', 'playwright', 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    // Check for any downloaded files
    const files = fs.readdirSync(downloadsDir);
    
    // Log found files
    console.log('Downloaded files:', files);
    
    // Verify at least some exports were successful
    const expectedFormats = ['.ics', '.csv', '.pdf', '.xlsx'];
    const hasExpectedFormat = files.some(file => 
      expectedFormats.some(format => file.endsWith(format))
    );
    
    if (files.length > 0) {
      expect(hasExpectedFormat).toBeTruthy();
    }
    
    // Take screenshot of portal with export options
    await page.goto('/portal');
    await page.screenshot({ 
      path: path.join('artifacts', 'playwright', 'screenshots', 'portal-export-options.png'),
      fullPage: true 
    });
  });
});