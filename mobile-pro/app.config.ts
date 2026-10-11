import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_NAME = 'Fieseros Pro';
const SCHEME = 'fieserospro';

export default ({ config }: ConfigContext): any => ({
  ...config,
  name: APP_NAME,
  slug: 'fieseros-pro',
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
    bundleIdentifier: 'com.fieseros.pro',
    infoPlist: {
      NSCameraUsageDescription: 'Fieseros Pro needs camera access to photograph job issues, capture before/after proof of work, and record customer signatures.',
      NSLocationWhenInUseUsageDescription: 'Fieseros Pro uses your location to discover nearby service leads and calculate travel route times.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Fieseros Pro tracks your live travel location while you are travelling to an assigned job so dispatchers and customers can see your ETA in real time, even when the app is in the background.',
      NSLocationAlwaysUsageDescription: 'Fieseros Pro tracks your live travel location while you are travelling to an assigned job so dispatchers and customers can see your ETA in real time, even when the app is in the background.',
      NSPhotoLibraryUsageDescription: 'Fieseros Pro needs photo access to upload work documentation and equipment receipts.',
      NSPhotoLibraryAddUsageDescription: 'Fieseros Pro saves completed job records to your photo library.',
      NSUserNotificationsUsageDescription: 'Fieseros Pro alerts you immediately when new customer leads and instant bookings arrive in your service area.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.fieseros.pro',
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
        faceIDPermission: 'Allow Fieseros Pro to access your Face ID.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Fieseros Pro needs camera access to take job photos and capture customer signatures.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Fieseros Pro tracks your live travel location while en route to a job so customers can see your ETA in real time, even when the app is in the background.',
        locationWhenInUsePermission: 'Fieseros Pro uses your location to discover nearby leads and calculate job routes.',
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
        photosPermission: 'Fieseros Pro needs photo access to upload job evidence and proof of work.',
        cameraPermission: 'Fieseros Pro needs camera access to take job photos.',
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
