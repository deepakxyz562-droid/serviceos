'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Film,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Upload,
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
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  initialFiles?: File[];
  editingItem?: WebMediaItem | null;
  defaultScheduleMode?: WebScheduleMode;
  onSaved: (message: string, mode?: WebScheduleMode) => void;
}) {
  const isEditMode = Boolean(editingItem && (editingItem.postId || editingItem.id));

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef(0);

  const previews = useMemo(() => {
    return files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      isVideo:
        file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name || ''),
    }));
  }, [files]);

  useEffect(() => {
    return () => {
      for (const p of previews) {
        URL.revokeObjectURL(p.url);
      }
    };
  }, [previews]);

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
    if (!open) return;
    sessionRef.current += 1;
    setTagInput('');
    setUploadProgress(null);

    if (editingItem) {
      setFiles([]);
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
    setFiles(chosen);
    setScheduleMode(defaultScheduleMode);
    setIntent('local_seo');
    setTitle('');
    setDescription('');
    setTags([]);
    setSuggestedTitles([]);
    setSuggestedTags([]);

    if (chosen.length > 0) {
      const hasVideo = chosen.some(
        (f) => f.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(f.name || ''),
      );
      void generateAiMetadata(
        chosen.map((f) => f.name),
        'local_seo',
        hasVideo ? 'video' : 'photo',
      );
    }
  }, [open, editingItem, initialFiles, defaultScheduleMode, businessName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(e.target.files || []);
    if (!nextFiles.length) return;
    setFiles(nextFiles);
    const hasVideo = nextFiles.some(
      (f) => f.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(f.name || ''),
    );
    void generateAiMetadata(
      nextFiles.map((f) => f.name),
      intent,
      hasVideo ? 'video' : 'photo',
    );
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
        const isVideo =
          file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name || '');
        uploadedItems.push({
          url: upData.url,
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

  const mediaFormatForAi: 'photo' | 'video' =
    editingItem?.mediaFormat === 'VIDEO' || previews.some((p) => p.isVideo) ? 'video' : 'photo';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card text-foreground border-border">
        <DialogHeader className="p-5 pb-3 border-b border-border text-left">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Sparkles className="size-4 text-primary" />
                {isEditMode ? 'Edit Media Title, Tags & Queue' : 'Upload Media with AI SEO Tags'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Auto-generated for <strong>{businessName}</strong> — edit any field before saving.
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
                    : files.map((f) => f.name),
                  intent,
                  mediaFormatForAi,
                  title || undefined,
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
          {/* Picker / Previews */}
          {isEditMode && editingItem ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
              <img
                src={editingItem.thumbnailUrl || editingItem.url}
                alt={editingItem.title || 'Media preview'}
                className="size-16 rounded-lg object-cover border border-border shrink-0"
              />
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
          ) : (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
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
                          <Film className="size-4 mb-0.5" />
                          <span className="truncate w-full text-center">Video</span>
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
                    Choose photos or videos (MP4, MOV, JPG, PNG, WEBP)
                  </span>
                </button>
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
                        isEditMode ? [title || businessName] : files.map((f) => f.name),
                        item.value,
                        mediaFormatForAi,
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
              disabled={submitting || (!isEditMode && !files.length)}
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
