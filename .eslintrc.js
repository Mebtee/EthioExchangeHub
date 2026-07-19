// @ts-check
const { resolve } = require('path');

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  reportUnusedDisableDirectives: true,

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],

  plugins: ['@typescript-eslint', 'import'],

  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: [resolve(__dirname, './tsconfig.json')],
  },

  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: [resolve(__dirname, './tsconfig.json')],
      },
    },
  },

  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-duplicates': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': 'off', // handled by @typescript-eslint/no-unused-vars
  },

  overrides: [
    {
      files: ['*.js', '*.mjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],

  ignorePatterns: [
    '**/dist/**',
    '**/.next/**',
    '**/node_modules/**',
    '**/*.config.*',
    '**/prisma/**',
    'coverage/**',
  ],
};

module.exports = config;
