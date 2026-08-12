/**
 * Fieseros Mobile App — Notifications Service
 * Registers for push notifications and subscribes the token to the
 * PWA backend (/api/notifications/push/subscribe).
 *
 * On web, push uses the Web Push API (VAPID); on native it uses Expo's
 * push token. Both converge on /api/notifications/push/subscribe.
 *
 * FIX: The backend now accepts Expo push tokens natively (no VAPID required
 * for native). The `projectId` for getExpoPushTokenAsync is read from
 * Constants.expoConfig.extra.eas.projectId (set by `eas build` or the
 * EAS_PROJECT_ID env var in app.config.ts). If no EAS projectId is
 * configured, registration is skipped with a warning (push disabled).
 */

import { Platform } from 'react-native';
import { api } from './api';

let pushToken: string | null = null;

// Lazy-load expo-notifications only on native platforms to avoid web crash.
let Notifications: typeof import('expo-notifications') | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
}

/**
 * Configure how notifications are displayed when the app is in the foreground.
 * Must be called once at app startup (done in registerForPushNotifications).
 * Without this, notifications received while the app is open are silently
 * dropped (no banner/alert shown).
 */
let notificationHandlerConfigured = false;
function ensureNotificationHandler() {
  if (notificationHandlerConfigured || !Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
    handleSuccess: () => {
      // Notification was delivered — no action needed.
    },
    handleError: (notificationId: string, error: unknown) => {
      console.warn('[notifications] handler error:', notificationId, error);
    },
  });
  notificationHandlerConfigured = true;
}

/**
 * Resolve the EAS project ID for getExpoPushTokenAsync.
 *
 * In Expo SDK 50+, getExpoPushTokenAsync requires a `projectId` (a UUID
 * from your EAS project). We try (in order):
 *   1. Constants.expoConfig.extra.eas.projectId (set by `eas build`)
 *   2. Constants.expoConfig.extra.eas.projectId via app.config.ts extra
 * If none is found, return null (caller skips registration with a warning).
 */
function getEasProjectId(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants');
    const cfg = Constants.expoConfig as
      | {
          extra?: {
            eas?: { projectId?: string };
            API_BASE_URL?: string;
          };
        }
      | undefined;
    const projectId = cfg?.extra?.eas?.projectId;
    if (typeof projectId === 'string' && projectId.length > 0) {
      return projectId;
    }
  } catch {
    // Constants not available — fall through
  }
  return null;
}

/**
 * Register for push notifications and subscribe the token to the backend.
 * Safe to call multiple times — returns the cached token on subsequent calls.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (pushToken) return pushToken;

  // Web: use Web Push API (VAPID)
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return null;

      const reg = await navigator.serviceWorker.ready;
      const vapidRes = await api.get<{ publicKey?: string }>(
        '/api/notifications/push/vapid-public-key'
      );
      if (!vapidRes.publicKey) return null;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidRes.publicKey) as unknown as BufferSource,
      });

      const subscriptionJson = sub.toJSON();
      await api.post('/api/notifications/push/subscribe', subscriptionJson);
      pushToken = sub.endpoint;
      return pushToken;
    } catch (err) {
      console.warn('[notifications] web push registration failed:', err);
      return null;
    }
  }

  // Native: use Expo push notifications
  if (!Notifications) return null;

  // Set up the foreground notification handler so push notifications are
  // actually visible when the app is open (not silently dropped).
  ensureNotificationHandler();

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    // FIX: getExpoPushTokenAsync requires a valid EAS projectId (UUID).
    // Using the app slug ('fieseros-app') does NOT work — Expo's push
    // service rejects it with 'Project ID not found'. We read the projectId
    // from Constants.expoConfig.extra.eas.projectId instead.
    //
    // CRITICAL FIX: Previously this returned `null` when no EAS projectId
    // was configured, and the Profile screen's handleTogglePush() mistook
    // that null for a permission denial — showing the misleading message
    // "Permission denied — enable notifications in Settings." even though
    // the user HAD granted permission. Now we throw a clear, actionable
    // error so the UI can show the real reason push can't be enabled.
    const projectId = getEasProjectId();
    if (!projectId) {
      throw new Error(
        'Push notifications require an EAS project ID. Set EAS_PROJECT_ID in the app .env file (get it from https://expo.dev → your project → Project ID, or run `eas init` in the mobile-app directory).'
      );
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;
    pushToken = token;

    // Subscribe the token to the backend. The backend now accepts Expo
    // push tokens directly (no VAPID required for native).
    await api.post('/api/notifications/push/subscribe', {
      platform: Platform.OS,
      token,
      expoPushToken: token,
    });

    return token;
  } catch (err) {
    console.warn('[notifications] native push registration failed:', err);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData =
    typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
