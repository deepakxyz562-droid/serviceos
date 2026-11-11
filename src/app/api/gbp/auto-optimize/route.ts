import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  executeAutoOptimize,
  getAutoOptimizeOverview,
  previewAutoOptimizePlan,
  rollbackAutoOptimize,
  type AutoOptimizeActionPreview,
  type AutoOptimizeStepId,
  type UncoveredSearchDemand,
} from '@/lib/gbp/auto-optimizer';

export type { AutoOptimizeActionPreview, AutoOptimizeStepId, UncoveredSearchDemand };

export const dynamic = 'force-dynamic';

/**
 * GET /api/gbp/auto-optimize
 * Preview the 1-click "Gemini-style" GBP optimization checklist & competitor gap fixes.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const overview = await getAutoOptimizeOverview(user.tenantId, { syncCompetitors: true });
    return NextResponse.json(overview);
  } catch (error: unknown) {
    console.error('[GET /api/gbp/auto-optimize] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load auto-optimizer plan' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/gbp/auto-optimize
 * Supports:
 *  - mode: 'preview' -> returns preview with generated sample description
 *  - mode: 'rollback' -> restores snapshot saved before the last batch optimization
 *  - mode: 'apply' (default) -> executes selected/all pending steps & pushes to Google GBP
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      mode?: 'preview' | 'apply' | 'rollback';
      steps?: AutoOptimizeStepId[];
      pushToGoogle?: boolean;
      locationId?: string;
    };

    const mode = body.mode || 'apply';

    if (mode === 'rollback') {
      const rollbackResult = await rollbackAutoOptimize(user.tenantId);
      if (rollbackResult.notFound) {
        return NextResponse.json({ error: rollbackResult.error }, { status: 404 });
      }
      return NextResponse.json(rollbackResult);
    }

    if (mode === 'preview') {
      const preview = await previewAutoOptimizePlan(user.tenantId);
      return NextResponse.json(preview);
    }

    const result = await executeAutoOptimize(user.tenantId, {
      steps: body.steps,
      pushToGoogle: body.pushToGoogle,
      locationId: body.locationId,
      syncCompetitors: true,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[POST /api/gbp/auto-optimize] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run GBP auto-optimizer' },
      { status: 500 },
    );
  }
}
