import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getChangeDirection } from '@/lib/proration';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/subscriptions/downgrade
 *
 * Phase 3: Schedule a downgrade to take effect at the next renewal date.
 * Does NOT change the current plan immediately — the user keeps their current
 * plan + limits until their renewal date, at which point the renewal cron
 * applies the downgrade (see /api/cron/renewal).
 *
 * Body:
 *   - plan: 'starter' | 'growth' | 'pro'  (the target lower plan)
 *   - billingCycle: 'monthly' | 'yearly'  (cycle for the downgraded plan)
 *
 * Auth: owner only.
 *
 * Returns:
 *   - 200 with { success, pendingDowngradePlan, pendingDowngradeAt }
 *   - 400 if the requested plan is not a downgrade (use the regular upgrade
 *     flow for upgrades — POST /api/paypal/capture-order)
 *   - 404 if no active subscription exists
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can manage subscriptions' },
        { status: 403 }
      );
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const body = await request.json();
    const { plan: newPlanCode, billingCycle } = body;

    if (!newPlanCode) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    const validPlans = ['starter', 'growth', 'pro'];
    if (!validPlans.includes(newPlanCode)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` },
        { status: 400 }
      );
    }

    // Find current active subscription
    const currentSub = await db.subscription.findFirst({
      where: { tenantId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentSub) {
      return NextResponse.json(
        { error: 'No active subscription found. Upgrade first.' },
        { status: 404 }
      );
    }

    // Verify this is actually a downgrade
    const direction = await getChangeDirection(currentSub.plan, newPlanCode);
    if (direction !== 'downgrade') {
      return NextResponse.json(
        {
          error: `${newPlanCode} is not a downgrade from ${currentSub.plan}. Use the upgrade flow (POST /api/paypal/capture-order) for upgrades.`,
          direction,
        },
        { status: 400 }
      );
    }

    const newCycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const effectiveDate = currentSub.endDate ?? new Date();

    // Schedule the downgrade
    await db.subscription.update({
      where: { id: currentSub.id },
      data: {
        pendingDowngradePlan: newPlanCode,
        pendingDowngradeAt: effectiveDate,
        pendingDowngradeCycle: newCycle,
      },
    });

    // Audit log
    await logBillingEvent({
      tenantId,
      subscriptionId: currentSub.id,
      type: 'downgrade_scheduled',
      status: 'success',
      description: `Downgrade scheduled: ${currentSub.plan} → ${newPlanCode} (${newCycle}), effective ${effectiveDate.toISOString().split('T')[0]}`,
      metadata: {
        fromPlan: currentSub.plan,
        toPlan: newPlanCode,
        cycle: newCycle,
        effectiveDate: effectiveDate.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      pendingDowngradePlan: newPlanCode,
      pendingDowngradeAt: effectiveDate.toISOString(),
      pendingDowngradeCycle: newCycle,
      message: `Downgrade to ${newPlanCode} scheduled for ${effectiveDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Your current plan remains active until then.`,
    });
  } catch (error) {
    console.error('Schedule downgrade error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule downgrade' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subscriptions/downgrade
 *
 * Cancel a previously-scheduled downgrade. The user keeps their current plan
 * and the pending downgrade is cleared.
 */
export async function DELETE() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can manage subscriptions' },
        { status: 403 }
      );
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const currentSub = await db.subscription.findFirst({
      where: { tenantId, pendingDowngradePlan: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentSub) {
      return NextResponse.json(
        { error: 'No pending downgrade to cancel' },
        { status: 404 }
      );
    }

    const cancelledPlan = currentSub.pendingDowngradePlan;

    await db.subscription.update({
      where: { id: currentSub.id },
      data: {
        pendingDowngradePlan: null,
        pendingDowngradeAt: null,
        pendingDowngradeCycle: null,
      },
    });

    await logBillingEvent({
      tenantId,
      subscriptionId: currentSub.id,
      type: 'downgrade_scheduled',
      status: 'failed', // using 'failed' to indicate cancellation; description clarifies
      description: `Pending downgrade to ${cancelledPlan} cancelled. Staying on ${currentSub.plan}.`,
      metadata: { cancelledDowngradeTo: cancelledPlan, keptPlan: currentSub.plan },
    });

    return NextResponse.json({
      success: true,
      message: `Pending downgrade to ${cancelledPlan} cancelled. You'll stay on ${currentSub.plan}.`,
    });
  } catch (error) {
    console.error('Cancel downgrade error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel downgrade' },
      { status: 500 }
    );
  }
}
