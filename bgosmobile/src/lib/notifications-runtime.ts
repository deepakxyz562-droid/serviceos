import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type * as ExpoNotifications from 'expo-notifications';

export type NotificationsModule = typeof ExpoNotifications;

function resolveExecutionEnvironment(): unknown {
  try {
    return (Constants as unknown as Record<string, unknown>)?.executionEnvironment;
  } catch {
    return undefined;
  }
}

export const isExpoGoRuntime: boolean = (() => {
  try {
    return (
      Constants?.appOwnership === 'expo' ||
      resolveExecutionEnvironment() === 'storeClient'
    );
  } catch {
    return false;
  }
})();

let cachedModule: NotificationsModule | null | undefined;

/**
 * Lazily loads `expo-notifications` only in native/dev builds (never inside Expo Go or web).
 * Importing `expo-notifications` eagerly at module evaluation triggers SDK 53+ Expo Go
 * warning side effects even when push registration is disabled.
 */
export function getNotificationsModule(): NotificationsModule | null {
  if (isExpoGoRuntime || Platform.OS === 'web') {
    return null;
  }
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-notifications') as NotificationsModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}
