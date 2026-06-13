/**
 * Simple In-Memory Cache with TTL Support
 *
 * Designed to reduce repeated database queries in API routes.
 * Each cache entry has a configurable TTL (time-to-live).
 * Expired entries are lazily cleaned up on access.
 *
 * Usage:
 *   const cached = cache.get<MyData>('key');
 *   if (cached) return cached;
 *   const data = await fetchExpensiveData();
 *   cache.set('key', data, 30_000); // 30-second TTL
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Unix timestamp in ms
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly DEFAULT_TTL = 30_000; // 30 seconds

  constructor() {
    // Run cleanup every 60 seconds to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    // Don't prevent Node.js process from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Get a cached value by key.
   * Returns undefined if the key doesn't exist or has expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set a cached value with an optional TTL.
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time-to-live in milliseconds (default: 30 seconds)
   */
  set<T>(key: string, value: T, ttlMs: number = this.DEFAULT_TTL): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Invalidate a specific cache key.
   */
  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidate all cache keys matching a prefix.
   * Useful for invalidating all stats for a tenant.
   */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get the number of non-expired entries.
   */
  get size(): number {
    this.cleanup();
    return this.store.size;
  }

  /**
   * Remove all expired entries.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval (useful for tests or shutdown).
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Singleton cache instance
export const cache = new MemoryCache();

// Export the class for testing or if multiple instances are needed
export { MemoryCache };
