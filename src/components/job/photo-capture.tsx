'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  Loader2,
  MapPin,
  X,
  Check,
  AlertCircle,
  CloudOff,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type PhotoType = 'before' | 'after' | 'progress' | 'issue' | 'other';

export interface JobPhoto {
  id: string;
  jobId: string;
  photoType: string;
  url: string;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  mimeType?: string;
  size?: number;
  capturedByName?: string | null;
  capturedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  caption?: string | null;
  notes?: string | null;
  syncStatus?: string;
}

interface PendingPhoto {
  id: string;
  jobId: string;
  photoType: PhotoType;
  dataUrl: string;
  caption?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  capturedAt: string;
  queuedAt: string;
}

interface PhotoCaptureProps {
  jobId: string;
  /** Default photo type — locks the component to a single type if provided. */
  photoType?: PhotoType;
  /** Allow switching between types via tabs. Defaults to true when photoType is not set. */
  showTabs?: boolean;
  /** Compact mode hides the card chrome (used inside dialogs). */
  compact?: boolean;
  /** Called whenever the photos list changes (e.g. after upload/delete). */
  onChange?: (photos: JobPhoto[]) => void;
  /**
   * Optional refresh trigger — when this value changes, the component refetches
   * photos. Pass the job's `status` or `updatedAt` so that when the job is
   * completed (or the completion dialog closes and the parent re-renders with
   * a new status), photos uploaded via a DIFFERENT PhotoCapture instance (e.g.
   * the completion dialog's before/after uploaders) are picked up.
   */
  refreshKey?: string | number;
}

const PHOTO_TYPE_TABS: { value: PhotoType; label: string; color: string }[] = [
  { value: 'before', label: 'Before', color: 'text-amber-700' },
  { value: 'after', label: 'After', color: 'text-emerald-700' },
  { value: 'progress', label: 'Progress', color: 'text-blue-700' },
  { value: 'issue', label: 'Issue', color: 'text-red-700' },
];

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;
const PENDING_STORAGE_KEY = 'fieseros_pending_photos';
// Reject files larger than 10MB before compression (protects against
// memory blow-ups in the canvas resize step + avoids huge base64 payloads
// that would exceed the server's 15MB body-size limit after base64 encoding).
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
// After compression, if the base64 data URL is still larger than this, reject
// the upload — the server body limit (15MB) would truncate it and cause a
// cryptic "Unterminated string in JSON" 500 error. base64 adds ~33% overhead
// over the raw buffer, so 9MB of data URL ≈ 12MB JSON body (safely under 15MB).
const MAX_DATA_URL_BYTES = 9 * 1024 * 1024;

/**
 * Compress and resize an image File to a JPEG data URL.
 * - Resizes so the longest side is <= maxSize (preserving aspect ratio).
 * - Uses canvas.toDataURL('image/jpeg', quality).
 * - Falls back to the original data URL if canvas is unavailable or the
 *   image fails to load.
 */
