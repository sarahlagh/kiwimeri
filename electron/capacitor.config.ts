import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.kiwimeri',
  appName: 'Kiwimeri',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: false
    }
  }
};

export default config;
