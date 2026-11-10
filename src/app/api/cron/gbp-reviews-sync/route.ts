import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { runGbpReviewsSyncCron } from '@/lib/reviews/gbp-reviews-cron';

export const dynamic = 'force-dynamic';

/**
 * POST / GET /api/cron/gbp-reviews-sync
 * Automated Google Business Profile review sync cron.
 * Imports new Google reviews for connected tenants and dispatches in-app +
 * web/mobile push notifications instead of unsolicited email nudges.
 *
 * Supports query params:
 *   ?dryRun=1       → inspect eligible connected tenants without calling Google APIs
 *   ?limit=50       → cap tenants evaluated
 *   ?tenantId=...   → target a single tenant
 */
async function handleRequest(request: NextRequest) {
  try {
    const auth = verifyCronAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === '1' || searchParams.get('dryRun') === 'true';
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
    const tenantIdFilter = searchParams.get('tenantId') || undefined;

    const report = await runGbpReviewsSyncCron({
      dryRun,
      limit,
      tenantIdFilter,
    });

    return NextResponse.json({
      success: true,
      ...report,
    });
  } catch (error) {
    console.error('[cron/gbp-reviews-sync] Failed:', error);
    return NextResponse.json(
      {
        error: 'GBP reviews sync cron failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}
