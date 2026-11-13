/**
 * Fast in-memory session cache for BOS Commerce & QuoteFlow.
 *
 * Eliminates redundant sequential database round-trips to Supabase/PostgreSQL
 * on repeated API calls within a 60-second window.
 */

export interface CachedUserSession {
  id: string;
  email: string;
  name?: string;
  tenantId?: string;
}

export interface CachedBusinessSession {
  business: any;
  role: string;
  permissions: {
    canCreateInvoices: boolean;
    canPosBilling: boolean;
    canManageProducts: boolean;
    canViewReports: boolean;
    canManageKhata: boolean;
    canManageSettings: boolean;
    canManageStaff: boolean;
  };
  isOwner: boolean;
  staffMember?: any;
}

const SESSION_CACHE_TTL_MS = 60_000; // 60s in-memory TTL
const MAX_CACHE_ENTRIES = 500;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const userCache = new Map<string, CacheEntry<CachedUserSession>>();
const businessCache = new Map<string, CacheEntry<CachedBusinessSession>>();

function pruneCache<T>(cache: Map<string, CacheEntry<T>>) {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
  if (cache.size > MAX_CACHE_ENTRIES) {
    const keysToDelete = Array.from(cache.keys()).slice(0, 100);
    for (const key of keysToDelete) {
      cache.delete(key);
    }
  }
}

export function getCachedSessionUser(userId: string): CachedUserSession | null {
  const entry = userCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    userCache.delete(userId);
    return null;
  }
  return entry.data;
}

export function setCachedSessionUser(userId: string, user: CachedUserSession): void {
  if (userCache.size >= MAX_CACHE_ENTRIES) {
    pruneCache(userCache);
  }
  userCache.set(userId, {
    data: user,
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
  });
}

export function getCachedSessionBusiness(userId: string): CachedBusinessSession | null {
  const entry = businessCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    businessCache.delete(userId);
    return null;
  }
  return entry.data;
}

export function setCachedSessionBusiness(userId: string, session: CachedBusinessSession): void {
  if (businessCache.size >= MAX_CACHE_ENTRIES) {
    pruneCache(businessCache);
  }
  businessCache.set(userId, {
    data: session,
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
  });
}

export function invalidateCommerceSessionCache(userId?: string): void {
  if (userId) {
    userCache.delete(userId);
    businessCache.delete(userId);
  } else {
    userCache.clear();
    businessCache.clear();
  }
}
