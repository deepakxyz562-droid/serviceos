import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  getDefaultCatalog,
  INTEGRATION_CATALOG_CONFIG_KEY,
  type IntegrationCatalogConfig,
} from '@/lib/integration-catalog';

/**
 * Tenant-facing integrations catalog.
 *
 * Returns only ENABLED categories and ENABLED integrations whose category is
 * also enabled. The "live" global catalog is stored in the first tenant's
 * settingsJson (see /api/superadmin/integrations); if that key is missing we
 * fall back to the in-code defaults (without persisting them — writes are a
 * superadmin-only operation).
 */

function parseSettings(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw as Record<string, unknown>;
}

function isCatalogConfig(value: unknown): value is IntegrationCatalogConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.categories) && Array.isArray(v.integrations);
}

async function getGlobalIntegrationCatalog(): Promise<IntegrationCatalogConfig> {
  const tenants = await db.tenant.findMany({ take: 1 });
  if (!tenants || tenants.length === 0) {
    return getDefaultCatalog();
  }
  const settings = parseSettings(tenants[0].settingsJson);
  const stored = settings[INTEGRATION_CATALOG_CONFIG_KEY];
  if (!isCatalogConfig(stored) || stored.categories.length === 0) {
    return getDefaultCatalog();
  }
  return stored;
}

// GET: tenant-facing catalog (only enabled categories + enabled integrations)
export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // tenantId is implied by the authenticated user — included to mirror the
    // project's auth pattern; the catalog itself is global, just filtered.
    const _tenantId = user.tenantId || 'default';

    const catalog = await getGlobalIntegrationCatalog();

    const enabledCategoryKeys = new Set(
      catalog.categories
        .filter((c) => c.enabled)
        .map((c) => c.key),
    );

    const visibleCategories = catalog.categories.filter((c) => c.enabled);
    const visibleIntegrations = catalog.integrations.filter(
      (i) => i.enabled && enabledCategoryKeys.has(i.category),
    );

    return NextResponse.json({
      categories: visibleCategories,
      integrations: visibleIntegrations,
    });
  } catch (error) {
    console.error('[Integrations Catalog GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load integrations catalog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
