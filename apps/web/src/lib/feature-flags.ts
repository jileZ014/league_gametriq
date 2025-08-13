/**
 * Feature Flag System for Basketball League Platform
 * Supports both internal UI and public portal modernization
 */

export interface FeatureFlags {
  // Internal app modern UI
  UI_MODERN_V1: boolean;
  // Public portal modern theme
  PUBLIC_PORTAL_MODERN: boolean;
  // Admin dashboard modern UI
  ADMIN_MODERN_UI: boolean;
  // Live scores real-time updates
  LIVE_SCORES: boolean;
  // Real-time WebSocket updates
  REAL_TIME_UPDATES: boolean;
}

export type FeatureFlagContext = 'internal' | 'public' | 'admin';

class FeatureFlagManager {
  private flags: Map<string, boolean> = new Map();

  constructor() {
    this.initializeFlags();
  }

  private initializeFlags(): void {
    // Check environment variables
    if (typeof window !== 'undefined') {
      // Browser environment
      const envFlags = {
        UI_MODERN_V1: process.env.NEXT_PUBLIC_UI_MODERN_V1 === '1',
        PUBLIC_PORTAL_MODERN: process.env.NEXT_PUBLIC_PUBLIC_PORTAL_MODERN === '1',
        ADMIN_MODERN_UI: process.env.NEXT_PUBLIC_ADMIN_MODERN_UI === '1',
        LIVE_SCORES: process.env.NEXT_PUBLIC_LIVE_SCORES === '1',
        REAL_TIME_UPDATES: process.env.NEXT_PUBLIC_REAL_TIME_UPDATES === '1',
      };

      // Check localStorage for overrides
      const storedFlags = this.getStoredFlags();

      // Check URL parameters for overrides
      const urlFlags = this.getUrlFlags();

      // Priority: URL > localStorage > env
      Object.keys(envFlags).forEach((key) => {
        const urlValue = urlFlags[key];
        const storedValue = storedFlags[key];
        const envValue = envFlags[key as keyof typeof envFlags];

        if (urlValue !== undefined) {
          this.flags.set(key, urlValue);
        } else if (storedValue !== undefined) {
          this.flags.set(key, storedValue);
        } else {
          this.flags.set(key, envValue);
        }
      });
    }
  }

  private getStoredFlags(): Record<string, boolean> {
    if (typeof window === 'undefined') return {};
    
    const stored: Record<string, boolean> = {};
    Object.keys(this.getDefaultFlags()).forEach((key) => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        stored[key] = value === '1';
      }
    });
    return stored;
  }

  private getUrlFlags(): Record<string, boolean> {
    if (typeof window === 'undefined') return {};
    
    const params = new URLSearchParams(window.location.search);
    const flags: Record<string, boolean> = {};
    
    params.forEach((value, key) => {
      if (key in this.getDefaultFlags()) {
        flags[key] = value === '1';
      }
    });
    
    return flags;
  }

  private getDefaultFlags(): FeatureFlags {
    return {
      UI_MODERN_V1: false,
      PUBLIC_PORTAL_MODERN: false,
      ADMIN_MODERN_UI: true,
      LIVE_SCORES: true,
      REAL_TIME_UPDATES: true,
    };
  }

  public isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags.get(flag) ?? false;
  }

  public enable(flag: keyof FeatureFlags): void {
    this.flags.set(flag, true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(flag, '1');
    }
  }

  public disable(flag: keyof FeatureFlags): void {
    this.flags.set(flag, false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(flag, '0');
    }
  }

  public toggle(flag: keyof FeatureFlags): boolean {
    const current = this.isEnabled(flag);
    if (current) {
      this.disable(flag);
    } else {
      this.enable(flag);
    }
    return !current;
  }

  public getAllFlags(): FeatureFlags {
    const flags: Partial<FeatureFlags> = {};
    this.flags.forEach((value, key) => {
      flags[key as keyof FeatureFlags] = value;
    });
    return flags as FeatureFlags;
  }

  public reset(): void {
    if (typeof window !== 'undefined') {
      Object.keys(this.getDefaultFlags()).forEach((key) => {
        localStorage.removeItem(key);
      });
    }
    this.initializeFlags();
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

// Helper hooks
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  if (typeof window === 'undefined') {
    // SSR - check env variables
    switch (flag) {
      case 'UI_MODERN_V1':
        return process.env.NEXT_PUBLIC_UI_MODERN_V1 === '1';
      case 'PUBLIC_PORTAL_MODERN':
        return process.env.NEXT_PUBLIC_PUBLIC_PORTAL_MODERN === '1';
      case 'ADMIN_MODERN_UI':
        return process.env.NEXT_PUBLIC_ADMIN_MODERN_UI === '1';
      case 'LIVE_SCORES':
        return process.env.NEXT_PUBLIC_LIVE_SCORES === '1';
      case 'REAL_TIME_UPDATES':
        return process.env.NEXT_PUBLIC_REAL_TIME_UPDATES === '1';
      default:
        return false;
    }
  }
  return featureFlags.isEnabled(flag);
}

export function useFeatureFlags(context?: FeatureFlagContext): FeatureFlags {
  return featureFlags.getAllFlags();
}