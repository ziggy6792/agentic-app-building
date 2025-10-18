// Warnings are errors in production
const OFF = 'off';
const ERROR = 'error';

// most rules should be either OFF or ERROR, but use WARNING for things that are common in development but you don't want in production
const WARNING = process.env.NODE_ENV === 'production' ? ERROR : 'warn';

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'eslint-plugin-import'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    'no-console': [WARNING, { allow: ['warn', 'error'] }],
    'import/order': [
      'error',
      {
        groups: [
          'builtin', // Node.js built-in modules
          'external', // External modules from node_modules
          'internal', // Internal modules (e.g., absolute imports)
          ['parent', 'sibling', 'index'], // Relative imports
        ],
        pathGroups: [
          {
            pattern: 'src',
            group: 'internal',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'no-useless-rename': ERROR,
    'arrow-body-style': ERROR,
    'prefer-template': ERROR,
    '@typescript-eslint/no-unused-vars': WARNING,
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
