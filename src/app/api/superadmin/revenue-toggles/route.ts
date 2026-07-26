import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { seedRevenueFeatureToggles } from '@/lib/revenue-toggles';

/**
 * GET /api/superadmin/revenue-toggles
 * Lists all RevenueFeatureToggle rows. Seeds defaults first if the table is empty.
 * SuperAdmin only.
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    let toggles = await db.revenueFeatureToggle.findMany({
      orderBy: { featureKey: 'asc' },
    });

    // If empty, seed defaults from REVENUE_FEATURE_DEFS via the shared helper.
    if (toggles.length === 0) {
      try {
        await seedRevenueFeatureToggles();
      } catch (seedError) {
        console.error('[SuperAdmin Revenue Toggles GET] Seed failed:', seedError);
      }
      toggles = await db.revenueFeatureToggle.findMany({
        orderBy: { featureKey: 'asc' },
      });
    }

    // Parse JSON fields for client convenience
    const formatted = toggles.map((t) => {
      let pricing: unknown = {};
      let config: unknown = {};
      try {
        pricing = t.pricingJson ? JSON.parse(t.pricingJson) : {};
      } catch {
        /* ignore */
      }
      try {
        config = t.configJson ? JSON.parse(t.configJson) : {};
      } catch {
        /* ignore */
      }
      return {
        ...t,
        pricingJson: pricing,
        configJson: config,
      };
    });

    return NextResponse.json({ toggles: formatted });
  } catch (error) {
    console.error('[SuperAdmin Revenue Toggles GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue toggles' }, { status: 500 });
  }
}

/**
 * PATCH /api/superadmin/revenue-toggles
 * Update a single RevenueFeatureToggle.
 * Body: { featureKey, enabled?, pricingJson?, configJson?, perTenantOverride?, defaultForNewTenants?, displayName?, description? }
 * SuperAdmin only.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { featureKey, enabled, pricingJson, configJson, perTenantOverride, defaultForNewTenants, displayName, description } = body;

    if (!featureKey || typeof featureKey !== 'string') {
      return NextResponse.json({ error: 'featureKey is required' }, { status: 400 });
    }

    // Build update payload from provided fields only
    const update: Record<string, unknown> = {};
    if (typeof enabled === 'boolean') update.enabled = enabled;
    if (typeof perTenantOverride === 'boolean') update.perTenantOverride = perTenantOverride;
    if (typeof defaultForNewTenants === 'boolean') update.defaultForNewTenants = defaultForNewTenants;
    if (typeof displayName === 'string') update.displayName = displayName;
    if (typeof description === 'string') update.description = description;
    if (pricingJson !== undefined) {
      update.pricingJson = typeof pricingJson === 'string' ? pricingJson : JSON.stringify(pricingJson ?? {});
    }
    if (configJson !== undefined) {
      update.configJson = typeof configJson === 'string' ? configJson : JSON.stringify(configJson ?? {});
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    const existing = await db.revenueFeatureToggle.findUnique({ where: { featureKey } });
    if (!existing) {
      return NextResponse.json({ error: `Revenue toggle '${featureKey}' not found` }, { status: 404 });
    }

    const updated = await db.revenueFeatureToggle.update({
      where: { featureKey },
      data: update,
    });

    let parsedPricing: unknown = {};
    let parsedConfig: unknown = {};
    try {
      parsedPricing = updated.pricingJson ? JSON.parse(updated.pricingJson) : {};
    } catch {
      /* ignore */
    }
    try {
      parsedConfig = updated.configJson ? JSON.parse(updated.configJson) : {};
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      success: true,
      toggle: { ...updated, pricingJson: parsedPricing, configJson: parsedConfig },
    });
  } catch (error) {
    console.error('[SuperAdmin Revenue Toggles PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update revenue toggle' }, { status: 500 });
  }
}
