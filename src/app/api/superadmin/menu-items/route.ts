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

// Get global menu config from the first tenant's settingsJson
async function getGlobalMenuConfig(): Promise<MenuItemEntry[]> {
  try {
    const tenants = await db.tenant.findMany({ take: 1 });
    if (!tenants || tenants.length === 0) return getDefaultItems();

    const settings = parseSettings(tenants[0].settingsJson);
    const config = settings[GLOBAL_CONFIG_KEY] as MenuItemEntry[] | undefined;

    if (!config || config.length === 0) {
      // Initialize with defaults
      const defaults = getDefaultItems();
      await saveGlobalMenuConfig(defaults);
      return defaults;
    }
    return config;
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
  const config = settings.menuConfig as MenuItemEntry[] | undefined;
  if (!config || config.length === 0) return getDefaultItems();
  return config;
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

// PUT: Toggle a single menu item
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

    // For global scope (or no tenantId), update the global config in settingsJson
    if (scope === 'global' || !tenantId) {
      const items = await getGlobalMenuConfig();
      const updatedItems = items.map((item) =>
        item.key === menuKey ? { ...item, enabled } : item
      );
      await saveGlobalMenuConfig(updatedItems);
      // Invalidate ALL tenant menu-visibility cache entries — a global
      // toggle affects every tenant's sidebar/mobile-nav. Without this,
      // tenants continue seeing the stale config for up to 5 minutes.
      cache.invalidateByPrefix('menu-visibility:');
      return NextResponse.json({ success: true, scope: 'global' });
    }

    // For tenant-specific, update the tenant's menuConfig in settingsJson
    const items = await getTenantMenuConfig(tenantId);
    const updatedItems = items.map((item) =>
      item.key === menuKey ? { ...item, enabled } : item
    );
    await saveTenantMenuConfig(tenantId, updatedItems);
    // Invalidate this tenant's menu-visibility cache so the change is
    // visible immediately (without waiting for the 5-min TTL to expire).
    cache.invalidate(`menu-visibility:${tenantId}`);
    return NextResponse.json({ success: true, scope: 'tenant' });
  } catch (error) {
    console.error('[SuperAdmin Menu Items PUT] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle menu item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Save menu item configuration (bulk)
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

    // For global scope, update the global config
    if (scope === 'global' || !tenantId) {
      const currentItems = await getGlobalMenuConfig();
      const updatedItems = currentItems.map((item) => {
        const update = items.find((i: { key: string }) => i.key === item.key);
        return update ? { ...item, enabled: update.enabled } : item;
      });
      await saveGlobalMenuConfig(updatedItems);
      // Invalidate ALL tenant menu-visibility cache entries (bulk global update).
      cache.invalidateByPrefix('menu-visibility:');
      return NextResponse.json({ success: true, updated: items.length, scope: 'global' });
    }

    // For tenant-specific, update tenant settingsJson
    const currentItems = await getTenantMenuConfig(tenantId);
    const updatedItems = currentItems.map((item) => {
      const update = items.find((i: { key: string }) => i.key === item.key);
      return update ? { ...item, enabled: update.enabled } : item;
    });
    await saveTenantMenuConfig(tenantId, updatedItems);
    // Invalidate this tenant's menu-visibility cache (bulk tenant update).
    cache.invalidate(`menu-visibility:${tenantId}`);
    return NextResponse.json({ success: true, updated: items.length, scope: 'tenant' });
  } catch (error) {
    console.error('[SuperAdmin Menu Items POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save menu items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
