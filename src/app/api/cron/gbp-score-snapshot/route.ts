import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeMarketingScore, snapshotMarketingScore, isMissingTableError } from '@/lib/gbp/marketing-score';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/gbp-score-snapshot?token=<CRON_SECRET>
 * Daily Marketing Score snapshot for every tenant with a connected Google
 * Business Profile. Pair with the existing /api/social/publish-due schedule.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') ||
      request.headers.get('x-cron-secret') || '';
    const expected = process.env.CRON_SECRET;
    if (!expected || token !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await db.socialAccount.findMany({
      where: { platform: 'googlebusiness', isActive: true },
      select: { tenantId: true },
      distinct: ['tenantId'],
      take: 200,
    });

    let processed = 0;
    let failed = 0;
    let migrationBlocked = false;

    for (const { tenantId } of accounts) {
      try {
        await snapshotMarketingScore(tenantId);
        processed++;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          migrationBlocked = true;
          break; // table missing — no point hammering every tenant
        }
        failed++;
        console.error('[cron/gbp-score-snapshot] tenant failed:', tenantId, err?.message?.slice(0, 150));
      }
    }

    return NextResponse.json({ processed, failed, migrationBlocked, total: accounts.length });
  } catch (error: unknown) {
    console.error('[cron/gbp-score-snapshot] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Snapshot cron failed' },
      { status: 500 },
    );
  }
}
