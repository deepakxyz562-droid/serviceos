/**
 * Fieseros Mobile App — Notifications Service
 * Registers for push notifications and subscribes the token to the
 * PWA backend (/api/notifications/push/subscribe).
 *
 * On web, push uses the Web Push API (VAPID); on native it uses Expo's
 * push token. Both converge on /api/notifications/push/subscribe.
 *
 * SECURITY FIX: Push token cache is now user-aware. When a user logs out,
 * the cache is cleared so the next user gets a fresh registration.
 *
 * NOTIFICATION CHANNELS: Android notification channels are created on
 * first registration so the backend can route notifications to specific
 * channels (jobs, messages, dispatch, default).
 */

import { Platform } from 'react-native';
import { api } from './api';

// ── User-aware push token cache ──────────────────────────────────────────────
// Previously this was a simple `let pushToken: string | null = null;` which
// caused a cross-user bug: User A logs out, User B logs in, but the cached
// token (registered for User A on the backend) is returned — User B never
// gets subscribed. Now the cache tracks which user the token belongs to.
interface PushRegistration {
  userId: string;
  token: string;
}
let pushRegistration: PushRegistration | null = null;

/**
 * Clear the push token cache. Called on logout to ensure the next user
 * gets a fresh registration cycle (token + backend subscription).
 */
export function clearPushToken(): void {
  pushRegistration = null;
}

// Lazy-load expo-notifications only on native platforms to avoid web crash.
let Notifications: typeof import('expo-notifications') | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
}

// ── Android notification channels ───────────────────────────────────────────
// Android 8+ requires explicit notification channels. Without them, all
// notifications fall into the default "Miscellaneous" channel with no
// per-category control. These channels let the backend route notifications
// to specific categories (jobs, messages, dispatch) and let users
// customize notification behavior per category in Android Settings.

export const NOTIFICATION_CHANNELS = {
  DEFAULT: 'fieseros_default',
  JOBS: 'fieseros_jobs',
  MESSAGES: 'fieseros_messages',
  DISPATCH: 'fieseros_dispatch',
} as const;

let channelsConfigured = false;

/**
 * Create Android notification channels. Called once on first registration.
 * Safe to call multiple times — Android ignores channels that already exist.
 */
async function ensureNotificationChannels(): Promise<void> {
  if (channelsConfigured || !Notifications || Platform.OS !== 'android') return;

  try {
    // Default channel — general notifications, normal importance
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DEFAULT, {
      name: 'Fieseros Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });

    // Jobs channel — job assignments, status changes, completions
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.JOBS, {
      name: 'Job Updates',
      description: 'Job assignments, status changes, and completions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });

    // Messages channel — customer/employee messages
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.MESSAGES, {
      name: 'Messages',
      description: 'Chat messages from customers and team members',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0EA5E9',
    });

    // Dispatch channel — dispatch alerts, emergency assignments
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DISPATCH, {
      name: 'Dispatch Alerts',
      description: 'Dispatch alerts and emergency job assignments',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#EF4444',
    });

    channelsConfigured = true;
  } catch (err) {
    console.warn('[notifications] Failed to create notification channels:', err);
  }
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
 */
function getEasProjectId(): string | null {
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

  return '49dae8a6-ccf0-4a29-b5ec-6617ccfa298c';
}

/**
 * Register for push notifications and subscribe the token to the backend.
 *
 * SECURITY: The cache is user-aware. If the current user doesn't match
 * the cached registration, a new registration cycle runs (get token +
 * subscribe to backend). This prevents the cross-user token bug where
 * User B would inherit User A's push subscription.
 *
 * @param userId - The current authenticated user's ID (for cache validation)
 */
export interface PushRegistrationResult {
  success: boolean;
  token?: string;
  error?: string;
  reason?: 'permission_denied' | 'no_project_id' | 'backend_error' | 'network_error' | 'unknown';
}

export async function registerForPushNotifications(userId?: string): Promise<string | null> {
  const result = await registerForPushNotificationsDetailed(userId);
  return result.success ? result.token ?? null : null;
}

export async function registerForPushNotificationsDetailed(userId?: string): Promise<PushRegistrationResult> {
  // Check cache — but only return if the userId matches.
  // This prevents the cross-user token bug where User B inherits User A's subscription.
  if (pushRegistration && userId && pushRegistration.userId === userId) {
    return { success: true, token: pushRegistration.token };
  }

  // If no userId provided (shouldn't happen in production), use a fallback
  // to maintain backward compat — but clear any existing cache first.
  if (!userId && pushRegistration) {
    pushRegistration = null;
  }
  const effectiveUserId = userId || 'unknown';

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
      pushRegistration = { userId: effectiveUserId, token: sub.endpoint };
      return { success: true, token: sub.endpoint };
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

  // Create Android notification channels (idempotent — safe to call multiple times)
  await ensureNotificationChannels();

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

    // Cache the registration with the user ID so we can detect user switches
    pushRegistration = { userId: effectiveUserId, token };

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
