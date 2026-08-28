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
 * from your EAS project). Multi-layered fallback:
 *   1. process.env.EXPO_PUBLIC_EAS_PROJECT_ID (inlined by bundler at build time)
 *   2. process.env.EAS_PROJECT_ID (runtime env var)
 *   3. Constants.expoConfig.extra.eas.projectId (set by `eas build`)
 *   4. Constants.easConfig?.projectId / manifest2 / manifest fallbacks
 *   5. Hardcoded fallback (Fieseros project ID)
 */
function getEasProjectId(): string | null {
  // 1. Check EXPO_PUBLIC_EAS_PROJECT_ID environment variable (inlined by bundler)
  if (process.env.EXPO_PUBLIC_EAS_PROJECT_ID) {
    return process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  }
  if (process.env.EAS_PROJECT_ID) {
    return process.env.EAS_PROJECT_ID;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants');
    const defaultConstants = Constants.default || Constants;

    const projectId =
      defaultConstants.expoConfig?.extra?.eas?.projectId ||
      defaultConstants.easConfig?.projectId ||
      defaultConstants.manifest2?.extra?.eas?.projectId ||
      defaultConstants.manifest?.extra?.eas?.projectId;

    if (typeof projectId === 'string' && projectId.length > 0) {
      return projectId;
    }
  } catch {
    // Constants not available — fall through
  }

  // 5. Default fallback project ID for Fieseros
  return '49dae8a6-ccf0-4a29-b5ec-6617ccfa298c';
}

/**
 * Register for push notifications and subscribe the token to the backend.
 * Safe to call multiple times — returns the cached token on subsequent calls.
 *
 * Returns a structured result so callers can show the ACTUAL error (not just
 * "Permission denied" for everything that fails).
 */
export interface PushRegistrationResult {
  success: boolean;
  token?: string;
  error?: string;
  reason?: 'permission_denied' | 'no_project_id' | 'backend_error' | 'network_error' | 'unknown';
}

export async function registerForPushNotifications(): Promise<string | null> {
  const result = await registerForPushNotificationsDetailed();
  return result.success ? result.token ?? null : null;
}

export async function registerForPushNotificationsDetailed(): Promise<PushRegistrationResult> {
  if (pushToken) return { success: true, token: pushToken };

  // Web: use Web Push API (VAPID)
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return { success: false, reason: 'unknown', error: 'Service Worker not available' };
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        return { success: false, reason: 'permission_denied', error: 'Notification permission denied' };
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidRes = await api.get<{ publicKey?: string }>(
        '/api/notifications/push/vapid-public-key'
      );
      if (!vapidRes.publicKey) {
        return { success: false, reason: 'backend_error', error: 'VAPID public key not configured on server' };
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidRes.publicKey) as unknown as BufferSource,
      });

      const subscriptionJson = sub.toJSON();
      await api.post('/api/notifications/push/subscribe', subscriptionJson);
      pushToken = sub.endpoint;
      return { success: true, token: pushToken };
    } catch (err) {
      console.warn('[notifications] web push registration failed:', err);
      return { success: false, reason: 'network_error', error: err instanceof Error ? err.message : 'Web push registration failed' };
    }
  }

  // Native: use Expo push notifications
  if (!Notifications) {
    return { success: false, reason: 'unknown', error: 'Notifications module not available' };
  }

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
    if (finalStatus !== 'granted') {
      return { success: false, reason: 'permission_denied', error: 'Notification permission denied by user' };
    }

    // Get the EAS project ID
    const projectId = getEasProjectId();
    if (!projectId) {
      return {
        success: false,
        reason: 'no_project_id',
        error: 'Push notifications require an EAS project ID. Set EAS_PROJECT_ID in the app .env file.',
      };
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;
    pushToken = token;

    // Subscribe the token to the backend
    try {
      await api.post('/api/notifications/push/subscribe', {
        platform: Platform.OS,
        token,
        expoPushToken: token,
      });
    } catch (backendErr) {
      // Token was obtained but backend subscription failed
      // Still return the token — the user can retry subscription later
      console.warn('[notifications] backend subscription failed:', backendErr);
      return {
        success: false,
        reason: 'backend_error',
        error: backendErr instanceof Error ? backendErr.message : 'Failed to subscribe to push notifications on server',
        token,
      };
    }

    return { success: true, token };
  } catch (err) {
    console.warn('[notifications] native push registration failed:', err);
    return {
      success: false,
      reason: 'unknown',
      error: err instanceof Error ? err.message : 'Push notification registration failed',
    };
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
