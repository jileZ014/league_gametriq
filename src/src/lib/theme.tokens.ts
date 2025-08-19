/**
 * Gametriq Design System - Modern UI Theme Tokens
 * NBA 2K + ESPN Inspired Basketball League Platform
 * TypeScript design tokens for consistent styling across components
 */

export const themeTokens = {
  // === Color Palette ===
  colors: {
    // NBA 2K Inspired Primary Colors
    nba2k: {
      primary: '#ea580c',        // Orange-600 - Basketball energy
      primaryDark: '#c2410c',    // Orange-700
      primaryLight: '#fed7aa',   // Orange-200
      secondary: '#9333ea',      // Purple-600 - Court vibes
      secondaryDark: '#7c3aed',  // Purple-700
      secondaryLight: '#ddd6fe', // Purple-200
    },
    
    // ESPN Sports Colors
    espn: {
      red: '#d32f2f',     // ESPN red accent
      blue: '#1976d2',    // ESPN blue accent
      gold: '#f57c00',    // Championship gold
      silver: '#78716c',  // Stone-500
    },
    
    // Court-Inspired Neutrals
    court: {
      wood: '#8b4513',     // Saddle brown - basketball court
      lines: '#ffffff',    // Pure white court lines
      arenaDark: '#1a1a1a',    // Near black - arena darkness
      arenaMedium: '#374151',  // Gray-700 - stadium seating
      arenaLight: '#f9fafb',   // Gray-50 - arena lighting
    },
    
    // Phoenix Market Colors
    phoenix: {
      sun: '#ff6b35',      // Desert sunset orange
      desert: '#d4a574',   // Desert tan
      sky: '#87ceeb',      // Desert sky blue
      cactus: '#355e3b',   // Desert green
    },
    
    // Semantic Colors (WCAG AA Compliant)
    semantic: {
      success: '#16a34a',  // Green-600 - Win/Success
      warning: '#ca8a04',  // Yellow-600 - Caution
      error: '#dc2626',    // Red-600 - Loss/Error
      info: '#2563eb',     // Blue-600 - Information
    },
    
    // Contrast-safe text colors
    text: {
      primary: '#1a1a1a',     // High contrast
      secondary: '#374151',   // Medium contrast
      tertiary: '#78716c',    // Lower contrast
      inverse: '#ffffff',     // White text
      muted: '#9ca3af',       // Gray-400
    },
    
    // Background colors
    background: {
      primary: '#ffffff',     // White
      secondary: '#f9fafb',   // Gray-50
      tertiary: '#f3f4f6',    // Gray-100
      dark: '#1a1a1a',        // Near black
      overlay: 'rgba(0, 0, 0, 0.6)', // Modal overlay
    }
  },

  // === Typography ===
  typography: {
    fontFamily: {
      display: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '2rem',    // 32px
      '4xl': '2.5rem',  // 40px
      '5xl': '3rem',    // 48px
    },
    
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    
    lineHeight: {
      tight: '1.2',
      normal: '1.6',
      relaxed: '1.8',
    },
    
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
    },
  },

  // === Spacing ===
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },

  // === Border Radius ===
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // === Shadows ===
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    neon: '0 0 20px #ea580c',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },

  // === Gradients ===
  gradients: {
    primary: 'linear-gradient(135deg, #ea580c 0%, #9333ea 100%)',
    court: 'linear-gradient(90deg, #8b4513 0%, #a0522d 100%)',
    arena: 'linear-gradient(180deg, #1a1a1a 0%, #374151 100%)',
    phoenix: 'linear-gradient(135deg, #ff6b35 0%, #d4a574 100%)',
    success: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
    warning: 'linear-gradient(135deg, #ca8a04 0%, #eab308 100%)',
    error: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
  },

  // === Animations ===
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '400ms',
      slower: '600ms',
    },
    
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // === Breakpoints ===
  breakpoints: {
    xs: '375px',   // Mobile
    sm: '640px',   // Large mobile
    md: '768px',   // Tablet
    lg: '1024px',  // Desktop
    xl: '1280px',  // Large desktop
    '2xl': '1536px', // Extra large
  },

  // === Z-Index Scale ===
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1020,
    banner: 1030,
    overlay: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1100,
    toast: 1200,
    skipLink: 1300,
  },

  // === Sports-Specific Tokens ===
  sports: {
    // Team identification colors
    teamColors: {
      home: '#ea580c',      // Primary orange
      away: '#9333ea',      // Purple
      neutral: '#78716c',   // Gray
    },
    
    // Game status colors
    gameStatus: {
      scheduled: '#9ca3af',   // Gray
      live: '#16a34a',        // Green
      halftime: '#ca8a04',    // Yellow
      final: '#374151',       // Dark gray
      cancelled: '#dc2626',   // Red
      postponed: '#2563eb',   // Blue
    },
    
    // Division/age group colors
    divisions: {
      youth: '#22c55e',      // Green
      junior: '#3b82f6',     // Blue
      senior: '#f59e0b',     // Amber
      adult: '#8b5cf6',      // Violet
    },
  },

  // === Component-Specific Tokens ===
  components: {
    button: {
      height: {
        sm: '32px',
        md: '40px',
        lg: '48px',
        xl: '56px',
      },
      padding: {
        sm: '8px 16px',
        md: '12px 24px',
        lg: '16px 32px',
        xl: '20px 40px',
      },
    },
    
    input: {
      height: {
        sm: '32px',
        md: '40px',
        lg: '48px',
      },
      padding: '0 12px',
      borderWidth: '2px',
    },
    
    card: {
      padding: {
        sm: '16px',
        md: '24px',
        lg: '32px',
      },
      borderWidth: '1px',
    },
  },

  // === Accessibility ===
  accessibility: {
    // Focus ring styles
    focusRing: {
      width: '2px',
      color: '#ea580c',
      offset: '2px',
      style: 'solid',
    },
    
    // Minimum contrast ratios
    contrast: {
      aa: 4.5,      // WCAG AA standard
      aaa: 7,       // WCAG AAA standard
    },
    
    // Touch target sizes
    touchTarget: {
      minimum: '44px',  // iOS/Android minimum
      comfortable: '48px', // Comfortable size
    },
  },
} as const;

