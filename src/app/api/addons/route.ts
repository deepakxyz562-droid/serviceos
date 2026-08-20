import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { listAvailableAddons } from '@/lib/addon-billing-service';

/**
 * GET /api/addons
 * ─────────────────────────────────────────────────────────────────────────
 * Returns the add-on catalog: all active AddonProducts with their active
 * AddonPlans. Used by the tenant UI to display available add-ons + pricing.
 *
 * Auth: any authenticated tenant user (read-only).
 *
 * NOTE: This does NOT include `creemProductId` / `creemPriceId` in the
 * response — those are internal integration fields, not shown to tenants.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const addons = await listAvailableAddons();

    const serialized = addons.map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      description: product.description,
      plans: product.plans.map((plan) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        billingCycle: plan.billingCycle,
        includedMinutes: Math.floor(plan.includedSeconds / 60),
        includedSeconds: plan.includedSeconds,
        maxCallDurationSeconds: plan.maxCallDurationSeconds,
        maxConcurrentCalls: plan.maxConcurrentCalls,
        includedNumbers: plan.includedNumbers,
      })),
    }));

    return NextResponse.json({ addons: serialized });
  } catch (error) {
    console.error('[GET /api/addons] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch add-on catalog' },
      { status: 500 },
    );
  }
}
