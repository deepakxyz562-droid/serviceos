/**
 * Offline Database (Dexie/IndexedDB)
 * ==================================
 *
 * Concern #4 — PWA + offline mode.
 *
 * This module provides a structured IndexedDB layer via Dexie.js for:
 *   1. **Marketplace catalog cache** — sync top providers per city into
 *      IndexedDB on first visit so users can browse offline (the SW's
 *      network-first `/api/` strategy returns a 503 offline JSON, not real
 *      data, so we need a real data layer for offline browse).
 *   2. **Static reference data** — industries, categories, plans, etc.
 *      cached with a weekly TTL so we don't re-fetch them every session
 *      (reduces Supabase API Gateway hits per Concern #5b).
 *   3. **TanStack Query persistence** — the QueryClient cache is persisted
 *      to IndexedDB via `@tanstack/query-sync-storage-persister` + a
 *      custom idb-keyval storage adapter, so refreshes don't lose cached
 *      API data (cuts gateway hits dramatically on repeat visits).
 *
 * The mutation queue (`offline-queue.ts`) handles offline WRITES — when
 * the user submits a form while offline, the mutation is queued here and
 * replayed when the SW's Background Sync `serviceos-sync` event fires.
 *
 * DB versioning: Dexie uses semantic versioning. Bump `DB_VERSION` when
 * the schema changes and add an `.upgrade()` handler in the `.version()`
 * chain. Existing user DBs auto-upgrade on next visit.
 */

import Dexie, { type Table } from 'dexie';

// ─── DB Version ─────────────────────────────────────────────────────────────

const DB_VERSION = 1;

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * A cached marketplace provider row. Mirrors the shape returned by the
 * marketplace browse API (`ProviderListItem`) but only the fields needed
 * for offline card rendering — we strip heavy fields (galleryJson,
 * portfolio) to keep IndexedDB lean.
 */
export interface CachedProvider {
  id: string;
  slug: string;
  name: string;
  industry: string | null;
  industryUrlSlug: string;
  city: string | null;
  cityUrlSlug: string;
  state: string | null;
  tagline: string | null;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  rating: number;
  reviewCount: number;
  phone: string | null;
  plan: string | null;
  claimed: boolean;
  marketplaceOptIn: boolean;
  /** Card type for marketplace rendering: 'featured' | 'normal-full' | 'normal-minimal'. */
  cardType: string;
  /** ISO timestamp when this row was cached. Used for TTL eviction. */
  cachedAt: number;
}

/**
 * A cached static reference data row. Used for industries, categories,
 * plans, etc. — data that rarely changes and would otherwise be re-fetched
 * on every session.
 */
export interface CachedReferenceData {
  /** The cache key, e.g. 'industries', 'categories', 'plans'. */
  key: string;
  /** The cached value (any JSON-serializable data). */
  value: unknown;
  /** ISO timestamp when this row was cached. */
  cachedAt: number;
  /** TTL in milliseconds. Entries older than this are considered stale. */
  ttlMs: number;
}

/**
 * A queued offline mutation. When the user submits a form/create/update
 * while offline, the mutation is serialized here and replayed by the
 * Background Sync handler when connectivity returns.
 */
export interface QueuedMutation {
  /** Auto-incremented primary key. */
  id?: number;
  /** The HTTP method: POST | PUT | PATCH | DELETE. */
  method: string;
  /** The API URL (relative, e.g. '/api/leads'). */
  url: string;
  /** The request body (JSON-serializable). */
  body: unknown;
  /** ISO timestamp when the mutation was queued. */
  queuedAt: number;
  /** Number of replay attempts (for retry/backoff). */
  attempts: number;
  /** Optional tag for grouping (e.g. 'lead', 'booking'). */
  tag: string;
}

// ─── Dexie Database ─────────────────────────────────────────────────────────

class ServiceOSOfflineDB extends Dexie {
  providers!: Table<CachedProvider, string>;
  reference!: Table<CachedReferenceData, string>;
  mutations!: Table<QueuedMutation, number>;

