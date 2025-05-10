import { lingui } from '@lingui/vite-plugin';
import legacy from '@vitejs/plugin-legacy';
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
    lingui(),
    legacy()
  ]
});

const vitestConfig = vitestDefineConfig({
  test: {
    name: '',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/vitest/setup/setupTests.ts'],
    dir: './src/vitest',
    reporters: process.env.GITHUB_ACTIONS
      ? ['dot', 'github-actions']
      : ['default', 'html']
  }
});

export default mergeConfig(viteConfig, vitestConfig);
