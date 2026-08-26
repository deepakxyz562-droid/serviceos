/**
 * resolveFallbackTenantId
 * ========================
 * Shared, CACHED tenant-ID resolver for API routes.
 *
 * Resolves a tenant ID from the auth user, falling back to the first tenant
 * (by createdAt asc) for demo / cookieless / super-admin sessions that have
 * no tenantId on their JWT.
 *
 * WHY THIS EXISTS
 * ---------------
 * Before this helper, 15+ API routes each had their own copy of:
 *
 *   async function resolveTenantId(authUser) {
 *     if (authUser?.tenantId) return authUser.tenantId
 *     const t = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } })
 *     return t?.id ?? null
 *   }
 *
 * Two problems with that:
 *
 * 1. PAYLOAD WASTE (C-2C): `findFirst` with no `select` fetched the entire
 *    ~80-column Tenant row (10+ JSON blobs) just to read `.id`. Fixed in a
 *    prior commit by adding `select: { id: true }`.
 *
 * 2. TIMEOUT AMPLIFICATION: every super-admin request to /api/invoices,
 *    /api/expenses, /api/assessments, etc. independently hit the DB for
 *    the first tenant. When the DB is under load (Supabase statement_timeout
 *    57014 on Tenant.findFirst), EACH request wastes ~10s. A page load that
 *    fans out to 5 such routes = 50s of wasted time.
 *
 *    This helper caches the result: 60s on success, 5s on failure. So only
 *    the FIRST request pays the DB cost — subsequent requests within the
 *    TTL return the cached value instantly.
 *
 * USAGE
 * -----
 *   import { resolveFallbackTenantId } from '@/lib/tenant-resolver'
 *
 *   const tenantId = await resolveFallbackTenantId(authUser)
 *   if (!tenantId) {
 *     return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
 *   }
 *
 * CACHE INVALIDATION
 * ------------------
 * The first tenant rarely changes. If a tenant is created or deleted, the
 * cache will naturally expire after 60s. For immediate invalidation, call:
 *   cache.invalidate('fallback-tenant-id')
 */

import { db } from '@/lib/db'
import { cache } from '@/lib/cache'

const CACHE_KEY = 'fallback-tenant-id'
const TTL_SUCCESS = 60_000 // 60s — first tenant rarely changes
const TTL_FAILURE = 5_000 // 5s — don't hammer DB when it's timing out

// Sentinel value to distinguish "cached null" from "not in cache".
// `cache.get()` returns `undefined` for misses; we need to cache `null`
// (legitimate "no tenants exist") distinctly from "never queried".
const NULL_SENTINEL = '__FALLBACK_TENANT_NULL__'

export async function resolveFallbackTenantId(
  authUser: { tenantId?: string | null; isSuperAdmin?: boolean } | null | undefined,
): Promise<string | null> {
  // Fast path: the user has a tenantId on their JWT — no DB call needed.
  if (authUser?.tenantId) {
    return authUser.tenantId
  }

  // Security & Data Isolation Gate:
  // Only super-admins operating without an explicit tenant context are allowed
  // to fall back to the primary system tenant. Standard users or unauthenticated
  // requests MUST NOT inherit another tenant's data.
  if (!authUser?.isSuperAdmin) {
    return null
  }

  // Check cache before hitting the DB.
  const cached = cache.get<string>(CACHE_KEY)
  if (cached !== undefined) {
    return cached === NULL_SENTINEL ? null : cached
  }

  // Cache miss — query the DB.
  try {
    const firstTenant = await db.tenant.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (firstTenant) {
      cache.set(CACHE_KEY, firstTenant.id, TTL_SUCCESS)
      return firstTenant.id
    }
    cache.set(CACHE_KEY, NULL_SENTINEL, TTL_FAILURE)
    return null
  } catch {
    cache.set(CACHE_KEY, NULL_SENTINEL, TTL_FAILURE)
    return null
  }
}

/**
 * Resolve the first tenant's `currency` (for multi-currency invoice/quote
 * calculations). Less common than resolveFallbackTenantId — only used by
 * /api/quotes and /api/invoices POST.
 *
 * CACHED separately from the ID resolver (different select column).
 */
const CURRENCY_CACHE_KEY = 'fallback-tenant-currency'

export async function resolveFallbackTenantCurrency(): Promise<string> {
  const cached = cache.get<string>(CURRENCY_CACHE_KEY)
  if (cached !== undefined) return cached

  try {
    const firstTenant = await db.tenant.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { currency: true },
    })
    const currency = firstTenant?.currency || 'USD'
    cache.set(CURRENCY_CACHE_KEY, currency, TTL_SUCCESS)
    return currency
  } catch {
    // DB error — return USD default, cache for 5s to avoid hammering.
    cache.set(CURRENCY_CACHE_KEY, 'USD', TTL_FAILURE)
    return 'USD'
  }
}
