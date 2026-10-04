import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_NAME = 'Nuvora';
const FULL_STORE_TITLE = 'Nuvora — Business Management';
const SCHEME = 'nuvora';

export default ({ config }: ConfigContext): any => ({
  ...config,
  name: APP_NAME,
  description: 'Your entire business, in one simple app. Point of sale, orders, khata, scheduling, and AI receptionist tailored for your industry.',
  slug: 'nuvora',
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
    bundleIdentifier: 'com.nuvora.app',
    infoPlist: {
      CFBundleDisplayName: 'Nuvora',
      NSMicrophoneUsageDescription: 'Nuvora uses microphone access for voice dictation and natural language AI Copilot commands.',
      NSCameraUsageDescription: 'Nuvora uses camera access to capture profile images and form attachments.',
      NSPhotoLibraryUsageDescription: 'Nuvora uses photo library access to upload form assets.',
      NSUserNotificationsUsageDescription: 'Nuvora sends instant notifications for new orders, customer payments, leads, and booking requests.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.nuvora.app',
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
