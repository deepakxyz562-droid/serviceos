import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Loading, ErrorNotice, colors } from '../ui';
import { useResource } from '../../hooks/use-resource';
import { normalizePendingUpload, type PendingUpload } from '../../lib/upload';
import { useMediaUploadStore } from '../../stores/media-upload-store';
import { ScheduledPhotosTimeline, type MediaTabKey } from '../gbp/scheduled-photos-timeline';
import { MediaMetadataSheet } from '../gbp/media-metadata-sheet';
import { AiStudioFeed } from '../gbp/ai-studio-feed';
import type {
  GbpConnectionState,
  GbpPhoto,
  GbpPlaceResult,
  PhotosResponse,
} from '../gbp/types';

interface DiscoverResponse {
  email: string;
  phone: string;
  version: string;
  count?: number;
  hasConnectedGbp?: boolean;
  activeProfile?: { id: string; name: string; shortId: string; initial: string };
}

export interface MediaHubPanelProps {
  initialViewMode?: 'media' | 'studio';
  initialTabParam?: string;
  mediaId?: string;
  photoId?: string;
  onStatusMessage?: (msg: string) => void;
}

/**
 * Unified Media Library & Clean AI Photo Studio panel embedded inside Marketing.
 */
export function MediaHubPanel({
  initialViewMode = 'media',
  initialTabParam,
  mediaId,
  photoId,
  onStatusMessage,
}: MediaHubPanelProps) {
  const router = useRouter();
  const photosRes = useResource<PhotosResponse>('/api/social/photos');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const discover = useResource<DiscoverResponse>('/api/gbp/accounts/discover');

  const [viewMode, setViewMode] = useState<'media' | 'studio'>(initialViewMode);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingAssets, setPendingAssets] = useState<PendingUpload[]>([]);
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerMode, setComposerMode] = useState<'upload' | 'ai_generate'>('upload');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GbpPhoto | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [focusedMediaId, setFocusedMediaId] = useState<string | null>(mediaId || photoId || null);
  const refreshedForFocusRef = useRef<string | null>(null);

  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  useEffect(() => {
    const nextId = mediaId || photoId || null;
    if (nextId) {
      setFocusedMediaId(nextId);
    }
  }, [mediaId, photoId]);

  const initialTab: MediaTabKey | undefined = useMemo(() => {
    const raw = String(initialTabParam || '').toLowerCase().trim();
    if (raw === 'published' || raw === 'uploaded') return 'uploaded';
    if (raw === 'drafts' || raw === 'draft' || raw === 'unposted' || raw === 'not_posted') {
      return 'unposted';
    }
    if (raw === 'scheduled') return 'scheduled';
    return undefined;
  }, [initialTabParam]);

  const lastCompletionSeq = useMediaUploadStore((s) => s.lastCompletionSeq);
  const lastCompletedJob = useMediaUploadStore((s) => s.lastCompletedJob);

  useEffect(() => {
    if (lastCompletionSeq > 0) {
      if (lastCompletedJob?.message) {
        setStatusBanner(lastCompletedJob.message);
        onStatusMessage?.(lastCompletedJob.message);
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
  const brandLogo =
    gbpPlace.data?.googlePicture ||
    (gbpPlace.data?.tenantFallback as any)?.logoUrl ||
    undefined;
  const brandPhone =
    gbpPlace.data?.place?.phone ||
    gbpPlace.data?.tenantFallback?.phone ||
    undefined;
  const brandCity =
    gbpPlace.data?.place?.city ||
    (gbpPlace.data?.tenantFallback as any)?.city ||
    'Patna';
  const brandCategory =
    gbpPlace.data?.place?.category ||
    gbpPlace.data?.tenantFallback?.category ||
    'Retail & Local Services';

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
      setSelectedTemplate(null);
      setPendingAssets(normalized);
      setComposerMode('upload');
      setComposerVisible(true);
    } catch (e: any) {
      Alert.alert('Media Picker Error', e?.message || 'Could not select media. Please try again.');
    }
  };

  const handleEditItem = (item: GbpPhoto) => {
    setPendingAssets([]);
    setSelectedTemplate(null);
    setEditingItem(item);
    setComposerMode('upload');
    setComposerVisible(true);
  };

  const handleAiCreate = () => {
    setViewMode('studio');
  };

  const handleSelectTemplate = (tpl: any) => {
    setPendingAssets([]);
    setEditingItem(null);
    setSelectedTemplate(tpl);
    setComposerMode('ai_generate');
    setComposerVisible(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([photosRes.refresh(), gbpPlace.refresh(), discover.refresh()]).catch(() => {});
    setRefreshing(false);
  };

  if (viewMode === 'studio') {
    return (
      <View style={styles.screenWrapper}>
        <AiStudioFeed
          embedded
          businessName={profileName}
          industry={
            gbpPlace.data?.place?.category ||
            gbpPlace.data?.tenantFallback?.category ||
            'IT & Software Development'
          }
          city={gbpPlace.data?.place?.city || (gbpPlace.data?.tenantFallback as any)?.city || 'Patna'}
          phone={gbpPlace.data?.place?.phone || gbpPlace.data?.tenantFallback?.phone || undefined}
          logoUrl={gbpPlace.data?.googlePicture || undefined}
          onSelectTemplate={handleSelectTemplate}
          onPublished={async (msg) => {
            setStatusBanner(msg);
            onStatusMessage?.(msg);
            await photosRes.refresh();
            setViewMode('media');
          }}
          onBack={() => setViewMode('media')}
        />

        <MediaMetadataSheet
          visible={composerVisible}
          onClose={() => setComposerVisible(false)}
          businessName={profileName}
          pendingAssets={pendingAssets}
          editingItem={editingItem}
          selectedTemplate={selectedTemplate}
          workspaceLocale={photosRes.data?.locale || null}
          initialMode={composerMode}
          onSaved={async (msg) => {
            setStatusBanner(msg);
            onStatusMessage?.(msg);
            await photosRes.refresh();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 96, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} />
        }
      >
        {/* Slim Media Action Header */}
        <View style={styles.subHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subHeaderTitle}>Google Maps Media &amp; Gallery</Text>
            <Text style={styles.subHeaderHint}>Upload photos/videos or generate clean AI visuals</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Media Help"
            onPress={() => setHelpOpen(true)}
            style={styles.helpButton}
          >
            <Text style={styles.helpButtonText}>Guide</Text>
          </Pressable>
        </View>

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
            logoUrl={brandLogo}
            phone={brandPhone}
            city={brandCity}
            category={brandCategory}
            isConnected={resolvedConnected}
            connectionState={resolvedConnectionState}
            onConnectPress={() => router.push('/select-profile')}
            timeZone={photosRes.data?.locale?.timeZone}
            locale={photosRes.data?.locale?.locale}
            onUploadPress={handleUpload}
            onAiCreatePress={handleAiCreate}
            onSelectTemplate={handleSelectTemplate}
            onEditItem={handleEditItem}
            onRefreshNeeded={() => photosRes.refresh()}
            initialTab={initialTab}
            focusedMediaId={focusedMediaId}
            onClearFocus={() => setFocusedMediaId(null)}
          />
        )}
      </ScrollView>

      <MediaMetadataSheet
        visible={composerVisible}
        onClose={() => setComposerVisible(false)}
        businessName={profileName}
        pendingAssets={pendingAssets}
        editingItem={editingItem}
        selectedTemplate={selectedTemplate}
        workspaceLocale={photosRes.data?.locale || null}
        initialMode={composerMode}
        onSaved={async (msg) => {
          setStatusBanner(msg);
          onStatusMessage?.(msg);
          await photosRes.refresh();
        }}
      />

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <View style={styles.helpOverlay}>
          <View style={styles.helpModalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="photo-library" size={20} color={colors.brand} />
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
    backgroundColor: '#F8FAFC',
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  subHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  subHeaderHint: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  bannerCard: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
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
