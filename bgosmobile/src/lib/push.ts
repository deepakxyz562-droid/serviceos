import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiRequest } from './api';
import * as SecureStore from 'expo-secure-store';
const key = 'bgos_push_token';
export async function enablePush() {
  if (!Device.isDevice) throw new Error('Push notifications require a physical device.');
  const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('This build needs an EAS project ID before push notifications can be enabled.');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Customer updates', importance: Notifications.AndroidImportance.HIGH });
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Allow notifications in your device settings to receive lead and message alerts.');
  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  await apiRequest('/api/notifications/push/subscribe', { method: 'POST', body: { expoPushToken: result.data, platform: Platform.OS } });
  await SecureStore.setItemAsync(key, result.data);
}
export async function unregisterPush() {
  const token = await SecureStore.getItemAsync(key);
  if (token) { await apiRequest('/api/notifications/push/subscribe', { method: 'DELETE', body: { expoPushToken: token } }); await SecureStore.deleteItemAsync(key); }
}
