// Warnings are errors in production
const OFF = 'off';
const ERROR = 'error';

// most rules should be either OFF or ERROR, but use WARNING for things that are common in development but you don't want in production
const WARNING = process.env.NODE_ENV === 'production' ? 'error' : 'warn';

/** @type {import("eslint").Linter.Config} */
const config = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
  },
  plugins: ['@typescript-eslint', 'react-compiler'],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
  ],
  ignorePatterns: ['.eslintrc.cjs', 'next-env.d.ts'],
  rules: {
    'react/no-unescaped-entities': OFF,
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'object-shorthand': ERROR,
    '@typescript-eslint/no-unsafe-call': OFF,
    '@typescript-eslint/no-unsafe-assignment': OFF,
    'no-console': [WARNING, { allow: ['warn', 'error'] }],
    'import/order': [
      ERROR,
      {
        pathGroups: [
          {
            pattern: 'convex/**', // Matches all `convex` imports
            group: 'external', // Treat `convex` imports as an external module
            position: 'after', // Position them after other external modules, If have problems, try before
          },
          {
            pattern: '~/**', // Matches imports from `~/`
            group: 'internal', // Treat `~/` imports as internal modules
          },
        ],

        pathGroupsExcludedImportTypes: ['convex'], // Exclude `convex` from the usual ordering rules
      },
    ],
    'react/jsx-curly-brace-presence': ERROR,
    'react/self-closing-comp': ERROR,
    'no-useless-rename': ERROR,
    'arrow-body-style': ERROR,
    'react/jsx-no-useless-fragment': ERROR,
    'react/jsx-boolean-value': ERROR,
    'prefer-template': ERROR,
    '@typescript-eslint/no-unused-vars': WARNING,
    '@typescript-eslint/array-type': OFF,
    '@typescript-eslint/consistent-type-definitions': OFF,
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      },
    ],

    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: {
          attributes: false,
        },
      },
    ],
  },
};
module.exports = config;
