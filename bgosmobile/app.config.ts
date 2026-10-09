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
  orientation: 'portrait',
  scheme: SCHEME,
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fieseros.bgos',
    infoPlist: {
      CFBundleDisplayName: 'BGOS',
      NSNotificationsUsageDescription: 'BGOS sends instant push notifications when new leads, messages, or appointment requests arrive.',
    },
  },
  android: {
    package: 'com.fieseros.bgos',
    permissions: ['POST_NOTIFICATIONS'],
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-notifications'],
  extra: { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } },
});
