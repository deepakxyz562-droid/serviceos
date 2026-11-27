import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/auth-store';
import { resolveBgosDeepLink } from '../src/lib/notification-routing';

/**
 * Target screen for `bgos://open?...` and `https://bgos.site/open?...` links
 * (launched from BGOS mailer CTAs on iOS / Android).
 */
export default function OpenDeepLinkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const { isAuthenticated, isLoading, onboardingRequired } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    if (onboardingRequired) {
      router.replace('/setup');
      return;
    }

    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      const val = Array.isArray(v) ? v[0] : v;
      if (typeof val === 'string' && val.trim()) qs.set(k, val.trim());
    }
    const resolved =
      resolveBgosDeepLink(`bgos://open?${qs.toString()}`) || '/(tabs)';
    router.replace(resolved as any);
  }, [isLoading, isAuthenticated, onboardingRequired, params, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F7FAF9', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#009F50" />
    </View>
  );
}
