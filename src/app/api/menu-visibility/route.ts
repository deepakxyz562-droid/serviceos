import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { cachedJson } from '@/lib/cache-headers';
import { sharedCacheGet, sharedCacheSet, sharedCacheDelete } from '@/lib/shared-cache';

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
 * TENANT OVERRIDES GLOBAL: when the tenant has an explicit entry for a
 * menu key, the tenant's `enabled` value WINS over the global default.
 *   - tenant.enabled=false  -> add to disabled set (restrict further)
 *   - tenant.enabled=true   -> REMOVE from disabled set (override a
 *     global disable so the tenant can see this menu again)
 * Items not present in tenantMenuConfig inherit the global setting.
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

    // 1. Fetch global disabled menus from the first tenant's settingsJson
    try {
      const tenants = await db.tenant.findMany({ take: 1 });
      if (tenants && tenants.length > 0) {
        const settings = parseSettings(tenants[0].settingsJson);
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
    //    Tenant.enabled=true OVERRIDES a global disable (removes the key).
    try {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
      if (tenant) {
        const settings = parseSettings(tenant.settingsJson);
        const tenantMenuConfig = settings.menuConfig as Array<{ key: string; enabled: boolean }> | undefined;
        if (tenantMenuConfig) {
          for (const item of tenantMenuConfig) {
            if (!item.enabled) {
              disabledKeys.add(item.key);
            } else {
              // Tenant explicitly enabled this item — let it override a
              // global disable. Items not present in tenantMenuConfig
              // continue to inherit the global setting.
              disabledKeys.delete(item.key);
            }
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
