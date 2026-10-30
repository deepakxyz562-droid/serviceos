import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen, colors } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { PhotosBoard } from '../../src/components/gbp/photos-grid';
import type { GbpPlaceResult, PhotosResponse } from '../../src/components/gbp/types';

interface DiscoverResponse {
  email: string;
  phone: string;
  version: string;
  activeProfile?: { id: string; name: string; shortId: string; initial: string };
}

/**
 * Photos tab — matches Dhanda AI benchmark (Screenshot 3).
 * Outer segmented track with Scheduled / Uploaded / Not Posted,
 * upload destination notice banner, calendar empty state, and bottom action.
 */
export default function PhotosScreen() {
  const router = useRouter();
  const photosRes = useResource<PhotosResponse>('/api/social/photos');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const discover = useResource<DiscoverResponse>('/api/gbp/accounts/discover');

  const activeProfile = discover.data?.activeProfile;
  const shortId = activeProfile?.shortId || (gbpPlace.data?.place?.locationId ? `#${gbpPlace.data.place.locationId.slice(-4)}` : '');
  const phone = discover.data?.phone || gbpPlace.data?.place?.phone || '';
  const version = discover.data?.version || 'v2.83';

  return (
    <View style={{ flex: 1 }}>
      <Screen
        title="Google Media"
        subtitle={[phone, shortId.replace('#', ''), version].filter(Boolean).join(' | ')}
        onRefresh={async () => {
          await Promise.all([photosRes.refresh(), gbpPlace.refresh(), discover.refresh()]).catch(() => {});
        }}
        rightAction={
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert(
                'Google Media Info',
                'Upload and schedule photos to publish directly to your Google Business Profile. Regular photo updates improve search discovery and local SEO rank.'
              )
            }
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="help-outline" size={20} color="#64748B" />
          </Pressable>
        }
      >
        {/* Destination notice banner (Screenshot 3) */}
        <Pressable
          onPress={() =>
            Alert.alert(
              'Where it will upload?',
              `Photos will be published directly to your Google Business Profile: ${activeProfile?.name || gbpPlace.data?.place?.title || 'Deepak Chandra'} (${shortId}).`
            )
          }
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 13, color: '#334155', fontWeight: '600' }}>Where it will upload?</Text>
          <Text style={{ fontSize: 13, color: '#2563EB', fontWeight: '700' }}>Click here to know</Text>
        </Pressable>

        <PhotosBoard
          data={photosRes.data}
          loading={photosRes.loading}
          error={photosRes.error}
          refresh={photosRes.refresh}
          connected={Boolean(gbpPlace.data?.isConnected)}
          onNeedConnect={() => router.push('/(tabs)/growth')}
          variant="dhanda"
        />
      </Screen>

      {/* Floating voice assistant mic (Screenshot 3 benchmark) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voice assistant"
        onPress={() => Alert.alert('Voice Assistant', 'Say "Upload media" or "Schedule photo for tomorrow"…')}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 16,
          bottom: 24,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: '#0F172A',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 8,
        })}
      >
        <MaterialIcons name="mic" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
