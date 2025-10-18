/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['@zc/eslint-config/server.js'],
  ignorePatterns: ['.eslintrc.cjs', '.sst/**'],
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
};
// module.exports = {
//   parser: '@typescript-eslint/parser',
//   extends: ['plugin:@typescript-eslint/recommended'],
//   parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
//   rules: {},
// };
