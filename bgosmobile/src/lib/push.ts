import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Linking, Platform } from 'react-native';
import { apiRequest } from './api';
import * as SecureStore from 'expo-secure-store';
import { getNotificationsModule, isExpoGoRuntime } from './notifications-runtime';

const PUSH_TOKEN_KEY = 'bgos_push_token';
const PUSH_ENABLED_KEY = 'bgos_push_enabled';

export async function isPushPermissionGranted(): Promise<boolean> {
  if (isExpoGoRuntime) return false;
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    return Boolean(
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

export async function getPushPermissionDetails(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  if (isExpoGoRuntime) return { granted: false, canAskAgain: true };
  const Notifications = getNotificationsModule();
  if (!Notifications) return { granted: false, canAskAgain: true };
  try {
    const settings = await Notifications.getPermissionsAsync();
    const granted = Boolean(
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
    const canAskAgain = settings.canAskAgain !== false;
    return { granted, canAskAgain };
  } catch {
    return { granted: false, canAskAgain: true };
  }
}

export async function requestPushPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  if (isExpoGoRuntime) return { granted: false, canAskAgain: true };
  const Notifications = getNotificationsModule();
  if (!Notifications) return { granted: false, canAskAgain: true };
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Customer & Lead Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const settings = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
      android: {},
    });

    const granted = Boolean(
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
    const canAskAgain = settings.canAskAgain !== false;

    return { granted, canAskAgain };
  } catch (err) {
    console.warn('[push] requestPushPermissions error:', err);
    return { granted: false, canAskAgain: true };
  }
}

export async function enablePush(): Promise<{
  success: boolean;
  message: string;
  token?: string;
  error?: string;
}> {
  try {
    const perm = await requestPushPermissions();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        return {
          success: false,
          message: 'Notification permission was denied. Please allow notifications in device settings.',
          error: 'PERMISSION_DENIED_PERMANENTLY',
        };
      }
      return {
        success: false,
        message: 'Notification permission was not granted. Please allow notifications to receive alerts.',
        error: 'PERMISSION_DENIED',
      };
    }

    if (!Device.isDevice) {
      return {
        success: false,
        message: 'Push notifications require a physical device.',
        error: 'SIMULATOR_NOT_SUPPORTED',
      };
    }

    const Notifications = getNotificationsModule();
    if (!Notifications) {
      return {
        success: false,
        message: 'Push notifications module is not available in this environment.',
        error: 'NOTIFICATIONS_MODULE_UNAVAILABLE',
      };
    }

    const projectId =
      Constants.easConfig?.projectId ||
      Constants.expoConfig?.extra?.eas?.projectId ||
      '6671fda2-0cc6-41c5-be96-e3bef1b459f4';

    let token: string | null = null;
    try {
      const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
      token = tokenRes.data || null;
    } catch (fcmError) {
      const msg = fcmError instanceof Error ? fcmError.message : String(fcmError);
      console.warn('[push] Native FCM / Expo push token error:', fcmError);
      return {
        success: false,
        message: `Could not obtain push token from device (${msg.slice(0, 110)}). Check Google Play Services and network connection.`,
        error: msg,
      };
    }

    if (!token || !token.startsWith('ExponentPushToken[')) {
      return {
        success: false,
        message: 'Received invalid push token format from device.',
        error: 'INVALID_TOKEN_FORMAT',
      };
    }

    // Register token with backend
    const res = await apiRequest<{ ok?: boolean; id?: string }>('/api/notifications/push/subscribe', {
      method: 'POST',
      body: { expoPushToken: token, platform: Platform.OS },
    }).catch((err) => {
      console.warn('[push] Failed to register token with backend:', err);
      throw err;
    });

    if (!res?.ok && !res?.id) {
      return {
        success: false,
        message: 'Failed to save push registration with server. Please try again.',
        error: 'BACKEND_REGISTRATION_FAILED',
      };
    }

    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'true');
    console.log('[push] Push notifications successfully enabled with token:', token.slice(0, 30));

    return {
      success: true,
      token,
      message: 'Push notifications enabled successfully.',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[push] enablePush error:', err);
    return {
      success: false,
      message: `Failed to enable push notifications: ${msg.slice(0, 110)}`,
      error: msg,
    };
  }
}

/**
 * Automatically syncs the push token with the backend on login/app startup
 * if the user has already granted notification permissions.
 * Retries with backoff if network or server is temporarily unavailable.
 */
export async function autoSyncPushToken(retries = 2): Promise<boolean> {
  if (isExpoGoRuntime) return false;
  const Notifications = getNotificationsModule();
  if (!Notifications || !Device.isDevice) return false;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const granted = await isPushPermissionGranted();
      if (!granted) return false;

      const projectId =
        Constants.easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId ||
        '6671fda2-0cc6-41c5-be96-e3bef1b459f4';

      const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenRes?.data;
      if (!token || !token.startsWith('ExponentPushToken[')) {
        throw new Error('Invalid token returned');
      }

      const res = await apiRequest<{ ok?: boolean; id?: string }>('/api/notifications/push/subscribe', {
        method: 'POST',
        body: { expoPushToken: token, platform: Platform.OS },
      });

      if (res?.ok || res?.id) {
        await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token).catch(() => {});
        await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'true').catch(() => {});
        console.log('[push] autoSyncPushToken successfully synced token:', token.slice(0, 30));
        return true;
      }
    } catch (err) {
      console.log(`[push] autoSyncPushToken attempt ${attempt + 1}/${retries + 1} notice:`, err);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1500));
      }
    }
  }
  return false;
}

export async function unregisterPush(accessToken?: string | null): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (token) {
      await apiRequest('/api/notifications/push/subscribe', {
        method: 'DELETE',
        body: { expoPushToken: token },
        ...(accessToken ? { skipAuth: true, headers: { Authorization: `Bearer ${accessToken}` } } : {}),
      }).catch((err) => {
        console.warn('[push] unregisterPush DELETE notice:', err);
      });
      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => {});
    }
    await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'false').catch(() => {});
    console.log('[push] unregisterPush completed successfully');
  } catch (err) {
    console.warn('[push] unregisterPush error:', err);
  }
}

export function openNotificationSettings(): void {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    void Linking.openSettings().catch(() => {});
  }
}
