import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: 'vite.config.ts',
    test: {
      include: ['**/unit/**/*.{test,spec}.ts', '**/unit/**/*.{test,spec}.tsx'],
      name: 'unit',
      environment: 'jsdom'
    }
  },
  {
    extends: 'vite.config.ts',
    test: {
      include: ['**/e2e/**/*.{test,spec}.ts'],
      name: 'e2e',
      browser: {
        enabled: true,
        headless: true,
        screenshotFailures: false,
        provider: 'playwright',
        instances: [{ browser: 'chromium' }, { browser: 'firefox' }]
      }
    }
  }
]);
