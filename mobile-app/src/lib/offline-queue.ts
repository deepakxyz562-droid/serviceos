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
