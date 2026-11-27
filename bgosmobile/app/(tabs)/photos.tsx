import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Loading } from '../../src/components/ui';

/**
 * Compatibility redirect route for `/(tabs)/photos` and `/photos`.
 * Media Library & Clean AI Photo Studio now live inside the unified Marketing tab.
 */
export default function PhotosCompatibilityRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mediaId?: string;
    photoId?: string;
    tab?: string;
    mode?: string;
  }>();

  useEffect(() => {
    const nextParams: Record<string, string> = {
      mode: params.mode === 'studio' ? 'media_studio' : 'media',
    };
    if (params.tab) nextParams.tab = String(params.tab);
    if (params.mediaId) nextParams.mediaId = String(params.mediaId);
    if (params.photoId) nextParams.photoId = String(params.photoId);

    router.replace({
      pathname: '/(tabs)/marketing',
      params: nextParams,
    });
  }, [params.mediaId, params.photoId, params.tab, params.mode, router]);

  return <Loading />;
}
