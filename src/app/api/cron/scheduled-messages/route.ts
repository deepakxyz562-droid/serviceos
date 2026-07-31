import { NextRequest, NextResponse } from 'next/server';
import { processDueScheduledMessages } from '@/lib/scheduled-messages';
import { verifyCronAuth } from '@/lib/cron-auth';

/**
 * POST /api/cron/scheduled-messages
 *
 * Cron runner that processes all due ScheduledMessage rows (status='pending'
 * AND dueAt <= now). For each row, dispatches via the appropriate channel
 * (email / whatsapp / sms / in_app) and marks it as 'sent' or 'failed'.
 *
 * Protected by a shared secret passed in the `x-cron-secret` header (or
 * `?secret=` query param) — same pattern as the other ServiceOS cron routes.
 *
 * Recommended schedule: every 15 minutes.
 *   Vercel cron:   "0,15,30,45 * * * *"  (or "*\/15 * * * *" — every 15 min)
 */
export async function POST(request: NextRequest) {
  try {
    // ─── Auth: unified cron secret ─────────────────────────────────────
    const auth = verifyCronAuth(request);
    if (!auth.ok) return auth.response;

    const result = await processDueScheduledMessages();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron scheduled-messages error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Cron run failed', details: message }, { status: 500 });
  }
}

// Also allow GET for easy browser/scheduler testing
export async function GET(request: NextRequest) {
  return POST(request);
}
