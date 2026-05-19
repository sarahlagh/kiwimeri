import { lingui } from '@lingui/vite-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { defineConfig as vitestDefineConfig } from 'vitest/config';

// https://vitejs.dev/config/
const viteConfig = defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/'),
      '@@': path.resolve(__dirname, 'test/')
    }
  },
  plugins: [
    react({
      babel: {
        plugins: ['@lingui/babel-plugin-lingui-macro']
      }
    }),
    lingui()
  ]
});

const vitestConfig = vitestDefineConfig({
  test: {
    reporters: process.env.GITHUB_ACTIONS
      ? ['dot', 'github-actions']
      : ['default', 'html'],
    coverage: {
      enabled: true,
      exclude: [
        'test/**',
        'src/capacitor/**',
        'src/polyfills/**',
        'src/locales/**'
      ]
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.{ts,tsx}'],
          globals: true,
          environment: 'jsdom',
          globalSetup: ['./test/_setup/globalSetup.ts'],
          setupFiles: ['./test/_setup/unit.setupTests.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/e2e-drivers/**/*.{test,spec}.{ts,tsx}'],
          globals: true,
          environment: 'jsdom',
          globalSetup: ['./test/_setup/globalSetup.ts'],
          setupFiles: ['./test/_setup/unit.setupTests.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['test/browser/**/*.{test,spec}.{ts,tsx}'],
          globalSetup: ['./test/_setup/globalSetup.ts'],
          setupFiles: ['./test/_setup/browser.setupTests.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            // https://vitest.dev/config/browser/playwright
            instances: [{ browser: 'chromium' } /*{ browser: 'firefox' }*/]
          }
        }
      }
    ]
  }
});

export default mergeConfig(viteConfig, vitestConfig);
