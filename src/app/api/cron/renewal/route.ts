import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/cron/renewal
 *
 * Runs daily. Two responsibilities:
 *
 * 1. Apply scheduled downgrades: any subscription with pendingDowngradeAt <= now
 *    gets its plan downgraded to pendingDowngradePlan, limits updated, and the
 *    pending fields cleared. Logs a 'downgrade_applied' BillingEvent.
 *
 * 2. (Future / PayPal Subscriptions API) Auto-renew active subscriptions whose
 *    endDate has passed. With PayPal Subscriptions API (Phase 3), PayPal
 *    handles the actual charge — this cron just needs to extend the endDate
 *    on our side after receiving the BILLING.SUBSCRIPTION.ACTIVATED webhook.
 *    For now (PayPal Orders API / one-time charges), renewal is manual: the
 *    user re-checks-out via the Subscription page.
 *
 * Auth: shared secret (CRON_SECRET env).
 *
 * Schedule: daily at 9:10 AM.
 *   10 9 * * *  curl -X POST https://your-app/api/cron/renewal \
 *              -H "x-cron-secret: $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.CRON_SECRET || 'serviceos-cron-dev';
    const providedSecret =
      request.headers.get('x-cron-secret') ||
      new URL(request.url).searchParams.get('secret') ||
      '';
    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // ─── 1. Apply scheduled downgrades ────────────────────────────────
    const dueDowngrades = await db.subscription.findMany({
      where: {
        pendingDowngradePlan: { not: null },
        pendingDowngradeAt: { lte: now },
      },
    });

    const downgradeResults: Array<{
      subscriptionId: string;
      tenantId: string;
      fromPlan: string;
      toPlan: string;
      applied: boolean;
      error?: string;
    }> = [];

    for (const sub of dueDowngrades) {
      try {
        const newPlanCode = sub.pendingDowngradePlan!;
        const newCycle = sub.pendingDowngradeCycle || sub.billingCycle;
        const newPlan = await db.plan.findUnique({ where: { code: newPlanCode } });

        const oldPlanCode = sub.plan;
        const price = newCycle === 'yearly' ? newPlan?.yearlyPrice ?? 0 : newPlan?.monthlyPrice ?? 0;

        // Extend endDate by one more cycle
        const newEndDate = new Date(now);
        if (newCycle === 'yearly') {
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        } else {
          newEndDate.setMonth(newEndDate.getMonth() + 1);
        }

        await db.subscription.update({
          where: { id: sub.id },
          data: {
            plan: newPlanCode,
            billingCycle: newCycle,
            amount: price,
            maxUsers: newPlan?.maxUsers ?? sub.maxUsers,
            maxJobs: newPlan?.maxJobs ?? sub.maxJobs,
            maxWorkflows: newPlan?.maxWorkflows ?? sub.maxWorkflows,
            endDate: newEndDate,
            pendingDowngradePlan: null,
            pendingDowngradeAt: null,
            pendingDowngradeCycle: null,
          },
        });

        // Sync tenant
        await db.tenant.update({
          where: { id: sub.tenantId },
          data: {
            plan: newPlanCode,
            planEndsAt: newEndDate,
          },
        });

        await logBillingEvent({
          tenantId: sub.tenantId,
          subscriptionId: sub.id,
          type: 'downgrade_applied',
          status: 'success',
          amount: price,
          description: `Downgrade applied: ${oldPlanCode} → ${newPlanCode} (${newCycle})`,
          metadata: { fromPlan: oldPlanCode, toPlan: newPlanCode, cycle: newCycle },
        });

        downgradeResults.push({
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          fromPlan: oldPlanCode,
          toPlan: newPlanCode,
          applied: true,
        });
      } catch (err) {
        downgradeResults.push({
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          fromPlan: sub.plan,
          toPlan: sub.pendingDowngradePlan || '?',
          applied: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      ranAt: now.toISOString(),
      downgradesApplied: downgradeResults.filter((r) => r.applied).length,
      downgradesFailed: downgradeResults.filter((r) => !r.applied).length,
      downgradeResults,
      // Note: auto-renewal charges are handled by PayPal Subscriptions API
      // webhooks (Phase 3) — not by this cron. This cron only extends endDate
      // after the webhook confirms a successful recurring payment.
    });
  } catch (error) {
    console.error('Cron renewal error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Cron run failed', details: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
