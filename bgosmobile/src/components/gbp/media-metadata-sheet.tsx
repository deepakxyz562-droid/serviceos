import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../ui';
import { apiRequest } from '../../lib/api';
import {
  normalizePendingUpload,
  uploadFileToStorage,
  type PendingUpload,
} from '../../lib/upload';
import {
  COUNTRIES,
  detectDeviceCountryAndTimezone,
  getCountryByCode,
  getTimeZoneShortLabel,
  type CountryItem,
} from '../../lib/country-codes';
import type { GbpPhoto } from './types';

export type MediaScheduleMode = 'daily' | 'weekly' | 'instant' | 'draft';
export type GbpCategoryType =
  | 'ADDITIONAL'
  | 'EXTERIOR'
  | 'INTERIOR'
  | 'PRODUCT'
  | 'AT_WORK'
  | 'TEAMS';
export type AiMediaIntent = 'local_seo' | 'showcase' | 'behind_the_scenes' | 'team' | 'offer';

interface UploadedMediaState {
  local: PendingUpload;
  cloudUrl?: string;
  uploading: boolean;
  progress?: number;
  error?: string;
}

interface WorkspaceLocaleInfo {
  country?: string;
  countryName?: string;
  callingCode?: string;
  timeZone?: string;
  locale?: string;
}

interface AiMetadataResponse {
  success?: boolean;
  title?: string;
  description?: string;
  tags?: string[];
  category?: GbpCategoryType;
  suggestedTitles?: string[];
  suggestedTags?: string[];
  businessName?: string;
}

const GBP_CATEGORIES: { value: GbpCategoryType; label: string }[] = [
  { value: 'ADDITIONAL', label: 'General' },
  { value: 'EXTERIOR', label: 'Exterior' },
  { value: 'INTERIOR', label: 'Interior' },
  { value: 'PRODUCT', label: 'Product / Service' },
  { value: 'AT_WORK', label: 'At Work' },
  { value: 'TEAMS', label: 'Team' },
];

const AI_INTENTS: { value: AiMediaIntent; label: string }[] = [
  { value: 'local_seo', label: 'Local SEO' },
  { value: 'showcase', label: 'Showcase' },
  { value: 'behind_the_scenes', label: 'Work in Action' },
  { value: 'team', label: 'Team' },
  { value: 'offer', label: 'Highlight / Offer' },
];

const SCHEDULE_MODES: {
  value: MediaScheduleMode;
  label: string;
  sub: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  { value: 'daily', label: 'Daily Schedule', sub: '1/day local cadence', icon: 'today' },
  { value: 'weekly', label: 'Weekly Schedule', sub: '1/week steady flow', icon: 'date-range' },
  { value: 'instant', label: 'Publish Now', sub: 'Direct to Google', icon: 'bolt' },
  { value: 'draft', label: 'Save Draft', sub: 'Keep in Not Posted', icon: 'bookmark-border' },
];

const PUBLISH_TIMES: { value: string; label: string }[] = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '19:00', label: '7:00 PM' },
];

