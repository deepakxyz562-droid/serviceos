/**
 * Fieseros Mobile App — Notifications Service
 * Registers for push notifications and subscribes the token to the
 * PWA backend (/api/notifications/push/subscribe).
 *
 * On web, push uses the Web Push API (VAPID); on native it uses Expo's
 * push token. Both converge on /api/notifications/push/subscribe.
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
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'fieseros-app',
    });
    const token = tokenData.data;
    pushToken = token;

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
