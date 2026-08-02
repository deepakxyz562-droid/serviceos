import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { getJobTransitionHistory, getAllowedNextStates } from '@/lib/job-state-machine';

/**
 * GET /api/jobs/[id]/transitions
 * ------------------------------
 * Returns the full transition history for a job.
 *
 * Response:
 *   {
 *     jobId: string,
 *     currentStatus: string,
 *     allowedNextStates: string[],
 *     transitions: JobStateTransition[]
 *   }
 *
 * Auth required. Tenant scoping: the auth user must be a member of the job's
 * tenant (resolved via the job's workspaceId → tenantId). Super admins bypass.
 */
export async function GET(
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

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, title: true, workspaceId: true },
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

    // Use the state-machine helper. Tenant scoping has already been enforced
    // above by verifying the caller is a member of the job's tenant.
    const transitions = await getJobTransitionHistory(jobId);

    log.info(
      { userId: authUser.id, jobId, count: transitions.length },
      'Job transition history fetched',
    );

    return NextResponse.json({
      jobId,
      currentStatus: job.status,
      allowedNextStates: getAllowedNextStates(job.status ?? ''),
      transitions,
      count: transitions.length,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch job transition history');
    const message =
      error instanceof Error ? error.message : 'Failed to fetch transition history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

