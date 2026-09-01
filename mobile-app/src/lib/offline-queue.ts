/**
 * Fieseros Mobile App — Offline Upload Queue (AsyncStorage-backed)
 *
 * Mirrors the PWA's localStorage-backed `fieseros_pending_photos` queue
 * (src/components/job/photo-capture.tsx) + checklist pending ops
 * (src/components/job/checklist-execution.tsx).
 *
 * When a photo or checklist-note upload fails because the device is offline
 * (or the server returns a 5xx / network error), we enqueue the payload
 * here. The next time the screen is focused (or the network recovers) the
 * owning screen drains the queue by re-attempting the upload.
 *
 * Persistence: AsyncStorage (`@react-native-async-storage/async-storage`) on
 * native, localStorage on web (the AsyncStorage module transparently falls
 * back to localStorage when running on web — see its docs). Survives app
 * restarts so an employee who closes the app mid-upload doesn't lose the
 * photo.
 *
 * Each item has a stable client-generated id (used as the AsyncStorage key
 * suffix) so we can remove it after a successful replay.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'fieseros_offline_queue_v1';

/**
 * Lazily resolve the storage backend.
 *
 * On native, AsyncStorage (default export) is used directly. On web, AsyncStorage
 * transparently falls back to localStorage (it ships a web shim), but to keep
 * the bundle small and avoid any initialization quirks we use localStorage
 * directly there.
 */
async function readRaw(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY)
        : null;
    }
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[offline-queue] read failed:', err);
    return null;
  }
}

async function writeRaw(value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, value);
      }
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, value);
  } catch (err) {
    console.warn('[offline-queue] write failed:', err);
  }
}

export type OfflineItemType = 'photo' | 'checklist';

export interface OfflineQueueItem {
  /** Stable client-generated id (used as a dedup key + for removal). */
  id: string;
  type: OfflineItemType;
  jobId: string;
  /**
   * Payload shape depends on `type`:
   *   - photo: { photoType, caption?, asset: { uri, name, type } }
   *   - checklist: { itemId, completed, notes? }
   *
   * Note: we can't serialize a FormData directly — the photo payload stores
   * the raw asset (uri/name/type) and the replay path rebuilds the FormData.
   */
  payload: Record<string, unknown>;
  createdAt: string;
  /** Number of failed replay attempts (used to give up after N tries). */
  attempts: number;
}

