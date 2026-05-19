module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/jsx-runtime'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  ignorePatterns: ['src/locales/**'],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/features/*/**'],
            message: 'Import from feature public API only'
          }
        ]
      }
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ImportExpression[source.value=/^@\\/features\\/[^/]+\\/.+/]',
        message: 'Import from feature public API only'
      }
    ]
  },
  overrides: [
    {
      files: ['*.js', '*.cjs', 'scripts/*.js', 'scripts/*.cjs'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off'
      }
    },
    {
      files: ['*.js', '*.cjs', './test/**', './src/polyfills/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off'
      }
    },
    {
      files: ['./test/**', './src/dev/**'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'no-restricted-imports': 'off',
        'no-restricted-syntax': 'off'
      }
    }
  ]
};
