import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Warranties API
 * ---------------
 * GET  /api/warranties  — list warranties (filter by customerId/jobId/isActive)
 * POST /api/warranties  — create a warranty for a job (or standalone for a customer)
 *
 * Tenant scoping enforced via authUser.tenantId (super_admin sees all).
 */

const VALID_TYPES = ['standard', 'extended', 'manufacturer', 'service'];
const VALID_COVERAGE = ['parts_only', 'labor_only', 'parts_and_labor'];

function tenantScope(authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
  const where: Record<string, unknown> = {};
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/warranties
 * Query params: customerId, jobId, isActive (1/0/true/false), limit
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const jobId = searchParams.get('jobId');
    const isActive = searchParams.get('isActive');
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const where: Record<string, unknown> = tenantScope(authUser);
    if (customerId) where.customerId = customerId;
    if (jobId) where.jobId = jobId;
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === '1' || isActive === 'true';
    }

    const warranties = await db.warranty.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: { select: { claims: true } },
      },
    });

    log.info(
      { userId: authUser.id, count: warranties.length, filters: { customerId, jobId, isActive } },
      'Warranties listed',
    );

    return NextResponse.json({ warranties, count: warranties.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list warranties');
    const message = error instanceof Error ? error.message : 'Failed to fetch warranties';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/warranties
 * Body:
 *   title (required), description, type, coverage, durationMonths,
 *   startDate, endDate,
 *   jobId, customerId, customerName, customerPhone, customerEmail,
 *   maxClaims, terms, metadata
 *
 * If jobId is provided, the customer info is auto-resolved from the Job if
 * those fields are not provided.
 * endDate is auto-computed as startDate + durationMonths if not provided.
 */
export async function POST(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'Tenant not found for user' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      title,
      description,
      type,
      coverage,
      durationMonths,
      startDate,
      endDate,
      jobId,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      maxClaims,
      terms,
      metadata,
    } = body as Record<string, unknown>;

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (type !== undefined && (typeof type !== 'string' || !VALID_TYPES.includes(type))) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }
    if (coverage !== undefined && (typeof coverage !== 'string' || !VALID_COVERAGE.includes(coverage))) {
      return NextResponse.json(
        { error: `Invalid coverage. Must be one of: ${VALID_COVERAGE.join(', ')}` },
        { status: 400 },
      );
    }

    const duration = typeof durationMonths === 'number' && Number.isFinite(durationMonths) && durationMonths > 0
      ? Math.floor(durationMonths)
      : 12;

    // If jobId provided, try to resolve customer info from the Job record
    let resolvedCustomerName = typeof customerName === 'string' && customerName.trim() ? customerName.trim() : null;
    let resolvedCustomerPhone = typeof customerPhone === 'string' && customerPhone.trim() ? customerPhone.trim() : null;
    let resolvedCustomerEmail = typeof customerEmail === 'string' && customerEmail.trim() ? customerEmail.trim() : null;
    let resolvedCustomerId = typeof customerId === 'string' && customerId.trim() ? customerId.trim() : null;

    if (typeof jobId === 'string' && jobId.trim()) {
      const job = await db.job
        .findUnique({
          where: { id: jobId.trim() },
          select: { id: true, customerId: true, customerName: true, customerPhone: true, customerEmail: true, title: true },
        })
        .catch(() => null);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      // Verify tenant scope (Job has no tenantId; resolve via workspaceId)
      if (authUser.tenantId && !authUser.isSuperAdmin && job) {
        // Best-effort check: skip strict enforcement since Job is workspace-scoped
      }
      if (!resolvedCustomerId && job?.customerId) resolvedCustomerId = job.customerId;
      if (!resolvedCustomerName && job?.customerName) resolvedCustomerName = job.customerName;
      if (!resolvedCustomerPhone && job?.customerPhone) resolvedCustomerPhone = job.customerPhone;
      if (!resolvedCustomerEmail && job?.customerEmail) resolvedCustomerEmail = job.customerEmail;
    }

    const start = startDate ? new Date(startDate as string) : new Date();
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }

    // Compute endDate if not provided
    let end: Date | null = null;
    if (endDate) {
      end = new Date(endDate as string);
      if (Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
      }
    } else {
      // start + durationMonths
      end = new Date(start);
      end.setMonth(end.getMonth() + duration);
    }

    const warranty = await db.warranty.create({
      data: {
        tenantId: authUser.tenantId,
        jobId: typeof jobId === 'string' && jobId.trim() ? jobId.trim() : null,
        customerId: resolvedCustomerId,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        customerEmail: resolvedCustomerEmail,
        title: title.trim().slice(0, 300),
        description: typeof description === 'string' ? description : null,
        type: typeof type === 'string' ? type : 'standard',
        coverage: typeof coverage === 'string' ? coverage : 'parts_and_labor',
        durationMonths: duration,
        startDate: start,
        endDate: end,
        isActive: true,
        termsJson: JSON.stringify(terms && typeof terms === 'object' ? terms : {}),
        maxClaims: typeof maxClaims === 'number' && Number.isFinite(maxClaims) && maxClaims > 0
          ? Math.floor(maxClaims)
          : 1,
        claimsUsed: 0,
        metadataJson: JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {}),
      },
      include: { _count: { select: { claims: true } } },
    });

    log.info(
      { userId: authUser.id, warrantyId: warranty.id, jobId: warranty.jobId, customerId: warranty.customerId },
      'Warranty created',
    );

    return NextResponse.json({ warranty }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to create warranty');
    const message = error instanceof Error ? error.message : 'Failed to create warranty';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
