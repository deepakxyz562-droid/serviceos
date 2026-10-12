/**
 * Index — Splash / Auth Gate
 * Bootstraps auth state on mount, then redirects to login or role tabs.
 * Uses a mounted flag to ensure the Root Layout is ready before navigating.
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { BRAND } from '@/lib/constants';

export default function Index() {
  const { isAuthenticated, isBooted, role, bootstrap } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!mounted || !isBooted) return;
    router.replace('/(pro)/home');
  }, [mounted, isBooted, isAuthenticated, role]);

  // Mark as mounted after the first render cycle (navigation is ready by then)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981' }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>
        {BRAND.name}
      </Text>
      <Text style={{ fontSize: 14, color: '#ECFDF5', marginBottom: 32 }}>
        {BRAND.tagline}
      </Text>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}
