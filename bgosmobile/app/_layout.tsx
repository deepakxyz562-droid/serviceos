import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { notificationDestination } from '../src/lib/notification-routing';
import { useAuthStore } from '../src/stores/auth-store';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: useAuthStore.getState().isAuthenticated, shouldShowList: useAuthStore.getState().isAuthenticated, shouldPlaySound: useAuthStore.getState().isAuthenticated, shouldSetBadge: false }) });

export default function RootLayout() {
  const { isAuthenticated, isLoading, onboardingRequired, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || onboardingRequired) return;
    let active = true;
    const receive = (response: Notifications.NotificationResponse) => {
      if (!active) return;
      const destination = notificationDestination(response.notification.request.content.data || {});
      if (destination) router.push(destination);
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    };
    const listener = Notifications.addNotificationResponseReceivedListener(receive);
    void Notifications.getLastNotificationResponseAsync().then(response => { if (response) receive(response); }).catch(() => {});
    return () => { active = false; listener.remove(); };
  }, [isLoading, isAuthenticated, onboardingRequired, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F6FE' } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!isLoading && !isAuthenticated}>
          <Stack.Screen name="login" />
          <Stack.Screen name="recover" />
          <Stack.Screen name="auth-callback" />
        </Stack.Protected>
        <Stack.Protected guard={!isLoading && isAuthenticated && onboardingRequired}>
          <Stack.Screen name="setup" />
        </Stack.Protected>
        <Stack.Protected guard={!isLoading && isAuthenticated && !onboardingRequired}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
