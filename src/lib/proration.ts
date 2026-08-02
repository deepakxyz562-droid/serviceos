/**
 * Proration + downgrade-scheduling helpers (Phase 3).
 *
 * Proration (upgrades): when a user upgrades mid-cycle, charge the difference
 * for the remaining days:
 *   proratedAmount = (newPlanPrice - oldPlanPrice) * daysRemaining / daysInCycle
 *
 * Downgrade scheduling: when a user downgrades mid-cycle, do NOT charge or
 * change immediately. Instead, record the requested lower plan + the date it
 * takes effect (= current renewal date). The renewal cron applies it on the
 * next renewal.
 *
 * Both helpers are pure (no DB writes) — callers persist the results.
 */
import { db } from '@/lib/db';

export interface ProrationResult {
  proratedAmount: number;
  daysRemaining: number;
  daysInCycle: number;
  oldPlanPrice: number;
  newPlanPrice: number;
}

/**
 * Compute the prorated charge for an upgrade from oldPlan to newPlan,
 * given the current subscription's startDate + endDate + billingCycle.
 *
 * Returns proratedAmount=0 for downgrades (downgrades are scheduled, not
 * charged) or when the new plan is the same/cheaper.
 */
export async function computeProration(
  subscription: {
    plan: string;
    billingCycle: string;
    startDate: Date;
    endDate: Date | null;
  },
  newPlanCode: string
): Promise<ProrationResult> {
  const oldPlan = await db.plan.findUnique({ where: { code: subscription.plan } });
  const newPlan = await db.plan.findUnique({ where: { code: newPlanCode } });

  const oldPrice = subscription.billingCycle === 'yearly'
    ? (oldPlan?.yearlyPrice ?? 0)
    : (oldPlan?.monthlyPrice ?? 0);
  const newPrice = subscription.billingCycle === 'yearly'
    ? (newPlan?.yearlyPrice ?? 0)
    : (newPlan?.monthlyPrice ?? 0);

  const now = new Date();
  const endDate = subscription.endDate ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const daysInCycle = Math.max(
    1,
    Math.round((endDate.getTime() - subscription.startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const daysRemaining = Math.max(
    0,
    Math.round((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  // No proration for downgrades or same-tier changes.
  if (newPrice <= oldPrice) {
    return {
      proratedAmount: 0,
      daysRemaining,
      daysInCycle,
      oldPlanPrice: oldPrice,
      newPlanPrice: newPrice,
    };
  }

  const proratedAmount = Math.round(
    ((newPrice - oldPrice) * daysRemaining / daysInCycle) * 100
  ) / 100;

  return {
    proratedAmount,
    daysRemaining,
    daysInCycle,
    oldPlanPrice: oldPrice,
    newPlanPrice: newPrice,
  };
}

/**
 * Determine whether changing from currentPlanCode to newPlanCode is an
 * upgrade, downgrade, or lateral move. Uses sortOrder from the Plan catalog.
 */
export async function getChangeDirection(
  currentPlanCode: string,
  newPlanCode: string
): Promise<'upgrade' | 'downgrade' | 'lateral'> {
  const plans = await db.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  const currentSort = plans.find((p) => p.code === currentPlanCode)?.sortOrder ?? 0;
  const newSort = plans.find((p) => p.code === newPlanCode)?.sortOrder ?? 0;
  if (newSort > currentSort) return 'upgrade';
  if (newSort < currentSort) return 'downgrade';
  return 'lateral';
}
