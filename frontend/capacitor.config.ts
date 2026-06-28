import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.astra.tracker',
  appName: 'ASTRA',
  webDir: 'dist',
  server: {
    url: 'https://astra-tracker-gqcs.vercel.app',
    cleartext: true
  }
};

export default config;
