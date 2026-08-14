import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { resolveFallbackTenantId } from '@/lib/tenant-resolver';

/**
 * Quality Inspections API
 * ------------------------
 * GET  /api/quality-inspections           — list QC inspections for the tenant
 * POST /api/quality-inspections           — create a new QC inspection
 *
 * Tenant scoping enforced via authUser.tenantId (super_admin sees all).
 * Filters (GET): jobId, status, inspectorId
 */

const VALID_STATUSES = ['pending', 'passed', 'failed', 'needs_rework'] as const;



/**
 * GET /api/quality-inspections
 * Query params:
 *   jobId, status, inspectorId — optional filters
 *   limit (default 100, max 500)
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status');
    const inspectorId = searchParams.get('inspectorId');
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const where: Record<string, unknown> = {};
    if (authUser.tenantId && !authUser.isSuperAdmin) {
      where.tenantId = authUser.tenantId;
    }
    if (jobId) where.jobId = jobId;
    if (inspectorId) where.inspectorId = inspectorId;
    if (status) {
      if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      where.status = status;
    }

    const inspections = await db.qualityInspection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    log.info(
      {
        userId: authUser.id,
        count: inspections.length,
        filters: { jobId, status, inspectorId },
      },
      'Quality inspections listed',
    );

    return NextResponse.json({ inspections, count: inspections.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list quality inspections');
    const message = error instanceof Error ? error.message : 'Failed to fetch quality inspections';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/quality-inspections
 * Body:
 *   jobId (required), inspectorId, checklistId, notes, metadata
 *
 * Creates a new QC inspection in status="pending" linked to a job.
 */
export async function POST(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = await resolveFallbackTenantId(authUser);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { jobId, inspectorId, checklistId, reworkNotes, metadata } = body as Record<string, unknown>;

    if (typeof jobId !== 'string' || !jobId.trim()) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    // Verify the job exists. (Job has no tenantId column — it links via
    // workspaceId, so we just check existence by id.)
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, status: true, workspaceId: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Resolve inspector name
    let inspectorName: string | null = null;
    if (typeof inspectorId === 'string' && inspectorId.trim()) {
      try {
        const emp = await db.employee.findUnique({
          where: { id: inspectorId },
          select: { name: true },
        });
        inspectorName = emp?.name ?? null;
      } catch {
        // ignore
      }
    }

    const inspection = await db.qualityInspection.create({
      data: {
        tenantId,
        jobId,
        inspectorId: typeof inspectorId === 'string' && inspectorId.trim() ? inspectorId : null,
        inspectorName,
        checklistId: typeof checklistId === 'string' && checklistId.trim() ? checklistId : null,
        status: 'pending',
        reworkNotes: typeof reworkNotes === 'string' ? reworkNotes.trim() || null : null,
        metadataJson: JSON.stringify(metadata ?? {}),
      },
    });

    log.info(
      {
        userId: authUser.id,
        inspectionId: inspection.id,
        jobId,
        tenantId,
      },
      'Quality inspection created',
    );

    return NextResponse.json({ inspection }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to create quality inspection');
    const message = error instanceof Error ? error.message : 'Failed to create quality inspection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
