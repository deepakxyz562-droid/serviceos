/**
 * Index — Field Staff Splash / Auth Gate
 * Bootstraps auth state on mount, then redirects to login or employee today tab.
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { BRAND } from '@/lib/constants';

export default function Index() {
  const { isAuthenticated, isBooted, bootstrap } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!mounted || !isBooted) return;
    if (isAuthenticated) {
      router.replace('/(employee)/today');
    } else {
      router.replace('/(auth)/login');
    }
  }, [mounted, isBooted, isAuthenticated]);

  // Mark as mounted after the first render cycle
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669' }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>
        {BRAND.name} Staff
      </Text>
      <Text style={{ fontSize: 14, color: '#ECFDF5', marginBottom: 32 }}>
        Field Service &amp; Technician Portal
      </Text>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}
