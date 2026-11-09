import React, { useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Action, Card, Empty, ErrorNotice, Loading, colors } from '../ui';
import { normalizePendingUpload, type PendingUpload } from '../../lib/upload';
import { gbpColors, shortDate } from './bits';
import { MediaMetadataSheet } from './media-metadata-sheet';
import type { GbpConnectionState, GbpPhoto, PhotosResponse } from './types';

type TabKey = 'soon' | 'published' | 'unposted';
type BoardVariant = 'default' | 'dhanda';

function PhotoCell({
  photo,
  scheduled,
  unposted,
  onPress,
}: {
  photo: GbpPhoto;
  scheduled: boolean;
  unposted?: boolean;
  onPress?: () => void;
}) {
  const isVideo = photo.mediaFormat === 'VIDEO';
  const editable = photo.source === 'queue' && Boolean(onPress);

  return (
    <Pressable
      disabled={!editable}
      onPress={onPress}
      accessibilityRole={editable ? 'button' : 'image'}
      accessibilityLabel={photo.title || photo.caption || 'Google Business Profile media'}
      style={({ pressed }) => ({
        flex: 1,
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: colors.soft,
        borderWidth: 1,
        borderColor: colors.line,
        opacity: pressed && editable ? 0.85 : 1,
      })}
    >
      <Image
        source={{ uri: photo.thumbnailUrl || photo.url }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessibilityLabel={photo.title || photo.caption || 'Google Business Profile media'}
        alt={photo.title || photo.caption || 'Google Business Profile media'}
      />

      {isVideo ? (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: 'rgba(7,11,45,0.72)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="videocam" size={14} color="#FFFFFF" />
        </View>
      ) : null}

      {photo.tags && photo.tags.length > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: 6,
            paddingHorizontal: 5,
            paddingVertical: 1.5,
          }}
        >
          <Text style={{ color: colors.brandDark, fontSize: 9, fontWeight: '800' }} numberOfLines={1}>
            #{photo.tags[0]}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          position: 'absolute',
          left: 6,
          bottom: 6,
          right: 6,
          gap: 3,
        }}
      >
        {photo.title ? (
          <View
            style={{
              backgroundColor: 'rgba(7,11,45,0.72)',
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '700' }} numberOfLines={1}>
              {photo.title}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {unposted ? (
            <View
              style={{
                backgroundColor: colors.danger,
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' }}>Not Posted</Text>
            </View>
          ) : scheduled ? (
            <View
              style={{
                backgroundColor: gbpColors.amber,
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' }}>Scheduled</Text>
            </View>
          ) : null}

          {shortDate(photo.scheduledFor || photo.createdAt) ? (
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.92)',
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: colors.ink, fontSize: 9.5, fontWeight: '700' }}>
                {shortDate(photo.scheduledFor || photo.createdAt)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function AddNewCell({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add new photos or videos"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        aspectRatio: 1,
        borderRadius: 12,
        backgroundColor: colors.brandSoft,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <MaterialIcons name="add" size={32} color={colors.brand} />
      <Text style={{ color: colors.brandDark, fontSize: 12, fontWeight: '800' }}>Add Media</Text>
    </Pressable>
  );
}

/** 3-column media grid; the first cell is the "+ Add Media" picker tile. */
function Grid({
  photos,
  scheduled,
  unposted,
  onAdd,
  onEdit,
}: {
  photos: GbpPhoto[];
  scheduled: boolean;
  unposted?: boolean;
  onAdd: () => void;
  onEdit?: (photo: GbpPhoto) => void;
}) {
  const firstRow = photos.slice(0, 2);
  const rest = photos.slice(2);
  const restRows: GbpPhoto[][] = [];
  for (let i = 0; i < rest.length; i += 3) restRows.push(rest.slice(i, i + 3));

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <AddNewCell onPress={onAdd} />
        {firstRow.map((p) => (
          <PhotoCell
            key={p.id}
            photo={p}
            scheduled={scheduled}
            unposted={unposted}
            onPress={p.source === 'queue' && onEdit ? () => onEdit(p) : undefined}
          />
        ))}
        {Array.from({ length: Math.max(0, 2 - firstRow.length) }).map((_, i) => (
          <View key={`pad-first-${i}`} style={{ flex: 1, aspectRatio: 1 }} />
        ))}
      </View>
      {restRows.map((row, rIdx) => (
        <View key={rIdx} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((p) => (
            <PhotoCell
              key={p.id}
              photo={p}
              scheduled={scheduled}
              unposted={unposted}
              onPress={p.source === 'queue' && onEdit ? () => onEdit(p) : undefined}
            />
          ))}
          {Array.from({ length: Math.max(0, 3 - row.length) }).map((_, i) => (
            <View key={`pad-${rIdx}-${i}`} style={{ flex: 1, aspectRatio: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Shared GBP Media board — used inside the GBP AI Hub Media sub-tab.
 * Supports picking Photos & Videos across native and Expo Web, opening
 * MediaMetadataSheet for AI Title, SEO Description, Tags & Category, and
 * editing or removing queued/draft items.
 */
export function PhotosBoard({
  data,
  loading,
  error,
  refresh,
  connected,
  connectionState,
  onNeedConnect,
  variant = 'default',
  businessName = 'My Business',
}: {
  data: PhotosResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<unknown>;
  connected: boolean;
  connectionState?: GbpConnectionState;
  /** Fired when the user taps a connect CTA while GBP is not connected. */
  onNeedConnect?: () => void;
  variant?: BoardVariant;
  businessName?: string;
}) {
  const [tab, setTab] = useState<TabKey>('soon');
  const [pendingAssets, setPendingAssets] = useState<PendingUpload[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GbpPhoto | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const all = useMemo(() => data?.photos || [], [data]);
  const published = useMemo(
    () =>
      all
        .filter((p) => p.source === 'google')
        .sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0)),
    [all],
  );
  const queued = useMemo(
    () =>
      all
        .filter((p) => p.source === 'queue')
        .sort((a, b) => (Date.parse(a.createdAt || '') || 0) - (Date.parse(b.createdAt || '') || 0)),
    [all],
  );

  const publishedCount = data?.liveCount ?? published.length;
  const scheduledQueue = useMemo(
    () => queued.filter((p) => p.status === 'scheduled' || p.status === 'publishing'),
    [queued],
  );
  const unpostedQueue = useMemo(
    () => queued.filter((p) => p.status !== 'scheduled' && p.status !== 'publishing'),
    [queued],
  );
  const dhanda = variant === 'dhanda';

  type TabOption = {
    key: TabKey;
    label: string;
    count: number;
    icon: React.ComponentProps<typeof MaterialIcons>['name'];
  };
  const tabOptions: TabOption[] = dhanda
    ? [
        { key: 'soon', label: 'Scheduled', count: scheduledQueue.length, icon: 'calendar-today' },
        { key: 'published', label: 'Uploaded', count: publishedCount, icon: 'cloud-done' },
        { key: 'unposted', label: 'Not Posted', count: unpostedQueue.length, icon: 'info-outline' },
      ]
    : [
        { key: 'soon', label: 'Scheduled', count: scheduledQueue.length, icon: 'schedule' },
        { key: 'published', label: 'Published', count: publishedCount, icon: 'cloud-done' },
        { key: 'unposted', label: 'Not Posted', count: unpostedQueue.length, icon: 'bookmark-border' },
      ];

  const activeList =
    tab === 'published' ? published : tab === 'unposted' ? unpostedQueue : scheduledQueue;

  async function pickPhotos() {
    setLocalError(null);
    setNotice(null);
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Media library access needed',
            'Allow photo & video access in Settings so BGOS can upload media to your Google Business Profile.',
          );
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.85,
        exif: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const mapped = result.assets.map((a, i) =>
        normalizePendingUpload(
          {
            uri: a.uri,
            name: a.fileName || `${a.type === 'video' ? 'video' : 'photo'}-${Date.now()}-${i}`,
            mimeType: a.mimeType || (a.type === 'video' ? 'video/mp4' : 'image/jpeg'),
            file: (a as any).file,
            fileSize: a.fileSize,
            mediaType: a.type === 'video' ? 'video' : 'image',
          },
          i,
        ),
      );
      setEditingItem(null);
      setPendingAssets(mapped);
      setComposerOpen(true);
    } catch (e) {
      setLocalError((e as Error).message || 'Could not open the media picker.');
    }
  }

  function openEditModal(item: GbpPhoto) {
    setPendingAssets([]);
    setEditingItem(item);
    setComposerOpen(true);
  }

  function SegmentedPills() {
    return (
      <View style={{ gap: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#EEF2F6',
            borderRadius: 16,
            padding: 4,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          {tabOptions.map((opt) => {
            const active = opt.key === tab;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(opt.key)}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  paddingVertical: 9,
                  paddingHorizontal: 6,
                  borderRadius: 12,
                  backgroundColor: active ? colors.brand : 'transparent',
                  opacity: pressed && !active ? 0.75 : 1,
                })}
              >
                <MaterialIcons
                  name={opt.icon}
                  size={14}
                  color={active ? '#FFFFFF' : colors.muted}
                />
                <Text
                  style={{
                    color: active ? '#FFFFFF' : colors.muted,
                    fontSize: 11.5,
                    fontWeight: '700',
                  }}
                  numberOfLines={1}
                >
                  {opt.label} ({opt.count})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {dhanda ? (
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink, paddingHorizontal: 4 }}>
            {activeList.length} Media {tab === 'soon' ? 'scheduled' : tab === 'published' ? 'uploaded' : 'not posted'}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <ErrorNotice message={localError || error} retry={() => void refresh()} />
      {notice ? (
        <Card style={{ backgroundColor: colors.successSoft, borderColor: '#A7F3D0' }}>
          <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>✓ {notice}</Text>
        </Card>
      ) : null}

      {!connected ? (
        <Card style={{ backgroundColor: colors.note, borderColor: colors.noteBorder, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="info-outline" size={16} color={colors.noteText} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.noteText }}>
              {(connectionState || data?.connectionState) === 'select_profile'
                ? 'Select your active Google Business location'
                : (connectionState || data?.connectionState) === 'reconnect_required'
                  ? 'Google Business Profile session expired'
                  : 'Media publishes to Google once GBP is connected'}
            </Text>
          </View>
          <Text style={{ fontSize: 12, lineHeight: 18, color: colors.noteText }}>
            {(connectionState || data?.connectionState) === 'select_profile'
              ? 'Multiple Google Business locations are linked. Choose which location to publish media to.'
              : (connectionState || data?.connectionState) === 'reconnect_required'
                ? 'Uploads save safely in BGOS. Reconnect your Google account to resume automatic publishing.'
                : 'Uploads save safely in BGOS with AI title & tags. Connect your Google Business Profile to start publishing.'}
          </Text>
          {onNeedConnect ? (
            <Action
              label={
                (connectionState || data?.connectionState) === 'select_profile'
                  ? 'Select Profile'
                  : (connectionState || data?.connectionState) === 'reconnect_required'
                    ? 'Reconnect Google'
                    : 'Connect in Overview'
              }
              icon="login"
              onPress={onNeedConnect}
            />
          ) : null}
        </Card>
      ) : null}

      <SegmentedPills />

      {loading ? (
        <Loading />
      ) : activeList.length === 0 ? (
        dhanda ? (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 28,
              paddingHorizontal: 16,
              gap: 12,
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                backgroundColor: colors.brandSoft,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#C6F6D5',
              }}
            >
              <MaterialIcons
                name={tab === 'published' ? 'photo-library' : tab === 'unposted' ? 'bookmark-border' : 'event-available'}
                size={36}
                color={colors.brand}
              />
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
                {tab === 'soon'
                  ? 'No Media Scheduled'
                  : tab === 'published'
                    ? 'No Media Uploaded'
                    : 'No Media in Drafts'}
              </Text>
              <Text style={{ fontSize: 12.5, color: colors.muted, textAlign: 'center', lineHeight: 18 }}>
                Upload photos or videos — BGOS AI generates local-SEO titles, descriptions, and tags automatically.
              </Text>
            </View>
            <View style={{ width: '100%', maxWidth: 300 }}>
              <Action label="Upload Media" icon="cloud-upload" onPress={pickPhotos} />
            </View>
          </View>
        ) : (
          <Empty
            title={
              tab === 'soon'
                ? 'Nothing scheduled'
                : tab === 'published'
                  ? 'No Google media yet'
                  : 'No drafts or unposted media'
            }
            detail={
              tab === 'soon'
                ? 'Upload photos or videos and let AI write the SEO title & tags and publish on your schedule.'
                : tab === 'published'
                  ? 'Published photos & videos from your Google Business Profile appear here.'
                  : 'Drafts and media saved before connecting Google appear here — tap any item to edit.'
            }
            actionLabel="Add Photos & Videos"
            onAction={pickPhotos}
          />
        )
      ) : (
        <Grid
          photos={activeList}
          scheduled={tab === 'soon'}
          unposted={tab === 'unposted'}
          onAdd={pickPhotos}
          onEdit={openEditModal}
        />
      )}

      <MediaMetadataSheet
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        businessName={businessName}
        pendingAssets={pendingAssets}
        editingItem={editingItem}
        workspaceLocale={data?.locale || null}
        onSaved={async (msg) => {
          setNotice(msg);
          await refresh();
        }}
      />
    </View>
  );
}