interface SerializedQueue {
  items: OfflineQueueItem[];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readQueue(): Promise<OfflineQueueItem[]> {
  const raw = await readRaw();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SerializedQueue;
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch (err) {
    console.warn('[offline-queue] parse failed:', err);
    return [];
  }
}

async function writeQueue(items: OfflineQueueItem[]): Promise<void> {
  const serialized = JSON.stringify({ items } satisfies SerializedQueue);
  await writeRaw(serialized);
}

/**
 * Enqueue a single item. Returns the new item (with its generated id).
 */
export async function enqueue(
  type: OfflineItemType,
  jobId: string,
  payload: Record<string, unknown>
): Promise<OfflineQueueItem> {
  const items = await readQueue();
  const item: OfflineQueueItem = {
    id: generateId(),
    type,
    jobId,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  items.push(item);
  await writeQueue(items);
  return item;
}

/**
 * Return ALL queued items (any type, any job). Callers filter as needed.
 */
export async function getAll(): Promise<OfflineQueueItem[]> {
  return readQueue();
}

/**
 * Return queued items for a specific job (and optionally a specific type).
 */
export async function getForJob(
  jobId: string,
  type?: OfflineItemType
): Promise<OfflineQueueItem[]> {
  const items = await readQueue();
  return items.filter((i) => i.jobId === jobId && (!type || i.type === type));
}

/**
 * Remove a specific item from the queue (after a successful replay).
 */
export async function remove(id: string): Promise<void> {
  const items = await readQueue();
  const next = items.filter((i) => i.id !== id);
  if (next.length !== items.length) {
    await writeQueue(next);
  }
}

/**
 * Increment the attempts counter for an item that failed replay.
 * Returns the updated item, or null if it was removed.
 */
export async function bumpAttempts(id: string): Promise<OfflineQueueItem | null> {
  const items = await readQueue();
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  item.attempts += 1;
  await writeQueue(items);
  return item;
}

/**
 * Wipe the entire queue. Use after a successful full sync, or in a "reset
 * offline data" settings action.
 */
export async function clear(): Promise<void> {
  await writeQueue([]);
}

/**
 * Total count of pending items (cheap — used to render a small badge).
 */
export async function count(): Promise<number> {
  const items = await readQueue();
  return items.length;
}

// ── Photo-specific queue (separate storage key) ──────────────────────
//
// V1.6 (Mobile-Fix-Tracking-Offline): A dedicated photo queue with three
// differences from the generic `enqueue/getForJob/remove` API above:
//
//   1. SEPARATE STORAGE KEY (`fieseros_photo_queue`) — so draining the
//      photo queue doesn't interfere with checklist items.
//
//   2. PERSISTENT URI COPY — temp camera URIs (especially on Android)
//      can be cleaned up by the OS minutes after the camera intent
//      returns. When queuing, we copy the photo into
//      `FileSystem.documentDirectory/fieseros-photos/` so the file
//      survives until the upload succeeds.
//
//   3. SELF-CONTAINED UPLOAD — `processPhotoQueue()` rebuilds the FormData
//      (using the shared `buildPhotoFormData` helper) and POSTs it to
//      `/api/jobs/[id]/photos` directly. The caller doesn't need to know
//      the upload mechanics.

import * as ImagePicker from 'expo-image-picker';
import { api } from './api';
import { buildPhotoFormData } from './job-proof-helpers';
import type { GpsCoords } from './gps';

const PHOTO_QUEUE_KEY = 'fieseros_photo_queue';
// Photo persistence directory — resolved lazily on native only.
// On web, photos are referenced by blob URL (no persistent copy needed).
let _photoDir: string | null = null;

/**
 * Get the photo directory path on native. Uses the legacy FileSystem API
 * via `expo-file-system/legacy` (the main export's deprecated wrappers
 * throw at runtime in v19). The legacy module is web-safe (returns null
 * for documentDirectory on web).
 */
async function getPhotoDir(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (_photoDir) return _photoDir;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system/legacy');
    const dir = `${FileSystem.documentDirectory}fieseros-photos/`;
    // Ensure the directory exists
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    _photoDir = dir;
    return dir;
  } catch (err) {
    console.warn('[offline-queue] getPhotoDir failed:', err);
    return null;
  }
}

export interface QueuedPhotoUpload {
  /** Stable client-generated id. */
  id: string;
  jobId: string;
  /**
   * Persistent URI in `documentDirectory/fieseros-photos/` (a copy of the
   * original temp camera URI). Survives OS cleanup of the camera cache.
   */
  photoUri: string;
  /** File name (used as the FormData file name). */
  photoName: string;
  /** MIME type — defaults to `image/jpeg` if unknown. */
  mimeType: string;
  /** One of: before / progress / after / issue / other. */
  photoType: string;
  caption?: string;
  /** Best-effort GPS captured at queue time. */
  gps?: GpsCoords | null;
  createdAt: string;
  /** Number of failed replay attempts. */
  attempts: number;
}

interface PhotoQueueStore {
  items: QueuedPhotoUpload[];
}

async function readPhotoQueue(): Promise<QueuedPhotoUpload[]> {
  try {
    if (Platform.OS === 'web') {
      const raw =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(PHOTO_QUEUE_KEY)
          : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PhotoQueueStore;
      return Array.isArray(parsed?.items) ? parsed.items : [];
    }
    const raw = await AsyncStorage.getItem(PHOTO_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PhotoQueueStore;
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch (err) {
    console.warn('[offline-queue] photo queue read failed:', err);
    return [];
  }
}

async function writePhotoQueue(items: QueuedPhotoUpload[]): Promise<void> {
  try {
    const serialized = JSON.stringify({ items } satisfies PhotoQueueStore);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PHOTO_QUEUE_KEY, serialized);
      }
      return;
    }
    await AsyncStorage.setItem(PHOTO_QUEUE_KEY, serialized);
  } catch (err) {
    console.warn('[offline-queue] photo queue write failed:', err);
  }
}

function generatePhotoId(): string {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Copy a temp camera/gallery URI into the app's document directory so the
 * photo survives OS cleanup of the camera cache. Returns the persistent URI.
 *
 * On web, no copy is performed (the photo is referenced by blob URL).
 * On any error, falls back to the original URI so the queue at least
 * remembers the photo exists (better than dropping it silently).
 *
 * Uses the legacy FileSystem API (copyAsync) for web compatibility.
 */
async function persistPhotoUri(
  tempUri: string,
  photoName: string
): Promise<string> {
  if (Platform.OS === 'web') {
    return tempUri;
  }
  try {
    const dir = await getPhotoDir();
    if (!dir) return tempUri;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system/legacy');

    const safeName = (photoName || `photo_${Date.now()}.jpg`).replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );
    const destUri = `${dir}${Date.now()}-${safeName}`;
    await FileSystem.copyAsync({ from: tempUri, to: destUri });
    return destUri;
  } catch (err) {
    console.warn('[offline-queue] persist photo URI failed, keeping temp URI:', err);
    return tempUri;
  }
}

