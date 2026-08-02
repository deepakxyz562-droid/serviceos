import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Single Quality Inspection API
 * -----------------------------
 * GET   /api/quality-inspections/[id]  — fetch a QC inspection
 * PATCH /api/quality-inspections/[id]  — update a QC inspection
 *
 * Auth required + tenant scoping enforced on every operation.
 *
 * Updatable PATCH fields: status, responses, score, findings, photos,
 *   reworkNotes, inspectorId, checklistId, customerNotifiedAt, metadata
 */

const VALID_STATUSES = ['pending', 'passed', 'failed', 'needs_rework'] as const;

function scopeWhere(
  authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>,
  id: string,
) {
  const where: Record<string, unknown> = { id };
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/quality-inspections/[id]
 * Returns the inspection with the related Job.
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Inspection id is required' }, { status: 400 });
    }

    const inspection = await db.qualityInspection.findFirst({
      where: scopeWhere(authUser, id),
    });
    if (!inspection) {
      return NextResponse.json({ error: 'Quality inspection not found' }, { status: 404 });
    }

    // Eager-load related Job (QualityInspection has no Prisma relation to Job — only jobId FK).
    const job = inspection.jobId
      ? await db.job
          .findUnique({
            where: { id: inspection.jobId },
            select: {
              id: true,
              jobNumber: true,
              title: true,
              status: true,
              priority: true,
              type: true,
              address: true,
              customerName: true,
              customerPhone: true,
              assigneeName: true,
              scheduledAt: true,
            },
          })
          .catch(() => null)
      : null;

    return NextResponse.json({ inspection, job });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch quality inspection');
    const message = error instanceof Error ? error.message : 'Failed to fetch quality inspection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/quality-inspections/[id]
 * Body:
 *   status, responses, score, findings, photos, reworkNotes,
 *   inspectorId, checklistId, customerNotifiedAt, metadata
 */
export async function PATCH(
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

    const existing = await db.qualityInspection.findFirst({
      where: scopeWhere(authUser, id),
    });
    if (!existing) {
      return NextResponse.json({ error: 'Quality inspection not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (
        typeof body.status !== 'string' ||
        !VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])
      ) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.status = body.status;
    }

    if (body.responses !== undefined) {
      updateData.responsesJson = JSON.stringify(
        body.responses && typeof body.responses === 'object' ? body.responses : {},
      );
    }
    if (body.score !== undefined) {
      const scoreNum = Number(body.score);
      if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        return NextResponse.json(
          { error: 'score must be a number between 0 and 100' },
          { status: 400 },
        );
      }
      updateData.score = Math.round(scoreNum);
    }
    if (body.findings !== undefined) {
      updateData.findingsJson = JSON.stringify(Array.isArray(body.findings) ? body.findings : []);
    }
    if (body.photos !== undefined) {
      updateData.photosJson = JSON.stringify(Array.isArray(body.photos) ? body.photos : []);
    }
    if (body.reworkNotes !== undefined) {
      updateData.reworkNotes =
        typeof body.reworkNotes === 'string' ? body.reworkNotes.trim() || null : null;
    }
    if (body.inspectorId !== undefined) {
      const inspId =
        typeof body.inspectorId === 'string' && body.inspectorId.trim()
          ? body.inspectorId
          : null;
      updateData.inspectorId = inspId;
      if (inspId) {
        try {
          const emp = await db.employee.findUnique({
            where: { id: inspId },
            select: { name: true },
          });
          updateData.inspectorName = emp?.name ?? null;
        } catch {
          // ignore
        }
      } else {
        updateData.inspectorName = null;
      }
    }
    if (body.checklistId !== undefined) {
      updateData.checklistId =
        typeof body.checklistId === 'string' && body.checklistId.trim()
          ? body.checklistId
          : null;
    }
    if (body.customerNotifiedAt !== undefined) {
      updateData.customerNotifiedAt = body.customerNotifiedAt
        ? new Date(body.customerNotifiedAt)
        : null;
    }
    if (body.metadata !== undefined) {
      updateData.metadataJson = JSON.stringify(
        body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      );
    }

    const inspection = await db.qualityInspection.update({
      where: { id },
      data: updateData,
    });

    log.info(
      { userId: authUser.id, inspectionId: id, fields: Object.keys(updateData) },
      'Quality inspection updated',
    );

    return NextResponse.json({ inspection });
  } catch (error) {
    log.error({ err: error }, 'Failed to update quality inspection');
    const message = error instanceof Error ? error.message : 'Failed to update quality inspection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
