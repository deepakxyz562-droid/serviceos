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
      // Required for background GPS tracking while the employee is en route
      // to a job (continues when the phone is locked / app is backgrounded).
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Fieseros tracks your live location while you are travelling to a job so dispatchers and customers can see your ETA in real time, even when the app is in the background.',
      NSLocationAlwaysUsageDescription: 'Fieseros tracks your live location while you are travelling to a job so dispatchers and customers can see your ETA in real time, even when the app is in the background.',
      NSPhotoLibraryUsageDescription: 'Fieseros needs photo access to upload job evidence and proof of work.',
      NSPhotoLibraryAddUsageDescription: 'Fieseros saves job photos to your library for record-keeping.',
      NSUserNotificationsUsageDescription: 'Fieseros sends notifications about your jobs, bookings, and shift updates.',
      // Allows the OS to keep the location background task running. Without
      // this entry the app will crash on `startLocationUpdatesAsync`.
      UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
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
      // Required for background location updates while en route. Android 10+
      // requires a separate runtime permission prompt for this; the
      // useLiveTracking hook requests it via
      // Location.requestBackgroundPermissionsAsync().
      'ACCESS_BACKGROUND_LOCATION',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'POST_NOTIFICATIONS',
      // Foreground service permission — needed for the persistent notification
      // that Android shows while a background location task is running.
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
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
        locationAlwaysAndWhenInUsePermission: 'Fieseros needs background location to track your live travel to a job so dispatchers and customers can see your ETA in real time, even when the app is in the background.',
        locationWhenInUsePermission: 'Fieseros uses your location to detect your city and track travel for jobs.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
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
    // EAS project ID — required by expo-notifications getExpoPushTokenAsync
    // (SDK 50+). Get this from https://expo.dev → your project → Project ID,
    // or run `eas init` in the mobile-app directory. Set as EAS_PROJECT_ID
    // in your .env file.
    eas: {
      projectId: process.env.EAS_PROJECT_ID || '803b8a8b-6b1c-4d1f-8d3c-ab843119c35c',
    },
    router: {
      origin: false,
    },
  },
});
