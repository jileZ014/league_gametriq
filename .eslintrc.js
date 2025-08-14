module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'next/core-web-vitals',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
  ],
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/prefer-const': 'error',
    '@typescript-eslint/no-var-requires': 'off',
    
    // React rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/display-name': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Next.js rules
    '@next/next/no-html-link-for-pages': 'off',
    '@next/next/no-img-element': 'warn',
    
    // General rules
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': 'off', // Use TypeScript version instead
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    
    // Accessibility rules
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/interactive-supports-focus': 'error',
    'jsx-a11y/label-has-associated-control': 'error',
    'jsx-a11y/no-autofocus': 'warn',
    'jsx-a11y/no-distracting-elements': 'error',
    'jsx-a11y/no-redundant-roles': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    
    // Basketball-specific naming conventions
    'camelcase': ['error', {
      allow: [
        'birth_year', // Database field
        'jersey_number', // Database field
        'team_id', // Database field
        'league_id', // Database field
        'game_id', // Database field
        'player_id', // Database field
        'home_team', // API response
        'away_team', // API response
        'home_score', // API response
        'away_score', // API response
        'time_remaining', // API response
        'heat_index', // Weather API
        'payment_intent', // Stripe API
        'client_secret', // Stripe API
        'stripe_customer_id', // Database field
        'created_at', // Database field
        'updated_at', // Database field
      ],
    }],
  },
  overrides: [
    // API routes
    {
      files: ['apps/api/**/*.ts', 'apps/api/**/*.js'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        'no-console': 'off', // Allow console in API
      },
    },
    
    // Test files
    {
      files: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        'tests/**/*',
      ],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-console': 'off',
      },
    },
    
    // Configuration files
    {
      files: [
        '*.config.js',
        '*.config.ts',
        '.eslintrc.js',
        'jest.config.js',
        'next.config.js',
        'postcss.config.js',
        'tailwind.config.js',
      ],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
      },
    },
    
    // Basketball domain-specific rules
    {
      files: [
        '**/basketball/**/*.ts',
        '**/basketball/**/*.tsx',
        '**/scoring/**/*.ts',
        '**/scoring/**/*.tsx',
        '**/tournament/**/*.ts',
        '**/tournament/**/*.tsx',
        '**/league/**/*.ts',
        '**/league/**/*.tsx',
      ],
      rules: {
        // Enforce consistent naming for basketball concepts
        'prefer-const': 'error',
        'no-magic-numbers': ['warn', {
          ignore: [0, 1, 2, 3, 4, 5, 10, 15, 20, 24, 30, 40, 48, 60], // Common basketball numbers
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
        }],
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: [
          'tsconfig.json',
          'apps/*/tsconfig.json',
          'packages/*/tsconfig.json',
        ],
      },
    },
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'out/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    'public/sw.js',
    'public/workbox-*.js',
    'playwright-report/',
    'test-results/',
    '.turbo/',
    '.vercel/',
    '.env*',
    '*.tsbuildinfo',
  ],
};