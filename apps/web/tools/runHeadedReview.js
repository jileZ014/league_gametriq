const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const userDataDir = path.resolve(process.cwd(), '.pw-user');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ['--no-first-run','--no-default-browser-check']
  });
  const [page] = context.pages().length ? context.pages() : [await context.newPage()];
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  console.log('🎭 Live review running. Using persistent profile at:', userDataDir);
  console.log('Tip: Edits trigger your dev server HMR. This window will refresh as changes compile.');
  // Keep the browser open for visual work:
  await page.waitForTimeout(1000 * 60 * 60 * 8); // 8 hours
})();