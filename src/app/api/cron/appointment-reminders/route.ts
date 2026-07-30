import { NextRequest, NextResponse } from 'next/server';
import { scheduleAppointmentReminders } from '@/lib/appointment-reminders';

/**
 * POST /api/cron/appointment-reminders
 *
 * Recurring cron that finds all JobVisits scheduled in the next 24 hours
 * (teamReminder != 'none', status='scheduled') and creates ScheduledMessage
 * rows for each customer reminder.
 *
 * The actual message dispatch happens on the next /api/cron/scheduled-messages
 * tick (every 15 min) — this endpoint just enqueues.
 *
 * Protected by a shared secret passed in the `x-cron-secret` header (or
 * `?secret=` query param) — same pattern as the other ServiceOS cron routes.
 *
 * Recommended schedule: every 6 hours.
 *   Vercel cron:   "0 0,6,12,18 * * *"  (or "0 *\/6 * * *" — every 6h)
 *
 * (Runs frequently enough that a visit created at 8 AM with teamReminder='1h'
 *  for a 5 PM appointment still gets a reminder scheduled in time.)
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

    const result = await scheduleAppointmentReminders();

    return NextResponse.json({
      success: true,
      scheduled: result.scheduled,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron appointment-reminders error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Cron run failed', details: message }, { status: 500 });
  }
}

// Also allow GET for easy browser/scheduler testing
export async function GET(request: NextRequest) {
  return POST(request);
}
