module.exports = {
  plugins: {
    // Tailwind CSS processing
    tailwindcss: {},
    
    // Autoprefixer for browser compatibility
    autoprefixer: {
      // Browser targets for basketball league application
      // Targeting modern browsers used in sports environments
      overrideBrowserslist: [
        '>0.2%',
        'not dead',
        'not op_mini all',
        'last 2 versions',
        'ios_saf >= 12', // iPhone/iPad support for coaches and parents
        'chrome >= 70',  // Android Chrome support
        'firefox >= 70', // Desktop Firefox
        'safari >= 12',  // macOS Safari
        'edge >= 79',    // Modern Edge
      ],
      // Enable flexbox prefixes for older iOS Safari
      flexbox: 'no-2009',
      // Support CSS Grid for layout components
      grid: 'autoplace',
    },
    
    // PostCSS Import for @import statements
    'postcss-import': {
      // Resolve paths for component imports
      path: ['src/styles', 'apps/web/src/styles'],
    },
    
    // PostCSS Nested for nested CSS syntax
    'postcss-nested': {},
    
    // CSS Custom Properties (CSS Variables) support
    'postcss-custom-properties': {
      // Preserve custom properties for runtime theming
      preserve: true,
      // Import custom properties from theme files
      importFrom: [
        'src/styles/theme.css',
        'apps/web/src/styles/globals.css'
      ],
    },
    
    // CSS Custom Media Queries
    'postcss-custom-media': {
      // Define custom media queries for responsive design
      importFrom: [
        {
          customMedia: {
            '--mobile': '(max-width: 767px)',
            '--tablet': '(min-width: 768px) and (max-width: 1023px)',
            '--desktop': '(min-width: 1024px)',
            '--touch-device': '(hover: none) and (pointer: coarse)',
            '--reduced-motion': '(prefers-reduced-motion: reduce)',
            '--dark-mode': '(prefers-color-scheme: dark)',
            '--high-contrast': '(prefers-contrast: high)',
            // Basketball-specific breakpoints
            '--scorekeeper-view': '(min-width: 768px)',
            '--coach-dashboard': '(min-width: 1024px)',
            '--tournament-display': '(min-width: 1280px)',
          }
        }
      ]
    },
    
    // Production optimizations
    ...(process.env.NODE_ENV === 'production' && {
      // CSS Nano for minification in production
      cssnano: {
        preset: [
          'advanced',
          {
            // Preserve important comments (license, etc.)
            discardComments: {
              removeAll: false,
            },
            // Optimize animations for performance
            reduceIdents: false,
            // Merge duplicate rules
            mergeLonghand: true,
            // Optimize font weights
            minifyFontValues: true,
            // Optimize gradients
            minifyGradients: true,
            // Normalize whitespace
            normalizeWhitespace: true,
            // Remove unused selectors
            discardUnused: false, // Keep false to avoid breaking dynamic classes
            // Optimize z-index values
            zindex: false, // Keep false to maintain layer hierarchy
            // Sort CSS properties for better gzip compression
            cssDeclarationSorter: true,
          }
        ]
      },
      
      // Purge unused CSS in production
      '@fullhuman/postcss-purgecss': {
        content: [
          './pages/**/*.{js,ts,jsx,tsx}',
          './components/**/*.{js,ts,jsx,tsx}',
          './app/**/*.{js,ts,jsx,tsx}',
          './src/**/*.{js,ts,jsx,tsx}',
          './lib/**/*.{js,ts,jsx,tsx}',
          './apps/**/*.{js,ts,jsx,tsx}',
          './packages/**/*.{js,ts,jsx,tsx}',
        ],
        // Whitelist classes that might be added dynamically
        safelist: [
          // Tailwind CSS classes that might be added dynamically
          /^bg-/, /^text-/, /^border-/, /^ring-/, /^shadow-/,
          // Basketball-specific dynamic classes
          /^team-/, /^game-/, /^heat-/, /^score-/,
          // Animation classes
          /^animate-/, /^transition-/, /^duration-/, /^ease-/,
          // State classes
          'active', 'disabled', 'loading', 'error', 'success',
          // Dark mode classes
          'dark',
          // Responsive classes that might be toggled
          /^sm:/, /^md:/, /^lg:/, /^xl:/, /^2xl:/,
          // Touch target classes
          'touch-target', 'touch-target-lg', 'touch-target-xl',
          // Live indicator classes
          'live-indicator', 'live-pulse',
          // Third-party library classes
          /^swiper-/, /^react-/, /^recharts-/,
        ],
        // Default extractors
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
        // Custom extractors for specific file types
        extractors: [
          {
            // Extract classes from JSX/TSX files
            extractor: content => {
              const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
              const classNames = content.match(/(?:class|className)="([^"]*)"/g) || [];
              const dynamicClassNames = content.match(/(?:class|className)={[^}]*}/g) || [];
              
              return [
                ...broadMatches,
                ...classNames.map(match => match.replace(/(?:class|className)="([^"]*)"/, '$1')),
                ...dynamicClassNames,
              ];
            },
            extensions: ['jsx', 'tsx', 'js', 'ts']
          }
        ]
      }
    }),
    
    // Development-only plugins
    ...(process.env.NODE_ENV === 'development' && {
      // PostCSS Reporter for better error messages in development
      'postcss-reporter': {
        clearReportedMessages: true,
        throwError: false, // Don't break build on warnings
      }
    })
  }
};