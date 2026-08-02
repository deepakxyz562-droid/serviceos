import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { archiveOldWonDeals } from '@/lib/deal-archive';

/**
 * POST /api/cron/archive-old-won-deals
 *
 * Pipeline Redesign (Phase 1)
 * ---------------------------
 * Runs daily. Auto-archives Won deals whose `closedAt` is older than
 * AUTO_ARCHIVE_AFTER_DAYS (14 days). Archived deals are hidden from the
 * active Sales Pipeline Kanban and only surface in the "Completed Workspace"
 * / Reports view.
 *
 * This keeps the Won Summary widget clean — sales reps see recent wins
 * (last 14 days) in the Kanban, and older wins are just one click away
 * via "View All →".
 *
 * Auth: shared secret (CRON_SECRET env).
 *
 * Schedule: daily at 3:00 AM (low-traffic window).
 *   0 3 * * *  curl -X POST https://your-app/api/cron/archive-old-won-deals \
 *             -H "x-cron-secret: $CRON_SECRET"
 *
 * Idempotent: safe to run multiple times — only deals with
 * `archivedAt IS NULL` are archived. Already-archived deals are skipped.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = verifyCronAuth(request);
    if (!auth.ok) return auth.response;

    const result = await archiveOldWonDeals();

    return NextResponse.json({
      success: true,
      ranAt: new Date().toISOString(),
      archivedCount: result.archivedCount,
      tenantIdsAffected: result.tenantIds,
    });
  } catch (error) {
    console.error('[cron/archive-old-won-deals] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Cron run failed', details: message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
