import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_NAME = 'Chatbotly';
const FULL_TITLE = 'Chatbotly — AI Forms, Chatbots & Live Inbox';
const SCHEME = 'chatbotly';

export default ({ config }: ConfigContext): any => ({
  ...config,
  name: APP_NAME,
  description: FULL_TITLE,
  slug: 'chatbotly',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: SCHEME,
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fieseros.chatbotly',
    infoPlist: {
      CFBundleDisplayName: 'Chatbotly',
      NSNotificationsUsageDescription: 'Chatbotly sends instant push notifications when website visitors chat or submit new forms.',
    },
  },
  android: {
    package: 'com.fieseros.chatbotly',
    permissions: ['POST_NOTIFICATIONS'],
  },
  plugins: ['expo-router', 'expo-secure-store'],
});
