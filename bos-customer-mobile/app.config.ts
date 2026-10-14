import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_NAME = 'BOS Customer';
const FULL_STORE_TITLE = 'BOS Customer — Discover & Order from Local Stores';
const SCHEME = 'boscustomer';

export default ({ config }: ConfigContext): any => ({
  ...config,
  name: APP_NAME,
  description: 'Discover local kirana, grocery, food, salon & pharmacy stores near you. Scan QR code or order directly with live tracking.',
  slug: 'bos-customer-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: SCHEME,
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#059669',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fieseros.boscustomer',
    infoPlist: {
      CFBundleDisplayName: 'BOS Customer',
      NSCameraUsageDescription: 'BOS Customer uses camera access to scan store QR codes and standees.',
      NSLocationWhenInUseUsageDescription: 'BOS Customer uses your location to discover verified nearby kirana and grocery stores.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.fieseros.boscustomer',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#059669',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
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
      'expo-camera',
      {
        cameraPermission: 'Allow BOS Customer to access your camera to scan store QR codes.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Allow BOS Customer to use your location to find nearby stores.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
