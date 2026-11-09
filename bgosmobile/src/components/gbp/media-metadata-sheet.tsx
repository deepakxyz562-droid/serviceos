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
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../ui';
import { apiRequest } from '../../lib/api';
import {
  normalizePendingUpload,
  uploadFileToStorage,
  type PendingUpload,
} from '../../lib/upload';
import {
  useMediaUploadStore,
  type BackgroundScheduleMode,
  type MediaJobSaveConfig,
} from '../../stores/media-upload-store';
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
  thumbnailUrl?: string;
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

const VIDEO_URL_RE = /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i;

function isVideoPhotoItem(item?: { mediaFormat?: string; url?: string } | null): boolean {
  if (!item) return false;
  return item.mediaFormat === 'VIDEO' || VIDEO_URL_RE.test(item.url || '');
}

interface PreviousBusinessPhoto {
  id: string;
  url: string;
  title?: string;
  source: 'library' | 'post' | 'google';
}

interface BusinessImageIdea {
  id: string;
  title: string;
  icon: string;
  prompt: string;
}

interface BusinessAiContext {
  name?: string;
  category?: string;
  location?: string;
  products?: string[];
  services?: string[];
  website?: string;
}

export function MediaMetadataSheet({
  visible,
  onClose,
  businessName,
  pendingAssets = [],
  editingItem = null,
  initialScheduleMode = 'daily',
  initialMode = 'upload',
  workspaceLocale = null,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  businessName: string;
  pendingAssets?: PendingUpload[];
  editingItem?: GbpPhoto | null;
  initialScheduleMode?: MediaScheduleMode;
  initialMode?: 'upload' | 'ai_generate';
  workspaceLocale?: WorkspaceLocaleInfo | null;
  onSaved: (message: string) => void | Promise<void>;
}) {
  const detected = detectDeviceCountryAndTimezone();
  const [composerMode, setComposerMode] = useState<'upload' | 'ai_generate'>(initialMode);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [aiUploads, setAiUploads] = useState<UploadedMediaState[]>([]);
  const [videoWarning, setVideoWarning] = useState<string | null>(null);

  const activeBatches = useMediaUploadStore((s) => s.activeBatches);
  const batchWarnings = useMediaUploadStore((s) => s.batchWarnings);
  const startBatch = useMediaUploadStore((s) => s.startBatch);
  const retryBatchFile = useMediaUploadStore((s) => s.retryBatchFile);
  const submitBatchJob = useMediaUploadStore((s) => s.submitBatchJob);

  const uploads: UploadedMediaState[] =
    composerMode === 'ai_generate'
      ? aiUploads
      : activeBatchId && activeBatches[activeBatchId]
        ? activeBatches[activeBatchId].map((b) => ({
            local: b.local,
            cloudUrl: b.cloudUrl,
            thumbnailUrl: b.thumbnailUrl,
            uploading: b.uploading,
            progress: b.progress,
            error: b.error,
          }))
        : [];
  const effectiveVideoWarning =
    (activeBatchId ? batchWarnings[activeBatchId] : null) || videoWarning;
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

  // Reference-aware AI image generation states
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [businessContext, setBusinessContext] = useState<BusinessAiContext | null>(null);
  const [previousPhotos, setPreviousPhotos] = useState<PreviousBusinessPhoto[]>([]);
  const [aiIdeas, setAiIdeas] = useState<BusinessImageIdea[]>([]);
  const [selectedRefUrls, setSelectedRefUrls] = useState<string[]>([]);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAspectRatio, setAiAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('1:1');
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const sessionKeyRef = useRef(0);
  const lastInitKeyRef = useRef('');
  const handedOffBatchRef = useRef<string | null>(null);
  const isEditMode = Boolean(editingItem && (editingItem.postId || editingItem.id));

  async function loadAiImageIdeas(topic?: string) {
    const reqKey = sessionKeyRef.current;
    setIdeasLoading(true);
    setIdeasError(null);
    try {
      const qs = topic?.trim() ? `?topic=${encodeURIComponent(topic.trim())}` : '';
      const res = await apiRequest<{
        business?: BusinessAiContext;
        previousPhotos?: PreviousBusinessPhoto[];
        ideas?: BusinessImageIdea[];
      }>(`/api/social/ai-image-ideas${qs}`);
      if (reqKey !== sessionKeyRef.current) return;
      if (res?.business) setBusinessContext(res.business);
      if (Array.isArray(res?.previousPhotos)) setPreviousPhotos(res.previousPhotos);
      if (Array.isArray(res?.ideas)) setAiIdeas(res.ideas);
    } catch (err: unknown) {
      if (reqKey !== sessionKeyRef.current) return;
      setIdeasError(err instanceof Error ? err.message : 'Could not load business photos & AI ideas.');
    } finally {
      if (reqKey === sessionKeyRef.current) setIdeasLoading(false);
    }
  }

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

  function startBatchUploads(normalized: PendingUpload[], _reqKey: number) {
    if (!normalized.length) {
      setActiveBatchId(null);
      setAiUploads([]);
      return;
    }
    handedOffBatchRef.current = null;
    const batchId = startBatch(normalized);
    setActiveBatchId(batchId);

    const hasVideo = normalized.some((n) => n.mediaType === 'video');
    void runAiMetadata(
      normalized.map((n) => n.name),
      intent,
      hasVideo ? 'video' : 'photo',
    );
  }

  useEffect(() => {
    if (!visible) {
      lastInitKeyRef.current = '';
      return;
    }
    const pendingKey = pendingAssets.map((a) => `${a.uri}:${a.name}`).join(',');
    const openKey = `${editingItem?.postId || editingItem?.id || ''}|${initialMode}|${pendingKey}`;
    if (lastInitKeyRef.current === openKey) return;
    lastInitKeyRef.current = openKey;

    sessionKeyRef.current += 1;
    const reqKey = sessionKeyRef.current;
    handedOffBatchRef.current = null;
    setErrorMsg(null);
    setVideoWarning(null);
    setTagInput('');
    setIdeasError(null);
    setGeneratedImageUrl(null);
    setAiPrompt('');
    setSelectedRefUrls([]);

    const d = detectDeviceCountryAndTimezone();
    setSelectedCountry(workspaceLocale?.country ? getCountryByCode(workspaceLocale.country) : d.country);
    setSelectedTimeZone(workspaceLocale?.timeZone || d.timeZone);

    if (editingItem) {
      setComposerMode('upload');
      setActiveBatchId(null);
      setAiUploads([]);
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

    const nextMode = pendingAssets.length > 0 ? 'upload' : initialMode;
    setComposerMode(nextMode);
    const normalized = pendingAssets.map((a, idx) => normalizePendingUpload(a, idx));
    setScheduleMode(initialScheduleMode);
    setIntent('local_seo');
    setTitle('');
    setDescription('');
    setTags([]);
    setSuggestedTitles([]);
    setSuggestedTags([]);

    if (nextMode === 'ai_generate') {
      void loadAiImageIdeas();
    }

    startBatchUploads(normalized, reqKey);
  }, [visible, editingItem, pendingAssets, initialScheduleMode, initialMode, businessName, workspaceLocale]);

  useEffect(() => {
    if (visible && !isEditMode && composerMode === 'ai_generate' && aiIdeas.length === 0 && !ideasLoading && !ideasError) {
      void loadAiImageIdeas();
    }
  }, [visible, isEditMode, composerMode]);

  async function pickUploadMediaInsideSheet() {
    setErrorMsg(null);
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Needed', 'Please allow photo & video access in Settings to upload media.');
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
      const mapped = res.assets.map((asset, idx) =>
        normalizePendingUpload(
          {
            uri: asset.uri,
            name: asset.fileName || `${asset.type === 'video' ? 'video' : 'photo'}-${Date.now()}-${idx}`,
            mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
            file: (asset as any).file,
            fileSize: asset.fileSize,
            mediaType: asset.type === 'video' ? 'video' : 'image',
          },
          idx,
        ),
      );
      startBatchUploads(mapped, sessionKeyRef.current);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not pick media from library.');
    }
  }

  function toggleReferencePhoto(url: string) {
    setErrorMsg(null);
    setSelectedRefUrls((prev) => {
      if (prev.includes(url)) {
        return prev.filter((u) => u !== url);
      }
      if (prev.length >= 3) {
        setErrorMsg('You can select up to 3 reference photos at once.');
        return prev;
      }
      return [...prev, url];
    });
  }

  async function pickReferencePhotoFromDevice() {
    setErrorMsg(null);
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Needed', 'Allow photo library access to upload a reference photo.');
          return;
        }
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.85,
        exif: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const normalized = normalizePendingUpload({
        uri: asset.uri,
        name: asset.fileName || `ref-photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        file: (asset as any).file,
        fileSize: asset.fileSize,
        mediaType: 'image',
      });
      setUploadingRef(true);
      const cloudUrl = await uploadFileToStorage(normalized, {
        folder: 'gbp-media',
        visibility: 'public',
      });
      setPreviousPhotos((prev) => [
        { id: `ref-${Date.now()}`, url: cloudUrl, title: 'Uploaded Ref', source: 'library' },
        ...prev.filter((p) => p.url !== cloudUrl),
      ]);
      setSelectedRefUrls((prev) => (prev.includes(cloudUrl) ? prev : [...prev.slice(0, 2), cloudUrl]));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not upload reference photo.');
    } finally {
      setUploadingRef(false);
    }
  }

  async function handleGenerateAiImage(autoFromBusiness: boolean) {
    if (generatingAiImage) return;
    const reqKey = sessionKeyRef.current;
    setErrorMsg(null);
    setGeneratingAiImage(true);
    try {
      const requestId = `mob-ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const trimmedPrompt = aiPrompt.trim();
      const useAuto = autoFromBusiness || !trimmedPrompt;
      const startRes = await apiRequest<{ jobId: string; status: string }>('/api/social/designs/image', {
        method: 'POST',
        body: {
          requestId,
          prompt: trimmedPrompt || undefined,
          autoFromBusiness: useAuto,
          referenceImageUrls: selectedRefUrls,
          aspectRatio: aiAspectRatio,
          provider: selectedRefUrls.length > 0 ? 'gemini' : 'cloudflare',
          businessName: businessContext?.name || businessName,
          category: businessContext?.category,
          products: businessContext?.products,
          services: businessContext?.services,
          website: businessContext?.website,
        },
      });
      if (reqKey !== sessionKeyRef.current) return;
      const jobId = startRes?.jobId || requestId;
      const pollStart = Date.now();
      let generated: string | null = null;
      let transientPollErrors = 0;
      while (Date.now() - pollStart < 75000) {
        if (reqKey !== sessionKeyRef.current) return;
        let statusRes: {
          status: string;
          error?: string;
          result?: { url?: string; assetId?: string } | null;
        };
        try {
          statusRes = await apiRequest<{
            status: string;
            error?: string;
            result?: { url?: string; assetId?: string } | null;
          }>(`/api/social/designs/image?id=${encodeURIComponent(jobId)}`);
          transientPollErrors = 0;
        } catch (pollErr: unknown) {
          const statusCode =
            typeof (pollErr as { statusCode?: unknown })?.statusCode === 'number'
              ? (pollErr as { statusCode: number }).statusCode
              : 0;
          if (statusCode === 0 || statusCode === 408 || statusCode === 503 || statusCode === 504) {
            transientPollErrors += 1;
            if (transientPollErrors <= 2) {
              await new Promise((r) => setTimeout(r, 2000));
              continue;
            }
          }
          throw pollErr;
        }
        if (reqKey !== sessionKeyRef.current) return;
        if (statusRes?.status === 'completed' && statusRes.result?.url) {
          generated = statusRes.result.url;
          break;
        }
        if (statusRes?.status === 'failed' || statusRes?.status === 'cancelled' || statusRes?.status === 'uncertain') {
          throw new Error(statusRes.error || 'AI image generation failed.');
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!generated) {
        throw new Error('Image generation timed out. Please try again.');
      }

      setGeneratedImageUrl(generated);
      const localItem = normalizePendingUpload({
        uri: generated,
        name: `ai-business-photo-${Date.now()}.png`,
        mimeType: 'image/png',
        mediaType: 'image',
      });
      setActiveBatchId(null);
      setAiUploads([
        {
          local: localItem,
          cloudUrl: generated,
          uploading: false,
          progress: 100,
        },
      ]);
      void runAiMetadata(
        [localItem.name],
        intent,
        'photo',
        trimmedPrompt || `${businessContext?.name || businessName} commercial showcase`,
      );
    } catch (err: unknown) {
      if (reqKey === sessionKeyRef.current) {
        setErrorMsg(err instanceof Error ? err.message : 'Could not generate AI image. Please try again.');
      }
    } finally {
      if (reqKey === sessionKeyRef.current) setGeneratingAiImage(false);
    }
  }

  async function retrySingleUpload(index: number) {
    setErrorMsg(null);
    if (composerMode !== 'ai_generate' && activeBatchId) {
      retryBatchFile(activeBatchId, index);
      return;
    }
    const target = aiUploads[index];
    if (!target) return;
    setAiUploads((prev) =>
      prev.map((row, i) => (i === index ? { ...row, uploading: true, progress: 0, error: undefined } : row)),
    );
    try {
      const cloudUrl = await uploadFileToStorage(target.local, {
        folder: 'gbp-media',
        visibility: 'public',
        onWarning: (w) => setVideoWarning(w),
        onProgress: (pct) => {
          setAiUploads((prev) =>
            prev.map((row, i) => (i === index ? { ...row, progress: pct } : row)),
          );
        },
      });
      setAiUploads((prev) =>
        prev.map((row, i) =>
          i === index ? { ...row, cloudUrl, uploading: false, progress: 100, error: undefined } : row,
        ),
      );
    } catch (err: unknown) {
      setAiUploads((prev) =>
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

  function buildJobConfig(): MediaJobSaveConfig {
    return {
      title: title.trim() || `${businessName} Media`,
      description: description.trim() || undefined,
      tags,
      category,
      scheduleMode: scheduleMode as BackgroundScheduleMode,
      preferredTime,
      country: selectedCountry.code,
      timeZone: selectedTimeZone,
      businessName,
    };
  }

  function handleRequestClose() {
    if (
      !isEditMode &&
      composerMode !== 'ai_generate' &&
      activeBatchId &&
      stillUploading &&
      handedOffBatchRef.current !== activeBatchId
    ) {
      handedOffBatchRef.current = activeBatchId;
      void submitBatchJob(activeBatchId, buildJobConfig()).catch(() => {});
      void Promise.resolve(
        onSaved('Upload continues in background — we will notify you once complete.'),
      );
    }
    onClose();
  }

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

    if (composerMode !== 'ai_generate') {
      if (!activeBatchId || !uploads.length) {
        setErrorMsg('Select at least one photo or video to upload first.');
        return;
      }
      if (!stillUploading && !readyUrls.length) {
        setErrorMsg(
          failedUploads[0]?.error ||
            'Select at least one photo or video to upload, or tap Retry on failed files.',
        );
        return;
      }

      if (stillUploading) {
        handedOffBatchRef.current = activeBatchId;
        void submitBatchJob(activeBatchId, buildJobConfig()).catch(() => {});
        await onSaved('Uploading in background — we will notify you once complete.');
        onClose();
        return;
      }

      setSubmitting(true);
      handedOffBatchRef.current = activeBatchId;
      try {
        const finished = await submitBatchJob(activeBatchId, buildJobConfig());
        await onSaved(finished.message || 'Media saved & scheduled successfully.');
        onClose();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Could not save media. Please try again.');
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
        failedUploads[0]?.error || 'Tap Auto-Create or Generate Image first before saving.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const items = readyUrls.map((u, idx) => ({
        url: u.cloudUrl as string,
        thumbnailUrl: u.thumbnailUrl,
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleRequestClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        {/* Top Bar */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close media composer"
            onPress={handleRequestClose}
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
                isVideoPhotoItem(editingItem) ||
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

          {!isEditMode ? (
            <View style={styles.modeToggleBar}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: composerMode === 'upload' }}
                onPress={() => setComposerMode('upload')}
                style={[styles.modeToggleBtn, composerMode === 'upload' && styles.modeToggleBtnActive]}
              >
                <MaterialIcons
                  name="cloud-upload"
                  size={15}
                  color={composerMode === 'upload' ? '#FFFFFF' : colors.muted}
                />
                <Text
                  style={[
                    styles.modeToggleText,
                    composerMode === 'upload' && styles.modeToggleTextActive,
                  ]}
                >
                  Upload Media
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: composerMode === 'ai_generate' }}
                onPress={() => setComposerMode('ai_generate')}
                style={[styles.modeToggleBtn, composerMode === 'ai_generate' && styles.modeToggleBtnAiActive]}
              >
                <MaterialIcons
                  name="auto-awesome"
                  size={15}
                  color={composerMode === 'ai_generate' ? '#FFFFFF' : '#7C3AED'}
                />
                <Text
                  style={[
                    styles.modeToggleText,
                    composerMode === 'ai_generate' && styles.modeToggleTextActive,
                  ]}
                >
                  Create with AI
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Media Thumbnails & Cloud Upload Progress / Reference-Aware AI Generator */}
          {isEditMode && editingItem ? (
            <View style={styles.editPreviewCard}>
              {isVideoPhotoItem(editingItem) ? (
                editingItem.thumbnailUrl ? (
                  <View style={[styles.editPreviewImg, { overflow: 'hidden', position: 'relative' }]}>
                    <Image
                      source={{ uri: editingItem.thumbnailUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                      alt={editingItem.title || 'Selected video preview'}
                    />
                    <View style={styles.videoPill}>
                      <MaterialIcons name="play-arrow" size={12} color="#FFFFFF" />
                    </View>
                  </View>
                ) : Platform.OS === 'web' && editingItem.url ? (
                  <View style={[styles.editPreviewImg, { overflow: 'hidden', position: 'relative', backgroundColor: '#0F172A' }]}>
                    {React.createElement('video', {
                      src: editingItem.url,
                      muted: true,
                      playsInline: true,
                      preload: 'metadata',
                      style: { width: '100%', height: '100%', objectFit: 'cover' },
                    })}
                    <View style={styles.videoPill}>
                      <MaterialIcons name="play-arrow" size={12} color="#FFFFFF" />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.editPreviewImg, styles.videoTileDark]}>
                    <MaterialIcons name="videocam" size={24} color="#34D399" />
                    <Text style={styles.videoTileLabel}>VIDEO</Text>
                  </View>
                )
              ) : (
                <Image
                  source={{ uri: editingItem.thumbnailUrl || editingItem.url }}
                  style={styles.editPreviewImg}
                  resizeMode="cover"
                  alt={editingItem.title || 'Selected media preview'}
                />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.previewBadgeText}>
                  {editingItem.status === 'draft' ? 'Not Posted (Draft)' : 'Scheduled to Publish'}
                </Text>
                <Text style={styles.previewHint}>
                  Update title, SEO description, tags, or category anytime before publishing.
                </Text>
              </View>
            </View>
          ) : composerMode === 'ai_generate' ? (
            <View style={styles.aiStudioBox}>
              <View style={styles.aiStudioHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiStudioTitle}>Generate Photo for {businessContext?.name || businessName}</Text>
                  <Text style={styles.aiStudioSub}>
                    Select previous business photos (optional) so AI preserves your real property/product, or let AI auto-create from your business profile.
                  </Text>
                </View>
              </View>

              {ideasError ? (
                <View style={styles.uploadFailBanner}>
                  <MaterialIcons name="info-outline" size={14} color={colors.danger} />
                  <Text style={styles.uploadFailText}>{ideasError}</Text>
                  <Pressable onPress={() => void loadAiImageIdeas()} style={styles.retryMiniBtn}>
                    <Text style={styles.retryMiniText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Reference Photos Selector */}
              <View style={{ gap: 6 }}>
                <View style={styles.labelRow}>
                  <Text style={styles.aiSubLabel}>
                    Use Previous Business Photos ({selectedRefUrls.length}/3)
                  </Text>
                  <Pressable
                    onPress={() => void pickReferencePhotoFromDevice()}
                    disabled={uploadingRef || generatingAiImage}
                    style={styles.uploadRefBtn}
                  >
                    {uploadingRef ? (
                      <ActivityIndicator size="small" color={colors.brandDark} />
                    ) : (
                      <MaterialIcons name="add-a-photo" size={13} color={colors.brandDark} />
                    )}
                    <Text style={styles.uploadRefText}>
                      {uploadingRef ? 'Uploading…' : 'Upload Ref'}
                    </Text>
                  </Pressable>
                </View>

                {ideasLoading && previousPhotos.length === 0 ? (
                  <View style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#7C3AED" />
                    <Text style={{ fontSize: 11.5, color: colors.muted }}>Loading your previous business photos…</Text>
                  </View>
                ) : previousPhotos.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {previousPhotos.map((photo) => {
                      const selected = selectedRefUrls.includes(photo.url);
                      return (
                        <Pressable
                          key={photo.id}
                          onPress={() => toggleReferencePhoto(photo.url)}
                          style={[styles.refPhotoCard, selected && styles.refPhotoCardActive]}
                        >
                          <Image source={{ uri: photo.url }} style={styles.refPhotoImg} resizeMode="cover" alt={photo.title || 'Previous business photo'} />
                          {selected ? (
                            <View style={styles.refPhotoCheck}>
                              <MaterialIcons name="check" size={12} color="#FFFFFF" />
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text style={{ fontSize: 11.5, color: colors.muted }}>
                    No previous photos saved yet — tap &quot;Upload Ref&quot; to use a real photo of your space, or Auto-Create below.
                  </Text>
                )}
              </View>

              {/* Smart Business Idea Prompts */}
              {aiIdeas.length > 0 ? (
                <View style={{ gap: 6 }}>
                  <Text style={styles.aiSubLabel}>Quick Business Ideas</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {aiIdeas.map((idea) => (
                      <Pressable
                        key={idea.id}
                        onPress={() => setAiPrompt(idea.prompt)}
                        style={styles.ideaChip}
                      >
                        <Text style={styles.ideaChipText}>{idea.title}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {/* Custom Prompt + Aspect Ratio */}
              <View style={{ gap: 6 }}>
                <Text style={styles.aiSubLabel}>Custom Prompt (optional)</Text>
                <TextInput
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  placeholder={`e.g. Evening fairy-light lawn setup at ${businessContext?.name || businessName}, keep our farmhouse building`}
                  placeholderTextColor={colors.muted}
                  multiline
                  style={[styles.input, { minHeight: 68, textAlignVertical: 'top' }]}
                />
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['1:1', '4:5', '9:16'] as const).map((ratio) => {
                    const active = aiAspectRatio === ratio;
                    return (
                      <Pressable
                        key={ratio}
                        onPress={() => setAiAspectRatio(ratio)}
                        style={[styles.chip, active && styles.chipPurpleActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipPurpleText]}>
                          {ratio === '1:1' ? 'Square 1:1' : ratio === '4:5' ? 'Portrait 4:5' : 'Story 9:16'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Two Clear Generation CTAs */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  disabled={generatingAiImage || uploadingRef}
                  onPress={() => void handleGenerateAiImage(true)}
                  style={[styles.aiAutoBtn, (generatingAiImage || uploadingRef) && { opacity: 0.6 }]}
                >
                  {generatingAiImage ? (
                    <ActivityIndicator size="small" color="#7C3AED" />
                  ) : (
                    <MaterialIcons name="auto-awesome" size={15} color="#7C3AED" />
                  )}
                  <Text style={styles.aiAutoBtnText}>Auto-Create</Text>
                </Pressable>

                <Pressable
                  disabled={generatingAiImage || uploadingRef}
                  onPress={() => void handleGenerateAiImage(false)}
                  style={[styles.aiGenBtn, (generatingAiImage || uploadingRef) && { opacity: 0.6 }]}
                >
                  {generatingAiImage ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialIcons name="auto-fix-high" size={15} color="#FFFFFF" />
                  )}
                  <Text style={styles.aiGenBtnText}>
                    {generatingAiImage ? 'Creating…' : generatedImageUrl ? 'Regenerate' : 'Generate Image'}
                  </Text>
                </Pressable>
              </View>

              {generatedImageUrl ? (
                <View style={styles.generatedPreviewCard}>
                  <Image
                    source={{ uri: generatedImageUrl }}
                    style={styles.generatedPreviewImg}
                    resizeMode="cover"
                    alt="Generated AI business image"
                  />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.brandDark }}>
                      ✓ Image Ready to Schedule or Publish
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      Review your AI SEO title, tags &amp; schedule below, then tap Save.
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {uploads.length === 0 ? (
                <Pressable
                  onPress={() => void pickUploadMediaInsideSheet()}
                  style={styles.pickInsideCard}
                >
                  <MaterialIcons name="add-photo-alternate" size={28} color={colors.brand} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>
                    Select Photos or Videos from Device
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted, textAlign: 'center' }}>
                    Supports JPG, PNG, WEBP &amp; MP4, MOV, 3GP, MKV videos (up to 100MB; Google recommends under 75MB / 30s).
                  </Text>
                </Pressable>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                  {uploads.map((item, idx) => (
                    <View key={`${item.local.uri}-${idx}`} style={styles.thumbCard}>
                      {item.local.mediaType === 'video' ? (
                        item.thumbnailUrl ? (
                          <View style={[styles.thumbImage, { position: 'relative' }]}>
                            <Image
                              source={{ uri: item.thumbnailUrl }}
                              style={styles.thumbImage}
                              resizeMode="cover"
                              alt={item.local.name || 'Video thumbnail'}
                            />
                            <View style={styles.videoPill}>
                              <MaterialIcons name="play-arrow" size={12} color="#FFFFFF" />
                            </View>
                          </View>
                        ) : Platform.OS === 'web' && item.local.uri ? (
                          <View style={[styles.thumbImage, { position: 'relative', backgroundColor: '#0F172A' }]}>
                            {React.createElement('video', {
                              src: item.local.uri,
                              muted: true,
                              playsInline: true,
                              preload: 'metadata',
                              style: { width: '100%', height: '100%', objectFit: 'cover' },
                            })}
                            <View style={styles.videoPill}>
                              <MaterialIcons name="play-arrow" size={12} color="#FFFFFF" />
                            </View>
                          </View>
                        ) : (
                          <View style={[styles.thumbImage, styles.videoTileDark]}>
                            <MaterialIcons name="videocam" size={24} color="#34D399" />
                            <Text style={styles.videoTileLabel}>VIDEO</Text>
                          </View>
                        )
                      ) : (
                        <Image
                          source={{ uri: item.local.uri }}
                          style={styles.thumbImage}
                          resizeMode="cover"
                          alt={item.local.name || 'Upload preview'}
                        />
                      )}
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
                  <Pressable onPress={() => void pickUploadMediaInsideSheet()} style={styles.thumbAddMore}>
                    <MaterialIcons name="add" size={22} color={colors.brand} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.brandDark }}>Change</Text>
                  </Pressable>
                </ScrollView>
              )}

              {(effectiveVideoWarning || uploads.some((u) => u.local.mediaType === 'video') || stillUploading) ? (
                <View style={styles.videoNoticeBanner}>
                  <MaterialIcons name="videocam" size={15} color={colors.noteText} />
                  <Text style={styles.videoNoticeText}>
                    {stillUploading
                      ? 'Upload running — tap Save & Upload in Background or close this screen and we will finish in the background & notify you.'
                      : effectiveVideoWarning ||
                        'Google Business Profile works best with MP4/MOV videos under 75MB (up to 30s at 1080p).'}
                  </Text>
                </View>
              ) : null}

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
                        isVideoPhotoItem(editingItem) ||
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
            disabled={submitting}
            style={({ pressed }) => [
              styles.saveBtn,
              submitting && { opacity: 0.65 },
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
                    ? 'Save & Upload in Background'
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
  modeToggleBar: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeToggleBtnActive: {
    backgroundColor: colors.brand,
  },
  modeToggleBtnAiActive: {
    backgroundColor: '#7C3AED',
  },
  modeToggleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.muted,
  },
  modeToggleTextActive: {
    color: '#FFFFFF',
  },
  videoTileDark: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  videoTileLabel: {
    color: '#E2E8F0',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  aiStudioBox: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 12,
    gap: 10,
  },
  aiStudioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  aiStudioTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.ink,
  },
  aiStudioSub: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    marginTop: 2,
  },
  aiSubLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.ink,
  },
  uploadRefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  uploadRefText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandDark,
  },
  refPhotoCard: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.soft,
  },
  refPhotoCardActive: {
    borderColor: '#7C3AED',
  },
  refPhotoImg: {
    width: '100%',
    height: '100%',
  },
  refPhotoCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ideaChip: {
    backgroundColor: colors.aiPurpleSoft,
    borderWidth: 1,
    borderColor: '#D8B4FE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ideaChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
  },
  aiAutoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.aiPurpleSoft,
    borderWidth: 1,
    borderColor: '#C084FC',
    borderRadius: 12,
    height: 42,
  },
  aiAutoBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#6D28D9',
  },
  aiGenBtn: {
    flex: 1.35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    height: 42,
  },
  aiGenBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  generatedPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 8,
  },
  generatedPreviewImg: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.soft,
  },
  pickInsideCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.brand,
    borderRadius: 14,
    padding: 18,
  },
  thumbAddMore: {
    width: 86,
    height: 86,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  videoNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.note,
    borderWidth: 1,
    borderColor: colors.noteBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  videoNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.noteText,
    fontWeight: '600',
    lineHeight: 15,
  },
});
