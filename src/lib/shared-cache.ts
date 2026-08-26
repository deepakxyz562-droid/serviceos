/**
 * shared-cache.ts — In-memory cache with stale-while-revalidate.
 *
 * ARCHITECTURE (simplified):
 *   Vercel CDN / ISR  →  Next.js in-memory cache  →  Supabase
 *
 * The Upstash Redis layer has been REMOVED. The marketplace request path no
 * longer depends on any external cache service. This file now uses a single
 * process-local in-memory Map with stale-while-revalidate semantics.
 *
 * WHY IN-MEMORY ONLY:
 *   - Vercel's Edge CDN (enabled via `revalidate` + no dynamic `headers()`)
 *     handles the cross-instance caching layer for public pages.
 *   - The in-memory cache handles per-instance get-or-compute with SWR.
 *   - No external Redis = no request quota limits, no +335ms overhead, no
 *     cascade-failure risk.
 *   - On Vercel serverless, each warm instance has its own cache. A cold
 *     instance pays one Supabase round-trip, then serves from memory.
 *
 * STALE-WHILE-REVALIDATE
 * ----------------------
 *   freshTtlMs   — serve from cache without recomputing
 *   staleTtlMs   — after freshTtl, serve stale + trigger background refresh
 *   after staleTtl — cache miss; recompute synchronously
 *
 * Combined with the circuit breaker: if Supabase is down and compute()
 * throws CircuitOpenError, we serve the stale value anyway (even past
 * staleTtl) as a grace period — users see last-known-good data instead
 * of a 500.
 */

import { ttlCacheGet, ttlCacheSet, ttlCacheDelete, ttlCacheWrap } from './ttl-cache';

// ── In-memory SWR store ─────────────────────────────────────────────────────
//
// Stores { v: value, w: writtenAtMs } so we can compute the value's age and
// decide fresh vs stale. The entry stays in the Map for the full
// (freshTtl + staleTtl) lifetime; we check the age on every GET.
//
// Bounded to MAX_ENTRIES to prevent unbounded memory growth on long-running
// instances. When the cap is hit, expired entries are evicted first; if that's
// not enough, the oldest entries are evicted (LRU-ish).

interface SwrEntry<T> {
  v: T;
  w: number; // writtenAt ms epoch
  expiresAt: number; // ms epoch — fresh + stale total TTL
}

const swrStore = new Map<string, SwrEntry<unknown>>();
const MAX_ENTRIES = 2000;

function swrSet<T>(key: string, value: T, totalTtlMs: number): void {
  // Evict expired entries opportunistically when near the cap
  if (swrStore.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, e] of swrStore) {
      if (e.expiresAt < now) swrStore.delete(k);
    }
    // If still at cap after expiry sweep, evict the oldest 100 entries
    if (swrStore.size >= MAX_ENTRIES) {
      const entries = Array.from(swrStore.entries())
        .sort((a, b) => a[1].w - b[1].w)
        .slice(0, 100);
      for (const [k] of entries) swrStore.delete(k);
    }
  }
  swrStore.set(key, {
    v: value,
    w: Date.now(),
    expiresAt: Date.now() + totalTtlMs,
  });
}

function swrGet<T>(key: string): SwrEntry<T> | undefined {
  const entry = swrStore.get(key);
  if (!entry) return undefined;
  // Don't delete expired entries here — leave them in the store so the
  // grace-period handler (in sharedCacheWrap's catch block) can still find
  // and serve them when compute() fails. Expired entries are cleaned up
  // opportunistically by swrSet when the store nears MAX_ENTRIES.
  if (entry.expiresAt < Date.now()) {
    return undefined; // expired — not fresh/stale, but still in store for grace
  }
  return entry as SwrEntry<T>;
}

