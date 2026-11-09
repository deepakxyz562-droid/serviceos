import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Screen, Loading } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { uploadFileToStorage } from '../../src/lib/upload';
import { ScheduledPhotosTimeline } from '../../src/components/gbp/scheduled-photos-timeline';
import type { GbpPlaceResult, PhotosResponse } from '../../src/components/gbp/types';

interface DiscoverResponse {
  email: string;
  phone: string;
  version: string;
  activeProfile?: { id: string; name: string; shortId: string; initial: string };
}

/**
 * Photos Screen — Benchmark matching Grexa Screenshot 3.
 * Clean, single-page layout with large portrait carousel, 1-tap "Add Photos & Videos"
 * button with real cloud upload, and a vertical "Scheduled Photos & Videos" drip timeline.
 */
export default function PhotosScreen() {
  const router = useRouter();
  const photosRes = useResource<PhotosResponse>('/api/social/photos');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const discover = useResource<DiscoverResponse>('/api/gbp/accounts/discover');
  const [isUploading, setIsUploading] = useState(false);

  const activeProfile = discover.data?.activeProfile;
  const profileName = activeProfile?.name || gbpPlace.data?.place?.title || 'Delhi Farm';

  const handleUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow photo gallery access to pick photos for your Google Business Profile.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
      });

      if (res.canceled || !res.assets?.length) return;

      setIsUploading(true);
      const uploadedUrls: string[] = [];

      for (const asset of res.assets) {
        const cloudUrl = await uploadFileToStorage({
          uri: asset.uri,
          name: asset.fileName || `photo-${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
        });
        if (cloudUrl) uploadedUrls.push(cloudUrl);
      }

      if (uploadedUrls.length > 0) {
        // Auto-generate on-brand caption with AI
        let autoCaption = `Lush, scenic spaces and exceptional hospitality at ${profileName}.`;
        try {
          const aiRes = await apiRequest<{ caption: string }>('/api/social/ai-caption', {
            method: 'POST',
            body: {
              topic: `${profileName} new photo showcase`,
              platforms: ['googlebusiness'],
            },
          });
          if (aiRes?.caption) autoCaption = aiRes.caption;
        } catch {}

        await apiRequest('/api/social/photos', {
          method: 'POST',
          body: {
            photos: uploadedUrls,
            scheduleMode: 'daily',
            description: autoCaption,
          },
        });

        await photosRes.refresh();
        Alert.alert(
          'Media Scheduled',
          `${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} queued for daily AI drip publishing to Google Business Profile.`
        );
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e?.message || 'Could not upload photos. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const rightHelpAction = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Help"
      onPress={() =>
        Alert.alert(
          'Photos & Media Help',
          'Publishing photos to your Google Business Profile improves visibility on Google Maps and search. Our AI agent schedules daily drips so your profile stays active.'
        )
      }
      style={styles.helpButton}
    >
      <Text style={styles.helpButtonText}>Help</Text>
    </Pressable>
  );

  return (
    <View style={styles.screenWrapper}>
      <Screen
        title="Photos"
        subtitle={profileName}
        onRefresh={async () => {
          await Promise.all([photosRes.refresh(), gbpPlace.refresh(), discover.refresh()]).catch(() => {});
        }}
        rightAction={rightHelpAction}
      >
        {photosRes.loading && !photosRes.data ? (
          <Loading />
        ) : (
          <ScheduledPhotosTimeline
            photos={photosRes.data?.photos?.filter((p) => p.source === 'google' || !p.scheduledFor)}
            scheduledPhotos={photosRes.data?.photos?.filter((p) => p.source === 'queue' || Boolean(p.scheduledFor))}
            businessName={profileName}
            onUploadPress={handleUpload}
            isUploading={isUploading}
          />
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#0F172A', // Sleek dark mode theme matching Benchmark Screenshot 3
  },
  helpButton: {
    backgroundColor: '#009F50', // BGOS Emerald green pill matching benchmark
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  helpButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
