'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Film,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

export type WebGbpCategoryType =
  | 'ADDITIONAL'
  | 'EXTERIOR'
  | 'INTERIOR'
  | 'PRODUCT'
  | 'AT_WORK'
  | 'TEAMS';

export type WebScheduleMode = 'daily' | 'weekly' | 'instant' | 'draft';
export type WebAiMediaIntent = 'local_seo' | 'showcase' | 'behind_the_scenes' | 'team' | 'offer';
export type WebComposerMode = 'upload' | 'ai_generate';

export interface WebMediaItem {
  id: string;
  postId?: string;
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  gbpCategory?: string;
  mediaFormat?: string;
  createdAt?: string;
  scheduledFor?: string | null;
  source?: string;
  status?: string;
  caption?: string;
  failureReason?: string;
}

interface PreviousPhotoRef {
  id: string;
  url: string;
  title?: string;
  source?: string;
  category?: string;
}

interface BusinessIdeasContext {
  name?: string;
  businessName?: string;
  category?: string;
  location?: string;
  services?: string | string[];
  products?: string | string[];
  website?: string;
}

interface AiImageIdeaItem {
  id: string;
  title: string;
  icon?: string;
  prompt: string;
}

const GBP_CATEGORIES: Array<{ value: WebGbpCategoryType; label: string }> = [
  { value: 'ADDITIONAL', label: 'General Showcase' },
  { value: 'EXTERIOR', label: 'Exterior / Storefront' },
  { value: 'INTERIOR', label: 'Interior / Workspace' },
  { value: 'PRODUCT', label: 'Product / Service' },
  { value: 'AT_WORK', label: 'Team at Work' },
  { value: 'TEAMS', label: 'Team & Staff' },
];

const AI_INTENTS: Array<{ value: WebAiMediaIntent; label: string }> = [
  { value: 'local_seo', label: 'Local SEO' },
  { value: 'showcase', label: 'Showcase' },
  { value: 'behind_the_scenes', label: 'Work in Action' },
  { value: 'team', label: 'Team' },
  { value: 'offer', label: 'Highlight / Offer' },
];

const VIDEO_FILE_RE = /\.(mp4|mov|webm|m4v|3gp|mkv|avi)$/i;
const VIDEO_URL_RE = /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const GBP_ADVISORY_BYTES = 75 * 1024 * 1024;

