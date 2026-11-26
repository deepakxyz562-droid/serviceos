import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Loading, Screen } from '../src/components/ui';

/**
 * Legacy route alias — Keyword Planner was merged into AI Search & SEO (Keywords tab).
 */
export default function KeywordPlannerRedirectScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/seo-growth?tab=keywords');
  }, [router]);

  return (
    <Screen title="AI Search & SEO" subtitle="Target Keywords" showBack={true}>
      <Loading />
    </Screen>
  );
}
