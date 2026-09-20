import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.appsbeautybook.seller',
  appName: 'BeautyBook Vendeur',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  ios: { contentInset: 'automatic', backgroundColor: '#f8f6f2' },
  plugins: { Keyboard: { resize: 'body' } },
};
export default config;
