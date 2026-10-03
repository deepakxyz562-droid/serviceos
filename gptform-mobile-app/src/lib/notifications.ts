/**
 * GPTForm Mobile App — Push Notifications Service
 *
 * Configures push notifications via Expo Notifications and subscribes the
 * native push token to the GPTForm backend (/api/notifications/push/subscribe).
 *
 * Features:
 * - Multi-channel support on Android (Urgent Alerts, Leads, Bookings, Messages)
 * - Foreground notification handler (alert, banner, badge, sound)
 * - User-aware token caching to prevent cross-account notifications
 * - Deep-link response listener mapping notifications to /chat, /lead, /bookings
 */

import { Platform } from 'react-native';
import { apiRequest } from './api';

export const NOTIFICATION_CHANNELS = {
  URGENT: 'gptform_urgent',
  LEADS: 'gptform_leads',
  BOOKINGS: 'gptform_bookings',
  MESSAGES: 'gptform_messages',
  DEFAULT: 'gptform_default',
} as const;

interface PushRegistration {
  userId: string;
  token: string;
}

let pushRegistration: PushRegistration | null = null;
let channelsConfigured = false;
let notificationHandlerConfigured = false;

// Lazy-load expo-notifications safely on native platforms
let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
  } catch (err) {
    console.warn('[notifications] Failed to load expo-notifications module:', err);
  }
}

/**
 * Clear the push token cache on logout.
 */
export function clearPushToken(): void {
  pushRegistration = null;
}

/**
 * Setup Android notification channels with high visibility and distinct colors.
 */
export async function ensureNotificationChannels(): Promise<void> {
  if (channelsConfigured || !Notifications || Platform.OS !== 'android') return;

  try {
    // Urgent alerts (Operator takeover, customer escalation)
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.URGENT, {
      name: 'Urgent Alerts & Takeover',
      description: 'Customer requests human operator or urgent attention',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#EF4444',
      sound: 'default',
    });

    // New Leads (GPTForm submissions)
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.LEADS, {
      name: 'New Leads & Quotes',
      description: 'Instant alerts when customers submit forms or request quotes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
      sound: 'default',
    });

    // Bookings & Appointments (Calendly schedule alerts)
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.BOOKINGS, {
      name: 'Bookings & Appointments',
      description: 'New appointments, rescheduling, or cancellations',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A855F7',
      sound: 'default',
    });

    // Messages (AI Copilot & live customer chat)
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.MESSAGES, {
      name: 'Live Chat Messages',
      description: 'Incoming customer chats across WhatsApp, Web, and SMS',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#3B82F6',
      sound: 'default',
    });

    // Default channel
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DEFAULT, {
      name: 'General Notifications',
      description: 'System updates and daily business digest',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#10B981',
    });

    channelsConfigured = true;
  } catch (err) {
    console.warn('[notifications] Failed to configure Android channels:', err);
  }
}

/**
 * Configure foreground notification display behavior.
 */
export function ensureNotificationHandler(): void {
  if (notificationHandlerConfigured || !Notifications) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    notificationHandlerConfigured = true;
  } catch (err) {
    console.warn('[notifications] Failed to set notification handler:', err);
  }
}

/**
 * Resolve the EAS Project ID from Constants or environment.
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
    // Constants not available
  }

  return '49dae8a6-ccf0-4a29-b5ec-6617ccfa298c';
}

export interface PushRegistrationResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Register for native push notifications and subscribe to backend.
 */
export async function registerForPushNotifications(userId?: string): Promise<PushRegistrationResult> {
  // If cached for this user, reuse
  if (pushRegistration && userId && pushRegistration.userId === userId) {
    return { success: true, token: pushRegistration.token };
  }

  if (Platform.OS === 'web' || !Notifications) {
    return { success: false, error: 'Push notifications are not supported on this platform' };
  }

  ensureNotificationHandler();
  await ensureNotificationChannels();

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { success: false, error: 'Notification permissions were denied' };
    }

    const projectId = getEasProjectId();
    if (!projectId) {
      return { success: false, error: 'EAS Project ID is not configured' };
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;

    // Subscribe token to backend
    try {
      await apiRequest('/api/notifications/push/subscribe', {
        method: 'POST',
        body: {
          platform: Platform.OS,
          token,
          expoPushToken: token,
        },
      });
    } catch (backendErr: any) {
      console.warn('[notifications] Failed to subscribe token with server:', backendErr);
      return { success: false, token, error: backendErr.message || 'Server subscription failed' };
    }

    pushRegistration = { userId: userId || 'subscriber', token };
    return { success: true, token };
  } catch (err: any) {
    console.warn('[notifications] Push registration failed:', err);
    return { success: false, error: err.message || 'Registration failed' };
  }
}

/**
 * Setup listener to handle incoming notification taps for deep linking.
 */
export function setupNotificationListeners(
  onNavigate: (route: string, params?: Record<string, any>) => void
): () => void {
  if (!Notifications || Platform.OS === 'web') {
    return () => {};
  }

  // Handle tap when app is opened from notification
  const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
    try {
      const data = response.notification.request.content.data as Record<string, any> | undefined;
      if (!data) return;

      if (data.url) {
        // e.g. /chat/c-123 or /lead/lead-456 or /bookings
        onNavigate(data.url);
        return;
      }

      if (data.chatId || data.conversationId) {
        onNavigate(`/chat/${data.chatId || data.conversationId}`);
      } else if (data.leadId) {
        onNavigate(`/lead/${data.leadId}`);
      } else if (data.bookingId) {
        onNavigate('/(tabs)/bookings');
      }
    } catch (err) {
      console.error('[notifications] Error handling notification tap:', err);
    }
  });

  return () => {
    subscription.remove();
  };
}
