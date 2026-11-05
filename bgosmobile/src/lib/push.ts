import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiRequest } from './api';
import * as SecureStore from 'expo-secure-store';

const PUSH_TOKEN_KEY = 'bgos_push_token';
const PUSH_ENABLED_KEY = 'bgos_push_enabled';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as Record<string, unknown>)?.executionEnvironment === 'storeClient';

export async function isPushPermissionGranted(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch {
    return false;
  }
}

export async function requestPushPermissions(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Customer & Lead Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return status === 'granted';
  } catch (err) {
    console.warn('[push] requestPushPermissions error:', err);
    return false;
  }
}

export async function enablePush(): Promise<{ success: boolean; message: string }> {
  try {
    const granted = await requestPushPermissions();
    if (!granted) {
      return {
        success: false,
        message: 'Notification permission was denied. Please allow notifications in device settings.',
      };
    }

    // Try to register native device push token (FCM on Android / APNs on iOS)
    let token: string | null = null;
    const projectId =
      Constants.easConfig?.projectId ||
      Constants.expoConfig?.extra?.eas?.projectId ||
      '30078807-9b75-42c3-97c3-41fb166c40f2';

    if (Device.isDevice && projectId && !isExpoGo) {
      try {
        const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
        token = tokenRes.data || null;
      } catch (fcmError) {
        // Firebase not configured in native build (or google-services.json missing).
        // Fall back seamlessly to in-app & local notifications without surfacing raw developer errors.
        console.log('[push] Native FCM not initialized; operating in In-App & Local notification mode:', fcmError);
      }
    }

    if (token) {
      await apiRequest('/api/notifications/push/subscribe', {
        method: 'POST',
        body: { expoPushToken: token, platform: Platform.OS },
      }).catch((err) => {
        console.warn('[push] Failed to register token with backend:', err);
      });
      await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
      await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'true');
      return { success: true, message: 'Push notifications enabled successfully.' };
    }

    // Seamless in-app mode enabled
    await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'in_app');
    return {
      success: true,
      message: 'Notifications enabled! You will receive live review alerts and customer updates in your BGOS Inbox.',
    };
  } catch (err) {
    console.warn('[push] enablePush fallback notice:', err);
    await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'in_app').catch(() => {});
    return {
      success: true,
      message: 'In-app notifications enabled! Live updates will appear in your BGOS Inbox.',
    };
  }
}

/**
 * Automatically syncs the push token with the backend on login/app startup
 * if the user has already granted notification permissions.
 */
export async function autoSyncPushToken(): Promise<void> {
  if (isExpoGo) return;
  try {
    const granted = await isPushPermissionGranted();
    if (!granted) return;

    const projectId =
      Constants.easConfig?.projectId ||
      Constants.expoConfig?.extra?.eas?.projectId ||
      '30078807-9b75-42c3-97c3-41fb166c40f2';

    if (Device.isDevice && projectId) {
      const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId }).catch(() => null);
      const token = tokenRes?.data;
      if (token) {
        await apiRequest('/api/notifications/push/subscribe', {
          method: 'POST',
          body: { expoPushToken: token, platform: Platform.OS },
        }).catch(() => {});
        await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token).catch(() => {});
        await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'true').catch(() => {});
      }
    }
  } catch (err) {
    console.log('[push] autoSyncPushToken background notice:', err);
  }
}

export async function unregisterPush(accessToken?: string | null) {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (token) {
      await apiRequest('/api/notifications/push/subscribe', {
        method: 'DELETE',
        body: { expoPushToken: token },
        ...(accessToken ? { skipAuth: true, headers: { Authorization: `Bearer ${accessToken}` } } : {}),
      }).catch(() => {});
      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => {});
    }
    await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'false').catch(() => {});
  } catch (err) {
    console.warn('[push] unregisterPush error:', err);
  }
}
