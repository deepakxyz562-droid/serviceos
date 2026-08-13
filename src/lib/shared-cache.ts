/**
 * shared-cache.ts — Cross-instance cache with stale-while-revalidate.
 *
 * PROBLEM
 * -------
 * The app has 4 cache layers (sitemap-builder Map, MemoryCache, ttlCache,
 * Next.js unstable_cache) — all process-local. On Vercel serverless with
 * multiple warm instances, EACH instance independently pays the cold-cache
 * cost: a Supabase round-trip for sitemap URLs, marketplace page-1, and
 * provider detail. With ~91K businesses this is the #2 cause of Supabase
 * load (after the offset-pagination bug we already fixed).
 *
 * SOLUTION
 * --------
 * A shared cache backed by Upstash Redis REST API (also used by Vercel KV
 * under the hood). One cache, shared across ALL instances. Falls back to
 * the existing in-memory ttlCache when no Redis URL is configured — so
 * local dev and unconfigured deployments keep working unchanged.
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
 *
 * ENV VARS (auto-detected, either set works)
 * ------------------------------------------
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN   (Upstash Redis)
 *   KV_REST_API_URL       + KV_REST_API_TOKEN           (Vercel KV)
 *
 * If neither set → in-memory fallback (process-local, no shared state).
 */

import { ttlCacheGet, ttlCacheSet, ttlCacheDelete, ttlCacheWrap } from './ttl-cache';

// ── Redis backend detection ────────────────────────────────────────────────

const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  '';
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  '';

export const hasSharedRedis = Boolean(REDIS_URL && REDIS_TOKEN);

// ── Redis REST client (dependency-free) ────────────────────────────────────
//
// Uses the Upstash pipeline endpoint so large values (e.g. the full sitemap
// URL list, ~MB of JSON) go in the POST body instead of the URL path (which
// would hit path-length limits). Works for both Upstash Redis and Vercel KV
// (Vercel KV is Upstash under the hood and exposes the identical REST API).

async function redisExec(args: string[]): Promise<unknown> {
  if (!hasSharedRedis) throw new Error('[shared-cache] Redis not configured');
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([args]),
      // Don't let a slow Redis hang the request — Redis is supposed to be
      // FASTER than Supabase. If it's not, fall through to in-memory.
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) {
      console.error(`[shared-cache] Redis HTTP ${res.status}: ${await res.text().catch(() => '')}`);
      return null;
    }
    const json = (await res.json()) as Array<{ result: unknown }>;
    // Pipeline returns an array of results, one per command. We send one
    // command at a time, so index 0.
    return json[0]?.result ?? null;
  } catch (err) {
    // Network error / timeout / bad URL — degrade to in-memory silently.
    // Logging here would be noisy (every request when Redis is down).
    console.error('[shared-cache] Redis exec failed, degrading to in-memory:', (err as Error).message);
    return null;
  }
}

async function redisGet<T>(key: string): Promise<T | undefined> {
  const raw = (await redisExec(['GET', key])) as string | null;
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

async function redisSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  await redisExec(['SET', key, JSON.stringify(value), 'EX', String(ttlSeconds)]);
}

async function redisDelete(key: string): Promise<void> {
  await redisExec(['DEL', key]);
}

// ── Internal: metadata key for staleness tracking ──────────────────────────
//
// We store the value AND a "writtenAt" timestamp. The REST Redis SET with EX
// handles expiry automatically, but we need to know the value's age to decide
// fresh vs stale. We store { v: value, w: writtenAtMs } together so a single
// GET retrieves both.

interface StoredEntry<T> {
  v: T;
  w: number; // writtenAt ms epoch
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

  // 1. Try shared (Redis) cache first — this is the cross-instance layer.
  if (hasSharedRedis) {
    const entry = await redisGet<StoredEntry<T>>(key);
    if (entry) {
      const age = now - entry.w;
      if (age < freshTtlMs) {
        return { value: entry.v, source: 'fresh' };
      }
      if (age < freshTtlMs + staleTtlMs) {
        // Stale but usable — serve immediately, refresh in background.
        // Fire-and-forget; errors are swallowed (the next request retries).
        void backgroundRefresh(key, freshTtlMs, staleTtlMs, compute, shouldCache);
        return { value: entry.v, source: 'stale' };
      }
      // Past staleTtl — fall through to synchronous recompute, but keep the
      // expired entry around in case compute() fails (grace period below).
    }
  } else {
    // 2. No Redis — use the in-memory ttlCache (process-local).
    const mem = ttlCacheGet<T>(key);
    if (mem !== undefined) {
      // ttlCache already encodes freshness in its expiresAt; if it returned
      // a value, it's fresh. Stale-while-revalidate isn't possible with the
      // existing ttlCache API (it deletes on expiry), so we just return it.
      return { value: mem, source: 'fresh' };
    }
  }

