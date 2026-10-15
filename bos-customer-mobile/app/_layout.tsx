import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAffinityStore } from '../src/stores/affinity-store';
import { useCartStore } from '../src/stores/cart-store';
import { useLanguageStore } from '../src/stores/language-store';
import { useProfileStore } from '../src/stores/profile-store';

export default function RootLayout() {
  const loadPersistedAffinity = useAffinityStore((s) => s.loadPersisted);
  const loadOrders = useCartStore((s) => s.loadOrders);
  const loadCart = useCartStore((s) => s.loadPersisted);
  const loadLanguage = useLanguageStore((s) => s.loadLanguage);
  const loadProfile = useProfileStore((s) => s.loadProfile);

  useEffect(() => {
    void loadPersistedAffinity();
    void loadOrders();
    void loadCart();
    void loadLanguage();
    void loadProfile();
  }, [loadPersistedAffinity, loadOrders, loadCart, loadLanguage, loadProfile]);

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
