/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Basketball Brand Colors
        basketball: {
          orange: {
            50: '#fff3e0',
            100: '#ffe0b2',
            200: '#ffcc80',
            300: '#ffb74d',
            400: '#ffa726',
            500: '#ff9800', // Primary basketball orange
            600: '#fb8c00',
            700: '#f57c00',
            800: '#ef6c00',
            900: '#e65100',
          },
          green: {
            50: '#e8f5e8',
            100: '#c8e6c9',
            200: '#a5d6a7',
            300: '#81c784',
            400: '#66bb6a',
            500: '#4caf50', // Court green
            600: '#43a047',
            700: '#388e3c',
            800: '#2e7d32',
            900: '#1b5e20',
          },
          court: '#d2691e', // Basketball court wood color
          lines: '#ffffff', // Court line markings
        },
        // Team Colors
        team: {
          home: {
            primary: '#1976d2',
            light: '#bbdefb',
            dark: '#0d47a1',
          },
          away: {
            primary: '#d32f2f',
            light: '#ffcdd2',
            dark: '#b71c1c',
          },
          neutral: '#424242',
        },
        // Game Status Colors
        game: {
          live: '#ff5722',
          scheduled: '#2196f3',
          completed: '#4caf50',
        },
        // Heat Safety Colors (Phoenix-specific)
        heat: {
          green: '#4caf50',
          yellow: '#ffeb3b',
          orange: '#ff9800',
          red: '#f44336',
        },
        // Semantic Colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-large': ['57px', { lineHeight: '64px', letterSpacing: '-0.25px' }],
        'display-medium': ['45px', { lineHeight: '52px', letterSpacing: '0px' }],
        'display-small': ['36px', { lineHeight: '44px', letterSpacing: '0px' }],
        'headline-large': ['32px', { lineHeight: '40px', letterSpacing: '0px' }],
        'headline-medium': ['28px', { lineHeight: '36px', letterSpacing: '0px' }],
        'headline-small': ['24px', { lineHeight: '32px', letterSpacing: '0px' }],
        'title-large': ['22px', { lineHeight: '28px', letterSpacing: '0px' }],
        'title-medium': ['16px', { lineHeight: '24px', letterSpacing: '0.15px' }],
        'title-small': ['14px', { lineHeight: '20px', letterSpacing: '0.1px' }],
        'body-large': ['16px', { lineHeight: '24px', letterSpacing: '0.5px' }],
        'body-medium': ['14px', { lineHeight: '20px', letterSpacing: '0.25px' }],
        'body-small': ['12px', { lineHeight: '16px', letterSpacing: '0.4px' }],
        'label-large': ['14px', { lineHeight: '20px', letterSpacing: '0.1px' }],
        'label-medium': ['12px', { lineHeight: '16px', letterSpacing: '0.5px' }],
        'label-small': ['11px', { lineHeight: '16px', letterSpacing: '0.5px' }],
      },
      spacing: {
        'touch': '48px',
        'touch-lg': '56px',
        'touch-xl': '64px',
      },
      maxWidth: {
        'container': '1200px',
      },
      screens: {
        'xs': '320px',
        'mobile-lg': '480px',
      },
      boxShadow: {
        'elevation-1': '0 1px 2px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.12)',
        'elevation-2': '0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 6px rgba(0, 0, 0, 0.12)',
        'elevation-3': '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.12)',
        'elevation-4': '0 4px 8px rgba(0, 0, 0, 0.15), 0 3px 12px rgba(0, 0, 0, 0.12)',
        'elevation-5': '0 5px 12px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.12)',
        'live-glow': '0 4px 12px rgba(255, 152, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15)',
        'emergency-glow': '0 6px 16px rgba(244, 67, 54, 0.4), 0 3px 12px rgba(0, 0, 0, 0.2)',
        'team-home': '0 2px 8px rgba(33, 150, 243, 0.2), 0 1px 4px rgba(0, 0, 0, 0.1)',
        'team-away': '0 2px 8px rgba(244, 67, 54, 0.2), 0 1px 4px rgba(0, 0, 0, 0.1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'score-update': {
          '0%': { transform: 'scale(1)', color: 'var(--foreground)' },
          '50%': { transform: 'scale(1.1)', color: '#ff9800' },
          '100%': { transform: 'scale(1)', color: 'var(--foreground)' },
        },
        'live-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        'basketball-spin': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.1)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'score-update': 'score-update 300ms ease-out',
        'live-pulse': 'live-pulse 2s infinite ease-in-out',
        'basketball-spin': 'basketball-spin 1s infinite ease-in-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}