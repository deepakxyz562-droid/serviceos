import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_NAME = 'GPTForm';
const SCHEME = 'gptform';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'gptform',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: SCHEME,
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
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
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '15.1',
        },
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
