import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  enqueueOrReuseBatchCampaignJob,
  runBatchCampaignJob,
} from '@/lib/social/batch-campaign-runner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface BatchCampaignRequest {
  goal?: string;
  platforms?: Array<'googlebusiness' | 'instagram' | 'facebook' | 'linkedin'>;
  daysCount?: number;
  idempotencyKey?: string;
  locationId?: string;
  sync?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as BatchCampaignRequest;
    const headerIdempotencyKey = request.headers.get('Idempotency-Key') || undefined;
    const idempotencyKey = (body.idempotencyKey || headerIdempotencyKey || '').trim() || undefined;

    const job = await enqueueOrReuseBatchCampaignJob({
      tenantId: user.tenantId,
      userId: user.id,
      goal: body.goal,
      platforms: body.platforms,
      daysCount: body.daysCount,
      idempotencyKey,
      locationId: body.locationId,
    });

    if (job.status === 'completed' && job.result) {
      return NextResponse.json({
        ...job.result,
        jobId: job.jobId,
        status: 'completed',
        stage: 'completed',
        progressPct: 100,
        reused: true,
      });
    }

    const runPromise = runBatchCampaignJob(job.jobId, {
      tenantId: user.tenantId,
      userId: user.id,
      goal: body.goal,
      platforms: body.platforms,
      daysCount: body.daysCount,
      idempotencyKey,
      locationId: body.locationId,
    });

    // For unit tests or explicit sync requests, await completion inline
    const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
    if (isTest || body.sync === true) {
      await runPromise;
      const { db } = await import('@/lib/db');
      const finished = await db.designGenerationJob
        .findUnique({ where: { id: job.jobId } })
        .catch(() => null);
      if (finished?.status === 'completed' && finished.resultJson) {
        return NextResponse.json({
          ...JSON.parse(finished.resultJson),
          jobId: job.jobId,
          status: 'completed',
          stage: 'completed',
          progressPct: 100,
        });
      }
      if (finished?.status === 'failed') {
        return NextResponse.json(
          { error: finished.error || 'Campaign generation failed', jobId: job.jobId, status: 'failed' },
          { status: 500 },
        );
      }
    }

    // Fire-and-forget in background so HTTP response returns immediately without proxy gateway timeouts
    void runPromise.catch((err) => {
      console.error('[POST /api/social/ai-batch-campaign] Background job error:', err);
    });

    return NextResponse.json(
      {
        success: true,
        async: true,
        jobId: job.jobId,
        status: job.status,
        stage: job.stage,
        progressPct: job.progressPct,
        reused: job.reused,
      },
      { status: 202 },
    );
  } catch (error: any) {
    console.error('[POST /api/social/ai-batch-campaign] Internal error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Internal campaign generation error',
      },
      { status: 500 },
    );
  }
}
