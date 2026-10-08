import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_NAME = 'BOS';
const FULL_STORE_TITLE = 'BOS — Business Operating System';
const SCHEME = 'bos';

export default ({ config }: ConfigContext): any => ({
  ...config,
  name: APP_NAME,
  description: 'BOS — Business Operating System. One system to run the entire business: Point of Sale, inventory, orders, khata, and GST invoicing.',
  slug: 'bos',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: SCHEME,
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#080C14',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fieseros.bos',
    infoPlist: {
      CFBundleDisplayName: 'BOS',
      NSMicrophoneUsageDescription: 'BOS uses microphone access for voice dictation and natural language Copilot commands.',
      NSCameraUsageDescription: 'BOS uses camera access to capture product images and barcode scanning.',
      NSPhotoLibraryUsageDescription: 'BOS uses photo library access to upload catalog and store assets.',
      NSUserNotificationsUsageDescription: 'BOS sends instant notifications for new orders, customer payments, low stock, and billing updates.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.fieseros.bos',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#080C14',
    },
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.POST_NOTIFICATIONS',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
  },
});
