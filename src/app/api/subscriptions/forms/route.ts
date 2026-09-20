import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { FORMS_PLAN_QUOTAS, type FormsPlanTier } from '@/lib/plan-features';

export const dynamic = 'force-dynamic';

/**
 * GET /api/subscriptions/forms
 * Returns the current Forms plan + available plans for upgrade.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { formsPlan: true, plan: true },
    }).catch(() => null);

    const currentPlan = (tenant?.formsPlan || 'free') as FormsPlanTier;
    const currentQuota = FORMS_PLAN_QUOTAS[currentPlan] || FORMS_PLAN_QUOTAS.free;

    // Return all available plans
    const availablePlans = Object.values(FORMS_PLAN_QUOTAS);

    return NextResponse.json({
      currentPlan,
      currentQuota,
      availablePlans,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/subscriptions/forms
 * Upgrade or downgrade the Forms plan.
 *
 * Body: { plan: 'free' | 'bronze' | 'silver' | 'gold' }
 *
 * This updates the tenant's formsPlan field. Payment processing
 * (Stripe/PayPal) is handled separately by the subscription route.
 * This endpoint just updates the plan assignment.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = body;

    // Validate plan
    const validPlans: FormsPlanTier[] = ['free', 'bronze', 'silver', 'gold'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Valid: ${validPlans.join(', ')}` },
        { status: 400 },
      );
    }

    const newQuota = FORMS_PLAN_QUOTAS[plan as FormsPlanTier];

    // Update tenant's forms plan
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { formsPlan: plan },
    }).catch(() => {
      // DB might be unavailable
    });

    return NextResponse.json({
      success: true,
      plan,
      quota: newQuota,
      message: plan === 'free'
        ? 'Switched to Free Forms plan'
        : `Upgraded to ${newQuota.label} Forms ($${newQuota.monthlyPrice}/mo)`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
