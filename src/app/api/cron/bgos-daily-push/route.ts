import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { runBgosDailyPushBatch } from '@/lib/bgos-daily-push';

export const dynamic = 'force-dynamic';

/**
 * POST / GET /api/cron/bgos-daily-push
 * Evaluates active BGOS tenants during their local morning window (09:30–11:30)
 * and sends a daily post / promotional push + in-app reminder when no post was
 * created or scheduled yet today.
 *
 * Query params:
 *   ?dryRun=1            → evaluate decisions without sending or persisting
 *   ?ignoreTimeWindow=1  → bypass local 09:30–11:30 window check (manual test runs)
 *   ?tenantId=...        → target a single tenant
 *   ?limit=200           → max tenants evaluated
 */
async function handleRequest(request: NextRequest) {
  try {
    const auth = verifyCronAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const dryRun =
      searchParams.get('dryRun') === '1' || searchParams.get('dryRun') === 'true';
    const ignoreTimeWindow =
      searchParams.get('ignoreTimeWindow') === '1' ||
      searchParams.get('ignoreTimeWindow') === 'true';
    const rawLimit = parseInt(searchParams.get('limit') || '200', 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 1000) : 200;
    const tenantIdFilter = searchParams.get('tenantId') || undefined;

    const report = await runBgosDailyPushBatch({
      dryRun,
      ignoreTimeWindow,
      limit,
      tenantIdFilter,
    });

    return NextResponse.json({
      success: true,
      ...report,
    });
  } catch (error) {
    console.error('[cron/bgos-daily-push] Failed:', error);
    return NextResponse.json(
      {
        error: 'BGOS daily push cron failed',
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
