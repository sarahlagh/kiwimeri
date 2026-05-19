import { lingui } from '@lingui/vite-plugin';
import react from '@vitejs/plugin-react';
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
    name: '',
    globals: true,
    environment: 'jsdom',
    globalSetup: ['./test/setup/globalSetup.ts'],
    setupFiles: ['./test/setup/setupTests.ts'],
    dir: './test',
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
    }
  }
});

export default mergeConfig(viteConfig, vitestConfig);
