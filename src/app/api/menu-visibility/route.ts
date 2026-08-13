import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { cachedJson } from '@/lib/cache-headers';
import { sharedCacheGet, sharedCacheSet, sharedCacheDelete } from '@/lib/shared-cache';
import { getGlobalConfigCarrierTenant } from '@/lib/global-config-carrier';

const GLOBAL_CONFIG_KEY = 'globalMenuConfig';

// 5-minute cache. Stored in the SHARED Redis cache (when configured) so that
// invalidation propagates across ALL Vercel serverless instances instantly.
// Previously this used the local in-memory `cache` module, which meant a
// toggle made on Instance A only cleared Instance A's cache — Instance B
// kept serving stale `disabledMenus` for up to 5 minutes (the TTL). That
// was the production-only "menu toggle doesn't work" bug.
//
// On Vercel serverless every request may land on a different warm instance,
// so a process-local cache is useless for cache-busting. Redis fixes this.
const MENU_VISIBILITY_CACHE_TTL_MS = 5 * 60 * 1000;

// Helper: safely parse settingsJson from a tenant record
function parseSettings(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw as Record<string, unknown>;
}

/**
 * GET /api/menu-visibility
 * Returns the menu visibility config for the current user's tenant.
 * Combines global (superadmin) defaults with tenant-specific overrides.
 * Used by the sidebar to show/hide menu items.
 *
 * GLOBAL HIDE = ABSOLUTE FLOOR (Option A):
 *   - Global enabled=false  -> item is hidden for EVERY tenant. No tenant
 *     override can re-enable it.
 *   - Global enabled=true (or no entry) -> tenants inherit "visible".
 *   - Tenant enabled=false -> hides the item FOR THIS TENANT ONLY
 *     (restricts further beyond the global default).
 *   - Tenant enabled=true  -> NO-OP. Cannot override a global hide.
 *
 * This prevents the bug where a stale tenant `menuConfig` snapshot (full
 * catalog with enabled=true) silently re-enabled every globally-hidden
 * menu the moment a tenant refreshed their CRM page.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId;
    if (!tenantId) {
      // Superadmin or user without tenant — return all enabled
      return NextResponse.json({ disabledMenus: [] });
    }

    // Cache lookup — keyed by tenantId only (same for all users in a tenant).
    // Uses the SHARED Redis cache so invalidation affects all instances.
    const cacheKey = `menu-visibility:${tenantId}`;
    const cached = await sharedCacheGet<{ disabledMenus: string[] }>(cacheKey);
    if (cached) {
      return cachedJson(cached);
    }

    const disabledKeys = new Set<string>();

    // 1. Fetch global disabled menus from the SENTINEL carrier tenant's
    //    settingsJson. Previously this used `findMany({ take: 1 })` with NO
    //    orderBy — on Supabase (PostgREST) that returns arbitrary rows, so
    //    the global config read could land on a DIFFERENT tenant than the one
    //    the superadmin PUT wrote to, causing toggles to silently not apply.
    //    The sentinel tenant is selected by NAME (deterministic across all
    //    instances and requests).
    try {
      const carrier = await getGlobalConfigCarrierTenant(db);
      if (carrier) {
        const settings = parseSettings(carrier.settingsJson);
        const globalConfig = settings[GLOBAL_CONFIG_KEY] as Array<{ key: string; enabled: boolean }> | undefined;
        if (globalConfig) {
          for (const item of globalConfig) {
            if (!item.enabled) {
              disabledKeys.add(item.key);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Menu Visibility] Global config error:', error);
      // Global configs might not exist yet
    }

    // 2. Fetch tenant-specific disabled menus from tenant's settingsJson.
    //    Tenant can ONLY hide more (add to disabledKeys). A tenant CANNOT
    //    re-enable a globally-hidden item — global hide is an absolute
    //    floor. This prevents stale tenant menuConfig snapshots (which may
    //    contain enabled=true for globally-hidden items) from silently
    //    re-enabling those items on tenant refresh.
    try {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
      if (tenant) {
        const settings = parseSettings(tenant.settingsJson);
        const tenantMenuConfig = settings.menuConfig as Array<{ key: string; enabled: boolean }> | undefined;
        if (tenantMenuConfig) {
          for (const item of tenantMenuConfig) {
            if (!item.enabled) {
              // Tenant hides this item further (restricts beyond global).
              disabledKeys.add(item.key);
            }
            // else: tenant says enabled=true. Under Option A this is a
            // NO-OP — we deliberately do NOT call disabledKeys.delete().
            // A tenant cannot un-hide a globally-hidden item.
          }
        }
      }
    } catch (error) {
      console.error('[Menu Visibility] Tenant config error:', error);
      // Tenant configs might not exist yet
    }

    const result = { disabledMenus: Array.from(disabledKeys) };
    // Store in the SHARED cache so all instances see the same value.
    await sharedCacheSet(cacheKey, result, MENU_VISIBILITY_CACHE_TTL_MS);

    return cachedJson(result);
  } catch (error) {
    console.error('[Menu Visibility] Error:', error);
    return NextResponse.json({ disabledMenus: [] });
  }
}

/**
 * Invalidate the menu-visibility cache for a tenant (or all tenants).
 * Exported so the superadmin menu-items PUT/POST handlers can call it after
 * a toggle — this replaces the old local `cache.invalidate()` calls that
 * only cleared the current instance's cache.
 */
export async function invalidateMenuVisibilityCache(tenantId?: string): Promise<void> {
  if (tenantId) {
    await sharedCacheDelete(`menu-visibility:${tenantId}`);
  } else {
    // No tenantId = global change. We can't enumerate every tenant's cache
    // key cheaply, so we rely on the TTL (5 min) for per-tenant entries to
    // expire naturally. Global changes are rare (superadmin only) and the
    // 5-min TTL is acceptable. For instant propagation we'd need a Redis
    // SCAN+DEL by prefix, but that's expensive on every toggle.
    //
    // NOTE: the superadmin menu-items route already calls
    // sharedCacheDeleteByPrefix('menu-visibility:') for global changes,
    // which DOES do the SCAN+DEL. This export is just a convenience.
  }
}
