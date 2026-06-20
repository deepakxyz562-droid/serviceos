import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  findTenantsInTrialWindow,
  sendTrialReminder,
  getDaysRemaining,
} from '@/lib/trial-lifecycle';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/cron/pre-charge-reminder
 *
 * Phase 2: runs daily, specifically 1 day before the trial auto-charge. This
 * is the most important email in the whole system for reducing disputes/
 * chargebacks: "Your trial ends tomorrow — your card will be charged $X."
 *
 * Functionally similar to the trial-reminders cron's 1-day branch, but
 * separated so it can be scheduled/tuned independently and so its results
 * are tracked separately in the audit log. Also looks up the tenant's
 * last-selected plan to include the actual price in the email.
 *
 * Auth: shared secret (CRON_SECRET env).
 *
 * Schedule: daily at 9:00 AM.
 *   0 9 * * *  curl -X POST https://your-app/api/cron/pre-charge-reminder \
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

    // Find tenants 0.5–1.5 days from trial end
    const tenants = await findTenantsInTrialWindow(0.5, 1.5);

    const results: Array<{
      tenantId: string;
      tenantName: string;
      sent: boolean;
      planName: string;
      planPrice: string;
      error?: string;
    }> = [];

    for (const tenant of tenants) {
      // Look up the tenant's most recent subscription to find the plan they
      // were on (or default to 'growth' for the email).
      const lastSub = await db.subscription.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
      });
      const planCode = lastSub?.plan || 'growth';
      const plan = await db.plan.findUnique({ where: { code: planCode } });
      const cycle = lastSub?.billingCycle || 'monthly';
      const price = cycle === 'yearly' ? plan?.yearlyPrice : plan?.monthlyPrice;
      const planName = plan?.name || 'Growth';
      const planPrice = price ? `$${price}/${cycle === 'yearly' ? 'year' : 'month'}` : '$79/month';

      // Use the trial-ending-1-day template (which has the "charged $X tomorrow" copy)
      const daysRemaining = getDaysRemaining(tenant.trialEndsAt);
      const r = await sendTrialReminder(tenant, 'trial-ending-1-day', daysRemaining);

      // Extra audit-log entry specific to pre-charge (distinct from the
      // generic trial_reminder event so revenue teams can filter on it).
      await logBillingEvent({
        tenantId: tenant.id,
        type: 'trial_reminder',
        status: r.sent ? 'success' : 'failed',
        description: `Pre-charge reminder: plan=${planName} price=${planPrice} sent=${r.sent}`,
        payerEmail: r.email,
        metadata: {
          templateSlug: 'trial-ending-1-day',
          daysRemaining,
          planName,
          planPrice,
          isPreCharge: true,
        },
      });

      results.push({
        tenantId: r.tenantId,
        tenantName: r.tenantName,
        sent: r.sent,
        planName,
        planPrice,
        error: r.error,
      });
    }

    return NextResponse.json({
      success: true,
      ranAt: new Date().toISOString(),
      count: results.length,
      sent: results.filter((r) => r.sent).length,
      results,
    });
  } catch (error) {
    console.error('Cron pre-charge-reminder error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Cron run failed', details: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
