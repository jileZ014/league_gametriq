/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Basketball-themed color palette
      colors: {
        // Primary basketball orange
        'basketball-orange': {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Main basketball orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        
        // Basketball court brown/wood
        'basketball-court': {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cfc7',
          400: '#d2bab0',
          500: '#bfa094',
          600: '#a18072',
          700: '#977669',
          800: '#846358',
          900: '#43302b',
        },
        
        // Team colors
        'team-home': {
          light: '#dbeafe',
          primary: '#3b82f6',
          dark: '#1e40af',
        },
        'team-away': {
          light: '#fecaca',
          primary: '#ef4444', 
          dark: '#dc2626',
        },
        
        // Game status colors
        'game-live': '#ef4444',
        'game-scheduled': '#3b82f6',
        'game-completed': '#6b7280',
        
        // Phoenix heat safety colors
        'heat-green': '#22c55e',
        'heat-yellow': '#eab308',
        'heat-orange': '#f97316',
        'heat-red': '#ef4444',
        
        // Basketball-specific greens for courts
        'basketball-green': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Main green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      
      // Basketball-specific spacing
      spacing: {
        'court': '94rem', // Standard basketball court length (94 feet)
        'half-court': '47rem',
        'key': '16rem', // Paint/key area
        'three-point': '23.75rem', // Three-point line distance
      },
      
      // Typography for sports display
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
        'sport': ['Roboto', 'ui-sans-serif', 'system-ui'],
        'mono': ['Roboto Mono', 'ui-monospace', 'monospace'], // For scores and timers
        'display': ['Roboto Flex', 'ui-sans-serif', 'system-ui'], // For headlines
      },
      
      // Animations for live sports
      animation: {
        'live-pulse': 'live-pulse 2s infinite ease-in-out',
        'score-bump': 'score-bump 0.3s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      
      keyframes: {
        'live-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        'score-bump': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200px 0' },
          '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
        },
      },
      
      // Box shadows for depth
      boxShadow: {
        'court': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'score-card': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'floating': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      
      // Border radius for basketball aesthetics
      borderRadius: {
        'basketball': '50%',
        'court': '0.75rem',
      },
      
      // Screen sizes for responsive design (tablet-first for courtside use)
      screens: {
        'xs': '475px',
        'tablet': '768px',
        'laptop': '1024px',
        'desktop': '1280px',
      },
    },
  },
  plugins: [
    // Add any additional Tailwind plugins here
  ],
  // Dark mode configuration
  darkMode: 'class',
}