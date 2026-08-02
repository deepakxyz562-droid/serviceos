import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Warranty Claim Resolve API
 * ---------------------------
 * POST /api/warranties/[id]/claims/[claimId]/resolve
 *
 * Resolves a warranty claim. The resolution can be one of:
 *   - 'approve'   → claim.status='approved', warranty.claimsUsed++
 *                   optionally creates a Job for the warranty repair
 *                   (when createJob=true in the body)
 *   - 'deny'      → claim.status='denied', claimsUsed unchanged
 *   - 'complete'  → claim.status='resolved', resolutionType required
 *
 * Body:
 *   resolution:     'approve' | 'deny' | 'complete'  (required)
 *   resolutionType: 'repair' | 'replace' | 'refund' | 'deny'  (required for approve/complete)
 *   resolutionNotes?: string
 *   assignedToId?:   string  (employee id — required when createJob=true)
 *   createJob?:      boolean (default true on approve, false otherwise)
 *   jobTitle?:       string  (override; defaults to "Warranty repair: <claim title>")
 *   jobType?:        string  (defaults to 'repair')
 *   jobPriority?:    string  (defaults to 'high')
 *
 * On approve+createJob:
 *   - Creates a Job (status='pending') linked to the claim's customer
 *   - Sets claim.jobId to the new Job id
 *   - warranty.claimsUsed is incremented
 *
 * Idempotent: if the claim is already in a terminal state (approved/denied/resolved),
 * the route returns 409.
 */

