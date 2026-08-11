/**
 * Root Layout — Providers (QueryClient, Toast) + Expo Router Stack.
 * Auth gating happens in app/index.tsx which redirects based on auth state.
 * Also wires the 401 → logout redirect and push notification registration.
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
