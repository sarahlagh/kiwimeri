import eslintReact from '@eslint-react/eslint-plugin';
import css from '@eslint/css';
import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import pluginLingui from 'eslint-plugin-lingui';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['src/locales/**', 'src/dev/**']
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      eslintReact.configs['recommended-typescript'],
      pluginLingui.configs['flat/recommended']
    ],

    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      }
    },

    rules: {
      'no-console': 'off',
      'no-debugger': 'warn',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@@/*/**'],
              message: 'Import from tests forbidden'
            },
            {
              group: ['**/test/**'],
              message: 'Import from tests forbidden'
            },
            {
              group: ['@/features/*/**'],
              message: 'Import from feature public API only'
            },
            {
              group: ['**/features/*/**'],
              message: 'Import from feature public API only'
            },
            {
              group: ['../../*'],
              message: 'Avoid deep relative imports; use aliases'
            }
          ]
        }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ImportExpression[source.value=/^@\\/features\\/[^/]+\\/.+/]',
          message: 'Import from feature public API only'
        }
      ]
    }
  },

  {
    files: ['**/*.{js,cjs}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },

  {
    files: ['**/*.{js,cjs}', 'test/**', 'src/core/infra/polyfills/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },

  {
    files: ['test/**', 'src/dev/**'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off'
    }
  },

  {
    files: ['test/**/*.{js,ts,jsx,tsx}', '**/*.{test,spec}.{js,ts,jsx,tsx}'],
    plugins: {
      vitest
    },
    extends: [vitest.configs.recommended]
  },

  {
    files: ['**/*.css'],
    plugins: {
      css
    },
    language: 'css/css',
    extends: ['css/recommended']
  }
]);
