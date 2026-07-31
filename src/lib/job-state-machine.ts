/**
 * Job State Machine — 15-state lifecycle for service jobs.
 *
 * States: lead → assessment → quoted → approved → scheduled → assigned →
 *          travelling → on_site → paused → completed → quality_check →
 *          invoiced → paid → warranty → closed
 *
 * Each transition is validated against allowed next states.
 * Transitions are logged to JobStateTransition for audit trail.
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export const JOB_STATES = [
  'lead',
  'assessment',
  'quoted',
  'approved',
  'scheduled',
  'assigned',
  'travelling',
  'on_site',
  'paused',
  'completed',
  'quality_check',
  'invoiced',
  'paid',
  'warranty',
  'closed',
] as const;

export type JobState = typeof JOB_STATES[number];

// Allowed transitions: from → [allowed next states]
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'lead':          ['assessment', 'quoted', 'closed'],
  'assessment':    ['quoted', 'closed'],
  'quoted':        ['approved', 'rejected', 'closed'],
  'approved':      ['scheduled', 'assigned', 'closed'],
  'scheduled':     ['assigned', 'cancelled', 'closed'],
  'assigned':      ['travelling', 'on_site', 'cancelled', 'closed'],
  'travelling':    ['on_site', 'cancelled', 'closed'],
  'on_site':       ['paused', 'completed', 'cancelled', 'closed'],
  'paused':        ['on_site', 'cancelled', 'closed'],
  'completed':     ['quality_check', 'invoiced', 'closed'],
  'quality_check': ['completed', 'invoiced', 'closed'],  // can rework back to completed
  'invoiced':      ['paid', 'cancelled', 'closed'],
  'paid':          ['warranty', 'closed'],
  'warranty':      ['closed', 'assigned'],  // warranty claim can reopen to assigned
  'closed':        [],  // terminal state
};

export function isValidTransition(from: string, to: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function getAllowedNextStates(currentState: string): string[] {
  return ALLOWED_TRANSITIONS[currentState] || [];
}

export interface TransitionResult {
  success: boolean;
  job?: { id: string; status: string };
  error?: string;
}

/**
 * Transition a job to a new state. Validates the transition, updates the job,
 * and logs the transition to JobStateTransition.
 */
export async function transitionJob(
  jobId: string,
  toState: string,
  options?: {
    tenantId?: string;
    transitionedById?: string;
    transitionedByName?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<TransitionResult> {
  try {
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    const fromState = job.status;
    if (fromState === toState) {
      return { success: false, error: `Job is already in state "${toState}"` };
    }

    if (!isValidTransition(fromState, toState)) {
      return {
        success: false,
        error: `Invalid transition: "${fromState}" → "${toState}". Allowed: ${getAllowedNextStates(fromState).join(', ')}`,
      };
    }

    // Update job status
    const updated = await db.job.update({
      where: { id: jobId },
      data: { status: toState },
    });

    // Resolve the tenantId for the JobStateTransition audit row.
    // Job has no tenantId column — it links via workspaceId. Prefer the
    // caller-provided options.tenantId; otherwise resolve via the workspace
    // lookup (best-effort, non-fatal).
    let resolvedTenantId: string | null = options?.tenantId ?? null;
    if (!resolvedTenantId && job.workspaceId) {
      try {
        const ws = await db.workspace.findUnique({
          where: { id: job.workspaceId },
          select: { tenantId: true },
        });
        resolvedTenantId = ws?.tenantId ?? null;
      } catch {
        // ignore — tenantId stays null (column is nullable)
      }
    }

    // ── Synthesize a RouteHistory row when transitioning to 'completed'.
    // The state machine is a low-level primitive used by multiple completion
    // paths. If GPS tracking was never started (no RouteHistory row exists),
    // synthesize a completed RouteHistory from the job's check-in / check-out
    // coordinates so the GPS & route tab on the detail page doesn't show
    // "No travel recorded." even when coordinates were captured.
    // (RouteHistory.employeeId is required — skip if no assignee. tenantId
    // is required too.) Non-fatal: any DB error is logged but never breaks
    // the transition.
    if (toState === 'completed' && resolvedTenantId && job.assigneeId && (job.checkInLat || job.checkOutLat)) {
      try {
        const existingRoute = await db.routeHistory.findFirst({
          where: { jobId: job.id },
          orderBy: { createdAt: 'desc' },
        });
        if (!existingRoute) {
          const endTime = job.actualEndTime || job.completedAt || new Date();
          const startTime = job.actualStartTime || job.scheduledAt || endTime;
          await db.routeHistory.create({
            data: {
              tenantId: resolvedTenantId,
              employeeId: job.assigneeId,
              jobId: job.id,
              startedAt: startTime,
              endedAt: endTime,
              pathJson: JSON.stringify([]),
              distanceMeters: 0,
              durationMinutes: Math.max(
                0,
                Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
              ),
              startLat: job.checkInLat ?? null,
              startLng: job.checkInLng ?? null,
              endLat: job.checkOutLat ?? job.checkInLat ?? null,
              endLng: job.checkOutLng ?? job.checkInLng ?? null,
              status: 'completed',
              arrivedAt: endTime,
            },
          });
        }
      } catch (e) {
        logger.error({ err: e, jobId, toState }, 'Failed to synthesize RouteHistory on state transition');
        // non-fatal
      }
    }

    // Log the transition
    await db.jobStateTransition.create({
      data: {
        tenantId: resolvedTenantId,
        jobId,
        fromState,
        toState,
        transitionReason: options?.reason,
        transitionedById: options?.transitionedById,
        transitionedByName: options?.transitionedByName,
        metadataJson: JSON.stringify(options?.metadata || {}),
      },
    });

    logger.info(
      { jobId, fromState, toState, reason: options?.reason },
      'Job state transition',
    );

    return { success: true, job: { id: updated.id, status: updated.status! } };
  } catch (err) {
    logger.error({ err, jobId, toState }, 'Failed to transition job state');
    return { success: false, error: 'Internal error during state transition' };
  }
}

/** Get the full transition history for a job. */
export async function getJobTransitionHistory(jobId: string) {
  return db.jobStateTransition.findMany({
    where: { jobId },
    orderBy: { createdAt: 'asc' },
  });
}