function inferMimeFromFile(file: File): string {
  if (file.type && file.type.includes('/')) return file.type;
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.webm')) return 'video/webm';
  if (name.endsWith('.m4v')) return 'video/x-m4v';
  if (name.endsWith('.3gp')) return 'video/3gpp';
  if (name.endsWith('.mkv')) return 'video/x-matroska';
  if (name.endsWith('.avi')) return 'video/x-msvideo';
  if (name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

interface AiMetadataApiResponse {
  success?: boolean;
  title?: string;
  description?: string;
  tags?: string[];
  category?: WebGbpCategoryType;
  suggestedTitles?: string[];
  suggestedTags?: string[];
}

export function WebMediaMetadataDialog({
  open,
  onOpenChange,
  businessName,
  initialFiles,
  editingItem = null,
  defaultScheduleMode = 'daily',
  initialMode = 'upload',
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  initialFiles?: File[];
  editingItem?: WebMediaItem | null;
  defaultScheduleMode?: WebScheduleMode;
  initialMode?: WebComposerMode;
  onSaved: (message: string, mode?: WebScheduleMode) => void;
}) {
  const isEditMode = Boolean(editingItem && (editingItem.postId || editingItem.id));

  const [composerMode, setComposerMode] = useState<WebComposerMode>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState<WebGbpCategoryType>('ADDITIONAL');
  const [scheduleMode, setScheduleMode] = useState<WebScheduleMode>(defaultScheduleMode);
  const [preferredTime, setPreferredTime] = useState<string>('10:00');
  const [intent, setIntent] = useState<WebAiMediaIntent>('local_seo');
  const localTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    } catch {
      return undefined;
    }
  }, []);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [videoWarning, setVideoWarning] = useState<string | null>(null);

  // Reference-aware AI image generation state
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [businessCtx, setBusinessCtx] = useState<BusinessIdeasContext | null>(null);
  const [previousPhotos, setPreviousPhotos] = useState<PreviousPhotoRef[]>([]);
  const [selectedRefUrls, setSelectedRefUrls] = useState<string[]>([]);
  const [aiIdeas, setAiIdeas] = useState<AiImageIdeaItem[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAspectRatio, setAiAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('4:5');
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
  const [aiGenStatus, setAiGenStatus] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [uploadingRefPhoto, setUploadingRefPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef(0);
  const lastInitKeyRef = useRef<string | null>(null);

  const previews = useMemo(() => {
    return files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      isVideo: file.type.startsWith('video/') || VIDEO_FILE_RE.test(file.name || ''),
    }));
  }, [files]);

  useEffect(() => {
    return () => {
      for (const p of previews) {
        URL.revokeObjectURL(p.url);
      }
    };
  }, [previews]);

  const loadAiImageIdeas = async () => {
    const reqSession = sessionRef.current;
    setIdeasLoading(true);
    try {
      const res = await authFetch('/api/social/ai-image-ideas');
      const data = (await res.json().catch(() => ({}))) as {
        previousPhotos?: PreviousPhotoRef[];
        ideas?: Array<AiImageIdeaItem | string>;
        business?: BusinessIdeasContext;
      };
      if (reqSession !== sessionRef.current) return;
      if (data.business) setBusinessCtx(data.business);
      if (Array.isArray(data.previousPhotos)) {
        setPreviousPhotos(data.previousPhotos.filter((p) => Boolean(p.url)));
      }
      if (Array.isArray(data.ideas)) {
        const normalizedIdeas: AiImageIdeaItem[] = data.ideas
          .map((item, idx) => {
            if (typeof item === 'string') {
              return { id: `idea-${idx}`, title: item, prompt: item };
            }
            if (item && typeof item === 'object' && typeof item.prompt === 'string') {
              return {
                id: item.id || `idea-${idx}`,
                title: item.title || item.prompt.slice(0, 32),
                icon: item.icon,
                prompt: item.prompt,
              };
            }
            return null;
          })
          .filter((x): x is AiImageIdeaItem => Boolean(x));
        setAiIdeas(normalizedIdeas);
      }
    } catch {
      // Non-blocking: user can still write a prompt or auto-generate
    } finally {
      if (reqSession === sessionRef.current) setIdeasLoading(false);
    }
  };

  const generateAiMetadata = async (
    targetFilenames: string[],
    selectedIntent: WebAiMediaIntent,
    mediaType: 'photo' | 'video',
    hint?: string,
  ) => {
    const reqId = sessionRef.current;
    setAiLoading(true);
    try {
      const res = await authFetch('/api/social/ai-media-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filenames: targetFilenames,
          mediaType,
          intent: selectedIntent,
          customHint: hint,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as AiMetadataApiResponse;
      if (reqId !== sessionRef.current) return;
      if (data?.title) setTitle(data.title);
      if (data?.description) setDescription(data.description);
      if (Array.isArray(data?.tags)) setTags(data.tags);
      if (data?.category) setCategory(data.category);
      if (Array.isArray(data?.suggestedTitles)) setSuggestedTitles(data.suggestedTitles);
      if (Array.isArray(data?.suggestedTags)) setSuggestedTags(data.suggestedTags);
    } catch {
      if (reqId === sessionRef.current && !title) {
        setTitle(`${businessName} · ${mediaType === 'video' ? 'Video' : 'Photo'} Showcase`);
        setDescription(
          `Featured update from ${businessName}. Connect or visit us on Google Maps for verified local service.`,
        );
        setTags([businessName, 'Local Service', 'Customer Showcase']);
      }
    } finally {
      if (reqId === sessionRef.current) setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      sessionRef.current += 1;
      lastInitKeyRef.current = null;
      return;
    }

    const chosenKey = initialFiles?.map((f) => `${f.name}:${f.size}`).join('|') || '';
    const initKey = editingItem
      ? `edit:${editingItem.postId || editingItem.id}`
      : `create:${initialMode}:${chosenKey}`;

    if (lastInitKeyRef.current === initKey) {
      return;
    }
    lastInitKeyRef.current = initKey;
    sessionRef.current += 1;

    setTagInput('');
    setUploadProgress(null);
    setVideoWarning(null);
    setAiGenStatus(null);
    setGeneratingAiImage(false);

    if (editingItem) {
      setComposerMode('upload');
      setFiles([]);
      setGeneratedImageUrl(null);
      setTitle(editingItem.title || `${businessName} Showcase`);
      setDescription(editingItem.description || editingItem.caption || '');
      setTags(Array.isArray(editingItem.tags) ? editingItem.tags : []);
      const cat = String(editingItem.gbpCategory || editingItem.category || 'ADDITIONAL').toUpperCase();
      setCategory(
        GBP_CATEGORIES.some((c) => c.value === cat) ? (cat as WebGbpCategoryType) : 'ADDITIONAL',
      );
      setScheduleMode(editingItem.status === 'draft' ? 'draft' : 'daily');
      setSuggestedTitles([]);
      setSuggestedTags([]);
      return;
    }

    const chosen = initialFiles ? Array.from(initialFiles) : [];
    const targetMode: WebComposerMode =
      chosen.length > 0 ? 'upload' : initialMode === 'ai_generate' ? 'ai_generate' : 'upload';

    setComposerMode(targetMode);
    setFiles(chosen);
    setGeneratedImageUrl(null);
    setSelectedRefUrls([]);
    setAiPrompt('');
    setScheduleMode(defaultScheduleMode);
    setIntent('local_seo');
    setTitle('');
    setDescription('');
    setTags([]);
    setSuggestedTitles([]);
    setSuggestedTags([]);

    if (chosen.length > 0) {
      const hasVideo = chosen.some(
        (f) => f.type.startsWith('video/') || VIDEO_FILE_RE.test(f.name || ''),
      );
      const largeVid = chosen.find(
        (f) =>
          (f.type.startsWith('video/') || VIDEO_FILE_RE.test(f.name || '')) &&
          f.size > GBP_ADVISORY_BYTES,
      );
      if (largeVid) {
        setVideoWarning(
          `Large video (${(largeVid.size / (1024 * 1024)).toFixed(1)} MB) — Google Business Profile works best with videos under 75 MB.`,
        );
      }
      void generateAiMetadata(
        chosen.map((f) => f.name),
        'local_seo',
        hasVideo ? 'video' : 'photo',
      );
    }

    void loadAiImageIdeas();
  }, [open, editingItem, initialFiles, defaultScheduleMode, businessName, initialMode]);

  const uploadSingleFile = async (file: File): Promise<string> => {
    const contentType = inferMimeFromFile(file);
    const isVideo = contentType.startsWith('video/') || VIDEO_FILE_RE.test(file.name || '');

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      throw new Error(
        `Video "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Max supported video size is 100 MB.`,
      );
    }
    if (!isVideo && file.size > MAX_IMAGE_BYTES) {
      throw new Error(
        `File "${file.name}" exceeds the 25 MB limit.`,
      );
    }

    // 1. Try direct presigned PUT first (avoids serverless body limits)
    try {
      const presignRes = await authFetch('/api/omnichannel/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name || `media-${Date.now()}`,
          mimeType: contentType,
          fileSize: file.size || 0,
          folder: 'gbp-media',
          visibility: 'public',
        }),
      });
      const presign = (await presignRes.json().catch(() => ({}))) as {
        directUploadAvailable?: boolean;
        uploadUrl?: string;
        publicUrl?: string;
        method?: string;
        headers?: Record<string, string>;
        mimeType?: string;
        gbpVideoWarning?: string | null;
      };
      if (presign.gbpVideoWarning) {
        setVideoWarning(presign.gbpVideoWarning);
      }
      if (presignRes.ok && presign.directUploadAvailable && presign.uploadUrl && presign.publicUrl) {
        const putRes = await fetch(presign.uploadUrl, {
          method: presign.method || 'PUT',
          headers: presign.headers || { 'Content-Type': presign.mimeType || contentType },
          body: file,
        });
        if (putRes.ok) {
          return presign.publicUrl;
        }
      }
    } catch {
      // Fall through cleanly to multipart server upload
    }

    // 2. Fallback to multipart server upload
    const form = new FormData();
    form.append('file', file);
    form.append('folder', 'gbp-media');
    form.append('visibility', 'public');
    const upRes = await authFetch('/api/omnichannel/upload', { method: 'POST', body: form });
    const upData = (await upRes.json().catch(() => ({}))) as {
      success?: boolean;
      url?: string;
      error?: string;
    };
    if (!upRes.ok || !upData.url) {
      throw new Error(upData.error || `Upload failed for ${file.name}`);
    }
    return upData.url;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(e.target.files || []);
    if (!nextFiles.length) return;
    setVideoWarning(null);
    setFiles(nextFiles);
    const hasVideo = nextFiles.some(
      (f) => f.type.startsWith('video/') || VIDEO_FILE_RE.test(f.name || ''),
    );
    const largeVid = nextFiles.find(
      (f) =>
        (f.type.startsWith('video/') || VIDEO_FILE_RE.test(f.name || '')) &&
        f.size > GBP_ADVISORY_BYTES,
    );
    if (largeVid) {
      setVideoWarning(
        `Large video (${(largeVid.size / (1024 * 1024)).toFixed(1)} MB) — Google Business Profile works best with videos under 75 MB.`,
      );
    }
    void generateAiMetadata(
      nextFiles.map((f) => f.name),
      intent,
      hasVideo ? 'video' : 'photo',
    );
  };

  const handleReferenceUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setUploadingRefPhoto(true);
    try {
      const uploadedUrl = await uploadSingleFile(picked);
      const entry: PreviousPhotoRef = {
        id: `ref-${Date.now()}`,
        url: uploadedUrl,
        title: picked.name || 'Reference Photo',
        source: 'upload',
      };
      setPreviousPhotos((prev) => [entry, ...prev.filter((p) => p.url !== uploadedUrl)]);
      setSelectedRefUrls((prev) => {
        if (prev.includes(uploadedUrl)) return prev;
        return prev.length >= 3 ? [...prev.slice(1), uploadedUrl] : [...prev, uploadedUrl];
      });
      toast.success('Reference photo uploaded and selected.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload reference photo');
    } finally {
      setUploadingRefPhoto(false);
    }
  };

  const toggleRefPhoto = (url: string) => {
    setSelectedRefUrls((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= 3) {
        return [...prev.slice(1), url];
      }
      return [...prev, url];
    });
  };

  const handleGenerateAiPhoto = async (autoMode: boolean) => {
    if (generatingAiImage) return;
    const reqSession = sessionRef.current;
    const effectiveAuto = autoMode || (!aiPrompt.trim() && selectedRefUrls.length === 0);
    setGeneratingAiImage(true);
    setAiGenStatus(
      selectedRefUrls.length > 0
        ? `Blending ${selectedRefUrls.length} reference photo${selectedRefUrls.length > 1 ? 's' : ''} with AI…`
        : effectiveAuto
          ? `Creating AI photo from ${businessName} profile…`
          : 'Generating AI photo…',
    );
    try {
      const requestId = `web-ai-img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const resolvedBusinessName = businessCtx?.name || businessCtx?.businessName || businessName;
      const toStringList = (val: string | string[] | undefined): string[] | undefined => {
        if (Array.isArray(val)) return val.filter(Boolean);
        if (typeof val === 'string' && val.trim()) {
          return val.split(',').map((s) => s.trim()).filter(Boolean);
        }
        return undefined;
      };
      const res = await authFetch('/api/social/designs/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim() || (effectiveAuto ? undefined : `Showcase ${resolvedBusinessName}`),
          provider: selectedRefUrls.length > 0 ? 'gemini' : 'cloudflare',
          requestId,
          isPoster: false,
          autoFromBusiness: effectiveAuto,
          aspectRatio: aiAspectRatio,
          referenceImageUrls: selectedRefUrls,
          businessName: resolvedBusinessName,
          category: businessCtx?.category || '',
          location: businessCtx?.location || '',
          services: toStringList(businessCtx?.services),
          products: toStringList(businessCtx?.products),
          website: businessCtx?.website || '',
        }),
      });
      const initData = (await res.json().catch(() => ({}))) as {
        jobId?: string;
        status?: string;
        error?: string;
      };
      if (!res.ok || !initData.jobId) {
        throw new Error(initData.error || 'Could not start AI image generation');
      }

      const jobId = initData.jobId;
      const startedAt = Date.now();
      while (Date.now() - startedAt < 60000) {
        if (reqSession !== sessionRef.current) return;
        await new Promise((r) => setTimeout(r, 2000));
        if (reqSession !== sessionRef.current) return;
        const pollRes = await authFetch(
          `/api/social/designs/image?id=${encodeURIComponent(jobId)}`,
        );
        const check = (await pollRes.json().catch(() => ({}))) as {
          status?: string;
          error?: string;
          result?: { url?: string };
        };
        if (reqSession !== sessionRef.current) return;
        if (check.status === 'completed' && check.result?.url) {
          setGeneratedImageUrl(check.result.url);
          setAiGenStatus(null);
          setGeneratingAiImage(false);
          toast.success('AI photo ready! Review metadata & schedule below.');
          void generateAiMetadata(
            [aiPrompt.trim() || `${businessName} AI Photo`],
            intent,
            'photo',
            aiPrompt.trim() || undefined,
          );
          return;
        }
        if (check.status === 'failed' || check.status === 'cancelled') {
          throw new Error(check.error || 'AI image generation failed');
        }
      }
      throw new Error('AI image generation timed out after 60s. Please try again.');
    } catch (err) {
      if (reqSession === sessionRef.current) {
        setAiGenStatus(null);
        setGeneratingAiImage(false);
        toast.error(err instanceof Error ? err.message : 'AI image generation failed');
      }
    }
  };

  const addTag = () => {
    const clean = tagInput.replace(/^#+/, '').trim();
    if (!clean) return;
    if (!tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setTags((prev) => [...prev, clean].slice(0, 12));
    }
    setTagInput('');
  };

  const toggleSuggestedTag = (tag: string) => {
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTags((prev) => prev.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
    } else {
      setTags((prev) => [...prev, tag].slice(0, 12));
    }
  };

  const handleSave = async () => {
    if (isEditMode && editingItem) {
      setSubmitting(true);
      try {
        const res = await authFetch('/api/social/photos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: editingItem.postId || editingItem.id,
            title: title.trim() || `${businessName} Media`,
            description: description.trim(),
            tags,
            category,
            status: scheduleMode === 'draft' ? 'draft' : 'scheduled',
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error || 'Could not update media details.');
        toast.success('Media title, tags & schedule updated.');
        onOpenChange(false);
        onSaved('Media details updated.', scheduleMode);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Update failed');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (composerMode === 'ai_generate') {
      if (!generatedImageUrl) {
        toast.error('Generate an AI image first.');
        return;
      }
      setSubmitting(true);
      try {
        setUploadProgress('Saving AI photo & SEO metadata…');
        const aiItem = {
          url: generatedImageUrl,
          title: title.trim() || `${businessName} Showcase`,
          description: description.trim() || undefined,
          tags,
          category,
          mediaFormat: 'PHOTO' as const,
        };
        const res = await authFetch('/api/social/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [aiItem],
            photos: [aiItem.url],
            title: aiItem.title,
            description: aiItem.description,
            tags,
            category,
            scheduleMode,
            preferredTime,
            timeZone: localTimeZone,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          error?: string;
        };
        if (!res.ok || !data.success) throw new Error(data.error || 'Could not save AI photo.');
        const msg = data.message || 'AI photo saved successfully.';
        toast.success(msg);
        onOpenChange(false);
        onSaved(msg, scheduleMode);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save AI photo');
      } finally {
        setSubmitting(false);
        setUploadProgress(null);
      }
      return;
    }

    if (!files.length) {
      toast.error('Choose at least one photo or video first.');
      return;
    }

    setSubmitting(true);
    try {
      const uploadedItems: Array<{
        url: string;
        title: string;
        description?: string;
        tags: string[];
        category: WebGbpCategoryType;
        mediaFormat: 'PHOTO' | 'VIDEO';
      }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1}/${files.length} (${file.name})…`);
        const uploadedUrl = await uploadSingleFile(file);
        const isVideo =
          file.type.startsWith('video/') || VIDEO_FILE_RE.test(file.name || '');
        uploadedItems.push({
          url: uploadedUrl,
          title:
            files.length > 1 && title.trim()
              ? `${title.trim()} (${i + 1})`
              : title.trim() || `${businessName} Showcase`,
          description: description.trim() || undefined,
          tags,
          category,
          mediaFormat: isVideo ? 'VIDEO' : 'PHOTO',
        });
      }

      setUploadProgress('Saving media & AI metadata…');
      const res = await authFetch('/api/social/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: uploadedItems,
          photos: uploadedItems.map((i) => i.url),
          title: title.trim(),
          description: description.trim() || undefined,
          tags,
          category,
          scheduleMode,
          preferredTime,
          timeZone: localTimeZone,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not save media.');

      const msg = data.message || 'Media saved successfully.';
      toast.success(msg);
      onOpenChange(false);
      onSaved(msg, scheduleMode);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Media upload failed');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    setSubmitting(true);
    try {
      const targetId = editingItem.postId || editingItem.id;
      const res = await authFetch(`/api/social/photos?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not delete item.');
      toast.success('Removed media item from queue.');
      onOpenChange(false);
      onSaved('Removed media item from queue.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete media');
    } finally {
      setSubmitting(false);
    }
  };

  const editingIsVideoNoThumb = Boolean(
    editingItem &&
      (editingItem.mediaFormat === 'VIDEO' || VIDEO_URL_RE.test(editingItem.url || '')) &&
      !editingItem.thumbnailUrl,
  );

  const mediaFormatForAi: 'photo' | 'video' =
    editingItem?.mediaFormat === 'VIDEO' || previews.some((p) => p.isVideo) ? 'video' : 'photo';

  const canSave = isEditMode
    ? true
    : composerMode === 'ai_generate'
      ? Boolean(generatedImageUrl)
      : files.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card text-foreground border-border">
        <DialogHeader className="p-5 pb-3 border-b border-border text-left">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Sparkles className="size-4 text-primary" />
                {isEditMode
                  ? 'Edit Media Title, Tags & Queue'
                  : composerMode === 'ai_generate'
                    ? 'Create Business AI Photo'
                    : 'Upload Media with AI SEO Tags'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Auto-tailored for <strong>{businessName}</strong> — edit any field before saving.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={aiLoading || submitting}
              onClick={() =>
                void generateAiMetadata(
                  isEditMode
                    ? [title || businessName]
                    : composerMode === 'ai_generate'
                      ? [aiPrompt.trim() || `${businessName} AI Photo`]
                      : files.map((f) => f.name),
                  intent,
                  mediaFormatForAi,
                  title || aiPrompt.trim() || undefined,
                )
              }
              className="h-8 rounded-lg text-xs font-bold gap-1 shrink-0"
            >
              {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-purple-600" />}
              {aiLoading ? 'Writing…' : 'AI Rewrite'}
            </Button>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Mode Switcher in Create Mode */}
          {!isEditMode && (
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted border border-border">
              <button
                type="button"
                onClick={() => setComposerMode('upload')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                  composerMode === 'upload'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Upload className="size-3.5" />
                Upload Media
              </button>
              <button
                type="button"
                onClick={() => {
                  setComposerMode('ai_generate');
                  if (!previousPhotos.length && !ideasLoading) {
                    void loadAiImageIdeas();
                  }
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                  composerMode === 'ai_generate'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Wand2 className="size-3.5" />
                Create with AI
              </button>
            </div>
          )}

          {/* Picker / Previews OR AI Generator */}
          {isEditMode && editingItem ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
              {editingIsVideoNoThumb ? (
                <div className="size-16 rounded-lg bg-slate-900 text-white flex flex-col items-center justify-center shrink-0 border border-border">
                  <Film className="size-5 text-emerald-400" />
                  <span className="text-[9px] font-extrabold tracking-wider mt-0.5 text-slate-200">VIDEO</span>
                </div>
              ) : (
                <img
                  src={editingItem.thumbnailUrl || editingItem.url}
                  alt={editingItem.title || 'Media preview'}
                  className="size-16 rounded-lg object-cover border border-border shrink-0"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-xs font-bold text-foreground">
                  {editingItem.status === 'draft'
                    ? 'Draft (Not Posted)'
                    : editingItem.status === 'failed'
                      ? 'Failed to publish — edit or reschedule'
                      : 'Scheduled to Publish'}
                </div>
                {editingItem.failureReason ? (
                  <p className="text-[11px] text-destructive line-clamp-2">{editingItem.failureReason}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Changes update your queued Google Business Profile media automatically.
                  </p>
                )}
              </div>
            </div>
          ) : composerMode === 'ai_generate' ? (
            <div className="space-y-3 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/15 p-3.5">
              {/* Previous Business Photos Reference Strip */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
                    Use Previous Business Photos ({selectedRefUrls.length}/3 optional)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void loadAiImageIdeas()}
                      disabled={ideasLoading}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-background text-[10.5px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className={`size-3 ${ideasLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    <input
                      ref={refFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleReferenceUploadChange}
                      className="hidden"
                      aria-label="Upload reference photo"
                    />
                    <button
                      type="button"
                      onClick={() => refFileInputRef.current?.click()}
                      disabled={uploadingRefPhoto}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10.5px] font-semibold hover:bg-purple-700 disabled:opacity-60"
                    >
                      {uploadingRefPhoto ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                      Upload Ref
                    </button>
                  </div>
                </div>

                {previousPhotos.length > 0 ? (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {previousPhotos.map((refPhoto) => {
                      const selected = selectedRefUrls.includes(refPhoto.url);
                      return (
                        <button
                          key={refPhoto.id}
                          type="button"
                          onClick={() => toggleRefPhoto(refPhoto.url)}
                          title={refPhoto.title || 'Select business photo as reference'}
                          className={`relative size-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                            selected
                              ? 'border-purple-600 ring-2 ring-purple-400/50'
                              : 'border-border opacity-85 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={refPhoto.url}
                            alt={refPhoto.title || 'Previous business photo'}
                            className="size-full object-cover"
                          />
                          {selected && (
                            <span className="absolute top-1 right-1 size-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                              <Check className="size-2.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {ideasLoading
                      ? 'Loading your existing Google Business photos…'
                      : 'No saved photos yet — click "+ Upload Ref" to let AI recreate scenes using your own place or product.'}
                  </p>
                )}
              </div>

              {/* Quick AI Prompt Ideas */}
              {aiIdeas.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                    Quick Business Ideas
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiIdeas.slice(0, 4).map((idea) => (
                      <button
                        key={idea.id}
                        type="button"
                        onClick={() => setAiPrompt(idea.prompt)}
                        className="px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800 bg-background text-[10.5px] font-medium text-foreground hover:border-purple-500 text-left"
                      >
                        ✨ {idea.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Custom Prompt */}
              <div className="space-y-1">
                <label htmlFor="web-ai-photo-prompt" className="text-xs font-bold text-foreground">
                  Prompt (Optional — leave empty for Auto Business AI)
                </label>
                <Textarea
                  id="web-ai-photo-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={2}
                  placeholder={`e.g. Showcase ${businessName} — serene garden courtyard at golden hour`}
                  className="rounded-xl text-xs resize-none bg-background"
                />
              </div>

              {/* Aspect Ratio + Generate Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {(['1:1', '4:5', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAiAspectRatio(ratio)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold border ${
                        aiAspectRatio === ratio
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background text-muted-foreground border-border'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={generatingAiImage}
                    onClick={() => void handleGenerateAiPhoto(true)}
                    className="h-8 rounded-lg text-[11px] font-bold gap-1"
                  >
                    <Sparkles className="size-3 text-purple-600" />
                    Auto for Business
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={generatingAiImage}
                    onClick={() => void handleGenerateAiPhoto(false)}
                    className="h-8 rounded-lg text-[11px] font-bold gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {generatingAiImage ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
                    {generatingAiImage ? 'Generating…' : 'Generate Image'}
                  </Button>
                </div>
              </div>

              {aiGenStatus && (
                <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300 font-semibold bg-background/80 border border-purple-200 rounded-lg px-3 py-2">
                  <Loader2 className="size-3.5 animate-spin shrink-0" />
                  <span>{aiGenStatus}</span>
                </div>
              )}

              {generatedImageUrl && (
                <div className="space-y-1.5">
                  <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
                    <img
                      src={generatedImageUrl}
                      alt={aiPrompt || `${businessName} AI generated photo`}
                      className="w-full max-h-56 object-cover"
                    />
                    <button
                      type="button"
                      disabled={generatingAiImage}
                      onClick={() => void handleGenerateAiPhoto(false)}
                      className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[11px] font-bold hover:bg-slate-900"
                    >
                      <RefreshCw className="size-3" />
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.mp4,.mov,.webm,.m4v,.3gp,.mkv,.avi"
                multiple
                onChange={handleFileChange}
                className="hidden"
                aria-label="Choose photos or videos"
              />
              {previews.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {previews.map((p, idx) => (
                    <div
                      key={`${p.file.name}-${idx}`}
                      className="relative size-16 rounded-xl overflow-hidden border border-border bg-muted shrink-0"
                    >
                      {p.isVideo ? (
                        <div className="size-full flex flex-col items-center justify-center bg-slate-900 text-white text-[10px] p-1">
                          <Film className="size-4 text-emerald-400 mb-0.5" />
                          <span className="truncate w-full text-center font-bold">VIDEO</span>
                        </div>
                      ) : (
                        <img src={p.url} alt={p.file.name} className="size-full object-cover" />
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="size-16 rounded-xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center text-[10px] font-semibold text-muted-foreground hover:text-primary shrink-0"
                  >
                    <Plus className="size-4" />
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <Upload className="size-6" />
                  <span className="text-xs font-semibold">
                    Choose photos or videos (MP4, MOV, 3GP, MKV, WEBM, JPG, PNG)
                  </span>
                </button>
              )}
              {videoWarning && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                  {videoWarning}
                </div>
              )}
            </div>
          )}

          {/* AI Focus Intent Chips */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              AI Focus Angle
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AI_INTENTS.map((item) => {
                const active = item.value === intent;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setIntent(item.value);
                      void generateAiMetadata(
                        isEditMode
                          ? [title || businessName]
                          : composerMode === 'ai_generate'
                            ? [aiPrompt.trim() || `${businessName} AI Photo`]
                            : files.map((f) => f.name),
                        item.value,
                        mediaFormatForAi,
                        aiPrompt.trim() || undefined,
                      );
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    ✨ {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title + AI Suggestion Pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="web-media-title" className="text-xs font-bold text-foreground">
                Title
              </label>
              {aiLoading && <span className="text-[11px] text-purple-600 font-semibold">Generating…</span>}
            </div>
            <Input
              id="web-media-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. Featured Work at ${businessName}`}
              className="rounded-xl text-xs"
            />
            {suggestedTitles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestedTitles.map((cand) => (
                  <button
                    key={cand}
                    type="button"
                    onClick={() => setTitle(cand)}
                    className="px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  >
                    {cand}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SEO Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="web-media-desc" className="text-xs font-bold text-foreground">
                SEO Description
              </label>
              <span className="text-[11px] text-muted-foreground">{description.length}/1500</span>
            </div>
            <Textarea
              id="web-media-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write or edit your customer-facing media description…"
              rows={3}
              className="rounded-xl text-xs resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1">
              <Tag className="size-3.5 text-primary" /> Tags &amp; Local Keywords
            </label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold"
                  >
                    <span>#{tag}</span>
                    <X className="size-3" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add custom tag (press Enter)"
                className="h-8 rounded-xl text-xs"
              />
              <Button type="button" size="sm" variant="secondary" onClick={addTag} className="h-8 rounded-xl text-xs">
                Add
              </Button>
            </div>
            {suggestedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {suggestedTags.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleSuggestedTag(st)}
                    className="px-2 py-0.5 rounded-full border border-dashed border-border text-[10.5px] font-medium text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    + {st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category + Publishing Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Google Category</label>
              <Select value={category} onValueChange={(v) => setCategory(v as WebGbpCategoryType)}>
                <SelectTrigger className="rounded-xl text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GBP_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {isEditMode ? 'Queue Status' : 'Publishing Schedule'}
              </label>
              <Select value={scheduleMode} onValueChange={(v) => setScheduleMode(v as WebScheduleMode)}>
                <SelectTrigger className="rounded-xl text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {!isEditMode && <SelectItem value="instant">Publish now</SelectItem>}
                  <SelectItem value="daily">{isEditMode ? 'Scheduled to Publish' : 'Daily schedule (1/day)'}</SelectItem>
                  {!isEditMode && <SelectItem value="weekly">Weekly schedule (1/week)</SelectItem>}
                  <SelectItem value="draft">Save draft (Not Posted)</SelectItem>
                </SelectContent>
              </Select>
              {!isEditMode && (scheduleMode === 'daily' || scheduleMode === 'weekly') && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-muted-foreground truncate">
                    Local publish time {localTimeZone ? `(${localTimeZone})` : ''}
                  </span>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="h-7 px-2 rounded-lg border border-border bg-background text-[11px] font-semibold"
                  >
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="19:00">07:00 PM</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {uploadProgress && (
            <div className="flex items-center gap-2 text-xs text-primary font-semibold bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
              <Loader2 className="size-3.5 animate-spin shrink-0" />
              <span>{uploadProgress}</span>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex items-center justify-between sm:justify-between gap-2">
          <div>
            {isEditMode && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={submitting}
                onClick={handleDelete}
                className="rounded-xl text-xs gap-1"
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submitting || !canSave}
              onClick={handleSave}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <ImageIcon className="size-3.5" />
                  {isEditMode
                    ? 'Save Changes'
                    : scheduleMode === 'instant'
                      ? 'Publish to Google'
                      : scheduleMode === 'draft'
                        ? 'Save Draft'
                        : 'Save & Queue'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
