import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen, Loading, ErrorNotice, colors } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { normalizePendingUpload, type PendingUpload } from '../../src/lib/upload';
import { useMediaUploadStore } from '../../src/stores/media-upload-store';
import { ScheduledPhotosTimeline, type MediaTabKey } from '../../src/components/gbp/scheduled-photos-timeline';
import { MediaMetadataSheet } from '../../src/components/gbp/media-metadata-sheet';
import type {
  GbpConnectionState,
  GbpPhoto,
  GbpPlaceResult,
  PhotosResponse,
} from '../../src/components/gbp/types';

interface DiscoverResponse {
  email: string;
  phone: string;
  version: string;
  count?: number;
  hasConnectedGbp?: boolean;
  activeProfile?: { id: string; name: string; shortId: string; initial: string };
}

/**
 * Photos Screen — Light BGOS UI with Google + Scheduled + Not Posted media,
 * real Photo & Video upload, and AI Title/Tags/SEO Description review sheet.
 */
export default function PhotosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mediaId?: string; photoId?: string; tab?: string }>();
  const photosRes = useResource<PhotosResponse>('/api/social/photos');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const discover = useResource<DiscoverResponse>('/api/gbp/accounts/discover');

  const [pendingAssets, setPendingAssets] = useState<PendingUpload[]>([]);
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerMode, setComposerMode] = useState<'upload' | 'ai_generate'>('upload');
  const [helpOpen, setHelpOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GbpPhoto | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [focusedMediaId, setFocusedMediaId] = useState<string | null>(
    params.mediaId || params.photoId || null,
  );
  const refreshedForFocusRef = useRef<string | null>(null);

  const initialTab: MediaTabKey | undefined = useMemo(() => {
    const raw = String(params.tab || '').toLowerCase().trim();
    if (raw === 'published' || raw === 'uploaded') return 'uploaded';
    if (raw === 'drafts' || raw === 'draft' || raw === 'unposted' || raw === 'not_posted') {
      return 'unposted';
    }
    if (raw === 'scheduled') return 'scheduled';
    return undefined;
  }, [params.tab]);

  const lastCompletionSeq = useMediaUploadStore((s) => s.lastCompletionSeq);
  const lastCompletedJob = useMediaUploadStore((s) => s.lastCompletedJob);

  useEffect(() => {
    const nextId = params.mediaId || params.photoId || null;
    if (nextId) {
      setFocusedMediaId(nextId);
    }
  }, [params.mediaId, params.photoId]);

  useEffect(() => {
    if (lastCompletionSeq > 0) {
      if (lastCompletedJob?.message) {
        setStatusBanner(lastCompletedJob.message);
      }
      void photosRes.refresh();
    }
  }, [lastCompletionSeq]);

  const activeProfile = discover.data?.activeProfile;
  const profileName =
    activeProfile?.name ||
    gbpPlace.data?.place?.title ||
    gbpPlace.data?.tenantFallback?.name ||
    'My Business';

  const isInitialLoading =
    (photosRes.loading && !photosRes.data) ||
    (gbpPlace.loading && !gbpPlace.data && photosRes.data?.isConnected === undefined);

  const hasConnectionErrorOnly =
    Boolean(gbpPlace.error && !gbpPlace.data) && photosRes.data?.isConnected === undefined;

  const rawConnected =
    gbpPlace.data?.isConnected ??
    photosRes.data?.isConnected ??
    (discover.data?.hasConnectedGbp && discover.data?.count === 1 ? true : undefined);

  const resolvedConnectionState: GbpConnectionState =
    gbpPlace.data?.connectionState ??
    photosRes.data?.connectionState ??
    (rawConnected === true
      ? 'connected'
      : discover.data?.hasConnectedGbp
        ? 'select_profile'
        : 'not_connected');

  const resolvedConnected =
    hasConnectionErrorOnly || isInitialLoading ? true : Boolean(rawConnected);

  const allPhotos = useMemo(() => photosRes.data?.photos || [], [photosRes.data]);

  useEffect(() => {
    if (!focusedMediaId || photosRes.loading) return;
    const exists = allPhotos.some(
      (p) => p.id === focusedMediaId || p.postId === focusedMediaId || p.url === focusedMediaId,
    );
    if (!exists && refreshedForFocusRef.current !== focusedMediaId) {
      refreshedForFocusRef.current = focusedMediaId;
      void photosRes.refresh();
    }
  }, [focusedMediaId, allPhotos, photosRes.loading]);
  const publishedPhotos = useMemo(
    () => allPhotos.filter((p) => p.source === 'google'),
    [allPhotos],
  );
  const scheduledPhotos = useMemo(
    () =>
      allPhotos.filter(
        (p) => p.source === 'queue' && (p.status === 'scheduled' || p.status === 'publishing'),
      ),
    [allPhotos],
  );
  const draftPhotos = useMemo(
    () =>
      allPhotos.filter(
        (p) => p.source === 'queue' && p.status !== 'scheduled' && p.status !== 'publishing',
      ),
    [allPhotos],
  );

  const handleUpload = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Permission Needed',
            'Please allow photo & video library access to upload media for your Google Business Profile.',
          );
          return;
        }
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.85,
        exif: false,
      });

      if (res.canceled || !res.assets?.length) return;

      const normalized = res.assets.map((asset, idx) =>
        normalizePendingUpload(
          {
            uri: asset.uri,
            name:
              asset.fileName ||
              `${asset.type === 'video' ? 'video' : 'photo'}-${Date.now()}-${idx}`,
            mimeType:
              asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
            file: (asset as any).file,
            fileSize: asset.fileSize,
            mediaType: asset.type === 'video' ? 'video' : 'image',
          },
          idx,
        ),
      );

      setEditingItem(null);
      setPendingAssets(normalized);
      setComposerMode('upload');
      setComposerVisible(true);
    } catch (e: any) {
      Alert.alert('Media Picker Error', e?.message || 'Could not select media. Please try again.');
    }
  };

  const handleEditItem = (item: GbpPhoto) => {
    setPendingAssets([]);
    setEditingItem(item);
    setComposerMode('upload');
    setComposerVisible(true);
  };

  const handleAiCreate = () => {
    setPendingAssets([]);
    setEditingItem(null);
    setComposerMode('ai_generate');
    setComposerVisible(true);
  };

  const rightHelpAction = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Media Help"
      onPress={() => setHelpOpen(true)}
      style={styles.helpButton}
    >
      <Text style={styles.helpButtonText}>Help</Text>
    </Pressable>
  );

  return (
    <View style={styles.screenWrapper}>
      <Screen
        title="Media"
        headerIcon="photo-library"
        subtitle={profileName}
        onRefresh={async () => {
          await Promise.all([photosRes.refresh(), gbpPlace.refresh(), discover.refresh()]).catch(() => {});
        }}
        rightAction={rightHelpAction}
      >
        <ErrorNotice
          message={photosRes.error || gbpPlace.error}
          retry={() => void Promise.all([photosRes.refresh(), gbpPlace.refresh(), discover.refresh()])}
        />

        {statusBanner ? (
          <View style={styles.bannerCard}>
            <Text style={styles.bannerText}>{statusBanner}</Text>
          </View>
        ) : null}

        {isInitialLoading ? (
          <Loading />
        ) : (
          <ScheduledPhotosTimeline
            photos={publishedPhotos}
            scheduledPhotos={scheduledPhotos}
            draftPhotos={draftPhotos}
            businessName={profileName}
            isConnected={resolvedConnected}
            connectionState={resolvedConnectionState}
            onConnectPress={() => router.push('/select-profile')}
            timeZone={photosRes.data?.locale?.timeZone}
            locale={photosRes.data?.locale?.locale}
            onUploadPress={handleUpload}
            onAiCreatePress={handleAiCreate}
            onEditItem={handleEditItem}
            onRefreshNeeded={() => photosRes.refresh()}
            initialTab={initialTab}
            focusedMediaId={focusedMediaId}
            onClearFocus={() => setFocusedMediaId(null)}
          />
        )}
      </Screen>

      <MediaMetadataSheet
        visible={composerVisible}
        onClose={() => setComposerVisible(false)}
        businessName={profileName}
        pendingAssets={pendingAssets}
        editingItem={editingItem}
        workspaceLocale={photosRes.data?.locale || null}
        initialMode={composerMode}
        onSaved={async (msg) => {
          setStatusBanner(msg);
          await photosRes.refresh();
        }}
      />

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <View style={styles.helpOverlay}>
          <View style={styles.helpModalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="auto-awesome" size={20} color={colors.brand} />
                <Text style={styles.helpModalTitle}>Media &amp; AI SEO Guide</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setHelpOpen(false)} style={styles.helpCloseBtn}>
                <MaterialIcons name="close" size={18} color={colors.ink} />
              </Pressable>
            </View>
            <Text style={styles.helpModalItem}>
              1. Tap Add Media or AI Photo Studio to upload real photos/videos or generate studio-grade GBP visuals.
            </Text>
            <Text style={styles.helpModalItem}>
              2. BGOS AI auto-writes an SEO Title, Geo-tag filename, Caption, Tags, and Google Category tailored to your services.
            </Text>
            <Text style={styles.helpModalItem}>
              3. Schedule Daily/Weekly in your local timezone, save to Drafts, or tap Publish Now / Retry directly on any card.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setHelpOpen(false)} style={styles.helpDoneBtn}>
              <Text style={styles.helpDoneText}>Got It</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bannerCard: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  bannerText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.success,
  },
  helpButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  helpButtonText: {
    color: '#0B9042',
    fontSize: 12,
    fontWeight: '700',
  },
  helpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  helpModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  helpModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  helpCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpModalItem: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  helpDoneBtn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  helpDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
