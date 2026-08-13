import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { cache } from '@/lib/cache';
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
 * snapshot was manually re-seeded — which is exactly the bug "I can't see
 * all the menu in superadmin menu management".
 *
 * The merge starts from the CURRENT catalog (so every catalog item is
 * present, defaulting to `enabled: true`) and then applies any persisted
 * `enabled` override for the same `key`. Catalog metadata (label, icon,
 * section, sortOrder) always wins over the persisted snapshot — so renaming
 * an item in the catalog is reflected immediately. Only the on/off toggle
 * state is preserved from the persisted snapshot.
 *
 * Returns the merged list, sorted by section then sortOrder. If the
 * persisted snapshot is empty/null, returns the defaults and (optionally)
 * seeds the DB so subsequent reads are fast.
 */
function mergeWithCatalog(
  persisted: MenuItemEntry[] | undefined | null
): MenuItemEntry[] {
  const defaults = getDefaultItems();
  if (!persisted || persisted.length === 0) {
    return defaults;
  }

  // Build a lookup of persisted enabled-state by menuKey.
  const persistedEnabledByKey = new Map<string, boolean>();
  for (const entry of persisted) {
    if (entry && typeof entry.key === 'string') {
      persistedEnabledByKey.set(entry.key, !!entry.enabled);
    }
  }

  // Start from catalog defaults; overlay persisted enabled-state where present.
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
    // Merge persisted snapshot with the current catalog so newly-added
    // catalog items appear immediately (defaulting to enabled: true) while
    // preserving previously-saved enabled/disabled toggles.
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

// Get tenant-specific menu config from the tenant's settingsJson
async function getTenantMenuConfig(tenantId: string): Promise<MenuItemEntry[]> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return getDefaultItems();

  const settings = parseSettings(tenant.settingsJson);
  const rawConfig = settings.menuConfig as MenuItemEntry[] | undefined;
  if (!rawConfig || rawConfig.length === 0) return getDefaultItems();
  // Merge persisted snapshot with the current catalog so newly-added
  // catalog items appear immediately for this tenant too.
  return mergeWithCatalog(rawConfig);
}

// Save tenant-specific menu config to the tenant's settingsJson
async function saveTenantMenuConfig(tenantId: string, items: MenuItemEntry[]): Promise<void> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  const settings = parseSettings(tenant.settingsJson);
  settings.menuConfig = items;

  await db.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: JSON.stringify(settings) },
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

    // For tenant-specific, read from tenant settingsJson
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
// Wrapped in db.$transaction for true atomicity — even if two PUTs land
// concurrently, each transaction sees a consistent snapshot and commits
// atomically, preventing the lost-update race that previously caused
// random subsets of toggles to persist.
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

    // Atomic read-modify-write inside a transaction.
    await db.$transaction(async (tx) => {
      if (scope === 'global' || !tenantId) {
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
        const rawConfig = (settings.menuConfig as MenuItemEntry[] | undefined) || getDefaultItems();
        const merged = mergeWithCatalog(rawConfig);
        const updatedItems = merged.map((item) =>
          item.key === menuKey ? { ...item, enabled } : item,
        );
        settings.menuConfig = updatedItems;
        await tx.tenant.update({
          where: { id: tenantId },
          data: { settingsJson: JSON.stringify(settings) },
        });
      }
    });

    // Cache invalidation outside the transaction.
    if (scope === 'global' || !tenantId) {
      cache.invalidateByPrefix('menu-visibility:');
    } else {
      cache.invalidate(`menu-visibility:${tenantId}`);
    }
    return NextResponse.json({ success: true, scope: scope === 'global' || !tenantId ? 'global' : 'tenant' });
  } catch (error) {
    console.error('[SuperAdmin Menu Items PUT] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle menu item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Save menu item configuration (bulk).
// Wrapped in db.$transaction for true atomicity — the entire bulk update
// commits as one unit, preventing partial writes if the process is
// interrupted mid-loop.
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

    await db.$transaction(async (tx) => {
      if (scope === 'global' || !tenantId) {
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

    if (scope === 'global' || !tenantId) {
      cache.invalidateByPrefix('menu-visibility:');
    } else {
      cache.invalidate(`menu-visibility:${tenantId}`);
    }
    return NextResponse.json({ success: true, updated: items.length, scope: scope === 'global' || !tenantId ? 'global' : 'tenant' });
  } catch (error) {
    console.error('[SuperAdmin Menu Items POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save menu items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
