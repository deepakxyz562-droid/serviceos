/**
 * In-Memory LRU Cache Handler for Next.js 16
 *
 * Prevents Next.js from writing unbounded gigabytes of route-cache and RSC payloads
 * to the container filesystem (.next/server/route-cache/APP_PAGE/...).
 *
 * Keeps hot pages in a bounded in-memory LRU map (max 500 entries, ~25-50MB RAM).
 * When max capacity is reached, the least recently accessed entry is automatically evicted.
 */

const MAX_ENTRIES = 500;

class InMemoryLRUCacheHandler {
  // Shared across requests in module scope
  static cache = new Map();

  constructor(options) {
    this.options = options || {};
  }

  async get(cacheKey, _ctx) {
    const entry = InMemoryLRUCacheHandler.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Move key to the end of the Map (most recently used in Map insertion order)
    InMemoryLRUCacheHandler.cache.delete(cacheKey);
    InMemoryLRUCacheHandler.cache.set(cacheKey, entry);

    return {
      lastModified: entry.lastModified,
      age: Math.floor((Date.now() - entry.lastModified) / 1000),
      value: entry.value,
    };
  }

  async set(cacheKey, data, ctx) {
    if (!data) return;

    const cache = InMemoryLRUCacheHandler.cache;

    // If key already exists, delete so it gets re-inserted at the end
    if (cache.has(cacheKey)) {
      cache.delete(cacheKey);
    } else if (cache.size >= MAX_ENTRIES) {
      // Evict oldest entry (first key in Map insertion order)
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }

    const tags = Array.isArray(ctx?.tags)
      ? ctx.tags
      : Array.isArray(ctx?.softTags)
      ? ctx.softTags
      : [];

    cache.set(cacheKey, {
      lastModified: Date.now(),
      value: data,
      tags,
    });
  }

  async revalidateTag(tags, _durations) {
    if (!tags) return;
    const tagList = Array.isArray(tags) ? tags : [tags];
    if (tagList.length === 0) return;

    const cache = InMemoryLRUCacheHandler.cache;
    for (const [key, entry] of cache.entries()) {
      if (entry.tags && entry.tags.some((t) => tagList.includes(t))) {
        cache.delete(key);
      }
    }
  }

  resetRequestCache() {
    // In-memory persistent cache — request-level reset is a no-op
  }
}

module.exports = InMemoryLRUCacheHandler;
module.exports.default = InMemoryLRUCacheHandler;
