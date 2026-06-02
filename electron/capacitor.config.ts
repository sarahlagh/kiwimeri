import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.kiwimeri',
  appName: 'Kiwimeri',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: false
    },
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    includePlugins: [
      '@capacitor/app',
      '@capacitor/filesystem',
      '@capacitor/haptics',
      '@capacitor/network',
      '@capacitor/status-bar'
    ]
  }
};

export default config;
