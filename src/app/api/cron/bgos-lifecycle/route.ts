import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { runBgosLifecycleBatch } from '@/lib/emails/bgos/lifecycle';

export const dynamic = 'force-dynamic';

/**
 * POST / GET /api/cron/bgos-lifecycle
 * Evaluates all BGOS registered tenants and sends at most 1 contextual email:
 *   - 2-day trial reminder (7-day BGOS trial)
 *   - Trial expired summary
 *   - Day +3 post-trial unpaid & inactive rescue ("not adding money + not using product")
 *   - Day +10–14 feature-led win-back
 *   - Unreplied Google reviews alert (>48h) via Push & In-App notifications (no unsolicited email)
 *   - Connect GBP nudge (24h+ after signup)
 *   - "Go from X to more than 5 reviews" growth nudge (<5 reviews, with direct Google review link)
 *   - First post nudge (4d+ post-signup, 0 published posts)
 *
 * Supports query params:
 *   ?dryRun=1       → inspect decisions without sending email or logging
 *   ?limit=200      → cap tenants evaluated
 *   ?tenantId=...   → evaluate a single tenant
 */
async function handleRequest(request: NextRequest) {
  try {
    const auth = verifyCronAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === '1' || searchParams.get('dryRun') === 'true';
    const rawLimit = parseInt(searchParams.get('limit') || '200', 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 1000) : 200;
    const tenantIdFilter = searchParams.get('tenantId') || undefined;

    const report = await runBgosLifecycleBatch({
      dryRun,
      limit,
      tenantIdFilter,
    });

    return NextResponse.json({
      success: true,
      ...report,
    });
  } catch (error) {
    console.error('[cron/bgos-lifecycle] Failed:', error);
    return NextResponse.json(
      {
        error: 'BGOS lifecycle cron failed',
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
