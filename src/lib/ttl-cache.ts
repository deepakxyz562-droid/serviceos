/**
 * ttl-cache.ts — A tiny in-memory TTL cache for API routes.
 *
 * WHY NOT unstable_cache?
 * -----------------------
 * `unstable_cache` from `next/cache` is designed for server components and
 * requires a serialization-safe cache key. For API routes that return JSON
 * responses with dynamic data, a simple in-memory Map with TTL is more
 * appropriate and avoids the React cache boundary overhead.
 *
 * This cache is process-local (not shared across serverless instances), which
 * is fine for marketplace browse queries — they're read-heavy and the 30s TTL
 * means each instance independently warms up. For a multi-instance deployment,
 * consider upgrading to Redis (the API is designed to make that swap trivial).
 *
 * USAGE
 * -----
 *   const cached = ttlCache.get(key);
 *   if (cached) return cached;
 *   const fresh = await expensiveQuery();
 *   ttlCache.set(key, fresh, 30_000); // 30s
 *   return fresh;
 *
 * Or use the wrap() helper for the common get-or-compute pattern:
 *   const result = await ttlCache.wrap(key, 30_000, () => expensiveQuery());
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Get a cached value if it exists and hasn't expired.
 * Returns undefined otherwise (caller should compute + set).
 */
export function ttlCacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

/**
 * Set a cached value with a TTL in milliseconds.
 */
export function ttlCacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Get-or-compute helper. Returns the cached value if fresh, otherwise calls
 * `compute()`, caches the result with the given TTL, and returns it.
 *
 * Issue #1 Fix E: the optional `shouldCache` predicate lets callers skip
 * caching for results that are likely transient failures (e.g. an empty
 * page-2+ response from a PostgREST timeout). Without this, a transient
 * empty result would be cached for the full TTL, blocking retries.
 *
 * Example:
 *   await ttlCacheWrap(key, 30_000, compute, (result) => result.items.length > 0);
 */
export async function ttlCacheWrap<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
  shouldCache?: (value: T) => boolean,
): Promise<T> {
  const cached = ttlCacheGet<T>(key);
  if (cached !== undefined) return cached;
  const fresh = await compute();
  // Only cache the result if the caller's predicate (if any) approves.
  // Default behavior (no predicate) caches everything — preserves backward compat.
  if (!shouldCache || shouldCache(fresh)) {
    ttlCacheSet(key, fresh, ttlMs);
  }
  return fresh;
}

/**
 * Delete a specific cache entry (useful for manual invalidation).
 */
export function ttlCacheDelete(key: string): void {
  store.delete(key);
}

/**
 * Clear all cache entries. Mainly for tests / debugging.
 */
export function ttlCacheClear(): void {
  store.clear();
}

/**
 * Build a stable cache key from a filter object. Sorts the keys so
 * `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` produce the same key.
 */
export function buildCacheKey(prefix: string, parts: Record<string, unknown>): string {
  const sorted = Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k] == null ? '' : String(parts[k])}`)
    .join('&');
  return `${prefix}:${sorted}`;
}