function swrDelete(key: string): void {
  swrStore.delete(key);
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface SharedCacheResult<T> {
  value: T;
  source: 'fresh' | 'stale' | 'recomputed' | 'stale-grace';
}

/**
 * Get-or-compute with stale-while-revalidate.
 *
 * @param key            Cache key
 * @param freshTtlMs     Serve from cache without recomputing (ms)
 * @param staleTtlMs     After freshTtl: serve stale + background-refresh (ms).
 *                       Total cache lifetime = freshTtl + staleTtl.
 * @param compute        Fetches fresh data. If this throws CircuitOpenError
 *                       and a stale entry exists, the stale entry is served
 *                       as grace (source: 'stale-grace').
 * @param shouldCache    Optional predicate to skip caching transient bad
 *                       results (e.g. empty page-2+ from a PostgREST hiccup).
 */
export async function sharedCacheWrap<T>(
  key: string,
  freshTtlMs: number,
  staleTtlMs: number,
  compute: () => Promise<T>,
  shouldCache?: (value: T) => boolean,
): Promise<SharedCacheResult<T>> {
  const now = Date.now();
  const totalTtlMs = freshTtlMs + staleTtlMs;

  // 1. Check the in-memory SWR store
  const entry = swrGet<T>(key);
  if (entry) {
    const age = now - entry.w;
    if (age < freshTtlMs) {
      return { value: entry.v, source: 'fresh' };
    }
    if (age < totalTtlMs) {
      // Stale but usable — serve immediately, refresh in background.
      // Fire-and-forget; errors are swallowed (the next request retries).
      void backgroundRefresh(key, freshTtlMs, staleTtlMs, compute, shouldCache);
      return { value: entry.v, source: 'stale' };
    }
    // Past staleTtl — fall through to synchronous recompute, but keep the
    // expired entry around in case compute() fails (grace period below).
  }

  // 2. Cache miss (or past staleTtl) — recompute synchronously.
  try {
    const fresh = await compute();
    if (!shouldCache || shouldCache(fresh)) {
      swrSet(key, fresh, totalTtlMs);
      // Also mirror to the legacy ttlCache for any code that reads via
      // ttlCacheGet directly (backward compat).
      ttlCacheSet(key, fresh, freshTtlMs);
    }
    return { value: fresh, source: 'recomputed' };
  } catch (err) {
    // GRACE PERIOD: if compute failed (esp. CircuitOpenError — Supabase is
    // down) AND we have a stale entry (even past staleTtl), serve it rather
    // than erroring. The swrGet above already removed truly-expired entries,
    // so we check the store directly for a grace-period entry.
    const graceEntry = swrStore.get(key) as SwrEntry<T> | undefined;
    if (graceEntry) {
      console.warn(
        `[shared-cache] compute() failed for "${key}", serving stale-grace (age=${Math.round((now - graceEntry.w) / 1000)}s):`,
        (err as Error).message,
      );
      return { value: graceEntry.v, source: 'stale-grace' };
    }
    throw err;
  }
}

/**
 * Background refresh — fire-and-forget. Used by SWR when serving stale data.
 * Wrapped so any error is logged but never rejects the caller.
 */
async function backgroundRefresh<T>(
  key: string,
  freshTtlMs: number,
  staleTtlMs: number,
  compute: () => Promise<T>,
  shouldCache?: (value: T) => boolean,
): Promise<void> {
  try {
    const fresh = await compute();
    if (!shouldCache || shouldCache(fresh)) {
      const totalTtlMs = freshTtlMs + staleTtlMs;
      swrSet(key, fresh, totalTtlMs);
      ttlCacheSet(key, fresh, freshTtlMs);
    }
  } catch (err) {
    // Background refresh failure is non-fatal — the stale value is still
    // being served. The next foreground request will retry.
    console.warn(`[shared-cache] background refresh failed for "${key}":`, (err as Error).message);
  }
}

/**
 * Synchronous get (no compute). Returns undefined on miss.
 * Useful for routes that want to check cache existence without triggering
 * a recompute.
 */
export async function sharedCacheGet<T>(key: string): Promise<T | undefined> {
  const entry = swrGet<T>(key);
  if (entry) return entry.v;
  return ttlCacheGet<T>(key);
}

/**
 * Set a value directly (bypasses compute). TTL = freshTtl + staleTtl.
 */
export async function sharedCacheSet<T>(
  key: string,
  value: T,
  freshTtlMs: number,
  staleTtlMs: number = 0,
): Promise<void> {
  const totalTtlMs = freshTtlMs + staleTtlMs;
  swrSet(key, value, totalTtlMs);
  ttlCacheSet(key, value, freshTtlMs);
}

/**
 * Delete a cache entry.
 */
export async function sharedCacheDelete(key: string): Promise<void> {
  swrDelete(key);
  ttlCacheDelete(key);
}

/**
 * Delete all keys matching a prefix.
 *
 * NOTE: the in-memory store uses a plain Map (no prefix scanning). We iterate
 * all keys and delete matches. For large stores this is O(n) — acceptable
 * because the store is bounded to MAX_ENTRIES (2000).
 */
export async function sharedCacheDeleteByPrefix(prefix: string): Promise<number> {
  // Collect matching keys first (can't safely delete during Map iteration)
  const keysToDelete: string[] = [];
  for (const key of swrStore.keys()) {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }
  // Delete from BOTH the SWR store and the legacy ttlCache
  let deleted = 0;
  for (const key of keysToDelete) {
    swrStore.delete(key);
    ttlCacheDelete(key);
    deleted++;
  }
  return deleted;
}

/**
 * Whether the shared (cross-instance) cache is active.
 * Always returns 'memory' — Redis has been removed.
 */
export function sharedCacheBackend(): 'memory' {
  return 'memory';
}

/**
 * Backward compatibility helper for legacy sitemap administration endpoints.
 */
export function hasSharedRedis(): boolean {
  return false;
}

// Re-export ttlCacheWrap for callers that don't need SWR but want a stable
// import surface. This preserves backward compatibility with existing code
// that imports from ttl-cache.ts.
export { ttlCacheWrap };
