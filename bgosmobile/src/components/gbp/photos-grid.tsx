import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Action, Card, Empty, ErrorNotice, Field, Loading, colors, ui } from '../ui';
import { apiRequest } from '../../lib/api';
import { uploadFileToStorage, type PendingUpload } from '../../lib/upload';
import { gbpColors, shortDate } from './bits';
import type { GbpPhoto, PhotosResponse } from './types';

type TabKey = 'soon' | 'published';
type ScheduleMode = 'instant' | 'daily' | 'weekly';

const SCHEDULE_OPTIONS: {
  value: ScheduleMode;
  label: string;
  chip: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  { value: 'instant', label: 'Publish now', chip: 'Now', icon: 'bolt' },
  { value: 'daily', label: 'Daily drip', chip: 'AI · Daily', icon: 'today' },
  { value: 'weekly', label: 'Weekly drip', chip: 'AI · Weekly', icon: 'date-range' },
];

function PhotoCell({ photo, scheduled }: { photo: GbpPhoto; scheduled: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: colors.soft,
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      <Image
        source={{ uri: photo.thumbnailUrl || photo.url }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessibilityLabel={photo.caption || 'Google Business Profile photo'}
      />
      <View
        style={{
          position: 'absolute',
          left: 6,
          bottom: 6,
          right: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          flexWrap: 'wrap',
        }}
      >
        {scheduled ? (
          <View style={{ backgroundColor: gbpColors.amber, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' }}>Scheduled</Text>
          </View>
        ) : null}
        {shortDate(photo.scheduledFor || photo.createdAt) ? (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: colors.ink, fontSize: 9.5, fontWeight: '700' }}>
              {shortDate(photo.scheduledFor || photo.createdAt)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AddNewCell({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add new photos"
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
      <MaterialIcons name="add" size={34} color={colors.brand} />
      <Text style={{ color: colors.brand, fontSize: 12.5, fontWeight: '800' }}>Add New</Text>
    </Pressable>
  );
}

/** 3-column photo grid; the first cell is the "+ Add New" picker tile. */
function Grid({ photos, scheduled, onAdd }: { photos: GbpPhoto[]; scheduled: boolean; onAdd: () => void }) {
  const firstRow = photos.slice(0, 2);
  const rest = photos.slice(2);
  const restRows: GbpPhoto[][] = [];
  for (let i = 0; i < rest.length; i += 3) restRows.push(rest.slice(i, i + 3));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <AddNewCell onPress={onAdd} />
        {firstRow.map((p) => (
          <PhotoCell key={p.id} photo={p} scheduled={scheduled} />
        ))}
        {Array.from({ length: Math.max(0, 2 - firstRow.length) }).map((_, i) => (
          <View key={`pad-first-${i}`} style={{ flex: 1, aspectRatio: 1 }} />
        ))}
      </View>
      {restRows.map((row, rIdx) => (
        <View key={rIdx} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((p) => (
            <PhotoCell key={p.id} photo={p} scheduled={scheduled} />
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
 * Shared GBP Photos board (design spec §7) — used by the Photos tab AND the
 * Photos sub-tab inside the GBP AI Hub so both stay pixel-identical.
 * Real device picking (expo-image-picker) → authenticated upload →
 * POST /api/social/photos with an AI drip schedule.
 */
export function PhotosBoard({
  data,
  loading,
  error,
  refresh,
  connected,
  onNeedConnect,
}: {
  data: PhotosResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<unknown>;
  connected: boolean;
  /** Fired when the user taps a connect CTA while GBP is not connected. */
  onNeedConnect?: () => void;
}) {
  const [tab, setTab] = useState<TabKey>('soon');
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [schedule, setSchedule] = useState<ScheduleMode>('instant');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
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
  const soonCount = data?.queuedCount ?? queued.length;

  async function pickPhotos() {
    setLocalError(null);
    setNotice(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Photo library access needed',
          'Allow photo access in Settings so BGOS can upload photos to your Google Business Profile.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
        exif: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const mapped = result.assets.map((a, i) => ({
        uri: a.uri,
        name: a.fileName || `gbp-photo-${Date.now()}-${i}.jpg`,
        mimeType: a.mimeType || 'image/jpeg',
      }));
      setPending(mapped);
      setTab('soon');
    } catch (e) {
      setLocalError((e as Error).message || 'Could not open the photo picker.');
    }
  }

  async function uploadPending() {
    if (!pending.length || uploading) return;
    setUploading(true);
    setLocalError(null);
    setNotice(null);
    try {
      const urls: string[] = [];
      for (const file of pending) {
        urls.push(await uploadFileToStorage(file));
      }
      const res = await apiRequest<{
        success: boolean;
        message?: string;
        results?: Array<{ url: string; status: string }>;
      }>('/api/social/photos', {
        method: 'POST',
        body: {
          photos: urls,
          scheduleMode: schedule,
          category: 'ADDITIONAL',
          description: description.trim() || undefined,
        },
      });
      const savedLocally = (res.results || []).some((r) => (r.status || '').includes('saved_locally'));
      setPending([]);
      setDescription('');
      setNotice(
        savedLocally
          ? 'Photos stored in BGOS — they will publish to Google automatically once your profile is connected.'
          : res.message || 'Photos sent to your Google Business Profile.',
      );
      await refresh();
    } catch (e: unknown) {
      setLocalError(e instanceof Error ? e.message : 'Could not upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function SegmentedPills() {
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([
          { key: 'soon' as TabKey, label: 'Publishing Soon', count: soonCount },
          { key: 'published' as TabKey, label: 'Published', count: publishedCount },
        ]).map((opt) => {
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
                gap: 6,
                minHeight: 42,
                borderRadius: 12,
                backgroundColor: active ? colors.brand : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.brand : colors.line,
                opacity: pressed && !active ? 0.7 : 1,
              })}
            >
              <Text style={{ color: active ? '#FFFFFF' : colors.muted, fontSize: 13, fontWeight: '700' }}>
                {opt.label}
              </Text>
              <View
                style={{
                  minWidth: 22,
                  height: 20,
                  paddingHorizontal: 6,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? 'rgba(255,255,255,0.25)' : colors.soft,
                }}
              >
                <Text style={{ color: active ? '#FFFFFF' : colors.muted, fontSize: 11, fontWeight: '800' }}>
                  {opt.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const activeList = tab === 'soon' ? queued : published;

  return (
    <View style={{ gap: 12 }}>
      <ErrorNotice message={localError || error} retry={() => void refresh()} />
      {notice ? (
        <Card style={{ backgroundColor: colors.successSoft }}>
          <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>✓ {notice}</Text>
        </Card>
      ) : null}

      {!connected ? (
        <Card style={{ backgroundColor: colors.note, borderColor: colors.noteBorder, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="info-outline" size={16} color={colors.noteText} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.noteText }}>
              Photos publish to Google once GBP is connected
            </Text>
          </View>
          <Text style={{ fontSize: 12, lineHeight: 18, color: colors.noteText }}>
            Uploads are stored safely in BGOS. Connect your Google Business Profile and AI starts the drip.
          </Text>
          {onNeedConnect ? <Action label="Connect in the GBP tab" icon="login" onPress={onNeedConnect} /> : null}
        </Card>
      ) : null}

      <SegmentedPills />

      {/* Pending upload composer (after image picking) */}
      {pending.length > 0 ? (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="auto-awesome" size={15} color={gbpColors.ai} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.ink }}>
              ✨ AI Suggested — {pending.length} photo{pending.length === 1 ? '' : 's'} ready
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove selected photo ${pending.length > 1 ? 's' : ''}`}
              onPress={() => setPending([])}
              hitSlop={8}
            >
              <MaterialIcons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {pending.map((p, i) => (
              <Image
                key={`${p.uri}-${i}`}
                source={{ uri: p.uri }}
                style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: colors.soft }}
                accessibilityIgnoresInvertColors
              />
            ))}
          </View>

          <View style={{ gap: 6 }}>
            <Text style={ui.label}>Publishing schedule</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {SCHEDULE_OPTIONS.map((opt) => {
                const active = opt.value === schedule;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setSchedule(opt.value)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      minHeight: 40,
                      borderRadius: 10,
                      backgroundColor: active ? colors.brand : colors.surface,
                      borderWidth: 1,
                      borderColor: active ? colors.brand : colors.line,
                      paddingHorizontal: 4,
                    }}
                  >
                    <MaterialIcons name={opt.icon} size={14} color={active ? '#FFFFFF' : colors.muted} />
                    <Text
                      style={{ color: active ? '#FFFFFF' : colors.muted, fontSize: 11.5, fontWeight: '700' }}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={ui.caption}>
              {schedule === 'instant'
                ? 'Photos upload straight to Google now.'
                : schedule === 'daily'
                ? 'AI publishes one photo per day to keep your profile fresh.'
                : 'AI publishes one photo per week on a steady drip.'}
            </Text>
          </View>

          <Field
            label="Caption / SEO description (optional)"
            placeholder="e.g. Recent bathroom remodel in Austin — same-week service"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Action
                label={uploading ? 'Uploading…' : schedule === 'instant' ? 'Publish to Google' : 'Queue AI Drip'}
                icon="cloud-upload"
                onPress={() => void uploadPending()}
                disabled={uploading}
              />
            </View>
            <View style={{ minWidth: 110 }}>
              <Action label="Cancel" secondary onPress={() => setPending([])} disabled={uploading} />
            </View>
          </View>
          {uploading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={ui.caption}>Uploading to BGOS storage, then queueing on Google…</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {loading ? (
        <Loading />
      ) : activeList.length === 0 ? (
        <Empty
          title={tab === 'soon' ? 'Nothing scheduled' : 'No photos published'}
          detail={
            tab === 'soon'
              ? 'Upload photos and let AI publish them to your Google Business Profile on a daily or weekly drip.'
              : 'Published photos from your Google Business Profile appear here.'
          }
          actionLabel="Add Photos"
          onAction={pickPhotos}
        />
      ) : (
        <Grid photos={activeList} scheduled={tab === 'soon'} onAdd={pickPhotos} />
      )}
    </View>
  );
}
