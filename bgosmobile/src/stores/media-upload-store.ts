import { Platform } from 'react-native';
import { create } from 'zustand';
import { apiRequest } from '../lib/api';
import { uploadFileToStorage, type PendingUpload } from '../lib/upload';
import { getNotificationsModule, isExpoGoRuntime } from '../lib/notifications-runtime';

export type BackgroundScheduleMode = 'daily' | 'weekly' | 'instant' | 'draft';

export interface ActiveBatchItem {
  id: string;
  local: PendingUpload;
  uploading: boolean;
  progress: number;
  cloudUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface MediaJobSaveConfig {
  title: string;
  description?: string;
  tags: string[];
  category: string;
  scheduleMode: BackgroundScheduleMode;
  preferredTime: string;
  country?: string;
  timeZone?: string;
  businessName: string;
}

export interface MediaUploadJob {
  id: string;
  batchId: string;
  status: 'uploading' | 'saving' | 'completed' | 'failed';
  progress: number;
  totalFiles: number;
  completedFiles: number;
  hasVideo: boolean;
  label: string;
  config: MediaJobSaveConfig;
  mediaId?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  targetTab: 'scheduled' | 'uploaded' | 'unposted';
  message?: string;
  error?: string;
  createdAt: number;
}

interface BatchUploadHandle {
  batchId: string;
  items: ActiveBatchItem[];
  promises: Array<Promise<string | null>>;
  thumbPromises: Array<Promise<string | undefined>>;
  videoWarning?: string;
  cancelled: boolean;
}

const batchHandles = new Map<string, BatchUploadHandle>();
const pendingJobBatches = new Map<string, PendingUpload[]>();

async function extractWebVideoPoster(asset: PendingUpload): Promise<PendingUpload | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || asset.mediaType !== 'video') {
    return null;
  }
  let objectUrl: string | null = null;
  try {
    let srcUrl = asset.uri;
    if (asset.file && typeof Blob !== 'undefined' && asset.file instanceof Blob) {
      objectUrl = URL.createObjectURL(asset.file);
      srcUrl = objectUrl;
    }
    if (!srcUrl) return null;

    const blob = await new Promise<Blob | null>((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';
      let done = false;
      const finish = (res: Blob | null) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        video.removeAttribute('src');
        resolve(res);
      };
      const timer = setTimeout(() => finish(null), 5000);
      video.onerror = () => finish(null);
      video.onloadedmetadata = () => {
        try {
          const seekTo =
            Number.isFinite(video.duration) && video.duration > 0.2
              ? Math.min(0.6, video.duration / 4)
              : 0;
          video.currentTime = seekTo;
        } catch {
          finish(null);
        }
      };
      video.onseeked = () => {
        try {
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 360;
          const maxW = 640;
          const scale = vw > maxW ? maxW / vw : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(16, Math.round(vw * scale));
          canvas.height = Math.max(16, Math.round(vh * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) return finish(null);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((outBlob) => finish(outBlob), 'image/jpeg', 0.82);
        } catch {
          finish(null);
        }
      };
      video.src = srcUrl;
    });

    if (!blob) return null;
    const posterFile =
      typeof File !== 'undefined'
        ? new File([blob], `thumb-${Date.now()}.jpg`, { type: 'image/jpeg' })
        : blob;
    return {
      uri: URL.createObjectURL(blob),
      name: `thumb-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      file: posterFile,
      fileSize: blob.size,
      mediaType: 'image',
    };
  } catch {
    return null;
  } finally {
    if (objectUrl) {
      setTimeout(() => URL.revokeObjectURL(objectUrl!), 6000);
    }
  }
}

function targetTabForResult(
  scheduleMode: BackgroundScheduleMode,
  resultStatus?: string,
): 'scheduled' | 'uploaded' | 'unposted' {
  const st = String(resultStatus || '').toLowerCase();
  if (st === 'published') return 'uploaded';
  if (st.includes('draft') || st.includes('saved_locally') || scheduleMode === 'draft') {
    return 'unposted';
  }
  return 'scheduled';
}

async function fireUploadNotification(job: MediaUploadJob) {
  const destParams = {
    route: '/(tabs)/photos',
    mediaId: job.mediaId || '',
    photoId: job.mediaId || '',
    tab: job.targetTab,
  };
  const title = job.status === 'completed' ? 'Media Upload Complete' : 'Media Upload Attention Needed';
  const body =
    job.status === 'completed'
      ? `${job.config.title || job.label} is ready. Tap to preview.`
      : job.error || 'Could not complete background media upload. Tap to retry.';

  if (Platform.OS === 'web') {
    try {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        const notif = new window.Notification(title, { body });
        notif.onclick = () => {
          try {
            window.focus();
            const qs = new URLSearchParams({
              ...(job.mediaId ? { mediaId: job.mediaId, photoId: job.mediaId } : {}),
              tab: job.targetTab,
            }).toString();
            window.location.href = `/photos?${qs}`;
          } catch {}
        };
      }
    } catch {}
    return;
  }

  if (isExpoGoRuntime) return;
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: destParams,
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[media-upload-store] Local notification warning:', err);
  }
}

interface MediaUploadStoreState {
  activeBatches: Record<string, ActiveBatchItem[]>;
  batchWarnings: Record<string, string | null>;
  jobs: MediaUploadJob[];
  lastCompletionSeq: number;
  lastCompletedJob: MediaUploadJob | null;

  startBatch: (assets: PendingUpload[]) => string;
  retryBatchFile: (batchId: string, index: number) => void;
  cancelBatch: (batchId: string) => void;
  submitBatchJob: (batchId: string, config: MediaJobSaveConfig) => Promise<MediaUploadJob>;
  retryJob: (jobId: string) => void;
  dismissJob: (jobId: string) => void;
}

export const useMediaUploadStore = create<MediaUploadStoreState>((set, get) => {
  const runBatchItem = (batchId: string, idx: number, item: PendingUpload) => {
    const handle = batchHandles.get(batchId);
    if (!handle || handle.cancelled) return;

    const updateItem = (patch: Partial<ActiveBatchItem>) => {
      const h = batchHandles.get(batchId);
      if (!h || h.cancelled) return;
      h.items = h.items.map((row, i) => (i === idx ? { ...row, ...patch } : row));
      set((state) => ({
        activeBatches: {
          ...state.activeBatches,
          [batchId]: h.items,
        },
      }));
      syncLinkedJobProgress(batchId);
    };

    const posterPromise: Promise<string | undefined> =
      item.mediaType === 'video'
        ? extractWebVideoPoster(item)
            .then(async (posterUpload) => {
              if (!posterUpload) return undefined;
              const thumbUrl = await uploadFileToStorage(posterUpload, {
                folder: 'gbp-media',
                visibility: 'public',
                timeoutMs: 45000,
              });
              updateItem({ thumbnailUrl: thumbUrl });
              return thumbUrl;
            })
            .catch(() => undefined)
        : Promise.resolve(undefined);

    const filePromise: Promise<string | null> = uploadFileToStorage(item, {
      folder: 'gbp-media',
      visibility: 'public',
      timeoutMs: item.mediaType === 'video' ? 180000 : 90000,
      onWarning: (w) => {
        set((state) => ({
          batchWarnings: { ...state.batchWarnings, [batchId]: w },
        }));
      },
      onProgress: (pct) => {
        updateItem({ progress: pct });
      },
    })
      .then((cloudUrl) => {
        updateItem({
          cloudUrl,
          uploading: false,
          progress: 100,
          error: undefined,
        });
        return cloudUrl;
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Upload failed';
        updateItem({
          uploading: false,
          error: message,
        });
        return null;
      });

    handle.promises[idx] = filePromise;
    handle.thumbPromises[idx] = posterPromise;
  };

  const syncLinkedJobProgress = (batchId: string) => {
    const h = batchHandles.get(batchId);
    if (!h) return;
    const items = h.items;
    if (!items.length) return;
    const totalPct = items.reduce((acc, it) => acc + (it.cloudUrl ? 100 : it.progress || 0), 0);
    const avgPct = Math.round(totalPct / items.length);
    const completedCount = items.filter((it) => Boolean(it.cloudUrl)).length;

    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.batchId === batchId && job.status === 'uploading'
          ? {
              ...job,
              progress: Math.min(95, Math.max(2, avgPct)),
              completedFiles: completedCount,
            }
          : job,
      ),
    }));
  };

  return {
    activeBatches: {},
    batchWarnings: {},
    jobs: [],
    lastCompletionSeq: 0,
    lastCompletedJob: null,

    startBatch: (assets) => {
      const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const items: ActiveBatchItem[] = assets.map((local, idx) => ({
        id: `${batchId}-${idx}`,
        local,
        uploading: true,
        progress: 0,
      }));
      const handle: BatchUploadHandle = {
        batchId,
        items,
        promises: new Array(items.length).fill(Promise.resolve(null)),
        thumbPromises: new Array(items.length).fill(Promise.resolve(undefined)),
        cancelled: false,
      };
      batchHandles.set(batchId, handle);
      pendingJobBatches.set(batchId, assets);

      set((state) => ({
        activeBatches: {
          ...state.activeBatches,
          [batchId]: items,
        },
        batchWarnings: {
          ...state.batchWarnings,
          [batchId]: null,
        },
      }));

      assets.forEach((asset, idx) => {
        runBatchItem(batchId, idx, asset);
      });

      return batchId;
    },

    retryBatchFile: (batchId, index) => {
      const h = batchHandles.get(batchId);
      if (!h || !h.items[index]) return;
      h.items = h.items.map((row, i) =>
        i === index ? { ...row, uploading: true, progress: 0, error: undefined } : row,
      );
      set((state) => ({
        activeBatches: {
          ...state.activeBatches,
          [batchId]: h.items,
        },
      }));
      runBatchItem(batchId, index, h.items[index].local);
    },

    cancelBatch: (batchId) => {
      const h = batchHandles.get(batchId);
      if (h) h.cancelled = true;
      batchHandles.delete(batchId);
      pendingJobBatches.delete(batchId);
      set((state) => {
        const nextBatches = { ...state.activeBatches };
        delete nextBatches[batchId];
        return { activeBatches: nextBatches };
      });
    },

    submitBatchJob: async (batchId, config) => {
      const h = batchHandles.get(batchId);
      const itemsSnapshot = h?.items || get().activeBatches[batchId] || [];
      const hasVideo = itemsSnapshot.some((it) => it.local.mediaType === 'video');
      const allReadyAlready =
        itemsSnapshot.length > 0 && itemsSnapshot.every((it) => !it.uploading && Boolean(it.cloudUrl));

      const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const initialJob: MediaUploadJob = {
        id: jobId,
        batchId,
        status: allReadyAlready ? 'saving' : 'uploading',
        progress: allReadyAlready ? 92 : 10,
        totalFiles: itemsSnapshot.length,
        completedFiles: itemsSnapshot.filter((it) => Boolean(it.cloudUrl)).length,
        hasVideo,
        label: config.title || (hasVideo ? 'Video Upload' : 'Media Upload'),
        config,
        targetTab: config.scheduleMode === 'draft' ? 'unposted' : config.scheduleMode === 'instant' ? 'uploaded' : 'scheduled',
        createdAt: Date.now(),
      };

      set((state) => ({
        jobs: [initialJob, ...state.jobs.filter((j) => j.status !== 'completed')].slice(0, 5),
      }));

      try {
        if (h) {
          await Promise.all([...h.promises, ...h.thumbPromises]);
        }

        const latestItems = batchHandles.get(batchId)?.items || get().activeBatches[batchId] || itemsSnapshot;
        const readyItems = latestItems.filter((it) => Boolean(it.cloudUrl));
        if (!readyItems.length) {
          const firstErr = latestItems.find((it) => it.error)?.error || 'Upload failed. Please try again.';
          throw new Error(firstErr);
        }

        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === jobId ? { ...j, status: 'saving', progress: 96, completedFiles: readyItems.length } : j,
          ),
        }));

        const payloadItems = readyItems.map((u, idx) => ({
          url: u.cloudUrl as string,
          thumbnailUrl: u.thumbnailUrl || undefined,
          title:
            readyItems.length > 1 && config.title.trim()
              ? `${config.title.trim()} (${idx + 1})`
              : config.title.trim() || `${config.businessName} Media`,
          description: config.description?.trim() || undefined,
          tags: config.tags,
          category: config.category,
          mediaFormat: u.local.mediaType === 'video' ? ('VIDEO' as const) : ('PHOTO' as const),
        }));

        const res = await apiRequest<{
          success?: boolean;
          message?: string;
          results?: Array<{ id?: string; url: string; thumbnailUrl?: string; status?: string }>;
        }>('/api/social/photos', {
          method: 'POST',
          body: {
            items: payloadItems,
            photos: payloadItems.map((i) => i.url),
            title: config.title.trim(),
            description: config.description?.trim() || undefined,
            tags: config.tags,
            category: config.category,
            scheduleMode: config.scheduleMode,
            preferredTime: config.preferredTime,
            country: config.country,
            timeZone: config.timeZone,
          },
        });

        const firstResult = Array.isArray(res?.results) ? res.results[0] : undefined;
        const resolvedMediaId = firstResult?.id || firstResult?.url || payloadItems[0]?.url;
        const resolvedTab = targetTabForResult(config.scheduleMode, firstResult?.status);

        const finishedJob: MediaUploadJob = {
          ...initialJob,
          status: 'completed',
          progress: 100,
          completedFiles: readyItems.length,
          mediaId: resolvedMediaId,
          mediaUrl: firstResult?.url || payloadItems[0]?.url,
          thumbnailUrl: firstResult?.thumbnailUrl || payloadItems[0]?.thumbnailUrl,
          targetTab: resolvedTab,
          message: res?.message || 'Media uploaded & saved successfully.',
        };

        batchHandles.delete(batchId);
        pendingJobBatches.delete(batchId);

        set((state) => {
          const nextBatches = { ...state.activeBatches };
          delete nextBatches[batchId];
          return {
            activeBatches: nextBatches,
            jobs: state.jobs.map((j) => (j.id === jobId ? finishedJob : j)),
            lastCompletionSeq: state.lastCompletionSeq + 1,
            lastCompletedJob: finishedJob,
          };
        });

        void fireUploadNotification(finishedJob);
        return finishedJob;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Background media upload failed.';
        const failedJob: MediaUploadJob = {
          ...initialJob,
          status: 'failed',
          error: message,
        };
        set((state) => ({
          jobs: state.jobs.map((j) => (j.id === jobId ? failedJob : j)),
        }));
        void fireUploadNotification(failedJob);
        throw err;
      }
    },

    retryJob: (jobId) => {
      const job = get().jobs.find((j) => j.id === jobId);
      if (!job) return;
      const assets = pendingJobBatches.get(job.batchId);
      if (!assets || !assets.length) {
        get().dismissJob(jobId);
        return;
      }
      const newBatchId = get().startBatch(assets);
      get().dismissJob(jobId);
      void get().submitBatchJob(newBatchId, job.config).catch(() => {});
    },

    dismissJob: (jobId) => {
      set((state) => ({
        jobs: state.jobs.filter((j) => j.id !== jobId),
      }));
    },
  };
});
