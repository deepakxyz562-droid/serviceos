import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAffinityStore } from '../src/stores/affinity-store';
import { useCartStore } from '../src/stores/cart-store';

export default function RootLayout() {
  const loadPersistedAffinity = useAffinityStore((s) => s.loadPersisted);
  const loadOrders = useCartStore((s) => s.loadOrders);

  useEffect(() => {
    void loadPersistedAffinity();
    void loadOrders();
  }, [loadPersistedAffinity, loadOrders]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="store/[slug]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="checkout/index"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
