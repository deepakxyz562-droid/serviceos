import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Single Assessment API
 * ----------------------
 * GET    /api/assessments/[id]   — fetch an assessment (with related job/lead/customer)
 * PATCH  /api/assessments/[id]   — update assessment fields
 * DELETE /api/assessments/[id]   — delete assessment (only when status === 'scheduled')
 *
 * Auth required + tenant scoping enforced on every operation.
 */

const VALID_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;

/**
 * Build a tenant-scoped where clause for a single assessment lookup.
 * Super admins bypass the tenantId filter (they can read any tenant's data).
 */
function scopeWhere(authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>, id: string) {
  const where: Record<string, unknown> = { id };
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/assessments/[id]
 * Returns the assessment with related Job, Lead, Customer.
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
      return NextResponse.json({ error: 'Assessment id is required' }, { status: 400 });
    }

    const assessment = await db.assessment.findFirst({
      where: scopeWhere(authUser, id),
      include: {
        tenant: { select: { id: true, name: true, currency: true } },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Eager-load related Job, Lead, Customer as parallel best-effort lookups
    // (Assessment has no Prisma relation fields for these — only FK strings).
    const [job, lead, customer] = await Promise.all([
      assessment.jobId
        ? db.job
            .findUnique({
              where: { id: assessment.jobId },
              select: {
                id: true,
                jobNumber: true,
                title: true,
                status: true,
                priority: true,
                type: true,
                address: true,
                scheduledAt: true,
                customerId: true,
                customerName: true,
                customerPhone: true,
                assigneeId: true,
                assigneeName: true,
              },
            })
            .catch(() => null)
        : Promise.resolve(null),
      assessment.leadId
        ? db.lead
            .findUnique({
              where: { id: assessment.leadId },
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                source: true,
                status: true,
                serviceType: true,
                value: true,
                description: true,
              },
            })
            .catch(() => null)
        : Promise.resolve(null),
      assessment.customerId
        ? db.customer
            .findUnique({
              where: { id: assessment.customerId },
              select: { id: true, name: true, phone: true, email: true, address: true },
            })
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ assessment, job, lead, customer });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch assessment');
    const message = error instanceof Error ? error.message : 'Failed to fetch assessment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/assessments/[id]
 * Updatable fields: status, findings, measurements, photos, signature, notes,
 *   description, scheduledAt, inspectorId, checklistId, checklistResponses,
 *   estimatedDurationMins, estimatedCost, currency, customerName/Phone/Email,
 *   address, title, type
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
      return NextResponse.json({ error: 'Assessment id is required' }, { status: 400 });
    }

    const existing = await db.assessment.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    // Basic fields
    if (typeof body.title === 'string' && body.title.trim()) updateData.title = body.title.trim();
    if (typeof body.description === 'string') updateData.description = body.description.trim() || null;
    if (typeof body.type === 'string') updateData.type = body.type;
    if (typeof body.address === 'string') updateData.address = body.address.trim() || null;
    if (typeof body.notes === 'string') updateData.notes = body.notes.trim() || null;
    if (typeof body.currency === 'string') updateData.currency = body.currency;

    // Status (validated against enum)
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

    // Schedule + inspector + checklist
    if (body.scheduledAt !== undefined) {
      updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
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

    // JSON-serialised rich fields
    if (body.findings !== undefined) {
      updateData.findingsJson = JSON.stringify(Array.isArray(body.findings) ? body.findings : []);
    }
    if (body.measurements !== undefined) {
      updateData.measurementsJson = JSON.stringify(
        body.measurements && typeof body.measurements === 'object' ? body.measurements : {},
      );
    }
    if (body.photos !== undefined) {
      updateData.photosJson = JSON.stringify(Array.isArray(body.photos) ? body.photos : []);
    }
    if (body.checklistResponses !== undefined) {
      updateData.checklistResponsesJson = JSON.stringify(
        body.checklistResponses && typeof body.checklistResponses === 'object'
          ? body.checklistResponses
          : {},
      );
    }

    // Customer signature
    if (body.signatureUrl !== undefined) {
      updateData.signatureUrl =
        typeof body.signatureUrl === 'string' && body.signatureUrl.trim()
          ? body.signatureUrl
          : null;
      if (body.signatureUrl) updateData.signedAt = new Date();
      if (typeof body.signedByName === 'string') {
        updateData.signedByName = body.signedByName;
      } else if (authUser.name) {
        updateData.signedByName = authUser.name;
      }
    }

    // Estimates
    if (body.estimatedDurationMins !== undefined) {
      updateData.estimatedDurationMins =
        body.estimatedDurationMins === null || body.estimatedDurationMins === ''
          ? null
          : Number(body.estimatedDurationMins) || null;
    }
    if (body.estimatedCost !== undefined) {
      updateData.estimatedCost =
        body.estimatedCost === null || body.estimatedCost === ''
          ? null
          : Number(body.estimatedCost) || null;
    }

    // Customer denormalised fields
    if (typeof body.customerName === 'string') updateData.customerName = body.customerName || null;
    if (typeof body.customerPhone === 'string') updateData.customerPhone = body.customerPhone || null;
    if (typeof body.customerEmail === 'string') updateData.customerEmail = body.customerEmail || null;

    const assessment = await db.assessment.update({
      where: { id },
      data: updateData,
    });

    log.info(
      { userId: authUser.id, assessmentId: id, fields: Object.keys(updateData) },
      'Assessment updated',
    );

    return NextResponse.json({ assessment });
  } catch (error) {
    log.error({ err: error }, 'Failed to update assessment');
    const message = error instanceof Error ? error.message : 'Failed to update assessment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/assessments/[id]
 * Only allowed when status === 'scheduled'. Otherwise return 409 Conflict.
 */
export async function DELETE(
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
      return NextResponse.json({ error: 'Assessment id is required' }, { status: 400 });
    }

    const existing = await db.assessment.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (existing.status !== 'scheduled') {
      return NextResponse.json(
        {
          error: `Cannot delete assessment in status "${existing.status}". Only assessments in "scheduled" status can be deleted.`,
          status: existing.status,
        },
        { status: 409 },
      );
    }

    await db.assessment.delete({ where: { id } });

    log.info({ userId: authUser.id, assessmentId: id }, 'Assessment deleted');

    return NextResponse.json({ success: true, id });
  } catch (error) {
    log.error({ err: error }, 'Failed to delete assessment');
    const message = error instanceof Error ? error.message : 'Failed to delete assessment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
