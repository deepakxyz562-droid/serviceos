import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_NAME = 'Fieseros';
const SCHEME = 'fieseros';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'fieseros-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: SCHEME,
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#10B981',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fieseros.app',
    infoPlist: {
      NSCameraUsageDescription: 'Fieseros needs camera access to take job photos and capture customer signatures.',
      NSLocationWhenInUseUsageDescription: 'Fieseros uses your location to detect your city for the marketplace and to track travel for assigned jobs.',
      NSPhotoLibraryUsageDescription: 'Fieseros needs photo access to upload job evidence and proof of work.',
      NSPhotoLibraryAddUsageDescription: 'Fieseros saves job photos to your library for record-keeping.',
      NSUserNotificationsUsageDescription: 'Fieseros sends notifications about your jobs, bookings, and shift updates.',
    },
  },
  android: {
    package: 'com.fieseros.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#10B981',
    },
    permissions: [
      'CAMERA',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'POST_NOTIFICATIONS',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-secure-store',
      {
        faceIDPermission: 'Allow Fieseros to access your Face ID.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Fieseros needs camera access to take job photos and capture customer signatures.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Fieseros uses your location to detect your city and track travel for jobs.',
        locationWhenInUsePermission: 'Fieseros uses your location to detect your city and track travel for jobs.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#10B981',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Fieseros needs photo access to upload job evidence and proof of work.',
        cameraPermission: 'Fieseros needs camera access to take job photos.',
      },
    ],
    '@react-native-community/datetimepicker',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://fieseros.com',
    router: {
      origin: false,
    },
  },
});
