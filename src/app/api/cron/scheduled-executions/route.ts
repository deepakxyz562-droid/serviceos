import { NextRequest, NextResponse } from 'next/server';
import { processDueScheduledExecutions } from '@/lib/scheduled-executions';

/**
 * POST /api/cron/scheduled-executions
 *
 * Cron runner that processes all due ScheduledExecution rows
 * (status='pending' AND dueAt <= now). Each row represents a delayed
 * workflow automation (e.g. "1 day after quote sent, send follow-up email")
 * that was persisted to the DB instead of using setTimeout (which dies on
 * serverless cold-starts).
 *
 * For each due row, the processor:
 *   1. Parses actionsJson + contextJson
 *   2. Replays the actions via the shared executeAction() from trigger-engine
 *   3. Marks the row as 'completed' or 'failed' + mirrors a TriggerExecution
 *
 * Protected by a shared secret passed in the `x-cron-secret` header (or
 * `?secret=` query param) — same pattern as the other ServiceOS cron routes.
 *
 * Recommended schedule: every 15 minutes.
 *   Vercel cron:   "0,15,30,45 * * * *"  (or "*\/15 * * * *" — every 15 min)
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

    const result = await processDueScheduledExecutions();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron scheduled-executions error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Cron run failed', details: message }, { status: 500 });
  }
}

// Also allow GET for easy browser/scheduler testing
export async function GET(request: NextRequest) {
  return POST(request);
}
