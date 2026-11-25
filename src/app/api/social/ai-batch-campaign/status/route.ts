import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const jobId = request.nextUrl.searchParams.get('jobId')?.trim();
    if (!jobId) {
      return NextResponse.json({ error: 'jobId query parameter is required' }, { status: 400 });
    }

    const job = await db.designGenerationJob.findFirst({
      where: {
        id: jobId,
        tenantId: user.tenantId,
        provider: 'batch_campaign',
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Campaign generation job not found' }, { status: 404 });
    }

    let ctx: Record<string, any> = {};
    try {
      if (job.contextJson) ctx = JSON.parse(job.contextJson);
    } catch {}

    let result: Record<string, any> | null = null;
    try {
      if (job.resultJson) result = JSON.parse(job.resultJson);
    } catch {}

    return NextResponse.json({
      success: job.status !== 'failed',
      jobId: job.id,
      status: job.status,
      stage: ctx.stage || (job.status === 'completed' ? 'completed' : 'analyzing'),
      progressPct:
        typeof ctx.progressPct === 'number'
          ? ctx.progressPct
          : job.status === 'completed'
            ? 100
            : job.status === 'failed'
              ? 0
              : 25,
      error: job.error || null,
      ...(result ? {
        count: result.count || 0,
        goal: result.goal || '',
        gbpPhotoCount: result.gbpPhotoCount || 0,
        posts: Array.isArray(result.posts) ? result.posts : [],
      } : {}),
    });
  } catch (error: any) {
    console.error('[GET /api/social/ai-batch-campaign/status] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to read campaign status' },
      { status: 500 },
    );
  }
}
