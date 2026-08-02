import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { seedRevenueFeatureToggles } from '@/lib/revenue-toggles';

interface RouteContext {
  params: Promise<{ featureKey: string }>;
}

/**
 * GET /api/superadmin/revenue-toggles/[featureKey]
 * Returns a single RevenueFeatureToggle by its featureKey.
 * SuperAdmin only.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { featureKey } = await context.params;

    let toggle = await db.revenueFeatureToggle.findUnique({ where: { featureKey } });

    // If not found, attempt to seed defaults (table may be empty) and re-query.
    if (!toggle) {
      try {
        await seedRevenueFeatureToggles();
      } catch (seedError) {
        console.error('[SuperAdmin Revenue Toggles GET single] Seed failed:', seedError);
      }
      toggle = await db.revenueFeatureToggle.findUnique({ where: { featureKey } });
    }

    if (!toggle) {
      return NextResponse.json({ error: `Revenue toggle '${featureKey}' not found` }, { status: 404 });
    }

    let pricing: unknown = {};
    let config: unknown = {};
    try {
      pricing = toggle.pricingJson ? JSON.parse(toggle.pricingJson) : {};
    } catch {
      /* ignore */
    }
    try {
      config = toggle.configJson ? JSON.parse(toggle.configJson) : {};
    } catch {
      /* ignore */
    }

    return NextResponse.json({ toggle: { ...toggle, pricingJson: pricing, configJson: config } });
  } catch (error) {
    console.error('[SuperAdmin Revenue Toggles GET single] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue toggle' }, { status: 500 });
  }
}

/**
 * PATCH /api/superadmin/revenue-toggles/[featureKey]
 * Update a single RevenueFeatureToggle by its featureKey.
 * Body: { enabled?, pricingJson?, configJson?, perTenantOverride?, defaultForNewTenants?, displayName?, description? }
 * SuperAdmin only.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { featureKey } = await context.params;
    const body = await request.json();
    const { enabled, pricingJson, configJson, perTenantOverride, defaultForNewTenants, displayName, description } = body;

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
    console.error('[SuperAdmin Revenue Toggles PATCH single] Error:', error);
    return NextResponse.json({ error: 'Failed to update revenue toggle' }, { status: 500 });
  }
}
