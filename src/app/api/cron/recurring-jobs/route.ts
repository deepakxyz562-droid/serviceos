import { NextRequest, NextResponse } from 'next/server';
import { processDueRecurringJobSchedules } from '@/lib/recurring-jobs';

/**
 * POST /api/cron/recurring-jobs
 *
 * Cron runner that processes all due recurring job schedules.
 * For each schedule whose `nextRunAt <= now`, generates a new Job +
 * JobVisit, advances the schedule, and writes an ActivityLog entry.
 *
 * This endpoint is meant to be called by an external scheduler (Vercel Cron,
 * GitHub Actions, system cron, etc.). It's protected by a shared secret
 * passed in the `x-cron-secret` header (or `?secret=` query param), which
 * must match the CRON_SECRET env var (falls back to a dev default if unset).
 *
 * Example cron (every day at 6 AM):
 *   0 6 * * *  curl -X POST https://your-app/api/cron/recurring-jobs \
 *              -H "x-cron-secret: $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // ─── Auth: shared secret ───────────────────────────────────────────
    const expectedSecret = process.env.CRON_SECRET || 'serviceos-cron-dev';
    const providedSecret =
      request.headers.get('x-cron-secret') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      new URL(request.url).searchParams.get('secret') ||
      '';

    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── Process due recurring jobs ────────────────────────────────────
    const result = await processDueRecurringJobSchedules();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron recurring jobs error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Cron run failed', details: message }, { status: 500 });
  }
}

// Also allow GET for easy browser/scheduler testing
export async function GET(request: NextRequest) {
  return POST(request);
}
