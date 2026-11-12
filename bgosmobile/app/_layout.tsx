import '../src/lib/runtime-polyfills';
import React, { useEffect, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// @ts-expect-error expo-font types provided at bundle time
import { useFonts } from 'expo-font';
import type { NotificationResponse } from 'expo-notifications';
import { getNotificationsModule, isExpoGoRuntime } from '../src/lib/notifications-runtime';
import { notificationDestination } from '../src/lib/notification-routing';
import { apiRequest } from '../src/lib/api';
import { enablePush, isPushPermissionGranted } from '../src/lib/push';
import { useAuthStore } from '../src/stores/auth-store';
import { RootErrorBoundary } from '../src/components/navigation/error-boundary';
import { AnimatedSplash } from '../src/components/navigation/animated-splash';

try {
  const Notifications = getNotificationsModule();
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        const isAuth = useAuthStore.getState().isAuthenticated;
        return {
          shouldShowBanner: isAuth,
          shouldShowList: isAuth,
          shouldPlaySound: isAuth,
          shouldSetBadge: false,
        };
      },
    });
  }
} catch {
  // Silent fallback for headless or background environments
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BgosDesign: require('../assets/fonts/BgosDesign-Regular.ttf'),
    BgosDesignBold: require('../assets/fonts/BgosDesign-Bold.ttf'),
    BgosEditorial: require('../assets/fonts/BgosEditorial.ttf'),
    BgosDisplay: require('../assets/fonts/BgosDisplay.ttf'),
  });
  const { isAuthenticated, isLoading, onboardingRequired, checkAuth } = useAuthStore();
  const router = useRouter();
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const notifPollerReadyRef = useRef(false);
  const pushSyncedRef = useRef(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Ensure default Android notification channel exists early on app startup
  useEffect(() => {
    if (Platform.OS === 'android' && !isExpoGoRuntime) {
      const Notifications = getNotificationsModule();
      if (!Notifications) return;
      void Notifications.setNotificationChannelAsync('default', {
        name: 'Customer & Lead Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#009F50',
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated || onboardingRequired || isExpoGoRuntime) return;
    const Notifications = getNotificationsModule();
    if (!Notifications) return;
    let active = true;
    let listener: { remove: () => void } | null = null;
    try {
      const receive = (response: NotificationResponse) => {
        if (!active) return;
        try {
          const destination = notificationDestination(response.notification.request.content.data || {});
          if (destination) router.push(destination);
        } catch {}
        void Notifications.clearLastNotificationResponseAsync().catch(() => {});
      };
      listener = Notifications.addNotificationResponseReceivedListener(receive);
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response && active) receive(response);
        })
        .catch(() => {});
    } catch {}

    return () => {
      active = false;
      try {
        listener?.remove();
      } catch {}
    };
  }, [isLoading, isAuthenticated, onboardingRequired, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || onboardingRequired) {
      pushSyncedRef.current = false;
      seenNotifIdsRef.current.clear();
      notifPollerReadyRef.current = false;
      return;
    }

    if (!pushSyncedRef.current && Platform.OS !== 'web' && !isExpoGoRuntime) {
      pushSyncedRef.current = true;
      void enablePush().catch(() => {});
    }

    let cancelled = false;
    const pollUnreadEscalations = async () => {
      if (cancelled || AppState.currentState === 'background') return;
      try {
        const res = await apiRequest<{
          notifications?: Array<{
            id: string;
            title?: string;
            message?: string;
            priority?: string;
            category?: string;
            createdAt?: string;
            metadataJson?: string | null;
          }>;
        }>('/api/notifications?filter=unread&limit=10');

        const rows = Array.isArray(res?.notifications) ? res.notifications : [];
        const isFirstRun = !notifPollerReadyRef.current;
        notifPollerReadyRef.current = true;

        const nowMs = Date.now();
        const freshEscalations: Array<{
          id: string;
          title: string;
          message: string;
          conversationId?: string;
          sessionId?: string;
        }> = [];

        for (const item of rows) {
          if (!item?.id || seenNotifIdsRef.current.has(item.id)) continue;
          seenNotifIdsRef.current.add(item.id);

          let meta: Record<string, unknown> = {};
          if (item.metadataJson) {
            try {
              meta = JSON.parse(item.metadataJson) as Record<string, unknown>;
            } catch {}
          }
          const isLiveChat =
            meta.source === 'live_chat_escalation' ||
            (item.priority === 'urgent' && item.category === 'customer');
          if (!isLiveChat) continue;

          const createdMs = item.createdAt ? new Date(item.createdAt).getTime() : nowMs;
          if (isFirstRun && Number.isFinite(createdMs) && nowMs - createdMs > 120_000) {
            continue;
          }

          freshEscalations.push({
            id: item.id,
            title: item.title || 'Live Chat Escalation',
            message: item.message || 'A customer wants to chat with a human agent.',
            conversationId: typeof meta.conversationId === 'string' ? meta.conversationId : undefined,
            sessionId: typeof meta.sessionId === 'string' ? meta.sessionId : undefined,
          });
        }

        if (freshEscalations.length === 0 || cancelled) return;
        const latest = freshEscalations[0];
        const Notifications = getNotificationsModule();

        if (!isExpoGoRuntime && Notifications && Platform.OS !== 'web') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: latest.title,
              body: latest.message,
              sound: 'default',
              data: {
                route: '/inbox',
                conversationId: latest.conversationId,
                sessionId: latest.sessionId,
                source: 'live_chat_escalation',
              },
            },
            trigger: null,
          }).catch(() => {});
        } else {
          Alert.alert(latest.title, latest.message, [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Open Inbox',
              onPress: () => {
                void apiRequest('/api/notifications', {
                  method: 'PATCH',
                  body: { id: latest.id, isRead: true },
                }).catch(() => {});
                router.push({
                  pathname: '/inbox',
                  params: latest.conversationId
                    ? {
                        conversationId: latest.conversationId,
                        ...(latest.sessionId ? { sessionId: latest.sessionId } : {}),
                      }
                    : {},
                });
              },
            },
          ]);
        }
      } catch {}
    };

    void pollUnreadEscalations();
    const timer = setInterval(() => {
      void pollUnreadEscalations();
    }, 15_000);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void pollUnreadEscalations();
      }
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      sub.remove();
    };
  }, [isLoading, isAuthenticated, onboardingRequired, router]);

  return (
    <RootErrorBoundary>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F7FAF9' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="recover" />
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="gbp-callback" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="outreach" />
        <Stack.Screen name="leads" />
        <Stack.Screen name="appointments" />
        <Stack.Screen name="submissions" />
        <Stack.Screen name="automations" />
        <Stack.Screen name="agents" />
        <Stack.Screen name="integrations" />
        <Stack.Screen name="growth" />
        <Stack.Screen name="qr-standee" />
        <Stack.Screen name="booking-page" />
        <Stack.Screen name="services-management" />
        <Stack.Screen name="products-management" />
        <Stack.Screen name="manage-profile" />
        <Stack.Screen name="my-plan" />
        <Stack.Screen name="keyword-planner" />
        <Stack.Screen name="seo-growth" />
        <Stack.Screen name="reply-settings" />
        <Stack.Screen name="growth-report" />
        <Stack.Screen name="select-profile" />
        <Stack.Screen name="team-management" />
        <Stack.Screen name="logo-management" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="help" />
      </Stack>
      <AnimatedSplash ready={fontsLoaded && !isLoading} />
    </RootErrorBoundary>
  );
}
