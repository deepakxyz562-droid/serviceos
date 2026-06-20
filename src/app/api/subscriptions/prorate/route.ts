import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { computeProration, getChangeDirection } from '@/lib/proration';

/**
 * GET /api/subscriptions/prorate?plan=growth
 *
 * Phase 3: Compute the prorated charge for an upgrade from the current plan
 * to the requested plan. Returns a preview — does NOT charge or change the
 * subscription. The actual upgrade happens via POST /api/paypal/capture-order
 * (which charges the full new plan price; the proration is informational and
 * tracked in subscription.lastProrationAmount for audit).
 *
 * Query params:
 *   - plan: target plan code (required)
 *
 * Returns:
 *   - 200 with { direction, proratedAmount, daysRemaining, daysInCycle,
 *                oldPlanPrice, newPlanPrice, newPlanCode }
 *   - 400 if plan is missing or invalid
 *   - 404 if no active subscription
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const newPlanCode = searchParams.get('plan');

    if (!newPlanCode) {
      return NextResponse.json({ error: 'Plan query param is required' }, { status: 400 });
    }

    const validPlans = ['starter', 'growth', 'pro', 'enterprise'];
    if (!validPlans.includes(newPlanCode)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` },
        { status: 400 }
      );
    }

    const currentSub = await db.subscription.findFirst({
      where: { tenantId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentSub) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const direction = await getChangeDirection(currentSub.plan, newPlanCode);
    const proration = await computeProration(currentSub, newPlanCode);

    return NextResponse.json({
      direction, // 'upgrade' | 'downgrade' | 'lateral'
      currentPlan: currentSub.plan,
      newPlan: newPlanCode,
      billingCycle: currentSub.billingCycle,
      ...proration,
    });
  } catch (error) {
    console.error('Proration preview error:', error);
    return NextResponse.json(
      { error: 'Failed to compute proration' },
      { status: 500 }
    );
  }
}
