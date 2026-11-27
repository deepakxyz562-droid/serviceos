import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Loading } from '../src/components/ui';

/**
 * Compatibility redirect route for `/growth` and `/growth?tab=...`.
 * Replaced duplicate growth sub-tabs with unified tab & dedicated report screens.
 */
export default function GrowthCompatibilityRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  useEffect(() => {
    const tab = String(params.tab || '').toLowerCase().trim();
    if (tab === 'reviews') {
      router.replace('/(tabs)/reviews');
      return;
    }
    if (tab === 'posts') {
      router.replace('/(tabs)/marketing?mode=posts');
      return;
    }
    if (tab === 'photos' || tab === 'media') {
      router.replace('/(tabs)/marketing?mode=media');
      return;
    }
    if (tab === 'performance' || tab === 'seo' || tab === 'grid' || tab === 'audit') {
      router.replace('/seo-growth');
      return;
    }
    router.replace('/growth-report');
  }, [params.tab, router]);

  return <Loading />;
}
