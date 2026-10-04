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
  scheme: SCHEME,
  userInterfaceStyle: 'automatic',
  splash: {
    resizeMode: 'contain',
    backgroundColor: '#0F172A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.gptform.app',
    infoPlist: {
      NSMicrophoneUsageDescription: 'GPTForm uses microphone access for voice dictation and natural language AI Copilot commands.',
      NSCameraUsageDescription: 'GPTForm uses camera access to capture profile images and form attachments.',
      NSPhotoLibraryUsageDescription: 'GPTForm uses photo library access to upload form assets.',
      NSUserNotificationsUsageDescription: 'GPTForm sends instant notifications for new leads, urgent chat takeovers, and booking requests.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.gptform.app',
    adaptiveIcon: {
      backgroundColor: '#0F172A',
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
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
  },
});
