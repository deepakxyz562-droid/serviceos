import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_NAME = 'BGOS';
const FULL_TITLE = 'BGOS — Business Growth Operating System';
const SCHEME = 'bgos';

export default ({ config }: ConfigContext): any => ({
  ...config,
  name: APP_NAME,
  description: FULL_TITLE,
  slug: 'bgos',
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
    permissions: ['POST_NOTIFICATIONS'],
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-notifications', 'expo-web-browser', 'expo-apple-authentication'],
  extra: { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } },
});
