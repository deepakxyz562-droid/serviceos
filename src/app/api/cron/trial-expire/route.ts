import { NextRequest, NextResponse } from 'next/server';
import { findExpiredTrials, expireTenantTrial, sendTrialReminder } from '@/lib/trial-lifecycle';

/**
 * POST /api/cron/trial-expire
 *
 * Runs daily. Finds all tenants whose trial has expired (trialEndsAt < now)
 * but planStatus is still 'trial', and:
 *   1. Flips planStatus to 'expired' (triggers the paywall middleware → /billing)
 *   2. Sends the trial-expired email
 *   3. Logs a BillingEvent of type 'trial_expired'
 *
 * Auth: shared secret (CRON_SECRET env).
 *
 * Schedule: daily at 9:05 AM (5 min after the reminders cron).
 *   5 9 * * *  curl -X POST https://your-app/api/cron/trial-expire \
 *             -H "x-cron-secret: $CRON_SECRET"
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

    const expiredTenants = await findExpiredTrials();
    const results: Array<{
      tenantId: string;
      tenantName: string;
      expired: boolean;
      emailSent: boolean;
      error?: string;
    }> = [];

    for (const tenant of expiredTenants) {
      try {
        // 1. Flip planStatus → 'expired' (paywall middleware will now redirect)
        await expireTenantTrial(tenant.id);

        // 2. Send the trial-expired email
        const r = await sendTrialReminder(tenant, 'trial-expired', 0);

        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          expired: true,
          emailSent: r.sent,
          error: r.error,
        });
      } catch (err) {
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          expired: false,
          emailSent: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      ranAt: new Date().toISOString(),
      expiredCount: results.length,
      emailsSent: results.filter((r) => r.emailSent).length,
      results,
    });
  } catch (error) {
    console.error('Cron trial-expire error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Cron run failed', details: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
