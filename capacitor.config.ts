import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'edu.cuchd.cubustransit',
  appName: 'CU BUS Transit',
  webDir: 'dist',
  server: {
    // Serves bundled dist/ assets from https://localhost inside Android WebView
    // (secure context required for opt-in Geolocation API and Maps JS referrer rules)
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