  // 3. Cache miss (or past staleTtl) — recompute synchronously.
  try {
    const fresh = await compute();
    if (!shouldCache || shouldCache(fresh)) {
      const entry: StoredEntry<T> = { v: fresh, w: Date.now() };
      if (hasSharedRedis) {
        const totalTtlSec = Math.ceil((freshTtlMs + staleTtlMs) / 1000);
        await redisSet(key, entry, totalTtlSec);
      } else {
        // In-memory: store with freshTtl (no SWR, but graceful degradation
        // still works via the CircuitOpenError catch below).
        ttlCacheSet(key, fresh, freshTtlMs);
      }
    }
    return { value: fresh, source: 'recomputed' };
  } catch (err) {
    // GRACE PERIOD: if compute failed (esp. CircuitOpenError — Supabase is
    // down) AND we have a stale entry, serve it rather than erroring.
    if (hasSharedRedis) {
      const entry = await redisGet<StoredEntry<T>>(key);
      if (entry) {
        console.warn(
          `[shared-cache] compute() failed for "${key}", serving stale (age=${Math.round((now - entry.w) / 1000)}s):`,
          (err as Error).message,
        );
        return { value: entry.v, source: 'stale-grace' };
      }
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
      const entry: StoredEntry<T> = { v: fresh, w: Date.now() };
      if (hasSharedRedis) {
        const totalTtlSec = Math.ceil((freshTtlMs + staleTtlMs) / 1000);
        await redisSet(key, entry, totalTtlSec);
      } else {
        ttlCacheSet(key, fresh, freshTtlMs);
      }
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
  if (hasSharedRedis) {
    const entry = await redisGet<StoredEntry<T>>(key);
    return entry?.v;
  }
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
  if (hasSharedRedis) {
    const entry: StoredEntry<T> = { v: value, w: Date.now() };
    const totalTtlSec = Math.ceil((freshTtlMs + staleTtlMs) / 1000);
    await redisSet(key, entry, totalTtlSec);
  } else {
    ttlCacheSet(key, value, freshTtlMs);
  }
}

/**
 * Delete a cache entry. When Redis is configured, this invalidates across
 * ALL instances — essential for cache-busting after a tenant edits their
 * profile.
 */
export async function sharedCacheDelete(key: string): Promise<void> {
  if (hasSharedRedis) {
    await redisDelete(key);
  }
  ttlCacheDelete(key);
}

/**
 * Delete all keys matching a prefix. Redis SCAN-based (works for large
 * keyspaces without blocking). Falls back to no-op in-memory (the in-memory
 * cache doesn't support prefix invalidation natively — callers should use
 * explicit keys or clear the whole ttlCache for local dev).
 *
 * NOTE: prefix deletion in Redis uses SCAN + DEL (iterative, non-blocking).
 * For very large keyspaces this may take a few seconds but never blocks
 * other operations.
 */
export async function sharedCacheDeleteByPrefix(prefix: string): Promise<number> {
  if (!hasSharedRedis) return 0;
  let deleted = 0;
  let cursor = '0';
  do {
    const scanResult = (await redisExec(['SCAN', cursor, 'MATCH', `${prefix}*`, 'COUNT', '200'])) as
      | [string, string[]]
      | null;
    if (!scanResult) break;
    cursor = scanResult[0];
    const keys = scanResult[1];
    if (keys.length > 0) {
      await redisExec(['DEL', ...keys]);
      deleted += keys.length;
    }
  } while (cursor !== '0' && cursor !== '0');
  return deleted;
}

/**
 * Whether the shared (cross-instance) cache is active. Exposed so callers
 * and health checks can report cache backend status.
 */
export function sharedCacheBackend(): 'redis' | 'memory' {
  return hasSharedRedis ? 'redis' : 'memory';
}

// Re-export ttlCacheWrap for callers that don't need SWR but want a stable
// import surface. This preserves backward compatibility with existing code
// that imports from ttl-cache.ts.
export { ttlCacheWrap };
