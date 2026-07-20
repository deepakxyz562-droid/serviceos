import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logBillingEvent } from '@/lib/billing-events';
import { getPayPalSubscription, isPayPalConfigured } from '@/lib/paypal';

/**
 * POST /api/cron/renewal
 *
 * Runs daily. Three responsibilities:
 *
 * 1. Apply scheduled downgrades: any subscription with pendingDowngradeAt <= now
 *    gets its plan downgraded to pendingDowngradePlan, limits updated, and the
 *    pending fields cleared. Logs a 'downgrade_applied' BillingEvent.
 *
 * 2. Defensive PayPal status sync: for active PayPal RECURRING subscriptions
 *    whose endDate has passed, fetch the current status from PayPal. If still
 *    ACTIVE, PayPal likely already charged the customer and sent a
 *    PAYMENT.SALE.COMPLETED webhook (which extends endDate). If our endDate is
 *    still stale (webhook missed / delayed), extend it here. If PayPal says
 *    SUSPENDED/CANCELLED/EXPIRED, sync the local status accordingly.
 *
 * 3. Mark expired: any non-recurring subscription (one-time / trial) whose
 *    endDate passed and is still 'active' → mark 'expired'. This is the
 *    one-time-payment path where renewal is manual.
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
    const paypalReady = isPayPalConfigured();

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

    // ─── 2. Defensive PayPal recurring status sync ───────────────────
    // Find active recurring subscriptions past their endDate. PayPal should
    // have charged + sent a webhook by now. If not, we sync manually.
    const syncResults: Array<{
      subscriptionId: string;
      tenantId: string;
      paypalStatus: string;
      action: string;
    }> = [];

    if (paypalReady) {
      const dueRecurring = await db.subscription.findMany({
        where: {
          status: 'active',
          paymentProvider: 'paypal',
          paypalSubscriptionId: { not: null },
          endDate: { lt: now },
        },
        take: 50, // cap per run
      });

      for (const sub of dueRecurring) {
        try {
          const ppSub = await getPayPalSubscription(sub.paypalSubscriptionId!);
          const ppStatus = (ppSub.status as string) || 'UNKNOWN';
          const statusMap: Record<string, string> = {
            ACTIVE: 'active',
            SUSPENDED: 'suspended',
            CANCELLED: 'cancelled',
            EXPIRED: 'expired',
          };
          const localStatus = statusMap[ppStatus];

          if (ppStatus === 'ACTIVE') {
            // PayPal is still charging — extend our endDate by one cycle from
            // the stale endDate (the webhook handler extends from the last
            // known endDate too, so this is consistent). If the webhook
            // already ran, our endDate would already be in the future and
            // this subscription wouldn't be in dueRecurring.
            const newEndDate = new Date(sub.endDate);
            if (sub.billingCycle === 'yearly') {
              newEndDate.setFullYear(newEndDate.getFullYear() + 1);
            } else {
              newEndDate.setMonth(newEndDate.getMonth() + 1);
            }
            await db.subscription.update({
              where: { id: sub.id },
              data: { endDate: newEndDate, status: 'active' },
            });
            await db.tenant.update({
              where: { id: sub.tenantId },
              data: { planEndsAt: newEndDate, planStatus: 'active' },
            });
            syncResults.push({
              subscriptionId: sub.id,
              tenantId: sub.tenantId,
              paypalStatus: ppStatus,
              action: 'endDate_extended (webhook may have been missed)',
            });
          } else if (localStatus && localStatus !== sub.status) {
            // PayPal suspended/cancelled/expired — sync local status
            await db.subscription.update({
              where: { id: sub.id },
              data: { status: localStatus },
            });
            await db.tenant.update({
              where: { id: sub.tenantId },
              data: { planStatus: localStatus === 'active' ? 'active' : localStatus },
            });
            await logBillingEvent({
              tenantId: sub.tenantId,
              subscriptionId: sub.id,
              type: localStatus === 'cancelled' ? 'cancel' : 'fail',
              status: localStatus === 'cancelled' ? 'success' : 'failed',
              amount: sub.amount,
              description: `PayPal status sync (cron): ${ppStatus} → local ${localStatus}`,
              paymentProvider: 'paypal',
              metadata: { paypalSubscriptionId: sub.paypalSubscriptionId, paypalStatus: ppStatus },
            });
            syncResults.push({
              subscriptionId: sub.id,
              tenantId: sub.tenantId,
              paypalStatus: ppStatus,
              action: `status_synced → ${localStatus}`,
            });
          } else {
            syncResults.push({
              subscriptionId: sub.id,
              tenantId: sub.tenantId,
              paypalStatus: ppStatus,
              action: 'no_change',
            });
          }
        } catch (err) {
          syncResults.push({
            subscriptionId: sub.id,
            tenantId: sub.tenantId,
            paypalStatus: 'ERROR',
            action: err instanceof Error ? err.message.slice(0, 100) : String(err).slice(0, 100),
          });
        }
      }
    }

    // ─── 3. Mark expired one-time / trial subscriptions ───────────────
    // Non-recurring subscriptions (no paypalSubscriptionId) whose endDate
    // passed and are still 'active' or 'trial' → mark 'expired'.
    const dueExpiry = await db.subscription.findMany({
      where: {
        status: { in: ['active', 'trial'] },
        endDate: { lt: now },
        paypalSubscriptionId: null,
      },
      take: 100,
    });
    let expiredCount = 0;
    for (const sub of dueExpiry) {
      try {
        await db.subscription.update({
          where: { id: sub.id },
          data: { status: 'expired' },
        });
        await db.tenant.update({
          where: { id: sub.tenantId },
          data: { planStatus: sub.status === 'trial' ? 'trial_expired' : 'expired' },
        });
        expiredCount++;
      } catch {
        // best-effort
      }
    }

    return NextResponse.json({
      success: true,
      ranAt: now.toISOString(),
      downgradesApplied: downgradeResults.filter((r) => r.applied).length,
      downgradesFailed: downgradeResults.filter((r) => !r.applied).length,
      downgradeResults,
      recurringSynced: syncResults.length,
      syncResults,
      expiredMarked: expiredCount,
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
