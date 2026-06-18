import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const GLOBAL_CONFIG_KEY = 'globalMenuConfig';

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

    // 2. Fetch tenant-specific disabled menus from tenant's settingsJson
    try {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
      if (tenant) {
        const settings = parseSettings(tenant.settingsJson);
        const tenantMenuConfig = settings.menuConfig as Array<{ key: string; enabled: boolean }> | undefined;
        if (tenantMenuConfig) {
          for (const item of tenantMenuConfig) {
            if (!item.enabled) {
              disabledKeys.add(item.key);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Menu Visibility] Tenant config error:', error);
      // Tenant configs might not exist yet
    }

    return NextResponse.json({ disabledMenus: Array.from(disabledKeys) });
  } catch (error) {
    console.error('[Menu Visibility] Error:', error);
    return NextResponse.json({ disabledMenus: [] });
  }
}
