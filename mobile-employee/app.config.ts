import type { ConfigContext } from 'expo/config';

const APP_NAME = 'Fieseros Staff';
const SCHEME = 'fieserosemployee';

export default ({ config }: ConfigContext): any => ({
  ...config,
  name: APP_NAME,
  slug: 'fieseros',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: SCHEME,
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#059669',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || 'com.fieseros.app',
    infoPlist: {
      NSCameraUsageDescription: 'Fieseros Staff needs camera access to photograph job issues, capture before/after proof of work, and record customer signatures.',
      NSLocationWhenInUseUsageDescription: 'Fieseros Staff uses your location to discover assigned jobs and calculate travel route times.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Fieseros Staff tracks your live travel location while you are travelling to an assigned job so dispatchers and customers can see your ETA in real time, even when the app is in the background.',
      NSLocationAlwaysUsageDescription: 'Fieseros Staff tracks your live travel location while you are travelling to an assigned job so dispatchers and customers can see your ETA in real time, even when the app is in the background.',
      NSPhotoLibraryUsageDescription: 'Fieseros Staff needs photo access to upload work documentation and equipment receipts.',
      NSPhotoLibraryAddUsageDescription: 'Fieseros Staff saves completed job records to your photo library.',
      NSUserNotificationsUsageDescription: 'Fieseros Staff alerts you immediately when new jobs are dispatched, schedules update, or customer notes arrive.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: process.env.ANDROID_PACKAGE || 'com.fieseros.app',
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#059669',
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
        },
        ios: {
          deploymentTarget: '16.4',
        },
      },
    ],
    [
      'expo-secure-store',
      {
        faceIDPermission: 'Allow Fieseros Staff to access your Face ID.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Fieseros Staff needs camera access to take job photos and capture customer signatures.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Fieseros Staff tracks your live travel location while en route to a job so customers can see your ETA in real time, even when the app is in the background.',
        locationWhenInUsePermission: 'Fieseros Staff uses your location to calculate job routes and dispatch navigation.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-notifications',
      {
        color: '#059669',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Fieseros Staff needs photo access to upload job evidence and proof of work.',
        cameraPermission: 'Fieseros Staff needs camera access to take job photos.',
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
