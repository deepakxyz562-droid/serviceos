/**
 * useCachedReferenceData — Static reference data cache
 * =====================================================
 *
 * Concern #5b — Supabase API Gateway optimization.
 *
 * Caches static-ish reference data (industries, categories, plans, etc.)
 * in IndexedDB with a weekly TTL so we don't re-fetch it every session.
 * This directly reduces Supabase API Gateway hits — data that changes
 * rarely should not be fetched on every page load.
 *
 * Usage:
 *   const { data: industries, isLoading } = useCachedReferenceData(
 *     'industries',
 *     async () => {
 *       const res = await fetch('/api/industries');
 *       return res.json();
 *     },
 *   );
 *
 * Behavior:
 *   1. On mount, check IndexedDB for a cached value under `key`.
 *   2. If cached + not stale (within TTL) → return immediately (no fetch).
 *   3. If cached + stale OR not cached → return cached value (if any) as
 *      a placeholder, then fetch fresh data, cache it, and update.
 *   4. If the fetcher fails → return the cached value (if any) or undefined.
 *
 * This is a stale-while-revalidate pattern: instant display from cache,
 * fresh data in the background.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCachedReference, setCachedReference } from '@/lib/offline-db';

interface UseCachedReferenceDataResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  /** Force a re-fetch (bypasses the cache). */
  refresh: () => Promise<void>;
}

/**
 * Default TTL for cached reference data: 7 days.
 * Reference data (industries, categories, plans) changes rarely.
 */
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useCachedReferenceData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): UseCachedReferenceDataResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      // Step 1: Try to read from cache.
      let cached: T | undefined;
      try {
        cached = await getCachedReference<T>(key);
      } catch {
        cached = undefined;
      }

      // If we have a fresh cached value and we're not forcing a refresh,
      // use it directly — no network fetch needed.
      if (cached !== undefined && !forceRefresh) {
        setData(cached);
        setIsLoading(false);
        return;
      }

      // Step 2: We need to fetch fresh data. If we have a stale cached
      // value, show it as a placeholder while fetching (stale-while-revalidate).
      if (cached !== undefined) {
        setData(cached);
        setIsLoading(false); // not loading — we have placeholder data
      }

      // Step 3: Fetch fresh data.
      try {
        const fresh = await fetcher();
        setData(fresh);
        setError(null);
        // Cache the fresh value for next time.
        await setCachedReference(key, fresh, ttlMs);
      } catch (err) {
        // If the fetch failed and we have cached data, keep showing it
        // (offline mode). If no cached data, surface the error.
        if (cached === undefined) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        // If we have cached data, don't set an error — the user sees
        // the cached data and the error is silently swallowed (offline mode).
      } finally {
        setIsLoading(false);
      }
    },
    [key, fetcher, ttlMs],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await load(true);
  }, [load]);

  return { data, isLoading, error, refresh };
}
