import { NextRequest, NextResponse } from 'next/server';
import { processDueRecurringInvoices } from '@/lib/invoice-automation';

/**
 * POST /api/cron/recurring-invoices
 *
 * Cron runner that processes all due recurring invoice schedules.
 * Generates invoices for any schedule whose `nextRunAt <= now`, sends them
 * via email + WhatsApp, and advances each schedule's nextRunAt.
 *
 * This endpoint is meant to be called by an external scheduler (Vercel Cron,
 * GitHub Actions, system cron, etc.). It's protected by a shared secret passed
 * in the `x-cron-secret` header or `?secret=` query param, which must match
 * the CRON_SECRET env var (falls back to a dev default if unset).
 *
 * Example cron (every day at 9 AM):
 *   0 9 * * *  curl -X POST https://your-app/api/cron/recurring-invoices \
 *              -H "x-cron-secret: $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // ─── Auth: shared secret ───────────────────────────────────────────
    const expectedSecret = process.env.CRON_SECRET || 'serviceos-cron-dev';
    const providedSecret =
      request.headers.get('x-cron-secret') ||
      new URL(request.url).searchParams.get('secret') ||
      '';

    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── Process due recurring invoices ────────────────────────────────
    const result = await processDueRecurringInvoices();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron recurring invoices error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Cron run failed', details: message }, { status: 500 });
  }
}

// Also allow GET for easy browser/scheduler testing
export async function GET(request: NextRequest) {
  return POST(request);
}