export interface EnqueuePhotoUploadParams {
  jobId: string;
  /** Original (possibly temp) URI from expo-image-picker. */
  photoUri: string;
  /** File name (used for the FormData file name + the persisted copy). */
  photoName: string;
  /** One of: before / progress / after / issue / other. */
  photoType: string;
  /** MIME type, e.g. `image/jpeg`. Defaults to `image/jpeg`. */
  mimeType?: string;
  caption?: string;
  gps?: GpsCoords | null;
}

/**
 * Enqueue a photo for upload. Copies the photo to a persistent location
 * in documentDirectory first (so OS cleanup of the camera cache doesn't
 * lose it), then stores the metadata in the photo queue.
 *
 * Returns the queued item (with the new persistent `photoUri`).
 */
export async function enqueuePhotoUpload(
  params: EnqueuePhotoUploadParams
): Promise<QueuedPhotoUpload> {
  const persistentUri = await persistPhotoUri(params.photoUri, params.photoName);
  const items = await readPhotoQueue();
  const item: QueuedPhotoUpload = {
    id: generatePhotoId(),
    jobId: params.jobId,
    photoUri: persistentUri,
    photoName: params.photoName,
    mimeType: params.mimeType || 'image/jpeg',
    photoType: params.photoType,
    caption: params.caption,
    gps: params.gps ?? null,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  items.push(item);
  await writePhotoQueue(items);
  return item;
}

/**
 * Remove a specific photo from the queue (after successful upload, or
 * if the user discards it).
 */
export async function removeFromPhotoQueue(id: string): Promise<void> {
  const items = await readPhotoQueue();
  const next = items.filter((i) => i.id !== id);
  if (next.length !== items.length) {
    await writePhotoQueue(next);
  }
}

/**
 * Increment the attempts counter for a queued photo. Returns the updated
 * item, or null if it was removed.
 */
export async function bumpPhotoAttempts(
  id: string
): Promise<QueuedPhotoUpload | null> {
  const items = await readPhotoQueue();
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  item.attempts += 1;
  await writePhotoQueue(items);
  return item;
}

/**
 * Drain the photo queue: attempt to upload every pending photo.
 *
 * For each item:
 *   - SUCCESS → remove from queue + delete the persisted photo file
 *     (free up disk).
 *   - FAILURE → bump attempts, keep in queue. Network errors (status 0)
 *     and 5xx stop the drain (device is likely still offline). 4xx errors
 *     are skipped so the user can see the failure but the drain continues.
 *
 * Returns the number of successfully uploaded photos.
 */
export async function processPhotoQueue(): Promise<number> {
  const items = await readPhotoQueue();
  if (items.length === 0) return 0;

  let successCount = 0;
  let stopped = false;

  for (const item of items) {
    if (stopped) break;
    try {
      // Rebuild the FormData matching the live-upload shape: file (with
      // name/type), type, caption?, latitude?/longitude?/accuracy?.
      const fakeAsset = {
        uri: item.photoUri,
        fileName: item.photoName,
        mimeType: item.mimeType || 'image/jpeg',
      } as ImagePicker.ImagePickerAsset;
      const fd = await buildPhotoFormData(fakeAsset, item.gps ?? null);
      fd.append('type', item.photoType);
      if (item.caption) fd.append('caption', item.caption);

      await api.post(`/api/jobs/${item.jobId}/photos`, fd, { formData: true });

      // Success — remove from queue + delete the persisted file.
      await removeFromPhotoQueue(item.id);
      try {
        if (Platform.OS !== 'web') {
          // Delete the persisted photo file using the legacy FileSystem API
          // (the v19 File API crashes Metro on web).
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const FileSystem = require('expo-file-system/legacy');
          await FileSystem.deleteAsync(item.photoUri, { idempotent: true });
        }
      } catch {
        /* non-fatal — file may have already been moved/cleaned */
      }
      successCount += 1;
    } catch (err) {
      await bumpPhotoAttempts(item.id);
      const status = (err as { statusCode?: number }).statusCode;
      // Network error / 5xx → stop draining (device likely still offline).
      if (status === 0 || (typeof status === 'number' && status >= 500)) {
        stopped = true;
      }
      // 4xx → don't stop, but keep the item so the user sees the failure.
      console.warn(
        `[offline-queue] photo upload failed (${status ?? 'unknown'}):`,
        err
      );
    }
  }

  return successCount;
}

/**
 * Total count of pending photo uploads (across all jobs). Cheap — used to
 * render the small "N photos pending upload" badge.
 */
export async function getPendingPhotoCount(): Promise<number> {
  const items = await readPhotoQueue();
  return items.length;
}

/**
 * Pending photo uploads for a specific job. Used by the photos screen to
 * show per-job pending counts and to retry just that job's queue.
 */
export async function getPendingPhotosForJob(
  jobId: string
): Promise<QueuedPhotoUpload[]> {
  const items = await readPhotoQueue();
  return items.filter((i) => i.jobId === jobId);
}
