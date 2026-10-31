import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_NAME = 'BGOS';
const FULL_TITLE = 'BGOS — Business Growth Operating System';
const SCHEME = 'bgos';

export default ({ config }: ConfigContext): any => ({
  ...config,
  name: APP_NAME,
  description: FULL_TITLE,
  slug: 'bgos',
  owner: 'rishi076s-team',
  version: '1.0.0',
  icon: './assets/app-icon.png',
  splash: { image: './assets/brand-mark.png', resizeMode: 'contain', backgroundColor: '#F4FAF9' },
  orientation: 'portrait',
  scheme: SCHEME,
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fieseros.bgos',
    usesAppleSignIn: true,
    infoPlist: {
      CFBundleDisplayName: 'BGOS',
      NSNotificationsUsageDescription: 'BGOS sends instant push notifications when new leads, messages, or appointment requests arrive.',
    },
  },
  android: {
    package: 'com.fieseros.bgos',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#009F50' },
    compileSdkVersion: 36,
    targetSdkVersion: 36,
    permissions: ['POST_NOTIFICATIONS'],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-notifications',
    'expo-web-browser',
    'expo-apple-authentication',
    './plugins/withAndroidReleaseOptimizations',
  ],
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '30078807-9b75-42c3-97c3-41fb166c40f2',
    },
  },
});
