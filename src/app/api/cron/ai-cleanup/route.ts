import { NextRequest, NextResponse } from 'next/server';
import { releaseStaleReservations } from '@/lib/usage-service';

/**
 * GET /api/cron/ai-cleanup
 * ─────────────────────────────────────────────────────────────────────────
 * Scheduled cron endpoint that releases stale AI call reservations.
 *
 * Phase 8: this is part of financial correctness — abandoned reservations
 * (calls that started but never received an end-of-call webhook) must be
 * cleaned up, otherwise minutes become permanently stuck.
 *
 * Run every 5-10 minutes via:
 *   - Vercel Cron
 *   - Supabase scheduled function
 *   - External cron service
 *
 * Auth: x-cron-secret header (matches CRON_SECRET env var)
 *   OR the Next.js CRON_SECRET built-in auth
 *
 * This endpoint releases:
 *   - ACTIVE reservations older than 30 minutes (default)
 *   - These become available for future calls
 */

export async function GET(request: NextRequest) {
  // Authenticate — cron endpoints must not be public
  const cronSecret = process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const headerSecret = request.headers.get('x-cron-secret') || '';
    if (token !== cronSecret && headerSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Release stale reservations (older than 30 minutes by default)
    const maxAgeParam = request.nextUrl.searchParams.get('maxAgeMinutes');
    const maxAgeMinutes = maxAgeParam ? parseInt(maxAgeParam, 10) : 30;

    const releasedCount = await releaseStaleReservations(maxAgeMinutes);

    return NextResponse.json({
      ok: true,
      releasedReservations: releasedCount,
      maxAgeMinutes,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cron/ai-cleanup] error:', err);
    return NextResponse.json(
      { error: 'Cleanup failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
