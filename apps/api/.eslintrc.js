module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    '@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/**', 'node_modules/**', 'coverage/**'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/prefer-as-const': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // Code quality rules
    'complexity': ['error', 10],
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    'max-depth': ['error', 4],
    'max-params': ['error', 4],
    'no-duplicate-imports': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    
    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Performance rules
    'no-await-in-loop': 'warn',
    'prefer-promise-reject-errors': 'error',
    
    // NestJS specific rules
    'no-empty-function': ['error', { allow: ['constructors'] }],
    
    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Import rules
    'sort-imports': ['error', {
      ignoreCase: false,
      ignoreDeclarationSort: true,
      ignoreMemberSort: false,
      memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
      allowSeparatedGroups: false,
    }],
  },
  overrides: [
    {
      files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/*.integration.spec.ts', '**/*.performance.spec.ts'],
      rules: {
        // Test files can be longer and more complex
        'max-lines-per-function': 'off',
        'complexity': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        'no-console': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    {
      files: ['**/*.entity.ts'],
      rules: {
        // Entity files often have simple getters/setters
        'max-lines-per-function': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      files: ['**/*.dto.ts'],
      rules: {
        // DTO files are often simple data structures
        'max-lines-per-function': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      files: ['**/*.module.ts'],
      rules: {
        // Module files can be longer due to imports and providers
        'max-lines-per-function': 'off',
      },
    },
    {
      files: ['src/main.ts'],
      rules: {
        // Main application file can use console.log for startup messages
        'no-console': 'off',
      },
    },
    {
      files: ['test/**/*.ts'],
      rules: {
        // Test setup files may need more flexibility
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
};