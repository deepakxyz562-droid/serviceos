import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { analyzeKeywordWinnability } from '@/lib/gbp/keyword-planner-free';
import { getTenantSeoContext } from '@/lib/gbp/seo-context';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gbp/keyword-plan/analyze
 * Evaluates candidate keywords with real Google Search Terms impressions,
 * Google Autocomplete signals, and Google Places competitor strength (0 DataForSEO cost)
 * to return Winnable / Quick Win keywords.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { keywords?: string[] };
    let keywords = Array.isArray(body.keywords)
      ? body.keywords.map((k) => String(k || '').trim()).filter(Boolean)
      : [];

    if (keywords.length === 0) {
      const ctx = await getTenantSeoContext(user.tenantId);
      keywords = ctx?.priorityKeywords?.slice(0, 8) || [];
      if (keywords.length === 0 && ctx?.category && ctx?.city) {
        keywords = [
          `${ctx.category.toLowerCase()} in ${ctx.city.toLowerCase()}`,
          `best ${ctx.category.toLowerCase()} ${ctx.city.toLowerCase()}`,
        ];
      }
    }

    if (keywords.length === 0) {
      return NextResponse.json(
        { error: 'Add or select at least one keyword to analyze local competition.' },
        { status: 400 },
      );
    }

    const analyzed = await analyzeKeywordWinnability({
      tenantId: user.tenantId,
      keywords,
    });

    // Update TrackedKeyword.mapsRank & score where matched
    for (const item of analyzed) {
      await db.trackedKeyword
        .updateMany({
          where: { tenantId: user.tenantId, keyword: item.keyword.toLowerCase() },
          data: {
            score: item.winnabilityScore,
            ...(item.yourPlacesRank !== null ? { mapsRank: item.yourPlacesRank } : {}),
            lastCheckedAt: new Date(),
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      analyzed,
      quickWins: analyzed.filter((a) => a.winnabilityTier === 'Quick Win'),
    });
  } catch (error: unknown) {
    console.error('[/api/gbp/keyword-plan/analyze] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze keywords' },
      { status: 500 },
    );
  }
}
