import type { ConfigContext } from 'expo/config';

const APP_NAME = 'BGOS';
const FULL_TITLE = 'BGOS — Business Growth Operating System';
const SCHEME = 'bgos';

export default ({ config, projectRoot }: ConfigContext): any => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('node:fs') as { existsSync: (targetPath: string) => boolean };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('node:path') as { resolve: (...segments: string[]) => string };
  const hasIosGoogleServicesPlist = fs.existsSync(
    path.resolve(projectRoot || '.', 'GoogleService-Info.plist'),
  );

  return {
  ...config,
  name: APP_NAME,
  description: FULL_TITLE,
  slug: 'bgos',
  owner: 'deepakchandra076',
  version: '1.0.0',
  icon: './assets/app-icon.png',
  splash: { image: './assets/icon-squircle.png', resizeMode: 'contain', backgroundColor: '#F5FBF8' },
  orientation: 'portrait',
  scheme: SCHEME,
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fieseros.bgos',
    usesAppleSignIn: true,
    ...(hasIosGoogleServicesPlist ? { googleServicesFile: './GoogleService-Info.plist' } : {}),
    infoPlist: {
      CFBundleDisplayName: 'BGOS',
      NSNotificationsUsageDescription: 'BGOS sends instant push notifications when new leads, messages, or appointment requests arrive.',
    },
  },
  android: {
    package: 'com.fieseros.bgos',
    googleServicesFile: './google-services.json',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#0B9042' },
    compileSdkVersion: 36,
    targetSdkVersion: 36,
    permissions: ['POST_NOTIFICATIONS'],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_CALL_LOG',
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-notifications',
    'expo-web-browser',
    'expo-apple-authentication',
    'expo-asset',
    'expo-status-bar',
    './plugins/withAndroidReleaseOptimizations',
    ...(hasIosGoogleServicesPlist
      ? ['@react-native-firebase/app', '@react-native-firebase/auth']
      : ['./plugins/withAndroidFirebase']),
  ],
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '6671fda2-0cc6-41c5-be96-e3bef1b459f4',
    },
  },
  };
};
