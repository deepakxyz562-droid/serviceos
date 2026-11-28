import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../src/components/ui';

export default function GbpCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    error?: string;
    google?: string;
    whatsapp?: string;
    next?: string;
  }>();

  useEffect(() => {
    const errorParam = params.error;
    const googleParam = params.google;
    const whatsappParam = params.whatsapp;
    const requestedNext =
      typeof params.next === 'string' && params.next.startsWith('/') ? params.next : null;

    if (whatsappParam || requestedNext === '/integrations') {
      const query = new URLSearchParams();
      if (whatsappParam) query.set('whatsapp', whatsappParam);
      if (errorParam) query.set('error', errorParam);
      const qs = query.toString();
      const target = requestedNext || '/integrations';
      router.replace((qs ? `${target}?${qs}` : target) as any);
      return;
    }

    const query = new URLSearchParams();
    if (errorParam) query.set('error', errorParam);
    if (googleParam) query.set('google', googleParam);
    const queryString = query.toString();
    const dest = queryString ? `/setup?${queryString}` : '/setup';
    router.replace(dest as any);
  }, [params, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4FAF9',
  },
});