export function MediaMetadataSheet({
  visible,
  onClose,
  businessName,
  pendingAssets = [],
  editingItem = null,
  initialScheduleMode = 'daily',
  workspaceLocale = null,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  businessName: string;
  pendingAssets?: PendingUpload[];
  editingItem?: GbpPhoto | null;
  initialScheduleMode?: MediaScheduleMode;
  workspaceLocale?: WorkspaceLocaleInfo | null;
  onSaved: (message: string) => void | Promise<void>;
}) {
  const detected = detectDeviceCountryAndTimezone();
  const [uploads, setUploads] = useState<UploadedMediaState[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState<GbpCategoryType>('ADDITIONAL');
  const [scheduleMode, setScheduleMode] = useState<MediaScheduleMode>(initialScheduleMode);
  const [preferredTime, setPreferredTime] = useState('10:00');
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(
    workspaceLocale?.country ? getCountryByCode(workspaceLocale.country) : detected.country,
  );
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>(
    workspaceLocale?.timeZone || detected.timeZone,
  );
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [intent, setIntent] = useState<AiMediaIntent>('local_seo');
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sessionKeyRef = useRef(0);
  const isEditMode = Boolean(editingItem && (editingItem.postId || editingItem.id));

  async function runAiMetadata(
    filenames: string[],
    selectedIntent: AiMediaIntent,
    mediaType: 'photo' | 'video',
    hint?: string,
  ) {
    const reqKey = sessionKeyRef.current;
    setAiLoading(true);
    try {
      const res = await apiRequest<AiMetadataResponse>('/api/social/ai-media-metadata', {
        method: 'POST',
        body: {
          filenames,
          mediaType,
          intent: selectedIntent,
          customHint: hint,
        },
      });
      if (reqKey !== sessionKeyRef.current) return;
      if (res?.title) setTitle(res.title);
      if (res?.description) setDescription(res.description);
      if (Array.isArray(res?.tags) && res.tags.length > 0) setTags(res.tags);
      if (res?.category) setCategory(res.category);
      if (Array.isArray(res?.suggestedTitles)) setSuggestedTitles(res.suggestedTitles);
      if (Array.isArray(res?.suggestedTags)) setSuggestedTags(res.suggestedTags);
    } catch {
      // Fall back cleanly using business name without blocking user
      if (reqKey === sessionKeyRef.current && !title) {
        setTitle(`${businessName} · Recent ${mediaType === 'video' ? 'Video' : 'Showcase'}`);
        setDescription(
          `Latest update from ${businessName}. Visit our Google Business Profile or get in touch for reliable local service.`,
        );
        setTags([businessName, 'Local Business', 'Customer Showcase']);
      }
    } finally {
      if (reqKey === sessionKeyRef.current) setAiLoading(false);
    }
  }

  useEffect(() => {
    if (!visible) return;
    sessionKeyRef.current += 1;
    const reqKey = sessionKeyRef.current;
    setErrorMsg(null);
    setTagInput('');
    const d = detectDeviceCountryAndTimezone();
    setSelectedCountry(workspaceLocale?.country ? getCountryByCode(workspaceLocale.country) : d.country);
    setSelectedTimeZone(workspaceLocale?.timeZone || d.timeZone);

    if (editingItem) {
      setUploads([]);
      setTitle(editingItem.title || `${businessName} Showcase`);
      setDescription(editingItem.description || editingItem.caption || '');
      setTags(Array.isArray(editingItem.tags) ? editingItem.tags : []);
      const cat = String(editingItem.gbpCategory || editingItem.category || 'ADDITIONAL').toUpperCase();
      setCategory(
        GBP_CATEGORIES.some((c) => c.value === cat) ? (cat as GbpCategoryType) : 'ADDITIONAL',
      );
      setScheduleMode(editingItem.status === 'draft' ? 'draft' : 'daily');
      setSuggestedTitles([]);
      setSuggestedTags([]);
      return;
    }

    const normalized = pendingAssets.map((a, idx) => normalizePendingUpload(a, idx));
    setScheduleMode(initialScheduleMode);
    setIntent('local_seo');
    setTitle('');
    setDescription('');
    setTags([]);
    setSuggestedTitles([]);
    setSuggestedTags([]);

    if (!normalized.length) {
      setUploads([]);
      return;
    }

    const initialState: UploadedMediaState[] = normalized.map((local) => ({
      local,
      uploading: true,
      progress: 0,
    }));
    setUploads(initialState);

    const hasVideo = normalized.some((n) => n.mediaType === 'video');
    void runAiMetadata(
      normalized.map((n) => n.name),
      'local_seo',
      hasVideo ? 'video' : 'photo',
    );

    normalized.forEach(async (item, idx) => {
      try {
        const cloudUrl = await uploadFileToStorage(item, {
          folder: 'gbp-media',
          visibility: 'public',
          onProgress: (pct) => {
            if (reqKey !== sessionKeyRef.current) return;
            setUploads((prev) =>
              prev.map((row, rIdx) => (rIdx === idx ? { ...row, progress: pct } : row)),
            );
          },
        });
        if (reqKey !== sessionKeyRef.current) return;
        setUploads((prev) =>
          prev.map((row, rIdx) =>
            rIdx === idx ? { ...row, cloudUrl, uploading: false, progress: 100, error: undefined } : row,
          ),
        );
      } catch (err: unknown) {
        if (reqKey !== sessionKeyRef.current) return;
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploads((prev) =>
          prev.map((row, rIdx) => (rIdx === idx ? { ...row, uploading: false, error: message } : row)),
        );
      }
    });
  }, [visible, editingItem, pendingAssets, initialScheduleMode, businessName, workspaceLocale]);

  async function retrySingleUpload(index: number) {
    const target = uploads[index];
    if (!target) return;
    setErrorMsg(null);
    setUploads((prev) =>
      prev.map((row, i) => (i === index ? { ...row, uploading: true, progress: 0, error: undefined } : row)),
    );
    try {
      const cloudUrl = await uploadFileToStorage(target.local, {
        folder: 'gbp-media',
        visibility: 'public',
        onProgress: (pct) => {
          setUploads((prev) =>
            prev.map((row, i) => (i === index ? { ...row, progress: pct } : row)),
          );
        },
      });
      setUploads((prev) =>
        prev.map((row, i) =>
          i === index ? { ...row, cloudUrl, uploading: false, progress: 100, error: undefined } : row,
        ),
      );
    } catch (err: unknown) {
      setUploads((prev) =>
        prev.map((row, i) =>
          i === index
            ? { ...row, uploading: false, error: err instanceof Error ? err.message : 'Retry failed' }
            : row,
        ),
      );
    }
  }

  function addCustomTag() {
    const cleaned = tagInput.replace(/^#+/, '').trim();
    if (!cleaned) return;
    if (!tags.some((t) => t.toLowerCase() === cleaned.toLowerCase())) {
      setTags((prev) => [...prev, cleaned].slice(0, 12));
    }
    setTagInput('');
  }

  function toggleSuggestedTag(tag: string) {
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTags((prev) => prev.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
    } else {
      setTags((prev) => [...prev, tag].slice(0, 12));
    }
  }

  const stillUploading = uploads.some((u) => u.uploading);
  const readyUrls = uploads.filter((u) => Boolean(u.cloudUrl));
  const failedUploads = uploads.filter((u) => Boolean(u.error));

  async function handleSubmit() {
    setErrorMsg(null);
    if (isEditMode && editingItem) {
      setSubmitting(true);
      try {
        const res = await apiRequest<{ success?: boolean }>('/api/social/photos', {
          method: 'PATCH',
          body: {
            postId: editingItem.postId || editingItem.id,
            title: title.trim() || `${businessName} Media`,
            description: description.trim(),
            tags,
            category,
            status: scheduleMode === 'draft' ? 'draft' : 'scheduled',
          },
        });
        if (!res?.success) throw new Error('Could not update media details.');
        await onSaved('Media details updated.');
        onClose();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Update failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (stillUploading) {
      setErrorMsg('Please wait for your selected media upload(s) to finish.');
      return;
    }
    if (!readyUrls.length) {
      setErrorMsg(
        failedUploads[0]?.error || 'No uploaded files succeeded. Tap Retry on failed files and try again.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const items = readyUrls.map((u, idx) => ({
        url: u.cloudUrl as string,
        title:
          readyUrls.length > 1 && title.trim()
            ? `${title.trim()} (${idx + 1})`
            : title.trim() || `${businessName} Media`,
        description: description.trim() || undefined,
        tags,
        category,
        mediaFormat: u.local.mediaType === 'video' ? ('VIDEO' as const) : ('PHOTO' as const),
      }));

      const res = await apiRequest<{ success?: boolean; message?: string }>('/api/social/photos', {
        method: 'POST',
        body: {
          items,
          photos: items.map((i) => i.url),
          title: title.trim(),
          description: description.trim() || undefined,
          tags,
          category,
          scheduleMode,
          preferredTime,
          country: selectedCountry.code,
          timeZone: selectedTimeZone,
        },
      });
      await onSaved(res?.message || 'Media saved & scheduled successfully.');
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save media. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingItem) return;
    Alert.alert('Remove from queue?', 'This removes the scheduled/draft item from your queue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await apiRequest(
              `/api/social/photos?id=${encodeURIComponent(editingItem.postId || editingItem.id)}`,
              { method: 'DELETE' },
            );
            await onSaved('Removed media item from queue.');
            onClose();
          } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'Could not delete item.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        {/* Top Bar */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close media composer"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={8}
          >
            <MaterialIcons name="close" size={20} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Media Details' : 'AI Media Title, Tags & Schedule'}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              Tailored for {businessName}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Regenerate with AI"
            onPress={() =>
              void runAiMetadata(
                isEditMode
                  ? [title || businessName]
                  : uploads.map((u) => u.local.name),
                intent,
                editingItem?.mediaFormat === 'VIDEO' ||
                  uploads.some((u) => u.local.mediaType === 'video')
                  ? 'video'
                  : 'photo',
                title || undefined,
              )
            }
            disabled={aiLoading}
            style={[styles.aiRegenBtn, aiLoading && { opacity: 0.6 }]}
          >
            <MaterialIcons name="auto-awesome" size={14} color="#7C3AED" />
            <Text style={styles.aiRegenText}>{aiLoading ? 'Writing…' : 'AI Rewrite'}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {errorMsg ? (
            <View style={styles.errorCard}>
              <MaterialIcons name="error-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Media Thumbnails & Cloud Upload Progress */}
          {isEditMode && editingItem ? (
            <View style={styles.editPreviewCard}>
              <Image
                source={{ uri: editingItem.thumbnailUrl || editingItem.url }}
                style={styles.editPreviewImg}
                resizeMode="cover"
                alt={editingItem.title || 'Selected media preview'}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.previewBadgeText}>
                  {editingItem.status === 'draft' ? 'Not Posted (Draft)' : 'Scheduled to Publish'}
                </Text>
                <Text style={styles.previewHint}>
                  Update title, SEO description, tags, or category anytime before publishing.
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                {uploads.map((item, idx) => (
                  <View key={`${item.local.uri}-${idx}`} style={styles.thumbCard}>
                    <Image source={{ uri: item.local.uri }} style={styles.thumbImage} resizeMode="cover" alt={item.local.name || 'Upload preview'} />
                    {item.local.mediaType === 'video' ? (
                      <View style={styles.videoPill}>
                        <MaterialIcons name="videocam" size={12} color="#FFFFFF" />
                      </View>
                    ) : null}
                    {item.uploading ? (
                      <View style={styles.thumbOverlay}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.thumbOverlayText}>
                          {item.progress && item.progress > 0 ? `${item.progress}%` : 'Uploading'}
                        </Text>
                      </View>
                    ) : item.error ? (
                      <Pressable
                        onPress={() => void retrySingleUpload(idx)}
                        style={[styles.thumbOverlay, { backgroundColor: 'rgba(186,53,71,0.88)' }]}
                      >
                        <MaterialIcons name="refresh" size={16} color="#FFFFFF" />
                        <Text style={styles.thumbOverlayText}>Tap Retry</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.donePill}>
                        <MaterialIcons name="check-circle" size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
              {failedUploads.length > 0 ? (
                <View style={styles.uploadFailBanner}>
                  <MaterialIcons name="warning-amber" size={15} color={colors.danger} />
                  <Text style={styles.uploadFailText} numberOfLines={2}>
                    {failedUploads[0]?.error || 'Upload failed'}
                  </Text>
                  <Pressable
                    onPress={() => {
                      uploads.forEach((u, i) => {
                        if (u.error) void retrySingleUpload(i);
                      });
                    }}
                    style={styles.retryMiniBtn}
                  >
                    <Text style={styles.retryMiniText}>Retry All</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}

          {/* AI Intent Chips */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>AI Focus</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {AI_INTENTS.map((item) => {
                const active = item.value === intent;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      setIntent(item.value);
                      void runAiMetadata(
                        isEditMode ? [title || businessName] : uploads.map((u) => u.local.name),
                        item.value,
                        editingItem?.mediaFormat === 'VIDEO' ||
                          uploads.some((u) => u.local.mediaType === 'video')
                          ? 'video'
                          : 'photo',
                      );
                    }}
                    style={[styles.chip, active && styles.chipPurpleActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipPurpleText]}>
                      ✨ {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Title Field + Alternatives */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>Title</Text>
              {aiLoading ? <Text style={styles.aiStatusHint}>AI generating…</Text> : null}
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={`e.g. Featured Showcase at ${businessName}`}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            {suggestedTitles.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 4 }}>
                {suggestedTitles.map((cand) => (
                  <Pressable
                    key={cand}
                    onPress={() => setTitle(cand)}
                    style={styles.altChip}
                  >
                    <Text style={styles.altChipText} numberOfLines={1}>
                      {cand}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>

          {/* Description Field */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>SEO Description</Text>
              <Text style={styles.charCount}>{description.length}/1500</Text>
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Write or refine your customer-facing media description..."
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, styles.textArea]}
            />
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tags & Local SEO Keywords</Text>
            <View style={styles.tagsWrap}>
              {tags.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  style={styles.selectedTagPill}
                >
                  <Text style={styles.selectedTagText}>#{tag}</Text>
                  <MaterialIcons name="close" size={12} color={colors.brandDark} />
                </Pressable>
              ))}
            </View>
            <View style={styles.tagInputRow}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addCustomTag}
                placeholder="Add custom tag (e.g. Weekend Event)"
                placeholderTextColor={colors.muted}
                style={[styles.input, { flex: 1, height: 40 }]}
              />
              <Pressable onPress={addCustomTag} style={styles.addTagBtn}>
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
            {suggestedTags.length > 0 ? (
              <View style={styles.tagsWrap}>
                {suggestedTags.map((st) => (
                  <Pressable
                    key={st}
                    onPress={() => toggleSuggestedTag(st)}
                    style={styles.suggestTagPill}
                  >
                    <Text style={styles.suggestTagText}>+ {st}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.helperCaption}>
              Tags organize your BGOS media library &amp; enrich your Google Business Profile SEO description.
            </Text>
          </View>

          {/* GBP Category */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Google Profile Category</Text>
            <View style={styles.tagsWrap}>
              {GBP_CATEGORIES.map((cat) => {
                const active = cat.value === category;
                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={[styles.chip, active && styles.chipBrandActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipBrandText]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Publish Timing */}
          {!isEditMode ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Where & When to Publish</Text>
              <View style={styles.scheduleGrid}>
                {SCHEDULE_MODES.map((opt) => {
                  const active = opt.value === scheduleMode;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setScheduleMode(opt.value)}
                      style={[styles.scheduleCard, active && styles.scheduleCardActive]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons
                          name={opt.icon}
                          size={16}
                          color={active ? colors.brand : colors.muted}
                        />
                        <Text style={[styles.scheduleTitle, active && { color: colors.brandDark }]}>
                          {opt.label}
                        </Text>
                      </View>
                      <Text style={styles.scheduleSub}>{opt.sub}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {(scheduleMode === 'daily' || scheduleMode === 'weekly') ? (
                <View style={styles.tzCard}>
                  <View style={styles.tzHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tzTitle}>
                        {selectedCountry.flag} {selectedCountry.name} ({getTimeZoneShortLabel(selectedTimeZone)})
                      </Text>
                      <Text style={styles.tzSub} numberOfLines={1}>
                        Scheduled in {selectedTimeZone}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setCountryPickerOpen(true)}
                      style={styles.changeTzBtn}
                    >
                      <Text style={styles.changeTzText}>Change Country</Text>
                    </Pressable>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 4 }}>
                    {PUBLISH_TIMES.map((slot) => {
                      const active = preferredTime === slot.value;
                      return (
                        <Pressable
                          key={slot.value}
                          onPress={() => setPreferredTime(slot.value)}
                          style={[styles.timeChip, active && styles.timeChipActive]}
                        >
                          <MaterialIcons
                            name="schedule"
                            size={12}
                            color={active ? colors.brandDark : colors.muted}
                          />
                          <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>
                            {slot.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Status</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setScheduleMode('daily')}
                  style={[styles.chip, scheduleMode !== 'draft' && styles.chipBrandActive]}
                >
                  <Text style={[styles.chipText, scheduleMode !== 'draft' && styles.chipBrandText]}>
                    Scheduled
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setScheduleMode('draft')}
                  style={[styles.chip, scheduleMode === 'draft' && styles.chipBrandActive]}
                >
                  <Text style={[styles.chipText, scheduleMode === 'draft' && styles.chipBrandText]}>
                    Draft (Not Posted)
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Sticky CTA */}
        <View style={styles.footer}>
          {isEditMode ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleDelete()}
              disabled={submitting}
              style={styles.deleteBtn}
            >
              <MaterialIcons name="delete-outline" size={19} color={colors.danger} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleSubmit()}
            disabled={submitting || (!isEditMode && stillUploading)}
            style={({ pressed }) => [
              styles.saveBtn,
              (submitting || (!isEditMode && stillUploading)) && { opacity: 0.65 },
              pressed && { opacity: 0.9 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.saveBtnText}>
              {submitting
                ? 'Saving…'
                : isEditMode
                  ? 'Save Changes'
                  : stillUploading
                    ? 'Uploading Media…'
                    : scheduleMode === 'instant'
                      ? 'Publish to Google Now'
                      : scheduleMode === 'draft'
                        ? 'Save as Draft'
                        : 'Save & Schedule'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Country & Timezone Picker Modal */}
      <Modal
        visible={countryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryPickerOpen(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Country &amp; Timezone</Text>
              <Pressable onPress={() => setCountryPickerOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {COUNTRIES.map((c) => {
                const active = c.code === selectedCountry.code;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      setSelectedCountry(c);
                      setSelectedTimeZone(c.timeZone);
                      setCountryPickerOpen(false);
                    }}
                    style={[styles.pickerRow, active && styles.pickerRowActive]}
                  >
                    <Text style={{ fontSize: 18 }}>{c.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerCountry}>{c.name}</Text>
                      <Text style={styles.pickerTz}>{c.timeZone}</Text>
                    </View>
                    {active ? <MaterialIcons name="check" size={18} color={colors.brand} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  headerSub: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 1,
  },
  aiRegenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.aiPurpleSoft,
    borderWidth: 1,
    borderColor: '#D8B4FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiRegenText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#6D28D9',
  },
  body: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  editPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  editPreviewImg: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.soft,
  },
  previewBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  previewHint: {
    fontSize: 11.5,
    color: colors.muted,
    lineHeight: 16,
  },
  thumbRow: {
    gap: 10,
  },
  thumbCard: {
    width: 86,
    height: 86,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  thumbOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  videoPill: {
    position: 'absolute',
    left: 6,
    top: 6,
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  donePill: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: colors.brand,
    borderRadius: 10,
    padding: 2,
  },
  section: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.ink,
  },
  aiStatusHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  charCount: {
    fontSize: 11,
    color: colors.muted,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipPurpleActive: {
    backgroundColor: colors.aiPurpleSoft,
    borderColor: '#C084FC',
  },
  chipBrandActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.muted,
  },
  chipPurpleText: {
    color: '#6D28D9',
    fontWeight: '800',
  },
  chipBrandText: {
    color: colors.brandDark,
    fontWeight: '800',
  },
  altChip: {
    maxWidth: 220,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  altChipText: {
    fontSize: 11,
    color: colors.ink,
    fontWeight: '600',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  selectedTagText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.brandDark,
  },
  suggestTagPill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  suggestTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addTagBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperCaption: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  scheduleCardActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  scheduleTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.ink,
  },
  scheduleSub: {
    fontSize: 10.5,
    color: colors.muted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deleteBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  uploadFailBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  uploadFailText: {
    flex: 1,
    fontSize: 11.5,
    color: colors.danger,
    fontWeight: '600',
  },
  retryMiniBtn: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  retryMiniText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  tzCard: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  tzHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tzTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.ink,
  },
  tzSub: {
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 1,
  },
  changeTzBtn: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  changeTzText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandDark,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.soft,
  },
  timeChipActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  timeChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.muted,
  },
  timeChipTextActive: {
    color: colors.brandDark,
    fontWeight: '800',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  pickerRowActive: {
    backgroundColor: colors.brandSoft,
  },
  pickerCountry: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.ink,
  },
  pickerTz: {
    fontSize: 11,
    color: colors.muted,
  },
});
