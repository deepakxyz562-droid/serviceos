import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import { getLatestAiCompetitorGap, runAiCompetitorGapAnalysis } from '@/lib/seo/ai-visibility';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const report = await getLatestAiCompetitorGap(user.tenantId);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('[api/seo/ai-competitor-gap] GET failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load AI competitor gap report' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const body = await request.json().catch(() => ({}));
    const customPrompts = Array.isArray(body?.customPrompts)
      ? body.customPrompts
          .map((p: unknown) => String(p || '').trim().slice(0, 200))
          .filter(Boolean)
          .slice(0, 5)
      : undefined;

    const report = await runAiCompetitorGapAnalysis({
      tenantId: user.tenantId,
      customPrompts,
      includeOpenAi: body?.includeOpenAi !== false,
      createPlan: body?.createPlan === true,
      createPlanOnly: body?.createPlanOnly === true,
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('[api/seo/ai-competitor-gap] POST failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI Competitor Gap analysis failed' },
      { status: 500 },
    );
  }
}
