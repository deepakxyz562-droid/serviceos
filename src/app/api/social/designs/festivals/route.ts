import { NextRequest, NextResponse } from 'next/server';
import {
  getFestivalGroupsWithCounts,
  searchFestivalCatalog,
} from '../../../../../../shared/festival-catalog';

export const dynamic = 'force-dynamic';

/**
 * GET /api/social/designs/festivals
 * Fast festival catalog and search endpoint for social posts, campaigns and flyers.
 *
 * Query Params:
 *  - q / search: Search keywords (e.g. "modak", "garba", "diwali", "arghya")
 *  - festival: Festival group filter (e.g. "diwali", "holi", "navratri", "all")
 *  - limit: Number of items to return (default: 50, max: 200)
 *  - offset: Offset for pagination (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('search') || '';
    const festivalKey = searchParams.get('festival') || searchParams.get('festivalKey') || 'all';
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const groups = getFestivalGroupsWithCounts();
    const result = searchFestivalCatalog({
      query,
      festivalKey: festivalKey === 'all' ? undefined : festivalKey,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      groups,
      photos: result.items,
      total: result.total,
      hasMore: result.hasMore,
      query,
      selectedFestival: festivalKey,
    });
  } catch (error: unknown) {
    console.error('[api/social/designs/festivals] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search festivals' },
      { status: 500 },
    );
  }
}
