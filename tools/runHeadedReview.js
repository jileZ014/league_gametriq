const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const userDataDir = path.resolve(process.cwd(), '.pw-user');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check']
  });

  const pages = context.pages();
  const page = pages.length ? pages[0] : await context.newPage();

  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });

  console.log('👀 Live visual review running (8h). Profile:', userDataDir);
  console.log('HMR will refresh this tab as you edit files.');
  // Keep the browser open for 8 hours so you can watch changes live.
  await page.waitForTimeout(1000 * 60 * 60 * 8);
})();
