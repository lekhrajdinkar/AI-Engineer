import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.daymark',
  appName: 'Daymark',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#f5f1e8',
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
