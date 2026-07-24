import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lekhrajdinkar.youtubelearning',
  appName: 'YouTube Learning',
  webDir: 'src/y2026/youtube_agent_2/frontend/dist',
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#f5f2ec',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
