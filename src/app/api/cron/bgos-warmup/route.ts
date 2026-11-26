import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { db } from '@/lib/db';
import { computeMarketingScore } from '@/lib/gbp/marketing-score';
import { computeGbpAudit } from '@/lib/gbp/audit';
import { ensureFreshCompetitorIntelligence } from '@/lib/gbp/competitor-intelligence';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET / POST /api/cron/bgos-warmup
 * Background pre-warm worker (No Redis required): refreshes Marketing Score,
 * GBP Audit, and stale Competitor snapshots in small batches so mobile interactive
 * GET requests read warm DB snapshots cleanly at 5,000+ tenant scale.
 */
async function handleWarmup(request: NextRequest) {
  const auth = verifyCronAuth(request);
  if (!auth.ok) return auth.response;

  const accounts = await db.socialAccount
    .findMany({
      where: { platform: 'googlebusiness', isActive: true },
      select: { tenantId: true },
      distinct: ['tenantId'],
      orderBy: { updatedAt: 'asc' },
      take: 25,
    })
    .catch(() => []);

  let warmed = 0;
  let failed = 0;

  for (const { tenantId } of accounts) {
    try {
      await Promise.allSettled([
        computeMarketingScore(tenantId),
        computeGbpAudit(tenantId),
        ensureFreshCompetitorIntelligence(tenantId, { maxAgeMs: 24 * 60 * 60 * 1000 }),
      ]);
      warmed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: accounts.length,
    warmed,
    failed,
  });
}

export async function GET(request: NextRequest) {
  return handleWarmup(request);
}

export async function POST(request: NextRequest) {
  return handleWarmup(request);
}
