import { NextRequest, NextResponse } from 'next/server';
import { detectAndEmitOverdueInvoices } from '@/lib/invoice-automation';
import { verifyCronAuth } from '@/lib/cron-auth';

/**
 * POST /api/cron/overdue-detector
 *
 * Daily cron that finds all overdue invoices (dueDate < now, status NOT in
 * {paid, cancelled, draft}) and:
 *   1. Emits the 'invoice.overdue' EventBus event for each
 *   2. Flips the invoice status to 'overdue' (idempotent)
 *   3. Creates a ScheduledMessage for the overdue reminder (de-duped by
 *      invoiceId + messageType='overdue_reminder')
 *
 * The actual message dispatch happens on the next /api/cron/scheduled-messages
 * tick (every 15 min) — this endpoint just enqueues.
 *
 * Protected by a shared secret passed in the `x-cron-secret` header (or
 * ``x-cron-secret` header or `Authorization: Bearer` header` query param) — same pattern as the other Fieseros cron routes.
 *
 * Recommended schedule: daily at 8 AM.
 *   Vercel cron:   "0 8 * * *"
 */
export async function POST(request: NextRequest) {
  try {
    // ─── Auth: unified cron secret ─────────────────────────────────────
    const auth = verifyCronAuth(request);
    if (!auth.ok) return auth.response;

    const result = await detectAndEmitOverdueInvoices();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron overdue-detector error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Cron run failed', details: message }, { status: 500 });
  }
}

// Also allow GET for easy browser/scheduler testing
export async function GET(request: NextRequest) {
  return POST(request);
}
