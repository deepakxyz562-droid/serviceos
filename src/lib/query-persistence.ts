/**
 * TanStack Query Persistence (IndexedDB)
 * =======================================
 *
 * Concern #4 + #5b — PWA + Supabase gateway optimization.
 *
 * Persists the TanStack Query cache to IndexedDB so page refreshes don't
 * re-fetch every API endpoint. This cuts Supabase API Gateway hits on
 * repeat visits and enables instant data display while TanStack Query
 * revalidates in the background (stale-while-revalidate).
 *
 * Implementation: uses `createSyncStoragePersister` from
 * `@tanstack/query-sync-storage-persister` with a custom idb-keyval storage
 * adapter (IndexedDB). The persister is attached to the QueryClient via
 * `persistQueryClientSubscribe` from `@tanstack/react-query-persist-client`.
 *
 * Storage: idb-keyval stores the entire serialized query cache as a single
 * JSON blob under the key `fieseros-query-cache`. This is simpler than
 * per-query storage and works well for our cache size (<1MB typical).
 *
 * SSR-safe: no-ops on the server (IndexedDB is browser-only).
 */

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClientSubscribe } from '@tanstack/react-query-persist-client';
import type { QueryClient } from '@tanstack/react-query';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

// ─── Constants ──────────────────────────────────────────────────────────────

const QUERY_CACHE_KEY = 'fieseros-query-cache';

/** Max age for persisted cache entries (24 hours). */
const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Interval at which the persister flushes to IndexedDB (60 seconds). */
const PERSIST_FLUSH_INTERVAL_MS = 60_000;

// ─── idb-keyval storage adapter ─────────────────────────────────────────────

/**
 * Custom storage adapter backed by idb-keyval (IndexedDB). The interface
 * required by `createSyncStoragePersister` is:
 *   - getItem(key): string | null | Promise<string | null>
 *   - setItem(key, value): void | Promise<void>
 *   - removeItem(key): void | Promise<void>
 *
 * idb-keyval's API maps directly. We wrap it to handle errors gracefully
 * (IndexedDB may be unavailable in private browsing).
 *
 * IMPORTANT: The persister calls `JSON.stringify`/`JSON.parse` internally,
 * so the storage adapter only needs to handle string values. We cast the
 * idb-keyval return to `string | null`.
 */
const idbStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await idbGet(key);
      return (value as string) ?? null;
    } catch {
      // IndexedDB unavailable (private browsing, storage disabled).
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await idbSet(key, value);
    } catch {
      // Silent fail — persistence is best-effort.
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await idbDel(key);
    } catch {
      // Silent fail.
    }
  },
};

// ─── Persister setup ────────────────────────────────────────────────────────

/**
 * Create the IndexedDB-backed persister. This is a factory — call it once
 * per QueryClient. The persister is then subscribed to the QueryClient via
 * `persistQueryClientSubscribe` which handles save/load automatically.
 */
function createPersister() {
  return createSyncStoragePersister({
    storage: idbStorage,
    key: QUERY_CACHE_KEY,
  });
}

/**
 * Set up IndexedDB persistence for the given QueryClient.
 *
 * Call this ONCE, inside the QueryProvider, after creating the QueryClient.
 * It returns a cleanup function that removes the persistence subscription.
 *
 * SSR-safe: no-ops if `window` is undefined.
 */
export function setupQueryPersistence(queryClient: QueryClient): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // no-op on server
  }

  // Create the persister and subscribe it to the QueryClient.
  // `persistQueryClientSubscribe` handles:
  //   1. On mount: rehydrate the cache from IndexedDB.
  //   2. On cache changes: debounce-save to IndexedDB.
  //   3. Returns an unsubscribe function for cleanup.
  const persister = createPersister();
  const unsubscribe = persistQueryClientSubscribe({
    queryClient,
    persister,
    maxAge: PERSIST_MAX_AGE_MS,
    // `buster` is a cache invalidation version string. Bump it to force
    // a full refetch of all persisted queries (e.g. after a schema change).
    buster: '',
  });

  // Periodically prune old entries to prevent unbounded growth.
  // The library doesn't expose a built-in entry-count cap, so we do a
  // manual sweep: if the cache has more than 500 queries, remove the
  // oldest ones. This runs every PERSIST_FLUSH_INTERVAL_MS.
  const PERSIST_MAX_ENTRIES = 500;
  const pruneInterval = setInterval(() => {
    try {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      if (queries.length > PERSIST_MAX_ENTRIES) {
        const sorted = [...queries].sort(
          (a, b) => (a.state.dataUpdatedAt || 0) - (b.state.dataUpdatedAt || 0),
        );
        const toRemove = sorted.slice(0, queries.length - PERSIST_MAX_ENTRIES);
        for (const query of toRemove) {
          cache.remove(query);
        }
      }
    } catch {
      // Silent fail — pruning is best-effort.
    }
  }, PERSIST_FLUSH_INTERVAL_MS);

  return () => {
    unsubscribe();
    clearInterval(pruneInterval);
  };
}
