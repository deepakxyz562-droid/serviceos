import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { sharedCacheDelete, sharedCacheDeleteByPrefix } from '@/lib/shared-cache';
import { MENU_CATALOG, getDefaultMenuItems } from '@/lib/menu-catalog';
import { getGlobalConfigCarrierTenant } from '@/lib/global-config-carrier';

const GLOBAL_CONFIG_KEY = 'globalMenuConfig';

interface MenuItemEntry {
  key: string;
  label: string;
  icon: string;
  section: string;
  sortOrder: number;
  enabled: boolean;
}

// Helper: safely parse settingsJson from a tenant record
function parseSettings(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw as Record<string, unknown>;
}

/**
 * Merge the persisted config snapshot with the current MENU_CATALOG.
 *
 * Why this exists: the persisted snapshot (in Tenant.settingsJson) is a
 * point-in-time copy of the catalog. When new items are added to
 * MENU_CATALOG, they would NOT appear in the Menu Management UI until the
 * snapshot was manually re-seeded.
 *
 * The merge starts from the CURRENT catalog (so every catalog item is
 * present, defaulting to `enabled: true`) and then applies any persisted
 * `enabled` override for the same `key`. Catalog metadata (label, icon,
 * section, sortOrder) always wins over the persisted snapshot — so renaming
 * an item in the catalog is reflected immediately. Only the on/off toggle
 * state is preserved from the persisted snapshot.
 */
function mergeWithCatalog(
  persisted: MenuItemEntry[] | undefined | null
): MenuItemEntry[] {
  const defaults = getDefaultItems();
  if (!persisted || persisted.length === 0) {
    return defaults;
  }

  const persistedEnabledByKey = new Map<string, boolean>();
  for (const entry of persisted) {
    if (entry && typeof entry.key === 'string') {
      persistedEnabledByKey.set(entry.key, !!entry.enabled);
    }
  }

  return defaults.map((item) => ({
    ...item,
    enabled: persistedEnabledByKey.has(item.key)
      ? (persistedEnabledByKey.get(item.key) as boolean)
      : item.enabled,
  }));
}

// Get global menu config from the SENTINEL carrier tenant's settingsJson.
//
// WHY SENTINEL (not "first tenant"):
//   Previously this used `db.tenant.findMany({ take: 1 })` with NO orderBy.
//   On Supabase (PostgREST), `LIMIT 1` without `ORDER BY` returns rows in
//   arbitrary physical order — different across requests/instances. The PUT
//   would write to Tenant A, the immediate GET would land on Tenant B (no
//   config) → destructive auto-init wrote defaults (all enabled) to Tenant B
//   → the user's toggle appeared to revert. Using a dedicated sentinel tenant
//   selected by NAME makes the carrier deterministic.
//
// NO DESTRUCTIVE AUTO-INIT:
//   Previously, a missing/empty `globalMenuConfig` triggered
//   `saveGlobalMenuConfig(defaults)` — a WRITE inside a GET handler. This
//   polluted whichever tenant happened to be read. Now we just return the
//   in-memory defaults WITHOUT writing. The first explicit PUT/POST from the
//   superadmin UI will persist the config to the sentinel tenant.
async function getGlobalMenuConfig(): Promise<MenuItemEntry[]> {
  try {
    const carrier = await getGlobalConfigCarrierTenant(db);
    if (!carrier) return getDefaultItems();

    const settings = parseSettings(carrier.settingsJson);
    const rawConfig = settings[GLOBAL_CONFIG_KEY] as MenuItemEntry[] | undefined;

    if (!rawConfig || rawConfig.length === 0) {
      // Return in-memory defaults — do NOT write to DB (the old behavior
      // polluted tenants via destructive auto-init). The first PUT/POST
      // from the UI will persist the config to the sentinel.
      return getDefaultItems();
    }
    return mergeWithCatalog(rawConfig);
  } catch (error) {
    console.error('[getGlobalMenuConfig] Error:', error);
    return getDefaultItems();
  }
}

