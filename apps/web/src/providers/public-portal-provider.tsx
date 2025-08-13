'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFeatureFlags, FeatureFlags } from '@/lib/feature-flags';

interface PublicPortalConfig {
  branding: {
    name: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  theme: {
    mode: 'modern' | 'legacy';
    gradients: {
      primary: string;
      secondary: string;
      phoenix: string;
    };
  };
  features: FeatureFlags;
}

const LegacyYouthSportsConfig: PublicPortalConfig = {
  branding: {
    name: 'Legacy Youth Sports',
    logo: '/images/legacy-youth-sports-logo.png',
    primaryColor: '#fbbf24', // Gold
    secondaryColor: '#000000', // Black
    accentColor: '#dc2626', // Red accent
  },
  theme: {
    mode: 'modern',
    gradients: {
      primary: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      secondary: 'linear-gradient(135deg, #000000 0%, #374151 100%)',
      phoenix: 'linear-gradient(135deg, #ff6b35 0%, #d4a574 100%)',
    },
  },
  features: {
    UI_MODERN_V1: false,
    PUBLIC_PORTAL_MODERN: true,
    LIVE_SCORES: true,
    REAL_TIME_UPDATES: true,
  },
};

interface PublicPortalContextType {
  config: PublicPortalConfig;
  isModernTheme: boolean;
  toggleTheme: () => void;
}

const PublicPortalContext = createContext<PublicPortalContextType | undefined>(undefined);

export function PublicPortalProvider({ children }: { children: React.ReactNode }) {
  const featureFlags = useFeatureFlags('public');
  const [config, setConfig] = useState<PublicPortalConfig>(LegacyYouthSportsConfig);
  const [isModernTheme, setIsModernTheme] = useState(false);

  useEffect(() => {
    // Check if modern theme is enabled
    const modernEnabled = featureFlags.PUBLIC_PORTAL_MODERN;
    setIsModernTheme(modernEnabled);

    // Update config based on feature flags
    setConfig((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        mode: modernEnabled ? 'modern' : 'legacy',
      },
      features: featureFlags,
    }));

    // Apply theme CSS variables
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      if (modernEnabled) {
        // Modern NBA 2K/ESPN theme with Legacy Youth Sports branding
        root.style.setProperty('--primary-color', '#fbbf24');
        root.style.setProperty('--secondary-color', '#000000');
        root.style.setProperty('--accent-color', '#dc2626');
        root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)');
        root.style.setProperty('--gradient-secondary', 'linear-gradient(135deg, #000000 0%, #374151 100%)');
        root.style.setProperty('--gradient-phoenix', 'linear-gradient(135deg, #ff6b35 0%, #d4a574 100%)');
        root.style.setProperty('--font-display', "'Bebas Neue', sans-serif");
        root.style.setProperty('--font-body', "'Inter', sans-serif");
        root.classList.add('modern-theme');
        root.classList.remove('legacy-theme');
      } else {
        // Legacy theme
        root.style.setProperty('--primary-color', '#3b82f6');
        root.style.setProperty('--secondary-color', '#1f2937');
        root.style.setProperty('--accent-color', '#ef4444');
        root.style.setProperty('--gradient-primary', 'none');
        root.style.setProperty('--gradient-secondary', 'none');
        root.style.setProperty('--font-display', 'system-ui');
        root.style.setProperty('--font-body', 'system-ui');
        root.classList.add('legacy-theme');
        root.classList.remove('modern-theme');
      }
    }
  }, [featureFlags]);

  const toggleTheme = () => {
    setIsModernTheme((prev) => !prev);
    // This would typically update the feature flag
    // featureFlags.toggle('PUBLIC_PORTAL_MODERN');
  };

  return (
    <PublicPortalContext.Provider value={{ config, isModernTheme, toggleTheme }}>
      {children}
    </PublicPortalContext.Provider>
  );
}

export function usePublicPortal() {
  const context = useContext(PublicPortalContext);
  if (!context) {
    throw new Error('usePublicPortal must be used within PublicPortalProvider');
  }
  return context;
}