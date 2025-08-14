/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './app/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx,js,jsx}',
    './apps/**/*.{ts,tsx,js,jsx}',
    './packages/**/*.{ts,tsx,js,jsx}',
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
        // Basketball Brand Colors - Phoenix-inspired palette
        basketball: {
          orange: {
            50: '#fff8f1',
            100: '#feecdc',
            200: '#fcd9bd',
            300: '#fdba8c',
            400: '#ff9800', // Primary basketball orange
            500: '#fd7f28',
            600: '#f56500',
            700: '#c44705',
            800: '#9a3412',
            900: '#772c0a',
            950: '#431407',
          },
          red: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444', // Phoenix Suns red
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
            950: '#450a0a',
          },
          purple: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7', // Phoenix Suns purple
            600: '#9333ea',
            700: '#7c3aed',
            800: '#6b21a8',
            900: '#581c87',
            950: '#3b0764',
          },
          court: {
            50: '#fefce8',
            100: '#fef9c3',
            200: '#fef08a',
            300: '#fde047',
            400: '#facc15',
            500: '#d2691e', // Basketball court wood color
            600: '#ca8a04',
            700: '#a16207',
            800: '#854d0e',
            900: '#713f12',
            950: '#422006',
          },
          lines: '#ffffff', // Court line markings
        },
        // Team Colors for home/away distinction
        team: {
          home: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#1976d2', // Primary home team blue
            600: '#1d4ed8',
            700: '#1e40af',
            800: '#1e3a8a',
            900: '#1e3a8a',
            950: '#0d47a1',
          },
          away: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#d32f2f', // Primary away team red
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
            950: '#b71c1c',
          },
          neutral: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#424242', // Neutral/referee colors
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
            950: '#030712',
          },
        },
        // Game Status Indicators
        game: {
          live: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#ff5722', // Live game indicator
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
            950: '#431407',
          },
          scheduled: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#2196f3', // Scheduled game
            600: '#1d4ed8',
            700: '#1e40af',
            800: '#1e3a8a',
            900: '#1e3a8a',
            950: '#172554',
          },
          completed: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#4caf50', // Completed game
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
            950: '#052e16',
          },
          cancelled: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444', // Cancelled game
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
            950: '#450a0a',
          },
        },
        // Heat Safety Colors (Phoenix-specific)
        heat: {
          green: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#4caf50', // Safe conditions
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
            950: '#052e16',
          },
          yellow: {
            50: '#fefce8',
            100: '#fef9c3',
            200: '#fef08a',
            300: '#fde047',
            400: '#facc15',
            500: '#ffeb3b', // Caution conditions
            600: '#ca8a04',
            700: '#a16207',
            800: '#854d0e',
            900: '#713f12',
            950: '#422006',
          },
          orange: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#ff9800', // Enhanced safety
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
            950: '#431407',
          },
          red: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#f44336', // Extreme caution
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
            950: '#450a0a',
          },
        },
        // Semantic Colors for UI Components
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
        lg: 'var(--radius-lg, var(--radius, 0.5rem))',
        md: 'var(--radius-md, calc(var(--radius, 0.5rem) - 2px))',
        sm: 'var(--radius-sm, calc(var(--radius, 0.5rem) - 4px))',
      },
      fontFamily: {
        // Primary font family for clean, modern look
        sans: [
          'var(--font-body, Inter)',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'sans-serif'
        ],
        // Monospace for game clock, stats, and scores
        mono: [
          'var(--font-mono, "JetBrains Mono")',
          'Roboto Mono',
          'SF Mono',
          'Monaco',
          'Cascadia Code',
          'monospace'
        ],
        // Display font for headers and branding
        display: [
          'var(--font-heading, "Inter")',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif'
        ],
        // Basketball-specific numeric font for scores
        score: [
          'var(--font-score, "JetBrains Mono")',
          'Roboto Mono',
          'SF Mono',
          'monospace'
        ],
      },
      fontSize: {
        // Material Design 3 Typography Scale adapted for basketball
        'display-large': ['3.5rem', { lineHeight: '4rem', letterSpacing: '-0.025em', fontWeight: '700' }],
        'display-medium': ['2.75rem', { lineHeight: '3.25rem', letterSpacing: '0', fontWeight: '700' }],
        'display-small': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '0', fontWeight: '600' }],
        'headline-large': ['2rem', { lineHeight: '2.5rem', letterSpacing: '0', fontWeight: '600' }],
        'headline-medium': ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '0', fontWeight: '600' }],
        'headline-small': ['1.5rem', { lineHeight: '2rem', letterSpacing: '0', fontWeight: '600' }],
        'title-large': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '0', fontWeight: '500' }],
        'title-medium': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.01em', fontWeight: '500' }],
        'title-small': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em', fontWeight: '500' }],
        'body-large': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.005em', fontWeight: '400' }],
        'body-medium': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em', fontWeight: '400' }],
        'body-small': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.04em', fontWeight: '400' }],
        'label-large': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em', fontWeight: '500' }],
        'label-medium': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em', fontWeight: '500' }],
        'label-small': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.05em', fontWeight: '500' }],
        // Basketball-specific sizes
        'score-large': ['4rem', { lineHeight: '4rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'score-medium': ['2.5rem', { lineHeight: '2.5rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'score-small': ['1.5rem', { lineHeight: '1.5rem', letterSpacing: '0', fontWeight: '600' }],
        'timer': ['3rem', { lineHeight: '3rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'stat': ['1.25rem', { lineHeight: '1.25rem', letterSpacing: '0', fontWeight: '600' }],
      },
      spacing: {
        // 4px base unit spacing scale with basketball-specific additions
        'xs': 'var(--spacing-xs, 0.25rem)', // 4px
        'sm': 'var(--spacing-sm, 0.5rem)',  // 8px
        'md': 'var(--spacing-md, 1rem)',    // 16px
        'lg': 'var(--spacing-lg, 1.5rem)',  // 24px
        'xl': 'var(--spacing-xl, 2rem)',    // 32px
        '2xl': '3rem',   // 48px
        '3xl': '4rem',   // 64px
        '4xl': '5rem',   // 80px
        '5xl': '6rem',   // 96px
        // Touch target minimums for mobile-first design
        'touch': '3rem',     // 48px - minimum touch target
        'touch-lg': '3.5rem', // 56px - larger touch target for youth
        'touch-xl': '4rem',   // 64px - extra large for accessibility
        // Court-specific spacing
        'court-padding': '1.25rem', // Standard court element padding
        'score-margin': '0.75rem',  // Score element margins
      },
      maxWidth: {
        'container': '75rem',     // 1200px main container
        'content': '65rem',       // 1040px content width
        'reading': '45rem',       // 720px reading width
        'form': '32rem',          // 512px form width
        'card': '24rem',          // 384px card width
      },
      screens: {
        'xs': '20rem',           // 320px
        'mobile-lg': '30rem',    // 480px
        'tablet-sm': '40rem',    // 640px
        'tablet': '48rem',       // 768px
        'laptop': '64rem',       // 1024px
        'desktop': '80rem',      // 1280px
        'wide': '96rem',         // 1536px
        // Basketball-specific breakpoints
        'scorekeeper': '48rem',  // Minimum for scorekeeper interface
        'coach': '64rem',        // Optimal for coaching dashboard
        'tournament': '80rem',   // Tournament bracket display
      },
      boxShadow: {
        // Material Design 3 Elevation System
        'elevation-0': 'none',
        'elevation-1': '0 1px 2px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.12)',
        'elevation-2': '0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 6px rgba(0, 0, 0, 0.12)',
        'elevation-3': '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.12)',
        'elevation-4': '0 4px 8px rgba(0, 0, 0, 0.15), 0 3px 12px rgba(0, 0, 0, 0.12)',
        'elevation-5': '0 5px 12px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.12)',
        // Basketball-specific shadows
        'live-glow': '0 4px 12px rgba(255, 152, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15)',
        'emergency-glow': '0 6px 16px rgba(244, 67, 54, 0.4), 0 3px 12px rgba(0, 0, 0, 0.2)',
        'team-home': '0 2px 8px rgba(33, 150, 243, 0.2), 0 1px 4px rgba(0, 0, 0, 0.1)',
        'team-away': '0 2px 8px rgba(244, 67, 54, 0.2), 0 1px 4px rgba(0, 0, 0, 0.1)',
        'court': '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
        'score-card': '0 2px 12px rgba(0, 0, 0, 0.08), 0 1px 6px rgba(0, 0, 0, 0.06)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // Basketball-specific animations
        'score-update': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
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
        'court-entrance': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '50%': { transform: 'translateY(-10%)', opacity: '0.7' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slideInUp': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slideInDown': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slideInLeft': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slideInRight': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'score-update': 'score-update 300ms ease-out',
        'live-pulse': 'live-pulse 2s infinite ease-in-out',
        'basketball-spin': 'basketball-spin 1s infinite ease-in-out',
        'court-entrance': 'court-entrance 600ms ease-out',
        'fadeIn': 'fadeIn 200ms ease-out',
        'slideInUp': 'slideInUp 300ms ease-out',
        'slideInDown': 'slideInDown 300ms ease-out',
        'slideInLeft': 'slideInLeft 300ms ease-out',
        'slideInRight': 'slideInRight 300ms ease-out',
        'bounce-subtle': 'bounce-subtle 1s infinite',
        'shimmer': 'shimmer 2s infinite linear',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'court-pattern': 'linear-gradient(45deg, #d2691e 25%, transparent 25%), linear-gradient(-45deg, #d2691e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d2691e 75%), linear-gradient(-45deg, transparent 75%, #d2691e 75%)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
      },
      backdropBlur: {
        'court': '12px',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class', // Use class-based forms
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    // Custom plugin for basketball-specific utilities
    function({ addUtilities, addComponents, theme }) {
      // Basketball-specific utility classes
      addUtilities({
        '.touch-target': {
          minHeight: theme('spacing.touch'),
          minWidth: theme('spacing.touch'),
        },
        '.touch-target-lg': {
          minHeight: theme('spacing.touch-lg'),
          minWidth: theme('spacing.touch-lg'),
        },
        '.touch-target-xl': {
          minHeight: theme('spacing.touch-xl'),
          minWidth: theme('spacing.touch-xl'),
        },
        '.score-text': {
          fontFamily: theme('fontFamily.score'),
          fontWeight: '700',
          lineHeight: '1',
          letterSpacing: '-0.02em',
        },
        '.court-bg': {
          backgroundImage: theme('backgroundImage.court-pattern'),
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 0, 10px 10px, 10px 10px',
        },
        '.glass-effect': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        '.text-balance': {
          textWrap: 'balance',
        },
        '.text-pretty': {
          textWrap: 'pretty',
        },
      });
      
      // Basketball-specific component classes
      addComponents({
        '.score-card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.lg'),
          boxShadow: theme('boxShadow.score-card'),
          padding: theme('spacing.md'),
          border: `1px solid ${theme('colors.gray.200')}`,
        },
        '.live-indicator': {
          backgroundColor: theme('colors.game.live.500'),
          color: theme('colors.white'),
          fontSize: theme('fontSize.label-small'),
          fontWeight: '600',
          padding: `${theme('spacing.xs')} ${theme('spacing.sm')}`,
          borderRadius: theme('borderRadius.md'),
          animation: theme('animation.live-pulse'),
        },
        '.team-home': {
          '--team-color': theme('colors.team.home.500'),
          backgroundColor: 'var(--team-color)',
          color: theme('colors.white'),
        },
        '.team-away': {
          '--team-color': theme('colors.team.away.500'),
          backgroundColor: 'var(--team-color)',
          color: theme('colors.white'),
        },
        '.heat-status': {
          padding: `${theme('spacing.xs')} ${theme('spacing.sm')}`,
          borderRadius: theme('borderRadius.md'),
          fontSize: theme('fontSize.label-small'),
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
        '.heat-green': {
          backgroundColor: theme('colors.heat.green.500'),
          color: theme('colors.white'),
        },
        '.heat-yellow': {
          backgroundColor: theme('colors.heat.yellow.500'),
          color: theme('colors.gray.900'),
        },
        '.heat-orange': {
          backgroundColor: theme('colors.heat.orange.500'),
          color: theme('colors.white'),
        },
        '.heat-red': {
          backgroundColor: theme('colors.heat.red.500'),
          color: theme('colors.white'),
        },
      });
    },
  ],
};