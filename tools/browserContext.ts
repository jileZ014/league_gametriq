import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { join } from 'path';

export interface PersistentBrowserConfig {
  headless?: boolean;
  userDataDir?: string;
  baseURL?: string;
  viewport?: { width: number; height: number };
  storageState?: any;
  slowMo?: number;
  recordVideo?: boolean;
  screenshot?: 'off' | 'on' | 'only-on-failure';
}

export class PersistentBrowserManager {
  private context: BrowserContext | null = null;
  private config: PersistentBrowserConfig;

  constructor(config: PersistentBrowserConfig = {}) {
    this.config = {
      headless: true,
      userDataDir: '.pw-user',
      baseURL: 'http://localhost:3000',
      viewport: { width: 1440, height: 900 },
      slowMo: 0,
      recordVideo: false,
      screenshot: 'only-on-failure',
      ...config,
    };
  }

  async launch(): Promise<BrowserContext> {
    if (this.context) {
      return this.context;
    }

    console.log(`🚀 Launching persistent Chromium context (headless: ${this.config.headless})`);
    
    const launchOptions = {
      headless: this.config.headless,
      slowMo: this.config.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-web-security',
        '--allow-running-insecure-content',
      ],
    };

    this.context = await chromium.launchPersistentContext(
      this.config.userDataDir!,
      {
        ...launchOptions,
        viewport: this.config.viewport,
        baseURL: this.config.baseURL,
        recordVideo: this.config.recordVideo ? {
          dir: 'artifacts/playwright/videos/',
          size: this.config.viewport,
        } : undefined,
        screenshot: this.config.screenshot,
        locale: 'en-US',
        timezoneId: 'America/Phoenix',
        permissions: ['geolocation', 'notifications'],
        geolocation: { latitude: 33.4484, longitude: -112.0740 }, // Phoenix, AZ
      }
    );

    // Set up storage state with feature flags
    await this.context.addInitScript(() => {
      const featureFlags = {
        registration_v1: true,
        payments_live_v1: true,
        branding_v1: true,
        pwa_v1: true,
        ui_modern_v1: process.env.UI_MODERN_V1 === '1',
      };
      localStorage.setItem('feature_flags', JSON.stringify(featureFlags));
    });

    console.log(`✅ Persistent context ready at ${this.config.userDataDir}`);
    return this.context;
  }

  async newPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not launched. Call launch() first.');
    }
    return await this.context.newPage();
  }

  async close(): Promise<void> {
    if (this.context) {
      console.log('🔄 Closing persistent browser context...');
      await this.context.close();
      this.context = null;
      console.log('✅ Browser context closed');
    }
  }

  async screenshot(page: Page, name: string): Promise<string> {
    const screenshotPath = join('artifacts/playwright/screenshots', `${name}-${Date.now()}.png`);
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true,
      animations: 'disabled' 
    });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  }

  async trace(page: Page, name: string, action: () => Promise<void>): Promise<string> {
    const tracePath = join('artifacts/playwright/traces', `${name}-${Date.now()}.zip`);
    
    await page.context().tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });

    try {
      await action();
    } finally {
      await page.context().tracing.stop({ path: tracePath });
      console.log(`🔍 Trace saved: ${tracePath}`);
    }

    return tracePath;
  }

  isLaunched(): boolean {
    return this.context !== null;
  }

  getConfig(): PersistentBrowserConfig {
    return { ...this.config };
  }
}

// Singleton instance for shared usage
export const sharedBrowserManager = new PersistentBrowserManager();

// Helper function for quick headless testing
export async function withPersistentBrowser<T>(
  action: (context: BrowserContext, page: Page) => Promise<T>,
  config: PersistentBrowserConfig = {}
): Promise<T> {
  const manager = new PersistentBrowserManager(config);
  
  try {
    const context = await manager.launch();
    const page = await manager.newPage();
    
    return await action(context, page);
  } finally {
    await manager.close();
  }
}

// Helper function for persistent testing sessions
export async function startPersistentSession(config: PersistentBrowserConfig = {}) {
  const manager = new PersistentBrowserManager(config);
  const context = await manager.launch();
  const page = await manager.newPage();
  
  return { manager, context, page };
}