// Save global menu config to the SENTINEL carrier tenant's settingsJson.
async function saveGlobalMenuConfig(items: MenuItemEntry[]): Promise<void> {
  const carrier = await getGlobalConfigCarrierTenant(db);
  if (!carrier) {
    throw new Error('Could not get/create carrier tenant — cannot save global menu config');
  }
  const settings = parseSettings(carrier.settingsJson);
  settings[GLOBAL_CONFIG_KEY] = items;

  await db.tenant.update({
    where: { id: carrier.id },
    data: { settingsJson: JSON.stringify(settings) },
  });
}

// Get tenant-specific menu config — returns the EFFECTIVE state (global
// overlaid with tenant overrides). Previously this returned only the
// tenant's raw config, which meant a globally-disabled item appeared as
// ENABLED in the tenant view even though the tenant's sidebar was hiding
// it. That mismatch caused "I toggled it off globally but it still shows
// as on for the tenant" confusion.
//
// Under Option A (global hide = absolute floor): if global enabled=false,
// the result is ALWAYS false regardless of any tenant override. The tenant
// can only hide MORE, not re-enable. This keeps the superadmin UI
// consistent with the actual sidebar behavior — if a menu is globally
// hidden, it shows as "off" in the tenant view too, even if a stale
// tenant menuConfig entry says enabled=true.
async function getTenantMenuConfig(tenantId: string): Promise<MenuItemEntry[]> {
  // Start from the global config so the tenant view reflects global
  // defaults (including global disables). This is the baseline the tenant
  // inherits when they haven't set an override.
  const globalConfig = await getGlobalMenuConfig();

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return globalConfig;

  const settings = parseSettings(tenant.settingsJson);
  const rawConfig = settings.menuConfig as MenuItemEntry[] | undefined;
  if (!rawConfig || rawConfig.length === 0) {
    // Tenant has no overrides — effective state == global state.
    return globalConfig;
  }

  // Build a lookup of the tenant's persisted enabled-state by menuKey.
  const tenantEnabledByKey = new Map<string, boolean>();
  for (const entry of rawConfig) {
    if (entry && typeof entry.key === 'string') {
      tenantEnabledByKey.set(entry.key, !!entry.enabled);
    }
  }

  // Overlay tenant overrides on top of the global config.
  // Option A: if global is false, the result is ALWAYS false (absolute
  // floor). If global is true, the tenant override applies (tenant can
  // hide further with enabled=false, or leave visible with enabled=true
  // / no override).
  return globalConfig.map((item) => {
    if (!item.enabled) {
      // Global hide = absolute floor. Tenant cannot re-enable.
      return { ...item, enabled: false };
    }
    const tenantOverride = tenantEnabledByKey.get(item.key);
    return {
      ...item,
      enabled: tenantOverride !== undefined ? tenantOverride : item.enabled,
    };
  });
}

function getDefaultItems(): MenuItemEntry[] {
  return getDefaultMenuItems();
}

// GET: List menu items for a tenant, or global defaults
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const scope = searchParams.get('scope');

    // If scope=global, fetch from settingsJson
    if (scope === 'global') {
      const items = await getGlobalMenuConfig();
      return NextResponse.json({ items: items.map((item) => ({ ...item, id: `global_${item.key}`, tenantId: null })) });
    }

    if (!tenantId) {
      return NextResponse.json({
        items: MENU_CATALOG.map((item) => ({
          ...item,
          id: `default_${item.key}`,
          enabled: true,
          tenantId: null,
        })),
      });
    }

    // For tenant-specific, read the EFFECTIVE state (global + tenant overrides)
    const items = await getTenantMenuConfig(tenantId);
    return NextResponse.json({ items: items.map((item) => ({ ...item, id: `tenant_${item.key}`, tenantId })) });
  } catch (error) {
    // Return 503 (not 200) so the frontend can distinguish "DB unavailable"
    // from "all menus enabled". Previously this returned 200 with all-enabled
    // defaults, which masqueraded a DB error as success — the user saw every
    // menu as enabled even though the read had failed.
    console.error('[SuperAdmin Menu Items GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load menu items', items: [] },
      { status: 503 }
    );
  }
}

