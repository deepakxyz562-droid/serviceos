import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { transitionJob } from '@/lib/job-state-machine';

/**
 * POST /api/quality-inspections/[id]/resolve
 * ------------------------------------------
 * Resolve a quality inspection.
 *  - Sets status (passed | failed | needs_rework), resolvedAt, resolvedById,
 *    resolvedByName, resolutionNotes
 *  - If passed      → transitions the linked Job to `invoiced`
 *  - If needs_rework → transitions the linked Job back to `on_site`
 *                     (uses a direct override if the state machine doesn't
 *                      allow quality_check → on_site directly, since QC
 *                      rework is a supervisor-driven override)
 *
 * Body:
 *   resolution: 'passed' | 'failed' | 'needs_rework'
 *   resolutionNotes?: string
 *   score?: number (0-100, optional — also persisted if provided)
 */

const VALID_RESOLUTIONS = ['passed', 'failed', 'needs_rework'] as const;

/**
 * Force-transition a job to a target state by bypassing the state machine
 * validation. Used when a QC resolution mandates a state change that the
 * state machine doesn't allow (e.g., needs_rework → on_site). The override
 * is logged to JobStateTransition with metadata explaining why.
 */
async function forceTransitionJob(
  jobId: string,
  toState: string,
  options: {
    tenantId?: string | null;
    transitionedById?: string;
    transitionedByName?: string | null;
    reason?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, workspaceId: true },
    });
    if (!job) {
      return { success: false, error: 'Job not found' };
    }
    const fromState = job.status ?? 'unknown';
    if (fromState === toState) {
      return { success: true };
    }
    // Job has no tenantId column — resolve via workspaceId if needed.
    let jobTenantId: string | null = options.tenantId ?? null;
    if (!jobTenantId && job.workspaceId) {
      try {
        const ws = await db.workspace.findUnique({
          where: { id: job.workspaceId },
          select: { tenantId: true },
        });
        jobTenantId = ws?.tenantId ?? null;
      } catch {
        // ignore — leave null
      }
    }
    await db.job.update({ where: { id: jobId }, data: { status: toState } });
    await db.jobStateTransition.create({
      data: {
        tenantId: jobTenantId,
        jobId,
        fromState,
        toState,
        transitionReason: options.reason || 'QC resolution override',
        transitionedById: options.transitionedById,
        transitionedByName: options.transitionedByName ?? null,
        metadataJson: JSON.stringify({
          ...(options.metadata || {}),
          override: true,
          source: 'quality_inspection_resolve',
        }),
      },
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Inspection id is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { id };
    if (authUser.tenantId && !authUser.isSuperAdmin) {
      where.tenantId = authUser.tenantId;
    }
    const existing = await db.qualityInspection.findFirst({ where });
    if (!existing) {
      return NextResponse.json({ error: 'Quality inspection not found' }, { status: 404 });
    }

    if (existing.status !== 'pending' && existing.status !== 'failed') {
      return NextResponse.json(
        {
          error: `Inspection is already resolved (status: ${existing.status}).`,
        },
        { status: 409 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { resolution, resolutionNotes, score } = body as Record<string, unknown>;

    if (
      typeof resolution !== 'string' ||
      !VALID_RESOLUTIONS.includes(resolution as (typeof VALID_RESOLUTIONS)[number])
    ) {
      return NextResponse.json(
        { error: `resolution is required and must be one of: ${VALID_RESOLUTIONS.join(', ')}` },
        { status: 400 },
      );
    }

    // Persist the resolution on the inspection row.
    const updateData: Record<string, unknown> = {
      status: resolution,
      resolvedAt: new Date(),
      resolvedById: authUser.id,
      resolvedByName: authUser.name || authUser.email,
      resolutionNotes:
        typeof resolutionNotes === 'string' ? resolutionNotes.trim() || null : null,
    };

    if (score !== undefined) {
      const scoreNum = Number(score);
      if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        return NextResponse.json(
          { error: 'score must be a number between 0 and 100' },
          { status: 400 },
        );
      }
      updateData.score = Math.round(scoreNum);
    }

    const inspection = await db.qualityInspection.update({
      where: { id },
      data: updateData,
    });

    log.info(
      {
        userId: authUser.id,
        inspectionId: id,
        jobId: existing.jobId,
        resolution,
      },
      'Quality inspection resolved',
    );

    // ─── Trigger the appropriate job state transition ────────────────────
    interface QcTransitionResult {
      success: boolean;
      job?: { id: string; status: string };
      error?: string;
    }
    let transitionResult: QcTransitionResult | null = null;
    let transitionTarget: string | null = null;

    if (resolution === 'passed') {
      transitionTarget = 'invoiced';
      transitionResult = await transitionJob(existing.jobId, 'invoiced', {
        tenantId: authUser.tenantId ?? inspection.tenantId ?? undefined,
        transitionedById: authUser.id,
        transitionedByName: authUser.name || authUser.email,
        reason: `QC passed (inspection ${id})`,
        metadata: {
          qcInspectionId: id,
          resolution,
          score: inspection.score ?? null,
        },
      });
    } else if (resolution === 'needs_rework') {
      transitionTarget = 'on_site';
      // The state machine doesn't allow quality_check → on_site directly, so
      // try the validated transition first; fall back to a force override if
      // the state machine rejects it (logged with metadata for audit).
      const attempted = await transitionJob(existing.jobId, 'on_site', {
        tenantId: authUser.tenantId ?? inspection.tenantId ?? undefined,
        transitionedById: authUser.id,
        transitionedByName: authUser.name || authUser.email,
        reason: `QC needs rework (inspection ${id})`,
        metadata: {
          qcInspectionId: id,
          resolution,
          reworkNotes: inspection.reworkNotes ?? null,
        },
      });
      if (attempted.success) {
        transitionResult = attempted;
      } else {
        log.warn(
          {
            inspectionId: id,
            jobId: existing.jobId,
            err: attempted.error,
          },
          'State machine rejected quality_check → on_site; using force override',
        );
        transitionResult = await forceTransitionJob(existing.jobId, 'on_site', {
          tenantId: authUser.tenantId ?? inspection.tenantId ?? null,
          transitionedById: authUser.id,
          transitionedByName: authUser.name || authUser.email,
          reason: `QC needs rework (inspection ${id}) — supervisor override`,
          metadata: {
            qcInspectionId: id,
            resolution,
            reworkNotes: inspection.reworkNotes ?? null,
            stateMachineRejectedAs: attempted.error,
          },
        });
      }
    }
    // 'failed' does not trigger a state transition — the job remains in its
    // current state and a supervisor must decide what to do next.

    // Re-fetch the job so the caller gets its current status.
    const jobAfter = await db.job.findUnique({
      where: { id: existing.jobId },
      select: { id: true, status: true, title: true },
    });

    return NextResponse.json({
      success: true,
      inspection,
      job: jobAfter,
      transition: transitionResult
        ? {
            attempted: transitionTarget,
            success: transitionResult.success,
            error: transitionResult.error ?? null,
          }
        : null,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to resolve quality inspection');
    const message = error instanceof Error ? error.message : 'Failed to resolve quality inspection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
