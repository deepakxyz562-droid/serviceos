import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getActiveEntitlement, computeRemainingSeconds } from '@/lib/entitlement-service';
import { db } from '@/lib/db';

/**
 * GET /api/addons/usage
 * ─────────────────────────────────────────────────────────────────────────
 * Returns the tenant's AI Receptionist usage for the current billing period.
 *
 * This is the SINGLE SOURCE OF TRUTH for the usage UI. The numbers come
 * directly from the immutable UsageLedger + active UsageReservations —
 * NOT from a frontend calculation.
 *
 *   UsageLedger (immutable, finalized)   ─┐
 *                                         ├─→ computeRemainingSeconds() ─→ this API ─→ Tenant UI
 *   UsageReservation (active, in-progress) ┘
 *
 * Returns:
 *   - includedMinutes / usedMinutes / remainingMinutes (human-friendly)
 *   - includedSeconds / usedSeconds / remainingSeconds (exact)
 *   - reservedSeconds (in-progress calls)
 *   - usedPercent + remainingPercent
 *   - plan metadata (maxConcurrentCalls, maxCallDurationSeconds, includedNumbers)
 *   - periodStart / periodEnd
 *   - subscription status
 *
 * If no active entitlement exists (no active subscription), returns
 * { hasEntitlement: false }.
 *
 * Auth: any authenticated tenant user (read-only).
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the active entitlement for AI_RECEPTIONIST
    const entitlement = await getActiveEntitlement(user.tenantId, 'AI_RECEPTIONIST');

    if (!entitlement) {
      return NextResponse.json({
        hasEntitlement: false,
        includedMinutes: 0,
        usedMinutes: 0,
        remainingMinutes: 0,
        usedPercent: 0,
        remainingPercent: 100,
      });
    }

    // Compute the authoritative remaining from the ledger + reservations
    const calc = await computeRemainingSeconds(entitlement.id);

    // Fetch the subscription for status + plan metadata
    const subscription = await db.tenantAddonSubscription.findFirst({
      where: { id: entitlement.tenantAddonSubscriptionId },
      select: {
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        addonPlan: {
          select: {
            code: true,
            name: true,
            price: true,
            currency: true,
            includedSeconds: true,
            maxConcurrentCalls: true,
            maxCallDurationSeconds: true,
            includedNumbers: true,
          },
        },
      },
    });

    const includedMinutes = Math.floor(calc.includedSeconds / 60);
    const usedMinutes = Math.floor(calc.usedSeconds / 60);
    const remainingMinutes = Math.floor(calc.remainingSeconds / 60);
    const usedPercent =
      calc.includedSeconds > 0
        ? Math.round((calc.usedSeconds / calc.includedSeconds) * 100)
        : 0;
    const remainingPercent = Math.max(0, 100 - usedPercent);

    // Count active (in-progress) calls for concurrency display
    const activeCallsCount = await db.usageReservation.aggregate({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
      },
      _count: { id: true },
    });

    return NextResponse.json({
      hasEntitlement: true,
      entitlementId: entitlement.id,
      // Human-friendly (minutes)
      includedMinutes,
      usedMinutes,
      remainingMinutes,
      // Exact (seconds)
      includedSeconds: calc.includedSeconds,
      usedSeconds: calc.usedSeconds,
      reservedSeconds: calc.reservedSeconds,
      remainingSeconds: calc.remainingSeconds,
      // Percentages
      usedPercent,
      remainingPercent,
      // Concurrency
      activeCalls: activeCallsCount._count.id,
      maxConcurrentCalls: entitlement.maxConcurrentCalls,
      maxCallDurationSeconds: entitlement.maxCallDurationSeconds,
      includedNumbers: entitlement.includedNumbers,
      // Billing period
      periodStart: entitlement.periodStart.toISOString(),
      periodEnd: entitlement.periodEnd.toISOString(),
      // Subscription
      subscriptionStatus: subscription?.status || null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      plan: subscription
        ? {
            code: subscription.addonPlan.code,
            name: subscription.addonPlan.name,
            price: subscription.addonPlan.price,
            currency: subscription.addonPlan.currency,
          }
        : null,
    });
  } catch (error) {
    console.error('[GET /api/addons/usage] error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
