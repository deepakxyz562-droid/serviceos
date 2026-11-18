interface CachedBootstrap {
  data: any;
  expiresAt: number;
}

const BOOTSTRAP_CACHE = new Map<string, CachedBootstrap>();
export const BOOTSTRAP_CACHE_TTL_MS = 60_000; // 60 seconds

export function getCachedBootstrap(tenantId: string): any | null {
  const cached = BOOTSTRAP_CACHE.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  return null;
}

export function setCachedBootstrap(tenantId: string, data: any, ttlMs: number = BOOTSTRAP_CACHE_TTL_MS) {
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