// PUT: Toggle a single menu item.
// Wrapped in db.$transaction for atomicity.
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const body = await request.json();
    const { tenantId, menuKey, enabled, scope } = body;

    if (!menuKey) {
      return NextResponse.json({ error: 'Menu key is required' }, { status: 400 });
    }
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Enabled must be a boolean' }, { status: 400 });
    }

    const isGlobal = scope === 'global' || !tenantId;

    // Atomic read-modify-write inside a transaction.
    await db.$transaction(async (tx) => {
      if (isGlobal) {
        // Use the SENTINEL carrier tenant (deterministic by name) — NOT
        // `findMany({ take: 1 })` which returns arbitrary rows on Supabase.
        const carrier = await getGlobalConfigCarrierTenant(tx);
        if (!carrier) {
          throw new Error('Could not get/create carrier tenant — cannot save global menu config');
        }
        const settings = parseSettings(carrier.settingsJson);
        const rawConfig = (settings[GLOBAL_CONFIG_KEY] as MenuItemEntry[] | undefined) || getDefaultItems();
        const merged = mergeWithCatalog(rawConfig);
        const updatedItems = merged.map((item) =>
          item.key === menuKey ? { ...item, enabled } : item,
        );
        settings[GLOBAL_CONFIG_KEY] = updatedItems;
        await tx.tenant.update({
          where: { id: carrier.id },
          data: { settingsJson: JSON.stringify(settings) },
        });
      } else {
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
          throw new Error(`Tenant ${tenantId} not found`);
        }
        const settings = parseSettings(tenant.settingsJson);

        // SPARSE OVERRIDE storage (Option A):
        // Store ONLY the toggled item as a tenant override, NOT a full
        // snapshot of the catalog. Only persist an override when:
        //   - The toggle DIFFERS from the global state (no redundant
        //     overrides that just duplicate global).
        //   - AND it's a HIDE (enabled=false). A tenant CANNOT re-enable
        //     a globally-hidden item (global hide = absolute floor), so
        //     enabled=true overrides are never stored.
        // If the toggle matches global (or tries to re-enable a global
        // hide), we REMOVE any existing override for this key so the
        // tenant inherits the global setting cleanly. This auto-cleans
        // stale entries over time as items are toggled.

        // Read the global enabled state for this key from the SENTINEL
        // carrier tenant (deterministic by name).
        const globalCarrier = await getGlobalConfigCarrierTenant(tx);
        let globalEnabled = true; // default: visible
        if (globalCarrier) {
          const gSettings = parseSettings(globalCarrier.settingsJson);
          const gConfig = gSettings[GLOBAL_CONFIG_KEY] as MenuItemEntry[] | undefined;
          if (gConfig) {
            const gEntry = gConfig.find((g) => g.key === menuKey);
            if (gEntry) globalEnabled = gEntry.enabled;
          }
        }

        const existingConfig = (settings.menuConfig as MenuItemEntry[] | undefined) || [];
        // Drop any prior entry for this key (we re-add below only if needed).
        const filtered = existingConfig.filter(
          (item) => item && typeof item.key === 'string' && item.key !== menuKey,
        );

        // Should we persist a tenant override for this key?
        // Only if it's a HIDE that differs from global.
        const shouldStoreOverride = !enabled && globalEnabled;

        if (shouldStoreOverride) {
          const catalogItem = MENU_CATALOG.find((i) => i.key === menuKey);
          if (!catalogItem) {
            throw new Error(`Unknown menu key: ${menuKey}`);
          }
          filtered.push({ ...catalogItem, enabled: false });
        }
        // else: toggle matches global, or tenant tried to re-enable a
        // global hide (no-op under Option A). Either way, don't store
        // an override — the tenant inherits global.

        settings.menuConfig = filtered;
        await tx.tenant.update({
          where: { id: tenantId },
          data: { settingsJson: JSON.stringify(settings) },
        });
      }
    });

    // Cache invalidation — uses the SHARED Redis cache so ALL Vercel
    // instances see the invalidation instantly. The old local
    // `cache.invalidate()` only cleared the current instance, leaving
    // other instances serving stale data for up to 5 minutes.
    if (isGlobal) {
      // Global change affects every tenant's effective menu-visibility.
      // Delete all menu-visibility:* keys across all instances.
      await sharedCacheDeleteByPrefix('menu-visibility:');
    } else {
      // Tenant-specific change — only that tenant's cache needs clearing.
      await sharedCacheDelete(`menu-visibility:${tenantId}`);
    }
    return NextResponse.json({ success: true, scope: isGlobal ? 'global' : 'tenant' });
  } catch (error) {
    console.error('[SuperAdmin Menu Items PUT] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle menu item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Save menu item configuration (bulk).
// Wrapped in db.$transaction for atomicity.
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const body = await request.json();
    const { tenantId, items, scope } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items must be an array' }, { status: 400 });
    }

    const isGlobal = scope === 'global' || !tenantId;

    await db.$transaction(async (tx) => {
      if (isGlobal) {
        // Use the SENTINEL carrier tenant (deterministic by name).
        const carrier = await getGlobalConfigCarrierTenant(tx);
        if (!carrier) {
          throw new Error('Could not get/create carrier tenant — cannot save global menu config');
        }
        const settings = parseSettings(carrier.settingsJson);
        const rawConfig = (settings[GLOBAL_CONFIG_KEY] as MenuItemEntry[] | undefined) || getDefaultItems();
        const currentItems = mergeWithCatalog(rawConfig);
        const updatedItems = currentItems.map((item) => {
          const update = items.find((i: { key: string }) => i.key === item.key);
          return update ? { ...item, enabled: update.enabled } : item;
        });
        settings[GLOBAL_CONFIG_KEY] = updatedItems;
        await tx.tenant.update({
          where: { id: carrier.id },
          data: { settingsJson: JSON.stringify(settings) },
        });
      } else {
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
          throw new Error(`Tenant ${tenantId} not found`);
        }
        const settings = parseSettings(tenant.settingsJson);

        // SPARSE OVERRIDE storage (Option A):
        // The UI sends the FULL items array (all catalog items with their
        // current enabled state) on bulk save. We must NOT store this as a
        // full snapshot — that would create a stale snapshot that breaks
        // global inheritance (the original Bug C, which was fixed in PUT
        // but not POST until now).
        //
        // Instead, read the global config and persist ONLY the tenant
        // overrides that:
        //   - DIFFER from global (no redundant entries)
        //   - AND are HIDES (enabled=false). A tenant cannot re-enable a
        //     globally-hidden item (Option A), so enabled=true overrides
        //     are never stored.
        // This also auto-cleans stale snapshots: any existing menuConfig
        // entries that now match global are dropped.

        // Read the global config from the SENTINEL carrier tenant.
        const globalCarrier = await getGlobalConfigCarrierTenant(tx);
        const globalConfig = globalCarrier
          ? (parseSettings(globalCarrier.settingsJson)[GLOBAL_CONFIG_KEY] as MenuItemEntry[] | undefined)
          : undefined;
        const globalEnabledByKey = new Map<string, boolean>();
        if (globalConfig) {
          for (const g of globalConfig) {
            if (g && typeof g.key === 'string') {
              globalEnabledByKey.set(g.key, !!g.enabled);
            }
          }
        }

        // Build the new sparse tenant override list.
        const newOverrides: MenuItemEntry[] = [];
        for (const update of items) {
          if (!update || typeof update.key !== 'string') continue;
          const globalEnabled = globalEnabledByKey.get(update.key) ?? true;
          // Only store a tenant override if it's a HIDE that differs
          // from global. A tenant cannot re-enable a globally-hidden
          // item, so enabled=true when global=false is a no-op (not stored).
          if (!update.enabled && globalEnabled) {
            const catalogItem = MENU_CATALOG.find((i) => i.key === update.key);
            if (catalogItem) {
              newOverrides.push({ ...catalogItem, enabled: false });
            }
          }
        }

        settings.menuConfig = newOverrides;
        await tx.tenant.update({
          where: { id: tenantId },
          data: { settingsJson: JSON.stringify(settings) },
        });
      }
    });

    // Shared cache invalidation (same rationale as PUT above).
    if (isGlobal) {
      await sharedCacheDeleteByPrefix('menu-visibility:');
    } else {
      await sharedCacheDelete(`menu-visibility:${tenantId}`);
    }
    return NextResponse.json({ success: true, updated: items.length, scope: isGlobal ? 'global' : 'tenant' });
  } catch (error) {
    console.error('[SuperAdmin Menu Items POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save menu items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
