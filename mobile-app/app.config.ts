import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_NAME = 'Fieseros';
const SCHEME = 'fieseros';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'fieseros',
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
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Fieseros tracks your live location while you are travelling to a job so dispatchers and customers can see your ETA in real time, even when the app is in the background.',
      NSLocationAlwaysUsageDescription: 'Fieseros tracks your live location while you are travelling to a job so dispatchers and customers can see your ETA in real time, even when the app is in the background.',
      NSPhotoLibraryUsageDescription: 'Fieseros needs photo access to upload job evidence and proof of work.',
      NSPhotoLibraryAddUsageDescription: 'Fieseros saves job photos to your library for record-keeping.',
      NSUserNotificationsUsageDescription: 'Fieseros sends notifications about your jobs, bookings, and shift updates.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.fieseros.app',
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#10B981',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
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
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
          // Let Expo SDK 54 handle compileSdkVersion + targetSdkVersion
          // (defaults to API 36, which is required by Google Play as of Aug 31, 2026)
        },
        ios: {
          deploymentTarget: '15.1',
        },
      },
    ],
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
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://fieseros.com',
    eas: {
      projectId: '49dae8a6-ccf0-4a29-b5ec-6617ccfa298c',
    },
    router: {
      origin: false,
    },
  },
});
