/**
 * Gametriq Theme CSS Variables
 * NBA 2K × ESPN Design System
 * 
 * This file exports CSS variables for runtime theming
 */

export const themeCSS = `
  :root {
    /* ============================================
       Dark Theme (Default) - NBA 2K Inspired
       ============================================ */
    
    /* Background Layers */
    --background: 221 39% 7%;           /* #0A0E1B */
    --background-elevated: 221 28% 14%; /* #1A1F2E */
    --background-interactive: 218 22% 22%; /* #2C3444 */
    --background-overlay: 221 39% 7% / 0.8;
    
    /* Foreground Colors */
    --foreground: 0 0% 95%;              /* #F3F4F6 */
    --foreground-muted: 220 9% 64%;      /* #9CA3AF */
    --foreground-subtle: 220 9% 46%;     /* #6B7280 */
    
    /* Primary - Basketball Orange */
    --primary: 24 100% 50%;              /* #FF9800 */
    --primary-foreground: 0 0% 100%;     /* White on orange */
    --primary-glow: 24 100% 50% / 0.4;
    
    /* Team Colors (Dynamic - will be overridden) */
    --team-home-primary: 217 91% 60%;    /* #3B82F6 */
    --team-home-secondary: 213 94% 93%;  /* #DBEAFE */
    --team-home-glow: 217 91% 60% / 0.4;
    
    --team-away-primary: 0 84% 60%;      /* #EF4444 */
    --team-away-secondary: 0 86% 97%;    /* #FEE2E2 */
    --team-away-glow: 0 84% 60% / 0.4;
    
    /* Semantic Colors */
    --success: 158 64% 52%;              /* #10B981 */
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;               /* #F59E0B */
    --warning-foreground: 0 0% 100%;
    --error: 0 84% 60%;                  /* #EF4444 */
    --error-foreground: 0 0% 100%;
    --info: 217 91% 60%;                 /* #3B82F6 */
    --info-foreground: 0 0% 100%;
    
    /* Live Indicator */
    --live: 0 84% 60%;                   /* Red pulse */
    --live-glow: 0 84% 60% / 0.6;
    
    /* Surface Colors */
    --card: var(--background-elevated);
    --card-foreground: var(--foreground);
    --popover: var(--background-elevated);
    --popover-foreground: var(--foreground);
    
    /* Interactive States */
    --muted: 217 19% 27%;                /* Muted background */
    --muted-foreground: 215 20% 65%;     /* Muted text */
    --accent: var(--primary);
    --accent-foreground: var(--primary-foreground);
    
    /* Borders */
    --border: 217 19% 27%;               /* Dark border */
    --input: 217 19% 27%;                /* Input border */
    --ring: var(--primary);              /* Focus ring */
    
    /* Shadows - Dark theme specific */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.5);
    --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.6);
    --shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.7);
    
    /* Glow Effects */
    --glow-sm: 0 0 8px;
    --glow: 0 0 16px;
    --glow-lg: 0 0 24px;
    --glow-xl: 0 0 32px;
    
    /* Typography Scale */
    --text-xs: 0.75rem;      /* 12px */
    --text-sm: 0.875rem;     /* 14px */
    --text-base: 1rem;       /* 16px */
    --text-lg: 1.125rem;     /* 18px */
    --text-xl: 1.5rem;       /* 24px */
    --text-2xl: 2rem;        /* 32px */
    --text-3xl: 3rem;        /* 48px */
    --text-4xl: 4.5rem;      /* 72px */
    --text-5xl: 6rem;        /* 96px */
    
    /* Spacing Scale (4px base) */
    --space-1: 0.25rem;      /* 4px */
    --space-2: 0.5rem;       /* 8px */
    --space-3: 0.75rem;      /* 12px */
    --space-4: 1rem;         /* 16px */
    --space-6: 1.5rem;       /* 24px */
    --space-8: 2rem;         /* 32px */
    --space-12: 3rem;        /* 48px */
    --space-16: 4rem;        /* 64px */
    
    /* Border Radius */
    --radius-sm: 4px;
    --radius: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 24px;
    --radius-full: 9999px;
    
    /* Animation Durations */
    --duration-instant: 100ms;
    --duration-fast: 200ms;
    --duration-normal: 300ms;
    --duration-slow: 500ms;
    --duration-slower: 700ms;
    
    /* Z-Index Layers */
    --z-base: 0;
    --z-dropdown: 1000;
    --z-sticky: 1100;
    --z-modal: 1200;
    --z-popover: 1300;
    --z-tooltip: 1400;
    --z-notification: 1500;
    
    /* Touch Targets */
    --touch-min: 44px;
    --touch-recommended: 48px;
    --touch-comfortable: 56px;
    --touch-large: 64px;
    
    /* Density Modes */
    --density-compact-height: 32px;
    --density-comfortable-height: 48px;
    --density-spacious-height: 64px;
  }
  
  /* ============================================
     Light Theme Override (Optional)
     ============================================ */
  
  [data-theme="light"] {
    --background: 0 0% 100%;             /* White */
    --background-elevated: 0 0% 98%;     /* Light gray */
    --background-interactive: 0 0% 95%;  /* Lighter gray */
    
    --foreground: 221 39% 11%;           /* Dark text */
    --foreground-muted: 220 9% 46%;      /* Muted dark */
    --foreground-subtle: 220 9% 64%;     /* Subtle dark */
    
    --card: 0 0% 100%;
    --popover: 0 0% 100%;
    
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    
    /* Light theme shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.15);
    --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.2);
    --shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.25);
  }
  
  /* ============================================
     Team Theme Overrides (Dynamic)
     ============================================ */
  
  [data-team-home="lakers"] {
    --team-home-primary: 273 100% 40%;   /* Purple */
    --team-home-secondary: 48 100% 50%;  /* Gold */
    --team-home-glow: 273 100% 40% / 0.4;
  }
  
  [data-team-home="celtics"] {
    --team-home-primary: 151 83% 34%;    /* Green */
    --team-home-secondary: 0 0% 100%;    /* White */
    --team-home-glow: 151 83% 34% / 0.4;
  }
  
  [data-team-home="heat"] {
    --team-home-primary: 0 0% 0%;        /* Black */
    --team-home-secondary: 0 84% 60%;    /* Red */
    --team-home-glow: 0 84% 60% / 0.4;
  }
  
  /* ============================================
     Motion Preferences
     ============================================ */
  
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  
  /* ============================================
     High Contrast Mode
     ============================================ */
  
  @media (prefers-contrast: high) {
    :root {
      --foreground: 0 0% 100%;
      --background: 0 0% 0%;
      --border: 0 0% 100%;
      --primary: 48 100% 50%;
    }
  }
  
  /* ============================================
     Dark Mode Preference
     ============================================ */
  
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
    }
  }
`;

// Export function to inject theme CSS
export function injectThemeCSS() {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.id = 'gametriq-theme';
    style.textContent = themeCSS;
    document.head.appendChild(style);
  }
}

// Export function to set team colors dynamically
export function setTeamColors(home: string, away: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-team-home', home);
    document.documentElement.setAttribute('data-team-away', away);
  }
}

// Export function to toggle theme
export function toggleTheme() {
  if (typeof document !== 'undefined') {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('gametriq-theme', newTheme);
  }
}

// Export function to apply saved theme
export function applySavedTheme() {
  if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
    const savedTheme = localStorage.getItem('gametriq-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
}