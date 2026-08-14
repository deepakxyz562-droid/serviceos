import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { resolveFallbackTenantId } from '@/lib/tenant-resolver';

/**
 * Assessments API
 * ----------------
 * GET  /api/assessments            — list assessments for the tenant
 * POST /api/assessments            — create a new assessment
 *
 * Tenant scoping: enforced via authUser.tenantId (super_admin sees all).
 * Filters (GET): jobId, leadId, customerId, status
 */

const VALID_TYPES = [
  'inspection',
  'estimate',
  'site_survey',
  'damage_assessment',
  'warranty_check',
] as const;

const VALID_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;



/**
 * GET /api/assessments
 * Query params:
 *   jobId, leadId, customerId, status — optional filters
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
    const leadId = searchParams.get('leadId');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    // Build the where clause. Super admins see everything; everyone else is scoped.
    const where: Record<string, unknown> = {};
    if (authUser.tenantId && !authUser.isSuperAdmin) {
      where.tenantId = authUser.tenantId;
    }
    if (jobId) where.jobId = jobId;
    if (leadId) where.leadId = leadId;
    if (customerId) where.customerId = customerId;
    if (status) {
      if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      where.status = status;
    }

    const assessments = await db.assessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        tenant: { select: { id: true, name: true, currency: true } },
      },
    });

    log.info(
      { userId: authUser.id, count: assessments.length, filters: { jobId, leadId, customerId, status } },
      'Assessments listed',
    );

    return NextResponse.json({ assessments, count: assessments.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list assessments');
    const message = error instanceof Error ? error.message : 'Failed to fetch assessments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/assessments
 * Body:
 *   type, title, customerId, address, scheduledAt, inspectorId, checklistId,
 *   estimatedDurationMins, estimatedCost, description, jobId, leadId, currency
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

    const {
      type = 'inspection',
      title,
      description,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      address,
      scheduledAt,
      inspectorId,
      checklistId,
      estimatedDurationMins,
      estimatedCost,
      currency = 'USD',
      jobId,
      leadId,
      notes,
    } = body as Record<string, unknown>;

    // Validate required fields
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Resolve inspector name from Employee if inspectorId is supplied.
    let inspectorName: string | null = null;
    if (typeof inspectorId === 'string' && inspectorId.trim()) {
      try {
        const emp = await db.employee.findUnique({
          where: { id: inspectorId },
          select: { name: true },
        });
        inspectorName = emp?.name ?? null;
      } catch {
        // ignore — name will stay null
      }
    }

    // Optionally resolve customer denormalized fields if only customerId was passed.
    let resolvedCustomerName = typeof customerName === 'string' ? customerName : null;
    let resolvedCustomerPhone = typeof customerPhone === 'string' ? customerPhone : null;
    let resolvedCustomerEmail = typeof customerEmail === 'string' ? customerEmail : null;
    if (typeof customerId === 'string' && customerId.trim() && !resolvedCustomerName) {
      try {
        const cust = await db.customer.findUnique({
          where: { id: customerId },
          select: { name: true, phone: true, email: true },
        });
        if (cust) {
          resolvedCustomerName = cust.name;
          resolvedCustomerPhone = cust.phone ?? null;
          resolvedCustomerEmail = cust.email ?? null;
        }
      } catch {
        // ignore — denormalised fields stay null
      }
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt as string) : null;
    if (scheduledAt && Number.isNaN(scheduledDate?.getTime() ?? NaN)) {
      return NextResponse.json({ error: 'scheduledAt is not a valid date' }, { status: 400 });
    }

    const assessment = await db.assessment.create({
      data: {
        tenantId,
        jobId: typeof jobId === 'string' && jobId.trim() ? jobId : null,
        leadId: typeof leadId === 'string' && leadId.trim() ? leadId : null,
        customerId: typeof customerId === 'string' && customerId.trim() ? customerId : null,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        customerEmail: resolvedCustomerEmail,
        address: typeof address === 'string' ? address.trim() || null : null,
        type: type as string,
        title: String(title).trim(),
        description: typeof description === 'string' ? description.trim() || null : null,
        status: 'scheduled',
        scheduledAt: scheduledDate,
        inspectorId: typeof inspectorId === 'string' && inspectorId.trim() ? inspectorId : null,
        inspectorName,
        checklistId: typeof checklistId === 'string' && checklistId.trim() ? checklistId : null,
        estimatedDurationMins:
          estimatedDurationMins != null && estimatedDurationMins !== ''
            ? Number(estimatedDurationMins) || null
            : null,
        estimatedCost:
          estimatedCost != null && estimatedCost !== '' ? Number(estimatedCost) || null : null,
        currency: typeof currency === 'string' ? currency : 'USD',
        notes: typeof notes === 'string' ? notes.trim() || null : null,
      },
    });

    log.info(
      { userId: authUser.id, assessmentId: assessment.id, tenantId },
      'Assessment created',
    );

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to create assessment');
    const message = error instanceof Error ? error.message : 'Failed to create assessment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
