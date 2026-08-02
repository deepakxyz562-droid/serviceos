import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Single Service Plan API
 * ------------------------
 * GET    /api/service-plans/[id]  — fetch a plan (with subscription count)
 * PATCH  /api/service-plans/[id]  — update plan fields
 * DELETE /api/service-plans/[id]  — soft delete (set isActive=false)
 *
 * Tenant scoping enforced on every read/write.
 */

const VALID_BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'];

function scopeWhere(
  authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>,
  id: string,
): Record<string, unknown> {
  const where: Record<string, unknown> = { id };
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/service-plans/[id]
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
      return NextResponse.json({ error: 'Plan id is required' }, { status: 400 });
    }

    const plan = await db.servicePlan.findFirst({
      where: scopeWhere(authUser, id),
      include: {
        _count: { select: { subscriptions: true } },
        subscriptions: {
          where: { status: 'active' },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            customerId: true,
            customerName: true,
            customerPhone: true,
            customerEmail: true,
            status: true,
            startDate: true,
            nextBillingDate: true,
          },
        },
      },
    });
    if (!plan) {
      return NextResponse.json({ error: 'Service plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch service plan');
    const message = error instanceof Error ? error.message : 'Failed to fetch service plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/service-plans/[id]
 * Updatable fields: name, description, industry, price, currency, billingCycle,
 *   setupFee, inspectionsPerYear, prioritySupport, discountPct, emergencyVisits,
 *   features, contractLengthMonths, autoRenew, cancellationNoticeDays,
 *   isActive, metadata
 *
 * NOTE: Changes do NOT propagate to existing subscriptions (their price is
 * snapshotted at subscription time). The caller must separately update
 * subscriptions if they want changes to apply retroactively.
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
      return NextResponse.json({ error: 'Plan id is required' }, { status: 400 });
    }

    const existing = await db.servicePlan.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Service plan not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim().slice(0, 200);
    }
    if (body.description !== undefined) {
      updateData.description = typeof body.description === 'string' ? body.description : null;
    }
    if (body.industry !== undefined) {
      updateData.industry =
        typeof body.industry === 'string' && body.industry.trim() ? body.industry.trim() : null;
    }
    if (body.price !== undefined) {
      const v = Number(body.price);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
      }
      updateData.price = v;
    }
    if (typeof body.currency === 'string' && body.currency.trim()) {
      updateData.currency = body.currency.trim().slice(0, 8);
    }
    if (body.billingCycle !== undefined) {
      if (typeof body.billingCycle !== 'string' || !VALID_BILLING_CYCLES.includes(body.billingCycle)) {
        return NextResponse.json(
          { error: `Invalid billingCycle. Must be one of: ${VALID_BILLING_CYCLES.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.billingCycle = body.billingCycle;
    }
    if (body.setupFee !== undefined) {
      const v = Number(body.setupFee);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'setupFee must be a non-negative number' }, { status: 400 });
      }
      updateData.setupFee = v;
    }
    if (body.inspectionsPerYear !== undefined) {
      const v = Number(body.inspectionsPerYear);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'inspectionsPerYear must be a non-negative number' }, { status: 400 });
      }
      updateData.inspectionsPerYear = Math.floor(v);
    }
    if (body.prioritySupport !== undefined) {
      updateData.prioritySupport = Boolean(body.prioritySupport);
    }
    if (body.discountPct !== undefined) {
      const v = Number(body.discountPct);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        return NextResponse.json({ error: 'discountPct must be between 0 and 100' }, { status: 400 });
      }
      updateData.discountPct = v;
    }
    if (body.emergencyVisits !== undefined) {
      const v = Number(body.emergencyVisits);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'emergencyVisits must be a non-negative number' }, { status: 400 });
      }
      updateData.emergencyVisits = Math.floor(v);
    }
    if (body.features !== undefined) {
      updateData.featuresJson = JSON.stringify(Array.isArray(body.features) ? body.features : []);
    }
    if (body.contractLengthMonths !== undefined) {
      const v = Number(body.contractLengthMonths);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'contractLengthMonths must be a non-negative number' }, { status: 400 });
      }
      updateData.contractLengthMonths = v > 0 ? Math.floor(v) : null;
    }
    if (body.autoRenew !== undefined) {
      updateData.autoRenew = Boolean(body.autoRenew);
    }
    if (body.cancellationNoticeDays !== undefined) {
      const v = Number(body.cancellationNoticeDays);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'cancellationNoticeDays must be a non-negative number' }, { status: 400 });
      }
      updateData.cancellationNoticeDays = Math.floor(v);
    }
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }

    const plan = await db.servicePlan.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { subscriptions: true } } },
    });

    log.info(
      { userId: authUser.id, planId: id, fields: Object.keys(updateData) },
      'Service plan updated',
    );

    return NextResponse.json({ plan });
  } catch (error) {
    log.error({ err: error }, 'Failed to update service plan');
    const message = error instanceof Error ? error.message : 'Failed to update service plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/service-plans/[id]
 * Soft-delete: set isActive=false. Existing subscriptions are preserved so
 * historical data isn't lost. Callers should reject new subscriptions to
 * inactive plans.
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
      return NextResponse.json({ error: 'Plan id is required' }, { status: 400 });
    }

    const existing = await db.servicePlan.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Service plan not found' }, { status: 404 });
    }

    // Check there are no active subscriptions — refuse hard-delete if so
    const activeCount = await db.servicePlanSubscription.count({
      where: { servicePlanId: id, status: 'active' },
    });

    const plan = await db.servicePlan.update({
      where: { id },
      data: { isActive: false },
      include: { _count: { select: { subscriptions: true } } },
    });

    log.info(
      { userId: authUser.id, planId: id, activeSubscriptions: activeCount },
      'Service plan deactivated (soft delete)',
    );

    return NextResponse.json({
      plan,
      deleted: true,
      activeSubscriptionsAtDelete: activeCount,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to delete service plan');
    const message = error instanceof Error ? error.message : 'Failed to delete service plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
