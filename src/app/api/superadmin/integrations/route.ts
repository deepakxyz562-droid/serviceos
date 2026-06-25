import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import {
  getDefaultCatalog,
  INTEGRATION_CATALOG_CONFIG_KEY,
  type IntegrationCatalogConfig,
  type IntegrationCategoryDef,
  type IntegrationDef,
} from '@/lib/integration-catalog';

/**
 * Superadmin route for managing the GLOBAL integration catalog.
 *
 * Storage pattern (mirrors /api/superadmin/menu-items):
 *   - The "live" catalog lives in the first tenant's settingsJson under the
 *     `integrationCatalog` key (see INTEGRATION_CATALOG_CONFIG_KEY).
 *   - On first read, if the key is missing we seed it with getDefaultCatalog()
 *     and persist it so subsequent reads are stable.
 */

// Helper: safely parse settingsJson from a tenant record
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

// Get global integration catalog from the first tenant's settingsJson (seed defaults if missing)
async function getGlobalIntegrationCatalog(): Promise<IntegrationCatalogConfig> {
  const tenants = await db.tenant.findMany({ take: 1 });
  if (!tenants || tenants.length === 0) {
    return getDefaultCatalog();
  }

  const settings = parseSettings(tenants[0].settingsJson);
  const stored = settings[INTEGRATION_CATALOG_CONFIG_KEY];

  if (!isCatalogConfig(stored) || stored.categories.length === 0) {
    // Seed defaults and persist so future reads are stable
    const defaults = getDefaultCatalog();
    await saveGlobalIntegrationCatalog(defaults);
    return defaults;
  }
  return stored;
}

// Save global integration catalog to the first tenant's settingsJson
async function saveGlobalIntegrationCatalog(catalog: IntegrationCatalogConfig): Promise<void> {
  const tenants = await db.tenant.findMany({ take: 1 });
  if (!tenants || tenants.length === 0) {
    throw new Error('No tenants found — cannot save global integration catalog');
  }

  const tenant = tenants[0] as { id: string; settingsJson: unknown };
  const settings = parseSettings(tenant.settingsJson);
  settings[INTEGRATION_CATALOG_CONFIG_KEY] = catalog;

  await db.tenant.update({
    where: { id: tenant.id },
    data: { settingsJson: JSON.stringify(settings) },
  });
}

// Basic validation for category entries
function isValidCategory(c: unknown): c is IntegrationCategoryDef {
  if (!c || typeof c !== 'object') return false;
  const o = c as Record<string, unknown>;
  return typeof o.key === 'string' && o.key.trim().length > 0
    && typeof o.label === 'string' && o.label.trim().length > 0;
}

// Basic validation for integration entries
function isValidIntegration(i: unknown): i is IntegrationDef {
  if (!i || typeof i !== 'object') return false;
  const o = i as Record<string, unknown>;
  return typeof o.key === 'string' && o.key.trim().length > 0
    && typeof o.name === 'string' && o.name.trim().length > 0
    && typeof o.category === 'string' && o.category.trim().length > 0;
}

// GET: Load global integration catalog
export async function GET(_request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const catalog = await getGlobalIntegrationCatalog();
    return NextResponse.json({
      categories: catalog.categories,
      integrations: catalog.integrations,
    });
  } catch (error) {
    console.error('[SuperAdmin Integrations GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load integration catalog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: Save global integration catalog (full replace)
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = await request.json() as { categories?: unknown; integrations?: unknown };

    if (!Array.isArray(body.categories) || !Array.isArray(body.integrations)) {
      return NextResponse.json(
        { error: 'Body must include `categories` and `integrations` arrays' },
        { status: 400 },
      );
    }

    // Validate entries
    const invalidCategory = body.categories.find((c) => !isValidCategory(c));
    if (invalidCategory) {
      return NextResponse.json(
        { error: 'Each category must have a non-empty `key` and `label`' },
        { status: 400 },
      );
    }
    const invalidIntegration = body.integrations.find((i) => !isValidIntegration(i));
    if (invalidIntegration) {
      return NextResponse.json(
        { error: 'Each integration must have a non-empty `key`, `name`, and `category`' },
        { status: 400 },
      );
    }

    const catalog: IntegrationCatalogConfig = {
      categories: body.categories as IntegrationCategoryDef[],
      integrations: body.integrations as IntegrationDef[],
    };

    await saveGlobalIntegrationCatalog(catalog);

    return NextResponse.json({
      categories: catalog.categories,
      integrations: catalog.integrations,
    });
  } catch (error) {
    console.error('[SuperAdmin Integrations PUT] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save integration catalog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
