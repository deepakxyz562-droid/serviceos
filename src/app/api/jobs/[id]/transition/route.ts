import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import {
  transitionJob,
  getAllowedNextStates,
  JOB_STATES,
} from '@/lib/job-state-machine';

/**
 * POST /api/jobs/[id]/transition
 * ------------------------------
 * Transition a job to a new state via the validated state machine.
 *
 * Body:
 *   toState: string (one of JOB_STATES)
 *   reason?: string
 *   metadata?: Record<string, unknown>
 *
 * Response:
 *   {
 *     success: boolean,
 *     job?: { id, status },
 *     error?: string,
 *     allowedNextStates: string[]   // always returned for convenience
 *   }
 *
 * Auth required. Tenant scoping: the auth user must be a member of the job's
 * tenant (resolved via the job's workspaceId → tenantId). Super admins bypass.
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: 'Job id is required' }, { status: 400 });
    }

    // Fetch the job (with its tenant via workspaceId) so we can enforce scoping.
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        title: true,
        workspaceId: true,
      },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Resolve the job's tenantId via its workspace.
    let jobTenantId: string | null = null;
    if (job.workspaceId) {
      try {
        const ws = await db.workspace.findUnique({
          where: { id: job.workspaceId },
          select: { tenantId: true },
        });
        jobTenantId = ws?.tenantId ?? null;
      } catch {
        // ignore
      }
    }

    // Enforce tenant scoping (super admins bypass).
    if (
      !authUser.isSuperAdmin &&
      authUser.tenantId &&
      jobTenantId &&
      authUser.tenantId !== jobTenantId
    ) {
      return NextResponse.json(
        { error: 'You do not have access to this job.' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { toState, reason, metadata } = body as Record<string, unknown>;

    if (typeof toState !== 'string' || !toState.trim()) {
      return NextResponse.json(
        {
          error: `toState is required. Must be one of: ${JOB_STATES.join(', ')}`,
          allowedNextStates: getAllowedNextStates(job.status ?? ''),
        },
        { status: 400 },
      );
    }

    if (!JOB_STATES.includes(toState as (typeof JOB_STATES)[number])) {
      return NextResponse.json(
        {
          error: `Invalid toState "${toState}". Must be one of: ${JOB_STATES.join(', ')}`,
          allowedNextStates: getAllowedNextStates(job.status ?? ''),
        },
        { status: 400 },
      );
    }

    const result = await transitionJob(jobId, toState, {
      tenantId: authUser.tenantId || jobTenantId || undefined,
      transitionedById: authUser.id,
      transitionedByName: authUser.name || authUser.email,
      reason: typeof reason === 'string' ? reason : undefined,
      metadata:
        metadata && typeof metadata === 'object'
          ? (metadata as Record<string, unknown>)
          : undefined,
    });

    const status = result.success ? 200 : 400;

    log.info(
      {
        userId: authUser.id,
        jobId,
        toState,
        success: result.success,
        err: result.error,
      },
      'Job transition attempted',
    );

    return NextResponse.json(
      {
        success: result.success,
        job: result.job,
        error: result.error,
        allowedNextStates: getAllowedNextStates(toState),
      },
      { status },
    );
  } catch (error) {
    log.error({ err: error }, 'Failed to transition job');
    const message = error instanceof Error ? error.message : 'Failed to transition job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
