import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiRequest } from './api';
import * as SecureStore from 'expo-secure-store';

const PUSH_TOKEN_KEY = 'bgos_push_token';
const PUSH_ENABLED_KEY = 'bgos_push_enabled';

export async function isPushPermissionGranted(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch {
    return false;
  }
}

export async function requestPushPermissions(): Promise<boolean> {
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
      return { success: false, message: 'Notification permission was denied. Please allow notifications in device settings.' };
    }

    await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'false');

    if (!Device.isDevice) {
      return { success: false, message: 'Permission granted. Use a physical device to register for push notifications.' };
    }

    const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      return { success: false, message: 'Push registration is unavailable: the app project ID is missing.' };
    }

    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!tokenRes.data) throw new Error('Push registration did not return a device token. Please retry.');
    if (tokenRes.data) {
      await apiRequest('/api/notifications/push/subscribe', {
        method: 'POST',
        body: { expoPushToken: tokenRes.data, platform: Platform.OS },
      });
      await SecureStore.setItemAsync(PUSH_TOKEN_KEY, tokenRes.data);
      await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'true');
    }

    return { success: true, message: 'Push notifications enabled successfully.' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to enable push notifications.';
    return { success: false, message: msg };
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
