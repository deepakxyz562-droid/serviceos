import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getActiveEntitlement, computeRemainingSeconds } from '@/lib/entitlement-service';
import { db } from '@/lib/db';

const safeDate = (d: unknown): string | null => {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d instanceof Date) return d.toISOString();
  try { return new Date(d as string).toISOString(); } catch { return null; }
};

/** Phase B: how long the cached usage value is considered fresh. */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/addons/usage
 * ─────────────────────────────────────────────────────────────────────────
 * Returns the tenant's AI Receptionist usage for the current billing period.
 *
 * Phase B: Optimized read path. Instead of recomputing the entire usage
 * ledger on every dashboard page load, this endpoint reads the cached
 * `cachedRemainingSeconds` value from the entitlement (written by call
 * start/end/reservation settlement). The expensive `computeRemainingSeconds()`
 * (which aggregates the UsageLedger + UsageReservation) only runs when:
 *   - The cache is stale (lastCalculatedAt > 5 minutes ago)
 *   - The cache was never computed (lastCalculatedAt is null)
 *   - The caller passes ?refresh=true (explicit refresh)
 *
 * The cached value is a performance cache only — billing/admission decisions
 * always use the authoritative computation. The dashboard just needs a
 * fast approximate reading.
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
 * Query params:
 *   - ?refresh=true — force a recompute (bypasses the cache)
 *
 * Auth: any authenticated tenant user (read-only).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check for explicit refresh
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Get the active entitlement for AI_RECEPTIONIST (with cache fields)
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

    // ── Phase B: Determine whether to use cached or recompute ──────────
    const cacheAge = entitlement.lastCalculatedAt
      ? Date.now() - new Date(entitlement.lastCalculatedAt as string | Date).getTime()
      : Infinity;
    const cacheStale = cacheAge > CACHE_TTL_MS;
    const useCache = !forceRefresh && !cacheStale && entitlement.cachedRemainingSeconds != null;

    let calc: {
      includedSeconds: number;
      usedSeconds: number;
      reservedSeconds: number;
      remainingSeconds: number;
    };

    if (useCache) {
      // Fast path: read the cached value. No ledger aggregate.
      // Derive usedSeconds from the cache (included - remaining = used + reserved).
      const remaining = entitlement.cachedRemainingSeconds as number;
      const included = entitlement.includedSeconds ?? 0;
      calc = {
        includedSeconds: included,
        remainingSeconds: remaining,
        // usedSeconds is derived (includes both finalized + reserved, which
        // is correct for the dashboard percentage — the authoritative split
        // is only needed for billing/admission, not for the dashboard display)
        usedSeconds: Math.max(0, included - remaining),
        // reservedSeconds is not separately cached — set to 0 for the cached
        // path. The activeCalls count below still works correctly.
        reservedSeconds: 0,
      };
    } else {
      // Slow path: recompute from the ledger + reservations
      calc = await computeRemainingSeconds(entitlement.id);
    }

    // Fetch the subscription for status + plan metadata (parallel with nothing —
    // this is the only remaining DB query after the cache optimization)
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

    const includedMinutes = Math.round(calc.includedSeconds / 60);
    const usedMinutes = Math.round(calc.usedSeconds / 60);
    const remainingMinutes = Math.max(0, includedMinutes - usedMinutes);
    const usedPercent =
      calc.includedSeconds > 0
        ? Math.round((calc.usedSeconds / calc.includedSeconds) * 100)
        : 0;
    const remainingPercent = Math.max(0, 100 - usedPercent);

    // Count active (in-progress) calls for concurrency display
    let activeCalls = 0;
    try {
      const activeCallsCount = await db.usageReservation.count({
        where: {
          tenantId: user.tenantId,
          status: 'ACTIVE',
        },
      });
      activeCalls = typeof activeCallsCount === 'number' ? activeCallsCount : 0;
    } catch {
      activeCalls = 0;
    }

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
      activeCalls,
      maxConcurrentCalls: entitlement.maxConcurrentCalls,
      maxCallDurationSeconds: entitlement.maxCallDurationSeconds,
      includedNumbers: entitlement.includedNumbers,
      // Billing period
      periodStart: safeDate(entitlement.periodStart),
      periodEnd: safeDate(entitlement.periodEnd),
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
      // Phase B: indicate whether the response came from cache
      cached: useCache,
    });
  } catch (error) {
    console.error('[GET /api/addons/usage] error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