  constructor() {
    super('serviceos-offline');

    this.version(DB_VERSION).stores({
      // `id` is the primary key. Index the fields we query/sort by.
      // Dexie index syntax: `&field` = unique, `field` = regular index.
      providers: 'id, industryUrlSlug, cityUrlSlug, rating, cachedAt',
      reference: 'key, cachedAt',
      mutations: '++id, queuedAt, tag, attempts',
    });
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

/**
 * Singleton DB instance. Dexie handles the IndexedDB connection lifecycle
 * (opens lazily on first query, auto-upgrades schema on version mismatch).
 *
 * IMPORTANT: This must only be instantiated in the browser (IndexedDB is
 * not available in Node.js / server components). The `getOfflineDB()`
 * guard below ensures SSR safety — if `window` is undefined, we return
 * null and callers must check.
 */
let _db: ServiceOSOfflineDB | null = null;

export function getOfflineDB(): ServiceOSOfflineDB | null {
  if (typeof window === 'undefined') return null;
  if (!_db) {
    try {
      _db = new ServiceOSOfflineDB();
    } catch (err) {
      // IndexedDB may be unavailable (private browsing in some browsers,
      // or the user disabled storage). Fail gracefully — callers fall
      // back to network-only mode.
      console.warn('[offline-db] Failed to open IndexedDB:', err);
      return null;
    }
  }
  return _db;
}

// ─── Provider cache helpers ─────────────────────────────────────────────────

/**
 * Cache TTL for marketplace providers. 24 hours — providers rarely change
 * their core info (name, industry, rating), and the SW's network-first
 * strategy will refresh the data when online anyway. The cache is primarily
 * for offline browse.
 */
export const PROVIDER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Bulk-upsert providers into the cache. Called after a successful
 * marketplace browse API response — we cache every provider in the
 * result so the user can re-browse offline.
 *
 * Uses Dexie's `bulkPut` (not `bulkAdd`) so re-caching overwrites
 * existing rows with the same `id` instead of throwing a ConstraintError.
 */
export async function cacheProviders(providers: CachedProvider[]): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.providers.bulkPut(providers);
  } catch (err) {
    console.warn('[offline-db] cacheProviders failed:', err);
  }
}

/**
 * Fetch cached providers by city. Returns providers whose `cityUrlSlug`
 * matches AND whose `cachedAt` is within the TTL.
 *
 * If no cached providers exist for the city (or all are stale), returns
 * an empty array — the caller should fall back to the network.
 */
export async function getCachedProvidersByCity(citySlug: string): Promise<CachedProvider[]> {
  const db = getOfflineDB();
  if (!db) return [];
  try {
    const cutoff = Date.now() - PROVIDER_CACHE_TTL_MS;
    return await db.providers
      .where('cityUrlSlug')
      .equals(citySlug)
      .and((p) => p.cachedAt > cutoff)
      .toArray();
  } catch (err) {
    console.warn('[offline-db] getCachedProvidersByCity failed:', err);
    return [];
  }
}

/**
 * Fetch a single cached provider by its canonical URL slug segments.
 * Used by the provider detail page for offline viewing.
 */
export async function getCachedProvider(
  industrySlug: string,
  citySlug: string,
  slug: string,
): Promise<CachedProvider | null> {
  const db = getOfflineDB();
  if (!db) return null;
  try {
    return (
      (await db.providers
        .where('industryUrlSlug')
        .equals(industrySlug)
        .and((p) => p.cityUrlSlug === citySlug && p.slug === slug)
        .first()) || null
    );
  } catch (err) {
    console.warn('[offline-db] getCachedProvider failed:', err);
    return null;
  }
}

/**
 * Clear the entire provider cache. Called when the user clicks "Clear
 * offline data" in settings, or when a SW `CLEAR_CACHE` message arrives.
 */
export async function clearProviderCache(): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.providers.clear();
  } catch (err) {
    console.warn('[offline-db] clearProviderCache failed:', err);
  }
}

// ─── Reference data cache helpers ───────────────────────────────────────────

/**
 * Get a cached reference data value by key. Returns `undefined` if the
 * key doesn't exist OR if the entry is older than its TTL.
 *
 * Used to cache static-ish data (industries, categories, plans) so we
 * don't re-fetch it every session — cutting Supabase API Gateway hits.
 */
