import { db } from '@/lib/db';
import { getAuthUser, type AuthUser } from '@/lib/auth';

/**
 * Super-admin authorization.
 * ==========================
 *
 * SECURITY MODEL (Phase Security-1):
 *   The database is the AUTHORITATIVE source of truth for super-admin status.
 *   The JWT's `isSuperAdmin` / `role` claims are treated as UNTRUSTED STALE
 *   METADATA — used only for UI hints, never for authorization decisions.
 *
 *   This closes the privilege-escalation bug where a demoted super-admin's
 *   old 7-day JWT continued to grant super-admin access. Now the DB is
 *   queried (with a 60-second cache) on every super-admin check, so a
 *   demotion takes effect within at most 60 seconds.
 *
 * CACHE:
 *   A bounded in-memory cache (Map) avoids hitting the DB on every request.
 *   - TTL: 60 seconds (CACHE_TTL_MS)
 *   - Fail-closed: DB errors return false (no privileged access on DB failure)
 *   - Invalidation: call invalidateSuperAdminCache(userId) when the user's
 *     isSuperAdmin/role changes (e.g., in the superadmin user-management UI)
 *
 *   The cache is bounded by the fact that entries expire after 60 seconds
 *   and are lazily evicted on read. Long-running processes won't accumulate
 *   entries indefinitely because expired entries are deleted on access.
 */

const CACHE_TTL_MS = 60_000; // 60 seconds

type CacheEntry = {
  value: boolean;
  expiresAt: number;
};

const superAdminCache = new Map<string, CacheEntry>();

/**
 * Get a cached super-admin result for a user.
 * Returns null if not cached or if the entry has expired (and deletes
 * expired entries to keep the map bounded).
 */
function getCachedSuperAdmin(userId: string): boolean | null {
  const entry = superAdminCache.get(userId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    superAdminCache.delete(userId);
    return null;
  }
  return entry.value;
}

/**
 * Invalidate the cached super-admin status for a user.
 *
 * Call this whenever the user's isSuperAdmin or role changes (e.g., after
 * a superadmin promotes/demotes a user). This ensures the next request
 * hits the DB immediately rather than waiting up to 60 seconds for the
 * cache to expire.
 *
 * If userId is omitted, clears the ENTIRE cache (use after bulk role changes).
 */
export function invalidateSuperAdminCache(userId?: string): void {
  if (userId) {
    superAdminCache.delete(userId);
  } else {
    superAdminCache.clear();
  }
}

/**
 * Check if the current request is from a super admin.
 *
 * SECURITY: The database is authoritative — NOT the JWT.
 * The JWT's isSuperAdmin/role fields are treated as untrusted stale metadata.
 *
 * Flow:
 *   1. Check 60-second in-memory cache (avoids DB hit on every request)
 *   2. If cache miss/expired → query DB for current isSuperAdmin + role
 *   3. Cache the result for 60 seconds
 *   4. On DB error → fail CLOSED (return false — no privileged access on failure)
 */
export async function isSuperAdminRequest(): Promise<boolean> {
  const authUser = await getAuthUser();
  if (!authUser) return false;

  // 1. Check cache first
  const cached = getCachedSuperAdmin(authUser.id);
  if (cached !== null) {
    return cached;
  }

  // 2. DB is authoritative — NOT the JWT
  try {
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: { isSuperAdmin: true, role: true },
    });

    const isSuperAdmin =
      user?.isSuperAdmin === true ||
      user?.role === 'superadmin' ||
      user?.role === 'super_admin';

    // 3. Cache the result for 60 seconds
    superAdminCache.set(authUser.id, {
      value: isSuperAdmin,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return isSuperAdmin;
  } catch {
    // 4. Fail CLOSED — DB error means we can't verify, so deny access
    return false;
  }
}

/**
 * Check if an AuthUser object represents a super admin.
 * Used for CLIENT-SIDE checks only (sidebar visibility, UI hints).
 *
 * SECURITY: This reads from the JWT (authUser), which is STALE metadata.
 * It is NOT an authorization decision — it's a UI hint. All actual
 * authorization is server-side via isSuperAdminRequest() which queries the DB.
 *
 * Do NOT use this function for security decisions. It exists only to avoid
 * flicker in the UI (e.g., showing/hiding the superadmin sidebar section)
 * before the server confirms the user's current role.
 */
export function isSuperAdminUser(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (user.role === 'superadmin' || user.role === 'super_admin') return true;
  // Legacy fallback: admin with no tenantId is likely superadmin
  if (user.role === 'admin' && !user.tenantId) return true;
  return false;
}