export async function compressImage(
  file: File,
  maxSize: number = MAX_DIMENSION,
  quality: number = JPEG_QUALITY
): Promise<string> {
  // For non-image files, just read as a data URL (no compression).
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // If the file is small enough, skip canvas processing.
  if (file.size <= 200 * 1024) {
    return dataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        // White background so transparent PNGs don't go black.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Get the user's current GPS position as a Promise.
 * Resolves to null if geolocation is unavailable or denied.
 */
function getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timeoutId = setTimeout(() => resolve(null), 8000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId);
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        clearTimeout(timeoutId);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 60000 }
    );
  });
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function PhotoCapture({
  jobId,
  photoType,
  showTabs,
  compact = false,
  onChange,
  refreshKey,
}: PhotoCaptureProps) {
  // The "locked" mode (photoType provided + showTabs !== true) shows only that type.
  const lockedType = photoType;
  const allowTabs = showTabs !== undefined ? showTabs : !photoType;

  const [activeType, setActiveType] = useState<PhotoType>(lockedType || 'before');
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<JobPhoto | null>(null);
  const [captionDraft, setCaptionDraft] = useState<Record<string, string>>({});
  const [savingCaptionId, setSavingCaptionId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  // Track photos whose <img> failed to load (broken storage URL). Shows a
  // fallback placeholder + error message instead of a silent broken image.
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Track online/offline state
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Fetch photos for this job (all types) — we filter on the client.
  const fetchPhotos = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos`);
      if (!res.ok) throw new Error('Failed to fetch photos');
      const data = await res.json();
      const all: JobPhoto[] = data.photos || [];
      setPhotos(all);
      setBrokenUrls(new Set()); // reset broken-URL tracking on fresh fetch
      onChange?.(all);
    } catch (err) {
      console.error('[PhotoCapture] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId, onChange]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Refetch when `refreshKey` changes — this lets the parent (e.g. the job
  // detail page) trigger a refresh when the job status changes (e.g. after
  // completion) so photos uploaded via a DIFFERENT PhotoCapture instance
  // (the completion dialog's before/after uploaders) are picked up.
  useEffect(() => {
    if (refreshKey === undefined) return;
    fetchPhotos();
  }, [refreshKey, fetchPhotos]);

  // Refetch when the window regains focus — covers the case where the user
  // uploads photos in another tab/dialog and returns to this page.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onFocus = () => {
      console.log('[PhotoCapture] window focus — refetching photos');
      fetchPhotos();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchPhotos]);

  // Try to replay any pending offline photos on mount + when we come back online.
  const replayPending = useCallback(async () => {
    if (typeof window === 'undefined') return;
    let pending: PendingPhoto[] = [];
    try {
      const raw = window.localStorage.getItem(PENDING_STORAGE_KEY);
      pending = raw ? (JSON.parse(raw) as PendingPhoto[]) : [];
    } catch {
      pending = [];
    }
    if (pending.length === 0) return;
    const remaining: PendingPhoto[] = [];
    for (const p of pending) {
      if (p.jobId !== jobId) {
        // Don't touch photos queued for other jobs — leave them in storage.
        remaining.push(p);
        continue;
      }
      try {
        const res = await fetch(`/api/jobs/${jobId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoType: p.photoType,
            file: p.dataUrl,
            caption: p.caption,
            notes: p.notes,
            latitude: p.latitude,
            longitude: p.longitude,
            accuracy: p.accuracy,
            capturedAt: p.capturedAt,
            syncStatus: 'synced',
          }),
        });
        if (!res.ok) throw new Error('upload failed');
      } catch {
        // Keep in queue for next attempt.
        remaining.push(p);
      }
    }
    try {
      window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(remaining));
    } catch {
      // storage full — best effort
    }
    if (remaining.length < pending.length) {
      toast.success(`Synced ${pending.length - remaining.length} queued photo(s)`);
      fetchPhotos();
    }
  }, [jobId, fetchPhotos]);

  useEffect(() => {
    if (isOnline) replayPending();
  }, [isOnline, replayPending]);

  // Filter photos by the active type tab.
  const visiblePhotos = photos.filter((p) => p.photoType === activeType);

  // ── Upload handlers ────────────────────────────────────────────────
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        console.log('[PhotoCapture] handleFiles: no files selected');
        return;
      }
      // CRITICAL: Snapshot the FileList into a plain array BEFORE any await.
      // The onChange handler calls `e.target.value = ''` synchronously right
      // after calling handleFiles (to allow re-selecting the same file). On
      // Chrome, clearing the input empties the live FileList object — so by
      // the time handleFiles resumes from its first `await` (GPS, up to 8s),
      // `files` would be empty and the upload loop would run zero iterations.
      // Symptom: spinner shows then stops, no POST, no toast, no error.
      const fileArray = Array.from(files);
      console.log(`[PhotoCapture] handleFiles: ${fileArray.length} file(s) to upload`);
      setUploading(true);
      const typeToUse = lockedType || activeType;
      // Start GPS capture immediately (non-blocking). We'll await it later,
      // right before the POST, so it runs in parallel with image compression.
      const gpsPromise = getCurrentPosition();

      let successCount = 0;
      let offlineCount = 0;

      for (const file of fileArray) {
        try {
          // Guard: reject excessively large files before attempting compression
          // (canvas operations on 50MB+ RAW/HEIC files can crash mobile browsers).
          if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`${file.name} is too large`, {
              description: `Maximum file size is ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB. Got ${Math.round(file.size / 1024 / 1024)}MB.`,
              duration: 6000,
            });
            continue;
          }
          const dataUrl = await compressImage(file, MAX_DIMENSION, JPEG_QUALITY);
          const capturedAt = new Date().toISOString();

          // Post-compression guard: if the data URL is still too large (e.g.,
          // compression fell back to the original for HEIC/unreadable files),
          // reject it BEFORE uploading — the server's 15MB body limit would
          // silently truncate the request and cause a cryptic JSON parse error.
          if (dataUrl.length > MAX_DATA_URL_BYTES) {
            toast.error(`${file.name} is too large to upload`, {
              description: `Even after compression, the image is ${Math.round(dataUrl.length / 1024 / 1024)}MB (base64). Maximum is ${Math.round(MAX_DATA_URL_BYTES / 1024 / 1024)}MB. Try a smaller image or different format.`,
              duration: 8000,
            });
            continue;
          }

          // Await GPS now (it was started before the loop, so it's likely
          // already resolved by the time compression finishes). This runs
          // in parallel with compression rather than blocking the loop start.
          const gps = await gpsPromise;

          // Offline path — queue to localStorage
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const pending: PendingPhoto = {
              id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              jobId,
              photoType: typeToUse,
              dataUrl,
              latitude: gps?.latitude,
              longitude: gps?.longitude,
              accuracy: gps?.accuracy,
              capturedAt,
              queuedAt: capturedAt,
            };
            try {
              const raw = window.localStorage.getItem(PENDING_STORAGE_KEY);
              const list: PendingPhoto[] = raw ? JSON.parse(raw) : [];
              list.push(pending);
              window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(list));
              offlineCount++;
            } catch {
              toast.error('Offline storage full — could not queue photo.');
            }
            continue;
          }

          // Online path — upload immediately
          console.log(`[PhotoCapture] POST /api/jobs/${jobId}/photos — ${file.name} (${Math.round(dataUrl.length / 1024)}KB base64)`);
          const res = await fetch(`/api/jobs/${jobId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photoType: typeToUse,
              file: dataUrl,
              latitude: gps?.latitude,
              longitude: gps?.longitude,
              accuracy: gps?.accuracy,
              capturedAt,
              syncStatus: 'synced',
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            // Include the HTTP status + server error message so the user
            // sees what actually went wrong (auth, size, server error, etc.)
            const detail = err.error || res.statusText || 'Unknown error';
            throw new Error(`Upload failed (${res.status}): ${detail}`);
          }
          successCount++;
        } catch (err) {
          console.error('[PhotoCapture] upload error:', err);
          // Show the actual error message (not just "Failed to upload")
          // so the user knows whether it's an auth issue, size limit, etc.
          const msg = err instanceof Error ? err.message : 'Unknown error';
          toast.error(`Failed to upload ${file.name}`, {
            description: msg,
            duration: 6000,
          });
        }
      }

      console.log(`[PhotoCapture] handleFiles done: ${successCount} uploaded, ${offlineCount} queued offline (of ${fileArray.length} total)`);
      if (successCount > 0) {
        toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded`);
      }
      if (offlineCount > 0) {
        toast.info(`${offlineCount} photo${offlineCount > 1 ? 's' : ''} saved offline — will sync when online`, {
          icon: <CloudOff className="size-4" />,
        });
      }
      setUploading(false);
      fetchPhotos();
    },
    [activeType, lockedType, jobId, fetchPhotos]
  );

  const handleDelete = useCallback(
    async (photo: JobPhoto) => {
      const prev = photos;
      // Optimistic delete
      setPhotos((cur) => cur.filter((p) => p.id !== photo.id));
      try {
        const res = await fetch(`/api/jobs/${jobId}/photos/${photo.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        toast.success('Photo deleted');
        const newList = prev.filter((p) => p.id !== photo.id);
        onChange?.(newList);
      } catch (err) {
        console.error('[PhotoCapture] delete error:', err);
        setPhotos(prev); // rollback
        toast.error('Failed to delete photo');
      }
    },
    [jobId, photos, onChange]
  );

  const saveCaption = useCallback(
    async (photo: JobPhoto) => {
      const draft = captionDraft[photo.id];
      if (draft == null) return;
      setSavingCaptionId(photo.id);
      try {
        const res = await fetch(`/api/jobs/${jobId}/photos/${photo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption: draft }),
        });
        if (!res.ok) throw new Error('Failed to update caption');
        const data = await res.json();
        setPhotos((cur) => cur.map((p) => (p.id === photo.id ? data.photo : p)));
        setCaptionDraft((cur) => {
          const next = { ...cur };
          delete next[photo.id];
          return next;
        });
        toast.success('Caption saved');
      } catch (err) {
        console.error('[PhotoCapture] caption save error:', err);
        toast.error('Failed to save caption');
      } finally {
        setSavingCaptionId(null);
      }
    },
    [jobId, captionDraft]
  );

  // ── Render ─────────────────────────────────────────────────────────
  const isLocked = !!lockedType && !allowTabs;

  return (
    <div className={cn('w-full', compact ? '' : 'space-y-4')}>
      {/* Type tabs (optional) */}
      {allowTabs && (
        <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-1 overflow-x-auto">
          {PHOTO_TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveType(tab.value)}
              className={cn(
                'flex-1 min-w-[80px] inline-flex items-center justify-center h-8 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors',
                activeType === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Upload actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="bg-background"
        >
          {uploading ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Camera className="size-4 mr-1.5" />}
          Take Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => galleryInputRef.current?.click()}
          disabled={uploading}
          className="bg-background"
        >
          <ImageIcon className="size-4 mr-1.5" />
          Upload
        </Button>
        {!isOnline && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 self-center">
            <CloudOff className="size-3" /> Offline
          </Badge>
        )}
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Photo grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          <Loader2 className="size-4 mr-2 animate-spin" /> Loading photos…
        </div>
      ) : visiblePhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-border/60 bg-muted/20 text-center">
          <Camera className="size-6 text-muted-foreground/60 mb-2" />
          <p className="text-sm text-muted-foreground">
            No {isLocked ? lockedType : activeType} photos yet.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Use the camera or upload button to add {isLocked ? lockedType : activeType} photos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visiblePhotos.map((photo) => {
            const hasGps = photo.latitude != null && photo.longitude != null;
            const draft = captionDraft[photo.id];
            const captionValue = draft != null ? draft : photo.caption || '';
            return (
              <div
                key={photo.id}
                className="group relative rounded-lg overflow-hidden border border-border/60 bg-background shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(photo)}
                  className="block w-full aspect-square bg-muted/40 overflow-hidden"
                  aria-label="View photo full size"
                >
                  {brokenUrls.has(photo.id) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center">
                      <AlertCircle className="size-5 text-red-500" />
                      <p className="text-[10px] text-red-600 font-medium">Image load failed</p>
                      <p className="text-[9px] text-muted-foreground leading-tight">
                        URL may be unreachable. Check storage config.
                      </p>
                    </div>
                  ) : (
                    <img
                      src={photo.url}
                      alt={photo.caption || `${photo.photoType} photo`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                      onError={() => {
                        console.error('[PhotoCapture] Image failed to load:', photo.url);
                        setBrokenUrls((prev) => new Set(prev).add(photo.id));
                      }}
                    />
                  )}
                </button>

                {/* Top-left: type badge */}
                <div className="absolute top-1.5 left-1.5">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] py-0 px-1.5 capitalize shadow-sm',
                      photo.photoType === 'before' && 'bg-amber-100 text-amber-800 border-amber-200',
                      photo.photoType === 'after' && 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      photo.photoType === 'progress' && 'bg-blue-100 text-blue-800 border-blue-200',
                      photo.photoType === 'issue' && 'bg-red-100 text-red-800 border-red-200',
                      photo.photoType === 'other' && 'bg-muted text-foreground border-border'
                    )}
                  >
                    {photo.photoType}
                  </Badge>
                </div>

                {/* Top-right: GPS indicator + delete */}
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                  {hasGps && (
                    <span
                      title={`GPS: ${photo.latitude?.toFixed(5)}, ${photo.longitude?.toFixed(5)} (±${Math.round(photo.accuracy || 0)}m)`}
                      className="inline-flex items-center justify-center size-6 rounded-full bg-background/90 text-emerald-700 shadow-sm"
                    >
                      <MapPin className="size-3" />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(photo)}
                    className="inline-flex items-center justify-center size-6 rounded-full bg-background/90 text-red-600 hover:bg-red-50 shadow-sm transition-colors"
                    aria-label="Delete photo"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>

                {/* Bottom: caption + timestamp */}
                <div className="p-2 space-y-1.5">
                  <Input
                    value={captionValue}
                    placeholder="Add caption…"
                    onChange={(e) =>
                      setCaptionDraft((cur) => ({ ...cur, [photo.id]: e.target.value }))
                    }
                    className="h-7 text-xs px-1.5"
                  />
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-muted-foreground truncate">
                      {formatTime(photo.capturedAt)}
                    </span>
                    {draft != null && draft !== (photo.caption || '') && (
                      <button
                        type="button"
                        onClick={() => saveCaption(photo)}
                        disabled={savingCaptionId === photo.id}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        {savingCaptionId === photo.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Check className="size-3" />
                        )}
                        Save
                      </button>
                    )}
                  </div>
                </div>

                {photo.syncStatus && photo.syncStatus !== 'synced' && (
                  <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 text-white text-[10px] text-center py-0.5 font-medium">
                    {photo.syncStatus}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      <Dialog open={!!previewPhoto} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {previewPhoto?.photoType} Photo
            </DialogTitle>
          </DialogHeader>
          {previewPhoto && (
            <div className="space-y-3">
              {brokenUrls.has(previewPhoto.id) ? (
                <div className="w-full max-h-[60vh] flex flex-col items-center justify-center gap-2 rounded-lg bg-muted/20 p-8 text-center">
                  <AlertCircle className="size-8 text-red-500" />
                  <p className="text-sm font-medium text-red-600">Image failed to load</p>
                  <p className="text-xs text-muted-foreground break-all max-w-md">
                    The photo was uploaded but its URL is unreachable. This usually means
                    storage (S3/Supabase/local FS) is misconfigured. URL: {previewPhoto.url}
                  </p>
                </div>
              ) : (
                <img
                  src={previewPhoto.url}
                  alt={previewPhoto.caption || 'Photo'}
                  className="w-full max-h-[60vh] object-contain rounded-lg bg-muted/20"
                  onError={() => {
                    console.error('[PhotoCapture] Preview image failed to load:', previewPhoto.url);
                    setBrokenUrls((prev) => new Set(prev).add(previewPhoto.id));
                  }}
                />
              )}
              <div className="space-y-1 text-sm">
                {previewPhoto.caption && (
                  <p className="text-foreground font-medium">{previewPhoto.caption}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Captured {formatTime(previewPhoto.capturedAt)}
                  {previewPhoto.capturedByName && ` by ${previewPhoto.capturedByName}`}
                </p>
                {previewPhoto.latitude != null && previewPhoto.longitude != null && (
                  <p className="text-xs text-emerald-700 inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {previewPhoto.latitude.toFixed(5)}, {previewPhoto.longitude.toFixed(5)}
                    {previewPhoto.accuracy != null && ` (±${Math.round(previewPhoto.accuracy)}m)`}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {previewPhoto && (
              <Button
                variant="outline"
                onClick={() => {
                  handleDelete(previewPhoto);
                  setPreviewPhoto(null);
                }}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="size-4 mr-1.5" /> Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setPreviewPhoto(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PhotoCapture;
