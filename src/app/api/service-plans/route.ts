import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Service Plans API
 * ------------------
 * GET  /api/service-plans  — list service plans (filter by industry/isActive)
 * POST /api/service-plans  — create a new service plan
 *
 * Tenant scoping enforced via authUser.tenantId (super_admin sees all).
 */

const VALID_BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'];

function tenantScope(authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
  const where: Record<string, unknown> = {};
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/service-plans
 * Query params: industry, isActive (1/0/true/false), limit
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry');
    const isActive = searchParams.get('isActive');
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const where: Record<string, unknown> = tenantScope(authUser);
    if (industry) where.industry = industry;
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === '1' || isActive === 'true';
    }

    const plans = await db.servicePlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { _count: { select: { subscriptions: true } } },
    });

    log.info(
      { userId: authUser.id, count: plans.length, filters: { industry, isActive } },
      'Service plans listed',
    );

    return NextResponse.json({ plans, count: plans.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list service plans');
    const message = error instanceof Error ? error.message : 'Failed to fetch service plans';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/service-plans
 * Body:
 *   name (required), description, industry,
 *   price, currency, billingCycle, setupFee,
 *   inspectionsPerYear, prioritySupport, discountPct, emergencyVisits,
 *   features (string[]), contractLengthMonths, autoRenew,
 *   cancellationNoticeDays, metadata
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
      name,
      description,
      industry,
      price,
      currency,
      billingCycle,
      setupFee,
      inspectionsPerYear,
      prioritySupport,
      discountPct,
      emergencyVisits,
      features,
      contractLengthMonths,
      autoRenew,
      cancellationNoticeDays,
      metadata,
    } = body as Record<string, unknown>;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (billingCycle !== undefined && (typeof billingCycle !== 'string' || !VALID_BILLING_CYCLES.includes(billingCycle))) {
      return NextResponse.json(
        { error: `Invalid billingCycle. Must be one of: ${VALID_BILLING_CYCLES.join(', ')}` },
        { status: 400 },
      );
    }

    if (price !== undefined) {
      const v = Number(price);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
      }
    }
    if (setupFee !== undefined) {
      const v = Number(setupFee);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'setupFee must be a non-negative number' }, { status: 400 });
      }
    }
    if (discountPct !== undefined) {
      const v = Number(discountPct);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        return NextResponse.json({ error: 'discountPct must be a number between 0 and 100' }, { status: 400 });
      }
    }

    const plan = await db.servicePlan.create({
      data: {
        tenantId: authUser.tenantId,
        name: name.trim().slice(0, 200),
        description: typeof description === 'string' ? description : null,
        industry: typeof industry === 'string' && industry.trim() ? industry.trim() : null,
        price: typeof price === 'number' && Number.isFinite(price) ? price : 0,
        currency: typeof currency === 'string' && currency.trim() ? currency.trim().slice(0, 8) : 'USD',
        billingCycle: typeof billingCycle === 'string' ? billingCycle : 'monthly',
        setupFee: typeof setupFee === 'number' && Number.isFinite(setupFee) ? setupFee : 0,
        inspectionsPerYear:
          typeof inspectionsPerYear === 'number' && Number.isFinite(inspectionsPerYear)
            ? Math.max(0, Math.floor(inspectionsPerYear))
            : 2,
        prioritySupport: typeof prioritySupport === 'boolean' ? prioritySupport : true,
        discountPct: typeof discountPct === 'number' && Number.isFinite(discountPct) ? discountPct : 10,
        emergencyVisits:
          typeof emergencyVisits === 'number' && Number.isFinite(emergencyVisits)
            ? Math.max(0, Math.floor(emergencyVisits))
            : 0,
        featuresJson: JSON.stringify(Array.isArray(features) ? features : []),
        contractLengthMonths:
          typeof contractLengthMonths === 'number' && Number.isFinite(contractLengthMonths) && contractLengthMonths > 0
            ? Math.floor(contractLengthMonths)
            : null,
        autoRenew: typeof autoRenew === 'boolean' ? autoRenew : true,
        cancellationNoticeDays:
          typeof cancellationNoticeDays === 'number' && Number.isFinite(cancellationNoticeDays)
            ? Math.max(0, Math.floor(cancellationNoticeDays))
            : 30,
        isActive: true,
      },
      include: { _count: { select: { subscriptions: true } } },
    });

    log.info({ userId: authUser.id, planId: plan.id }, 'Service plan created');

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to create service plan');
    const message = error instanceof Error ? error.message : 'Failed to create service plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