// === Type Definitions ===
export type ThemeTokens = typeof themeTokens;
export type ColorTokens = typeof themeTokens.colors;
export type TypographyTokens = typeof themeTokens.typography;
export type SpacingTokens = typeof themeTokens.spacing;
export type SportsTokens = typeof themeTokens.sports;

// === CSS Variables Generator ===
export const generateCSSVariables = (tokens: ThemeTokens) => {
  const cssVars: Record<string, string> = {};
  
  // Generate CSS custom properties from tokens
  const generateVars = (obj: any, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        generateVars(value, `${prefix}${key}-`);
      } else {
        cssVars[`--${prefix}${key}`] = String(value);
      }
    });
  };
  
  generateVars(tokens);
  return cssVars;
};

// === Theme Provider Props ===
export interface ModernThemeProviderProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark' | 'auto';
  enableModernUI?: boolean;
}

// === Utility Functions ===
export const getContrastColor = (backgroundColor: string): string => {
  // Simple contrast color calculation
  // In a real implementation, you'd use a proper color library
  const lightColors = ['#ffffff', '#f9fafb', '#fed7aa', '#ddd6fe'];
  return lightColors.includes(backgroundColor) 
    ? themeTokens.colors.text.primary 
    : themeTokens.colors.text.inverse;
};

export const getTeamColor = (isHome: boolean): string => {
  return isHome 
    ? themeTokens.sports.teamColors.home 
    : themeTokens.sports.teamColors.away;
};

export const getGameStatusColor = (status: keyof typeof themeTokens.sports.gameStatus): string => {
  return themeTokens.sports.gameStatus[status] || themeTokens.sports.gameStatus.scheduled;
};

// === Export default for convenience ===
export default themeTokens;