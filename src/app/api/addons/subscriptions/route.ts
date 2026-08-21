import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/addons/subscriptions
 * ─────────────────────────────────────────────────────────────────────────
 * Returns the authenticated tenant's add-on subscriptions (all statuses).
 * Used by the tenant UI to show active/cancelled/expired subscriptions.
 *
 * Auth: any authenticated tenant user (read-only).
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const subscriptions = await db.tenantAddonSubscription.findMany({
      where: { tenantId: user.tenantId },
      include: {
        // Phase 9.8: Add addonProduct at the TOP LEVEL so it's resolved directly
        // from TenantAddonSubscription.addonProductId → AddonProduct.
        // This is more reliable than the nested addonPlan.addonProduct path
        // (which depends on the AddonPlan row's addonProductId being non-null
        // and matching). The TenantAddonSubscription schema guarantees
        // addonProductId is non-nullable, so this always resolves.
        addonProduct: {
          select: { id: true, code: true, name: true },
        },
        addonPlan: {
          include: {
            // Kept as a fallback — if the direct resolution fails for any reason,
            // the nested path provides a second chance.
            addonProduct: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Phase 9.8 DEBUG: log what resolveIncludes actually returned so we can
    // see if addonProduct is null or populated. Safe — no secrets, just
    // structural info (field presence + addonProduct.code).
    console.log('[addons/subscriptions] raw query results:', JSON.stringify(
      subscriptions.map((s: Record<string, unknown>) => ({
        id: s.id,
        status: s.status,
        addonProductId: s.addonProductId,
        addonPlanId: s.addonPlanId,
        hasAddonProduct: !!s.addonProduct,
        addonProductCode: (s.addonProduct as Record<string, unknown> | null)?.code || null,
        hasAddonPlan: !!s.addonPlan,
        addonPlanCode: (s.addonPlan as Record<string, unknown> | null)?.code || null,
        hasNestedAddonProduct: !!((s.addonPlan as Record<string, unknown> | null)?.addonProduct),
        nestedAddonProductCode: ((s.addonPlan as Record<string, unknown> | null)?.addonProduct as Record<string, unknown> | null)?.code || null,
      })),
      null, 2,
    ));

    const serialized = subscriptions.map((sub) => ({
      id: sub.id,
      status: sub.status,
      addonPlan: {
        id: sub.addonPlan.id,
        code: sub.addonPlan.code,
        name: sub.addonPlan.name,
        price: sub.addonPlan.price,
        currency: sub.addonPlan.currency,
        billingCycle: sub.addonPlan.billingCycle,
        includedMinutes: Math.floor(sub.addonPlan.includedSeconds / 60),
        maxConcurrentCalls: sub.addonPlan.maxConcurrentCalls,
        includedNumbers: sub.addonPlan.includedNumbers,
      },
      addonProduct: sub.addonProduct || sub.addonPlan?.addonProduct,
      currentPeriodStart: sub.currentPeriodStart?.toISOString() || null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      cancelledAt: sub.cancelledAt?.toISOString() || null,
      endedAt: sub.endedAt?.toISOString() || null,
      trialEndsAt: sub.trialEndsAt?.toISOString() || null,
      gracePeriodEndsAt: sub.gracePeriodEndsAt?.toISOString() || null,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    }));

    return NextResponse.json({ subscriptions: serialized });
  } catch (error) {
    console.error('[GET /api/addons/subscriptions] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch add-on subscriptions' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/addons/subscriptions
 * ─────────────────────────────────────────────────────────────────────────
 * Cancel the tenant's add-on subscription.
 *
 * Body: { subscriptionId: string }
 *
 * Marks `cancelAtPeriodEnd = true` — AI continues until `currentPeriodEnd`,
 * then transitions to EXPIRED. Does NOT immediately disable access.
 *
 * Auth: owner only (same gate as PayPal/Creem subscription cancellation).
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can manage subscriptions' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId is required' },
        { status: 400 },
      );
    }

    // Verify the subscription belongs to this tenant
    const subscription = await db.tenantAddonSubscription.findFirst({
      where: { id: subscriptionId, tenantId: user.tenantId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 },
      );
    }

    if (['CANCELLED', 'EXPIRED'].includes(subscription.status)) {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 },
      );
    }

    // Mark cancelAtPeriodEnd — the actual cancellation happens at currentPeriodEnd
    // (or immediately if the period has already ended)
    const now = new Date();
    const periodEnd = subscription.currentPeriodEnd;
    const hasRemainingTime = periodEnd && periodEnd > now;

    if (hasRemainingTime) {
      await db.tenantAddonSubscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          cancelledAt: now,
        },
      });
      console.log(
        `[DELETE /api/addons/subscriptions] ${subscription.id} marked cancelAtPeriodEnd (period ends ${periodEnd!.toISOString()})`,
      );
    } else {
      // Period already ended → immediately EXPIRED
      await db.tenantAddonSubscription.update({
        where: { id: subscription.id },
        data: {
          status: 'EXPIRED',
          cancelledAt: now,
          endedAt: now,
          cancelAtPeriodEnd: false,
        },
      });
      console.log(`[DELETE /api/addons/subscriptions] ${subscription.id} → EXPIRED`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/addons/subscriptions] error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 },
    );
  }
}
