import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Service Plan Subscriptions API
 * -------------------------------
 * GET /api/service-plans/subscriptions — list subscriptions
 *
 * Filters: customerId, status, servicePlanId, limit
 *
 * Tenant scoping enforced via authUser.tenantId (super_admin sees all).
 */

const VALID_STATUSES = ['active', 'paused', 'cancelled', 'expired'];

function tenantScope(authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
  const where: Record<string, unknown> = {};
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

export async function GET(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const servicePlanId = searchParams.get('servicePlanId');
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const where: Record<string, unknown> = tenantScope(authUser);
    if (customerId) where.customerId = customerId;
    if (servicePlanId) where.servicePlanId = servicePlanId;
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      where.status = status;
    }

    const subscriptions = await db.servicePlanSubscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        servicePlan: {
          select: {
            id: true,
            name: true,
            industry: true,
            inspectionsPerYear: true,
            emergencyVisits: true,
            discountPct: true,
          },
        },
      },
    });

    log.info(
      {
        userId: authUser.id,
        count: subscriptions.length,
        filters: { customerId, status, servicePlanId },
      },
      'Service plan subscriptions listed',
    );

    return NextResponse.json({ subscriptions, count: subscriptions.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list service plan subscriptions');
    const message =
      error instanceof Error ? error.message : 'Failed to fetch service plan subscriptions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
