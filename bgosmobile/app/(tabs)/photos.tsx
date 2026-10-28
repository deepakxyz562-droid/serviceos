import React from 'react';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen, colors } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { PhotosBoard } from '../../src/components/gbp/photos-grid';
import type { GbpPlaceResult, PhotosResponse } from '../../src/components/gbp/types';

/**
 * Photos tab — first-class GBP photo publisher (design spec §7).
 * Shares the exact board component with the Photos sub-tab inside the GBP
 * AI Hub (src/components/gbp/photos-grid.tsx) so both stay identical.
 */
export default function PhotosScreen() {
  const router = useRouter();
  const photosRes = useResource<PhotosResponse>('/api/social/photos');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');

  const publishedCount = photosRes.data?.liveCount ?? 0;

  return (
    <Screen
      title="Photos"
      subtitle="AI photo publishing to your Google Business Profile"
      onRefresh={async () => {
        await Promise.all([photosRes.refresh(), gbpPlace.refresh()]).catch(() => {});
      }}
      rightAction={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.brandSoft,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 20,
          }}
        >
          <MaterialIcons name="photo-library" size={14} color={colors.brandDark} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brandDark }}>
            {publishedCount} live
          </Text>
        </View>
      }
    >
      <PhotosBoard
        data={photosRes.data}
        loading={photosRes.loading}
        error={photosRes.error}
        refresh={photosRes.refresh}
        connected={Boolean(gbpPlace.data?.isConnected)}
        onNeedConnect={() => router.push('/(tabs)/growth')}
      />
    </Screen>
  );
}
