import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { sharedCacheDelete, sharedCacheDeleteByPrefix } from '@/lib/shared-cache';
import { MENU_CATALOG, getDefaultMenuItems } from '@/lib/menu-catalog';

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

// Get global menu config from the first tenant's settingsJson
async function getGlobalMenuConfig(): Promise<MenuItemEntry[]> {
  try {
    const tenants = await db.tenant.findMany({ take: 1 });
    if (!tenants || tenants.length === 0) return getDefaultItems();

    const settings = parseSettings(tenants[0].settingsJson);
    const rawConfig = settings[GLOBAL_CONFIG_KEY] as MenuItemEntry[] | undefined;

    if (!rawConfig || rawConfig.length === 0) {
      // Initialize with defaults
      const defaults = getDefaultItems();
      await saveGlobalMenuConfig(defaults);
      return defaults;
    }
    return mergeWithCatalog(rawConfig);
  } catch (error) {
    console.error('[getGlobalMenuConfig] Error:', error);
    return getDefaultItems();
  }
}

// Save global menu config to the first tenant's settingsJson
async function saveGlobalMenuConfig(items: MenuItemEntry[]): Promise<void> {
  const tenants = await db.tenant.findMany({ take: 1 });
  if (!tenants || tenants.length === 0) {
    throw new Error('No tenants found — cannot save global menu config');
  }

  const tenantId = (tenants[0] as Record<string, unknown>).id as string;
  const settings = parseSettings(tenants[0].settingsJson);
  settings[GLOBAL_CONFIG_KEY] = items;

  await db.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: JSON.stringify(settings) },
  });
}

// Get tenant-specific menu config — returns the EFFECTIVE state (global
// overlaid with tenant overrides). Previously this returned only the
// tenant's raw config, which meant a globally-disabled item appeared as
// ENABLED in the tenant view even though the tenant's sidebar was hiding
// it. That mismatch caused "I toggled it off globally but it still shows
// as on for the tenant" confusion.
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

  // Overlay tenant overrides on top of the global config: when the tenant
  // has an explicit entry for a key, the tenant's value wins; otherwise the
  // global value applies.
  return globalConfig.map((item) => ({
    ...item,
    enabled: tenantEnabledByKey.has(item.key)
      ? (tenantEnabledByKey.get(item.key) as boolean)
      : item.enabled,
  }));
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
    console.error('[SuperAdmin Menu Items GET] Error:', error);
    return NextResponse.json({
      items: MENU_CATALOG.map((item) => ({
        ...item,
        id: `default_${item.key}`,
        enabled: true,
        tenantId: null,
      })),
    });
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
        const tenants = await tx.tenant.findMany({ take: 1 });
        if (!tenants || tenants.length === 0) {
          throw new Error('No tenants found — cannot save global menu config');
        }
        const tenantIdInner = (tenants[0] as Record<string, unknown>).id as string;
        const settings = parseSettings(tenants[0].settingsJson);
        const rawConfig = (settings[GLOBAL_CONFIG_KEY] as MenuItemEntry[] | undefined) || getDefaultItems();
        const merged = mergeWithCatalog(rawConfig);
        const updatedItems = merged.map((item) =>
          item.key === menuKey ? { ...item, enabled } : item,
        );
        settings[GLOBAL_CONFIG_KEY] = updatedItems;
        await tx.tenant.update({
          where: { id: tenantIdInner },
          data: { settingsJson: JSON.stringify(settings) },
        });
      } else {
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
          throw new Error(`Tenant ${tenantId} not found`);
        }
        const settings = parseSettings(tenant.settingsJson);

        // SPARSE OVERRIDE storage: store ONLY the toggled item as a tenant
        // override, NOT a full snapshot of the catalog. This is critical
        // because getTenantMenuConfig() overlays tenant overrides on the
        // GLOBAL config — if we wrote a full snapshot here, every catalog
        // item would get a tenant value and the tenant would stop
        // inheriting global changes. With sparse storage, only items the
        // superadmin explicitly toggled for this tenant override global;
        // everything else inherits the global setting.
        const existingConfig = (settings.menuConfig as MenuItemEntry[] | undefined) || [];
        // Drop any prior entry for this key so we don't accumulate dupes.
        const filtered = existingConfig.filter(
          (item) => item && typeof item.key === 'string' && item.key !== menuKey,
        );
        const catalogItem = MENU_CATALOG.find((i) => i.key === menuKey);
        if (!catalogItem) {
          throw new Error(`Unknown menu key: ${menuKey}`);
        }
        settings.menuConfig = [...filtered, { ...catalogItem, enabled }];
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
        const tenants = await tx.tenant.findMany({ take: 1 });
        if (!tenants || tenants.length === 0) {
          throw new Error('No tenants found — cannot save global menu config');
        }
        const tenantIdInner = (tenants[0] as Record<string, unknown>).id as string;
        const settings = parseSettings(tenants[0].settingsJson);
        const rawConfig = (settings[GLOBAL_CONFIG_KEY] as MenuItemEntry[] | undefined) || getDefaultItems();
        const currentItems = mergeWithCatalog(rawConfig);
        const updatedItems = currentItems.map((item) => {
          const update = items.find((i: { key: string }) => i.key === item.key);
          return update ? { ...item, enabled: update.enabled } : item;
        });
        settings[GLOBAL_CONFIG_KEY] = updatedItems;
        await tx.tenant.update({
          where: { id: tenantIdInner },
          data: { settingsJson: JSON.stringify(settings) },
        });
      } else {
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
          throw new Error(`Tenant ${tenantId} not found`);
        }
        const settings = parseSettings(tenant.settingsJson);
        const rawConfig = (settings.menuConfig as MenuItemEntry[] | undefined) || getDefaultItems();
        const currentItems = mergeWithCatalog(rawConfig);
        const updatedItems = currentItems.map((item) => {
          const update = items.find((i: { key: string }) => i.key === item.key);
          return update ? { ...item, enabled: update.enabled } : item;
        });
        settings.menuConfig = updatedItems;
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
