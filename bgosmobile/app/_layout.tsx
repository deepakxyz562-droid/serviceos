import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { notificationDestination } from '../src/lib/notification-routing';
import { useAuthStore } from '../src/stores/auth-store';
import { RootErrorBoundary } from '../src/components/navigation/error-boundary';

try {
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
} catch {
  // Silent fallback for headless or background environments
}

export default function RootLayout() {
  const { isAuthenticated, isLoading, onboardingRequired, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Ensure default Android notification channel exists early on app startup
  useEffect(() => {
    if (Platform.OS === 'android') {
      void Notifications.setNotificationChannelAsync('default', {
        name: 'Customer & Lead Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#009F50',
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated || onboardingRequired) return;
    let active = true;
    let listener: { remove: () => void } | null = null;
    try {
      const receive = (response: Notifications.NotificationResponse) => {
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
        <Stack.Screen name="qr-standee" />
        <Stack.Screen name="manage-profile" />
        <Stack.Screen name="my-plan" />
        <Stack.Screen name="keyword-planner" />
        <Stack.Screen name="reply-settings" />
        <Stack.Screen name="growth-report" />
        <Stack.Screen name="select-profile" />
        <Stack.Screen name="preferences" />
      </Stack>
    </RootErrorBoundary>
  );
}
