/**
 * Root Layout — Providers (QueryClient, Toast) + Expo Router Stack.
 * Auth gating happens in app/index.tsx which redirects based on auth state.
 * Also wires the 401 → logout redirect and push notification registration.
 *
 * FIX: Push notifications are now registered at app startup (after the user
 * is authenticated), matching the PWA's usePushAutoSubscribe behavior.
 * Previously, push was only registered when the user opened the Profile or
 * Notifications screen — a user who never opened those screens would never
 * receive push notifications.
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

import { ToastProvider } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth-store';
import { emitter } from '@/lib/event-emitter';
import { registerForPushNotifications } from '@/lib/notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthGate() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // On 401 (session expired) or explicit logout, return to login.
    const unsubUnauthorized = emitter.on('auth:unauthorized', () => {
      logout().catch(() => {});
      router.replace('/(auth)/login');
    });
    const unsubLogout = emitter.on('auth:logout', () => {
      router.replace('/(auth)/login');
    });
    return () => {
      unsubUnauthorized();
      unsubLogout();
    };
  }, [router, logout]);

  // FIX: Register for push notifications at startup, after the user is
  // authenticated. This matches the PWA's usePushAutoSubscribe behavior
  // (which runs on portal mount). Best-effort — failures are silently
  // swallowed (don't block app usage). The user can still toggle push
  // later from the Profile screen.
  useEffect(() => {
    if (!isAuthenticated) return;
    // Small delay to let the auth token settle (the api client reads it
    // from SecureStore on the first request).
    const timer = setTimeout(() => {
      registerForPushNotifications().catch((err) => {
        console.warn('[root] push notification registration failed:', err);
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthGate />
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
