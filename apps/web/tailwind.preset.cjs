const tokens = require('./styles/tokens.gametriq.json');

// Transform tokens to Tailwind format
function transformTokens(tokenObj, prefix = '') {
  const result = {};
  
  for (const [key, value] of Object.entries(tokenObj)) {
    if (value && typeof value === 'object' && 'value' in value) {
      result[key] = value.value;
    } else if (value && typeof value === 'object') {
      result[key] = transformTokens(value, `${prefix}${key}-`);
    }
  }
  
  return result;
}

module.exports = {
  theme: {
    extend: {
      colors: {
        // Dark theme palette
        dark: transformTokens(tokens.color.dark),
        
        // Primary colors (Basketball orange)
        primary: transformTokens(tokens.color.primary),
        
        // Semantic colors
        success: transformTokens(tokens.color.semantic.success),
        warning: transformTokens(tokens.color.semantic.warning),
        error: transformTokens(tokens.color.semantic.error),
        info: transformTokens(tokens.color.semantic.info),
        live: transformTokens(tokens.color.semantic.live),
        
        // Team colors (CSS variables for dynamic theming)
        team: {
          home: {
            DEFAULT: 'var(--team-home-primary)',
            light: 'var(--team-home-secondary)',
            glow: 'var(--team-home-glow)',
          },
          away: {
            DEFAULT: 'var(--team-away-primary)',
            light: 'var(--team-away-secondary)',
            glow: 'var(--team-away-glow)',
          },
        },
        
        // Background and surface colors
        background: {
          DEFAULT: 'hsl(var(--background))',
          elevated: 'hsl(var(--background-elevated))',
          interactive: 'hsl(var(--background-interactive))',
        },
        foreground: 'hsl(var(--foreground))',
      },
      
      fontFamily: {
        display: ['Inter Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'],
        'lg': ['18px', '28px'],
        'xl': ['24px', '32px'],
        '2xl': ['32px', '40px'],
        '3xl': ['48px', '56px'],
        '4xl': ['72px', '80px'],
        '5xl': ['96px', '104px'],
        // Sport-specific sizes
        'score': ['72px', { lineHeight: '1', fontWeight: '900' }],
        'stat': ['48px', { lineHeight: '1.1', fontWeight: '700' }],
        'label': ['12px', { lineHeight: '1.3', fontWeight: '500', letterSpacing: '0.1em' }],
      },
      
      spacing: transformTokens(tokens.spacing),
      
      borderRadius: transformTokens(tokens.borderRadius),
      
      boxShadow: {
        ...transformTokens(tokens.shadow),
        'glow-sm': '0 0 8px var(--glow-color, rgba(255, 152, 0, 0.4))',
        'glow': '0 0 16px var(--glow-color, rgba(255, 152, 0, 0.4))',
        'glow-lg': '0 0 24px var(--glow-color, rgba(255, 152, 0, 0.4))',
        'glow-xl': '0 0 32px var(--glow-color, rgba(255, 152, 0, 0.6))',
      },
      
      animation: {
        'slide-in': 'slideIn 300ms cubic-bezier(0, 0, 0.2, 1)',
        'slide-out': 'slideOut 200ms cubic-bezier(0.4, 0, 1, 1)',
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-out': 'fadeOut 150ms ease-in',
        'scale-up': 'scaleUp 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'count-up': 'countUp 600ms cubic-bezier(0, 0, 0.2, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-in': 'bounceIn 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { 
            boxShadow: '0 0 16px var(--glow-color, rgba(255, 152, 0, 0.4))',
            borderColor: 'var(--glow-color, rgb(255, 152, 0))',
          },
          '50%': { 
            boxShadow: '0 0 32px var(--glow-color, rgba(255, 152, 0, 0.8))',
            borderColor: 'var(--glow-color, rgb(255, 152, 0))',
          },
        },
        countUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '50%': { transform: 'translateY(-2px)' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      
      transitionDuration: transformTokens(tokens.animation.duration),
      
      transitionTimingFunction: {
        'ease-overshoot': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      
      screens: {
        'xs': '320px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        'touch': { raw: '(hover: none) and (pointer: coarse)' },
        'mouse': { raw: '(hover: hover) and (pointer: fine)' },
      },
      
      zIndex: transformTokens(tokens.zIndex),
    },
  },
  
  plugins: [
    // Custom plugin for density variants
    function({ addUtilities, theme }) {
      const densities = {
        '.density-compact': {
          '--row-height': '32px',
          '--cell-padding': '8px',
          '--font-size': '14px',
        },
        '.density-comfortable': {
          '--row-height': '48px',
          '--cell-padding': '12px',
          '--font-size': '16px',
        },
        '.density-spacious': {
          '--row-height': '64px',
          '--cell-padding': '16px',
          '--font-size': '18px',
        },
      };
      
      addUtilities(densities);
    },
    
    // Custom plugin for glow effects
    function({ addUtilities, theme }) {
      const glows = {
        '.glow-primary': {
          '--glow-color': theme('colors.primary.500'),
          filter: 'drop-shadow(0 0 8px var(--glow-color))',
        },
        '.glow-team-home': {
          '--glow-color': 'var(--team-home-glow)',
          filter: 'drop-shadow(0 0 8px var(--glow-color))',
        },
        '.glow-team-away': {
          '--glow-color': 'var(--team-away-glow)',
          filter: 'drop-shadow(0 0 8px var(--glow-color))',
        },
        '.glow-live': {
          '--glow-color': theme('colors.error.500'),
          filter: 'drop-shadow(0 0 12px var(--glow-color))',
        },
      };
      
      addUtilities(glows);
    },
  ],
}