export async function getCachedReference<T>(key: string): Promise<T | undefined> {
  const db = getOfflineDB();
  if (!db) return undefined;
  try {
    const row = await db.reference.get(key);
    if (!row) return undefined;
    if (Date.now() - row.cachedAt > row.ttlMs) return undefined; // stale
    return row.value as T;
  } catch (err) {
    console.warn('[offline-db] getCachedReference failed:', err);
    return undefined;
  }
}

/**
 * Set a reference data value with a TTL. Default TTL is 7 days —
 * reference data changes rarely.
 */
export async function setCachedReference(
  key: string,
  value: unknown,
  ttlMs: number = 7 * 24 * 60 * 60 * 1000,
): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.reference.put({
      key,
      value,
      cachedAt: Date.now(),
      ttlMs,
    });
  } catch (err) {
    console.warn('[offline-db] setCachedReference failed:', err);
  }
}

// ─── Mutation queue helpers ─────────────────────────────────────────────────

/**
 * Queue a mutation for later replay (when online). Called by the
 * `useOfflineMutation` hook when a fetch fails due to being offline.
 *
 * Returns the queued mutation's auto-generated `id` (for status tracking).
 */
export async function queueMutation(
  mutation: Omit<QueuedMutation, 'id' | 'queuedAt' | 'attempts'>,
): Promise<number | undefined> {
  const db = getOfflineDB();
  if (!db) return undefined;
  try {
    const id = await db.mutations.add({
      ...mutation,
      queuedAt: Date.now(),
      attempts: 0,
    });
    return id;
  } catch (err) {
    console.warn('[offline-db] queueMutation failed:', err);
    return undefined;
  }
}

/**
 * Get all pending queued mutations, ordered by queue time (oldest first).
 * Used by the Background Sync replay handler.
 */
export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const db = getOfflineDB();
  if (!db) return [];
  try {
    return await db.mutations.orderBy('queuedAt').toArray();
  } catch (err) {
    console.warn('[offline-db] getQueuedMutations failed:', err);
    return [];
  }
}

/**
 * Remove a queued mutation after it's been successfully replayed.
 */
export async function removeQueuedMutation(id: number): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.mutations.delete(id);
  } catch (err) {
    console.warn('[offline-db] removeQueuedMutation failed:', err);
  }
}

/**
 * Increment the attempt counter on a queued mutation (for retry/backoff).
 * If `attempts` exceeds MAX_REPLAY_ATTEMPTS, the mutation is removed and
 * a console error is logged (the user's data is lost — we could surface
 * this as a toast in the future).
 */
export async function incrementMutationAttempts(id: number): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    const mutation = await db.mutations.get(id);
    if (!mutation) return;
    const attempts = (mutation.attempts || 0) + 1;
    if (attempts > MAX_REPLAY_ATTEMPTS) {
      console.error(
        `[offline-db] Mutation ${id} exceeded max replay attempts (${MAX_REPLAY_ATTEMPTS}), discarding:`,
        mutation,
      );
      await db.mutations.delete(id);
    } else {
      await db.mutations.update(id, { attempts });
    }
  } catch (err) {
    console.warn('[offline-db] incrementMutationAttempts failed:', err);
  }
}

/**
 * Maximum number of replay attempts before a queued mutation is discarded.
 * With exponential backoff (1s, 2s, 4s, 8s, 16s), this gives the mutation
 * ~31 seconds of total retry time across 5 attempts.
 */
export const MAX_REPLAY_ATTEMPTS = 5;

/**
 * Get the count of pending queued mutations. Used by the UI to show a
 * "N pending syncs" badge.
 */
export async function getQueuedMutationCount(): Promise<number> {
  const db = getOfflineDB();
  if (!db) return 0;
  try {
    return await db.mutations.count();
  } catch (err) {
    console.warn('[offline-db] getQueuedMutationCount failed:', err);
    return 0;
  }
}

/**
 * Clear ALL offline data (providers, reference, mutations). Called when
 * the user logs out or clicks "Clear offline data" in settings.
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await Promise.all([
      db.providers.clear(),
      db.reference.clear(),
      db.mutations.clear(),
    ]);
  } catch (err) {
    console.warn('[offline-db] clearAllOfflineData failed:', err);
  }
}
