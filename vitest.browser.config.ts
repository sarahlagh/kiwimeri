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
      '@': path.resolve(__dirname, 'src/')
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
    dir: './src/vitest',
    reporters: process.env.GITHUB_ACTIONS
      ? ['dot', 'github-actions']
      : ['default', 'html'],
    globalSetup: ['./src/vitest/setup/globalSetup.ts'],
    setupFiles: ['./src/vitest/browser/setupTests.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      // https://vitest.dev/config/browser/playwright
      instances: [{ browser: 'chromium' } /*{ browser: 'firefox' }*/]
    }
  }
});

export default mergeConfig(viteConfig, vitestConfig);
