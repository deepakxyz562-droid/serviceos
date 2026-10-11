import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_NAME = 'Fieseros';
const SCHEME = 'fieseros';

export default ({ config }: ConfigContext): any => ({
  ...config,
  name: APP_NAME,
  slug: 'fieseros-customer',
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
    bundleIdentifier: 'com.fieseros.customer',
    infoPlist: {
      NSCameraUsageDescription: 'Fieseros needs camera access so you can take photos of damaged appliances and plumbing for accurate AI quotes.',
      NSLocationWhenInUseUsageDescription: 'Fieseros uses your location to discover verified local service professionals and calculate accurate arrival estimates.',
      NSPhotoLibraryUsageDescription: 'Fieseros needs photo access to attach repair photos to your service requests.',
      NSPhotoLibraryAddUsageDescription: 'Fieseros saves booking receipts and invoices to your photo library.',
      NSUserNotificationsUsageDescription: 'Fieseros sends real-time notifications about incoming quotes, technician arrival, and booking status.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.fieseros.customer',
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#059669',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
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
        faceIDPermission: 'Allow Fieseros to access your Face ID.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Fieseros needs camera access to photograph repair issues.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Fieseros uses your location to match nearby verified contractors.',
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
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
        photosPermission: 'Fieseros needs photo access to upload problem images.',
        cameraPermission: 'Fieseros needs camera access to take problem photos.',
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
