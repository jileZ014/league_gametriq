/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors from your UI design
        'bg-primary': '#0f1419',
        'bg-secondary': '#1a1d29',
        'bg-card': '#1a1d29',
        'border-card': '#2a2d3a',
        'primary': '#ff6b35',      // Orange
        'accent': '#ffd93d',       // Yellow
        'text-primary': '#ffffff',
        'text-secondary': '#9ca3af',
        'text-muted': '#6b7280',
        'live': '#ef4444',         // Red for LIVE indicator
        'success': '#10b981',
        'warning': '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}