const VALID_RESOLUTIONS = ['approve', 'deny', 'complete'] as const;
const VALID_RESOLUTION_TYPES = ['repair', 'replace', 'refund', 'deny'] as const;
const VALID_JOB_TYPES = ['delivery', 'service', 'pickup', 'installation', 'maintenance', 'inspection', 'repair', 'consultation'];
const VALID_JOB_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function scopeWhere(
  authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>,
  warrantyId: string,
  claimId: string,
): Record<string, unknown> {
  const where: Record<string, unknown> = { id: claimId, warrantyId };
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

async function resolveWorkspaceIdForTenant(
  tenantId: string | null,
  userWorkspaceId: string | null,
): Promise<string | null> {
  if (userWorkspaceId) return userWorkspaceId;
  if (tenantId) {
    try {
      const ws = await db.workspace.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (ws) return ws.id;
    } catch {
      // ignore
    }
  }
  try {
    const ws = await db.workspace.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
    return ws?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id, claimId } = await params;
    if (!id || !claimId) {
      return NextResponse.json(
        { error: 'Warranty id and claim id are required' },
        { status: 400 },
      );
    }

    const claim = await db.warrantyClaim.findFirst({
      where: scopeWhere(authUser, id, claimId),
    });
    if (!claim) {
      return NextResponse.json({ error: 'Warranty claim not found' }, { status: 404 });
    }

    // Block re-resolution of terminal claims
    if (['approved', 'denied', 'resolved'].includes(claim.status)) {
      return NextResponse.json(
        { error: `Claim is already resolved (status: ${claim.status})` },
        { status: 409 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      resolution,
      resolutionType,
      resolutionNotes,
      assignedToId,
      createJob,
      jobTitle,
      jobType,
      jobPriority,
    } = body as Record<string, unknown>;

    if (
      typeof resolution !== 'string' ||
      !VALID_RESOLUTIONS.includes(resolution as (typeof VALID_RESOLUTIONS)[number])
    ) {
      return NextResponse.json(
        { error: `resolution is required and must be one of: ${VALID_RESOLUTIONS.join(', ')}` },
        { status: 400 },
      );
    }

    // resolutionType validation
    let finalResolutionType: string | null = null;
    if (resolution === 'approve' || resolution === 'complete') {
      if (
        typeof resolutionType !== 'string' ||
        !VALID_RESOLUTION_TYPES.includes(resolutionType as (typeof VALID_RESOLUTION_TYPES)[number])
      ) {
        return NextResponse.json(
          {
            error: `resolutionType is required for '${resolution}' and must be one of: ${VALID_RESOLUTION_TYPES.join(', ')}`,
          },
          { status: 400 },
        );
      }
      finalResolutionType = resolutionType;
    } else if (resolution === 'deny') {
      finalResolutionType = 'deny';
    }

    // Resolve assigned tech name if provided
    let assignedToName: string | null = claim.assignedToName;
    if (typeof assignedToId === 'string' && assignedToId.trim()) {
      try {
        const emp = await db.employee.findUnique({
          where: { id: assignedToId.trim() },
          select: { name: true },
        });
        assignedToName = emp?.name ?? null;
      } catch {
        // ignore
      }
    }

    // Determine the target status
    const targetStatus = resolution === 'approve' ? 'approved' : resolution === 'deny' ? 'denied' : 'resolved';

    // Determine whether to create a Job
    const shouldCreateJob =
      resolution === 'approve'
        ? createJob !== false // default true on approve
        : createJob === true; // default false on deny/complete

    // ── Atomic: update claim, optionally create Job, optionally bump claimsUsed ──
    // Use a holder object so the assignment inside the transaction closure
    // is visible to the outer scope (TS doesn't widen `let` narrowing through
    // closures, so a direct `let newJob` would be narrowed to `null` outside).
    const result: {
      job: { id: string; jobNumber: string | null; title: string; status: string } | null;
    } = { job: null };

    await db.$transaction(async (tx) => {
      // 1. Update the claim
      await tx.warrantyClaim.update({
        where: { id: claimId },
        data: {
          status: targetStatus,
          resolutionType: finalResolutionType,
          resolutionNotes:
            typeof resolutionNotes === 'string' && resolutionNotes.trim() ? resolutionNotes.trim() : null,
          resolvedAt: new Date(),
          resolvedById: authUser.id,
          resolvedByName: authUser.name || authUser.email,
          assignedToId: typeof assignedToId === 'string' && assignedToId.trim() ? assignedToId.trim() : claim.assignedToId,
          assignedToName,
        },
      });

      // 2. Bump claimsUsed on the Warranty if approved
      if (resolution === 'approve') {
        await tx.warranty.update({
          where: { id },
          data: { claimsUsed: { increment: 1 } },
        });
      }

      // 3. Optionally create a Job for the warranty repair
      if (shouldCreateJob && (resolution === 'approve' || resolution === 'complete')) {
        if (typeof assignedToId !== 'string' || !assignedToId.trim()) {
          // We won't hard-fail inside the tx; the caller should pass assignedToId
          // when createJob=true. Log a warning and skip job creation.
          log.warn(
            { warrantyId: id, claimId },
            'createJob=true but no assignedToId provided — skipping job creation',
          );
          return;
        }

        // Resolve workspace
        const warranty = await tx.warranty.findUnique({ where: { id } });
        const workspaceId = await resolveWorkspaceIdForTenant(
          warranty?.tenantId ?? authUser.tenantId,
          authUser.workspaceId,
        );
        if (!workspaceId) {
          log.warn(
            { warrantyId: id, claimId },
            'No workspace resolved — skipping job creation',
          );
          return;
        }

        const finalJobType =
          typeof jobType === 'string' && VALID_JOB_TYPES.includes(jobType) ? jobType : 'repair';
        const finalJobPriority =
          typeof jobPriority === 'string' && VALID_JOB_PRIORITIES.includes(jobPriority)
            ? jobPriority
            : 'high';
        const finalJobTitle =
          typeof jobTitle === 'string' && jobTitle.trim()
            ? jobTitle.trim().slice(0, 300)
            : `Warranty repair: ${claim.title}`;

        const jobId = crypto.randomUUID();
        const createdJob = await tx.job.create({
          data: {
            id: jobId,
            title: finalJobTitle,
            description: claim.description || `Warranty claim ${claim.id} for warranty ${id}`,
            status: 'pending',
            priority: finalJobPriority,
            type: finalJobType,
            customerId: claim.customerId ?? warranty?.customerId ?? null,
            customerName: claim.customerName ?? warranty?.customerName ?? null,
            customerPhone: claim.customerPhone ?? warranty?.customerPhone ?? null,
            assigneeId: assignedToId,
            assigneeName: assignedToName,
            notes: `Created from warranty claim ${claim.id} (resolution: ${resolution}${finalResolutionType ? ', type: ' + finalResolutionType : ''})`,
            workspaceId,
          },
          select: { id: true, jobNumber: true, title: true, status: true },
        });

        // Link the claim to the new Job
        await tx.warrantyClaim.update({
          where: { id: claimId },
          data: { jobId: createdJob.id },
        });

        result.job = createdJob;
      }
    });

    const newJob = result.job;

    // Re-fetch the updated claim for the response
    const updatedClaim = await db.warrantyClaim.findUnique({ where: { id: claimId } });
    const updatedWarranty = await db.warranty.findUnique({
      where: { id },
      select: { id: true, claimsUsed: true, maxClaims: true, isActive: true },
    });

    log.info(
      {
        userId: authUser.id,
        warrantyId: id,
        claimId,
        resolution,
        targetStatus,
        resolutionType: finalResolutionType,
        jobId: newJob?.id ?? null,
        claimsUsed: updatedWarranty?.claimsUsed ?? null,
      },
      'Warranty claim resolved',
    );

    return NextResponse.json({
      success: true,
      claim: updatedClaim,
      warranty: updatedWarranty,
      job: newJob,
      resolution,
      resolutionType: finalResolutionType,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to resolve warranty claim');
    const message = error instanceof Error ? error.message : 'Failed to resolve warranty claim';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
