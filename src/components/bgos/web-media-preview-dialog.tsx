'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Film, Loader2, Maximize2, Pencil, Play, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { WebMediaItem } from './media-metadata-dialog';
import { FullscreenImageLightbox } from './fullscreen-image-lightbox';

const VIDEO_URL_RE = /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i;

export function isWebVideoItem(item?: Pick<WebMediaItem, 'mediaFormat' | 'url'> | null): boolean {
  if (!item) return false;
  return item.mediaFormat === 'VIDEO' || VIDEO_URL_RE.test(item.url || '');
}

export function WebMediaThumb({
  item,
  alt,
  className = 'w-full h-full object-cover',
}: {
  item: Pick<WebMediaItem, 'url' | 'thumbnailUrl' | 'mediaFormat' | 'title' | 'caption'>;
  alt?: string;
  className?: string;
}) {
  const isVideo = isWebVideoItem(item);
  const resolvedAlt = alt || item.title || item.caption || 'Google Business media';

  if (!isVideo) {
    return (
      /* Remote storage/data URLs — not local /public assets, plain img is intentional */
      <img
        src={item.thumbnailUrl || item.url}
        alt={resolvedAlt}
        loading="lazy"
        className={className}
      />
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt={resolvedAlt}
          loading="lazy"
          className={className}
        />
      ) : item.url ? (
        <video
          src={item.url}
          muted
          playsInline
          preload="metadata"
          className={className}
        />
      ) : (
        <div className="flex w-full h-full flex-col items-center justify-center gap-1 text-white">
          <Film className="size-7 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Video</span>
        </div>
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 m-auto size-9 rounded-full bg-black/60 border border-white/60 text-white flex items-center justify-center shadow-md"
      >
        <Play className="size-4 fill-white ml-0.5" />
      </span>
    </div>
  );
}

export function WebMediaPreviewDialog({
  item,
  open,
  onOpenChange,
  onEdit,
  onDeleted,
  onPublished,
  businessName = 'My Business',
}: {
  item: WebMediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (item: WebMediaItem) => void;
  onDeleted?: (item: WebMediaItem) => void | Promise<void>;
  onPublished?: (item: WebMediaItem) => void | Promise<void>;
  businessName?: string;
}) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<'delete' | 'publish' | null>(null);

  useEffect(() => {
    if (!open) {
      setFullscreenOpen(false);
      setBusyAction(null);
    }
  }, [open, item?.id, item?.url]);

  if (!item) return null;

  const isVideo = isWebVideoItem(item);
  const queueId = item.postId || item.id;
  const isQueue = item.source === 'queue' && Boolean(queueId);
  const canEdit = isQueue && Boolean(onEdit);
  const statusLabel =
    item.source === 'google'
      ? 'Published on Google'
      : item.status === 'failed'
        ? 'Failed'
        : item.status === 'scheduled' || item.status === 'publishing'
          ? 'Scheduled'
          : 'Draft (Not Posted)';

  const handlePublishNow = async () => {
    if (!isQueue || busyAction) return;
    setBusyAction('publish');
    try {
      const res = await authFetch('/api/social/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: queueId, publishNow: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not publish media.');
      toast.success('Published media live to Google Business Profile!');
      onOpenChange(false);
      await onPublished?.(item);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish media');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async () => {
    if (!isQueue || busyAction) return;
    setBusyAction('delete');
    try {
      const res = await authFetch(`/api/social/photos?id=${encodeURIComponent(queueId)}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not remove item.');
      toast.success('Removed media item from queue.');
      onOpenChange(false);
      await onDeleted?.(item);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove item');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card text-foreground border-border">
        <DialogHeader className="p-5 pb-3 border-b border-border text-left">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold truncate">
                {item.title || `${businessName} ${isVideo ? 'Video' : 'Photo'}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {statusLabel}
                {item.gbpCategory || item.category ? ` · ${item.gbpCategory || item.category}` : ''}
              </DialogDescription>
            </div>
            {isQueue && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  disabled={busyAction !== null}
                  onClick={() => void handlePublishNow()}
                  className="h-8 rounded-lg text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {busyAction === 'publish' ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Zap className="size-3.5" />
                  )}
                  {item.status === 'failed' ? 'Retry' : 'Publish Now'}
                </Button>
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyAction !== null}
                    onClick={() => {
                      onOpenChange(false);
                      onEdit?.(item);
                    }}
                    className="h-8 rounded-lg text-xs font-bold gap-1"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyAction !== null}
                  onClick={() => void handleDelete()}
                  className="h-8 rounded-lg text-xs font-bold gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  {busyAction === 'delete' ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="rounded-xl overflow-hidden bg-slate-950 border border-border flex items-center justify-center max-h-[380px]">
            {isVideo ? (
              <video
                src={item.url}
                poster={item.thumbnailUrl}
                controls
                playsInline
                autoPlay
                className="w-full max-h-[380px] object-contain"
              />
            ) : (
              <div className="relative w-full flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setFullscreenOpen(true)}
                  className="w-full cursor-zoom-in block"
                  title="Inspect photo full screen"
                >
                  <img
                    src={item.url}
                    alt={item.title || item.caption || 'Business media preview'}
                    className="w-full max-h-[380px] object-contain mx-auto"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreenOpen(true)}
                  className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-900/85 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-900 cursor-pointer"
                >
                  <Maximize2 className="size-3" />
                  <span>Full Screen</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {statusLabel}
              </span>
              {item.scheduledFor && (
                <span className="text-muted-foreground">
                  Scheduled: {new Date(item.scheduledFor).toLocaleString()}
                </span>
              )}
              <div className="flex items-center gap-3">
                {!isVideo && item.url && (
                  <button
                    type="button"
                    onClick={() => setFullscreenOpen(true)}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <Maximize2 className="size-3" />
                    Inspect Full Screen
                  </button>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    Open Original
                  </a>
                )}
              </div>
            </div>

            {(item.description || item.caption) && (
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {item.description || item.caption}
              </p>
            )}

            {Array.isArray(item.tags) && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {item.failureReason && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 font-medium">
                {item.failureReason}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {!isVideo ? (
      <FullscreenImageLightbox
        open={fullscreenOpen}
        onOpenChange={setFullscreenOpen}
        imageUrl={item.url}
        alt={item.title || item.caption || 'Business media preview'}
        title={item.title || `${businessName} Photo`}
        subtitle={`${statusLabel}${item.gbpCategory || item.category ? ` · ${item.gbpCategory || item.category}` : ''}`}
      />
    ) : null}
    </>
  );
}
