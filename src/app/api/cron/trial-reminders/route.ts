import { NextRequest, NextResponse } from 'next/server';
import {
  findTenantsInTrialWindow,
  sendTrialReminder,
  getDaysRemaining,
} from '@/lib/trial-lifecycle';

/**
 * POST /api/cron/trial-reminders
 *
 * Runs daily. Sends trial reminder emails to tenants whose trial is ending:
 *   - ~3 days remaining → trial-ending-3-day reminder
 *   - ~1 day remaining  → trial-ending-1-day reminder (pre-charge)
 *
 * Auth: shared secret in x-cron-secret header or ?secret= query (CRON_SECRET env).
 *
 * Schedule: daily at 9:00 AM tenant-local time.
 *   0 9 * * *  curl -X POST https://your-app/api/cron/trial-reminders \
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

    const results: {
      threeDay: Array<{ tenantId: string; tenantName: string; sent: boolean; error?: string }>;
      oneDay: Array<{ tenantId: string; tenantName: string; sent: boolean; error?: string }>;
    } = {
      threeDay: [],
      oneDay: [],
    };

    // 3-day reminder window
    const threeDayTenants = await findTenantsInTrialWindow(2.5, 3.5);
    for (const tenant of threeDayTenants) {
      const daysRemaining = getDaysRemaining(tenant.trialEndsAt);
      const r = await sendTrialReminder(tenant, 'trial-ending-3-day', daysRemaining);
      results.threeDay.push({
        tenantId: r.tenantId,
        tenantName: r.tenantName,
        sent: r.sent,
        error: r.error,
      });
    }

    // 1-day / pre-charge reminder window
    const oneDayTenants = await findTenantsInTrialWindow(0.5, 1.5);
    for (const tenant of oneDayTenants) {
      const daysRemaining = getDaysRemaining(tenant.trialEndsAt);
      const r = await sendTrialReminder(tenant, 'trial-ending-1-day', daysRemaining);
      results.oneDay.push({
        tenantId: r.tenantId,
        tenantName: r.tenantName,
        sent: r.sent,
        error: r.error,
      });
    }

    return NextResponse.json({
      success: true,
      ranAt: new Date().toISOString(),
      threeDayCount: results.threeDay.length,
      oneDayCount: results.oneDay.length,
      threeDaySent: results.threeDay.filter((r) => r.sent).length,
      oneDaySent: results.oneDay.filter((r) => r.sent).length,
      results,
    });
  } catch (error) {
    console.error('Cron trial-reminders error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Cron run failed', details: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
