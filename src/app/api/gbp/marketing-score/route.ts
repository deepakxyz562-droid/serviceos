import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { computeMarketingScore, snapshotMarketingScore } from '@/lib/gbp/marketing-score';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gbp/marketing-score
 * Composite Marketing Score (0-100) for the speedometer gauge + history for
 * the swipeable growth chart. Upserts today's GbpScoreSnapshot.
 *
 * When Google Business is NOT connected the response has
 * `isConnected: false, score: null` — the UI renders the honest
 * "Not available / NOT_CONNECTED → How to fix" state.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const refreshHistory = searchParams.get('snapshot') !== 'false';

    const result = await computeMarketingScore(user.tenantId);
    const { history } = refreshHistory
      ? await snapshotMarketingScore(user.tenantId)
      : { history: [] };

    return NextResponse.json({
      ...result,
      history,
      weekHistory: history.slice(-7),
    });
  } catch (error: unknown) {
    console.error('[marketing-score] GET failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute marketing score' },
      { status: 500 },
    );
  }
}
