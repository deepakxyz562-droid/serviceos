interface CachedBootstrap {
  data: any;
  expiresAt: number;
}

const BOOTSTRAP_CACHE = new Map<string, CachedBootstrap>();
export const BOOTSTRAP_CACHE_TTL_MS = 60_000; // 60 seconds
const MAX_BOOTSTRAP_CACHE_ENTRIES = 2000;

export function getCachedBootstrap(tenantId: string): any | null {
  const cached = BOOTSTRAP_CACHE.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  if (cached) {
    BOOTSTRAP_CACHE.delete(tenantId);
  }
  return null;
}

export function setCachedBootstrap(tenantId: string, data: any, ttlMs: number = BOOTSTRAP_CACHE_TTL_MS) {
  if (BOOTSTRAP_CACHE.has(tenantId)) {
    BOOTSTRAP_CACHE.delete(tenantId);
  } else if (BOOTSTRAP_CACHE.size >= MAX_BOOTSTRAP_CACHE_ENTRIES) {
    const oldestKey = BOOTSTRAP_CACHE.keys().next().value;
    if (oldestKey) BOOTSTRAP_CACHE.delete(oldestKey);
  }
  BOOTSTRAP_CACHE.set(tenantId, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateBootstrapCache(tenantId?: string) {
  if (tenantId) {
    BOOTSTRAP_CACHE.delete(tenantId);
  } else {
    BOOTSTRAP_CACHE.clear();
  }
}
