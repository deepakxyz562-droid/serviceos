import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Single Service Plan Subscription API
 * -------------------------------------
 * GET   /api/service-plans/subscriptions/[id]  — fetch a subscription
 * PATCH /api/service-plans/subscriptions/[id]  — pause / cancel / resume
 *                                                + update other fields
 *
 * Status transitions:
 *   pause   → active → paused
 *   resume  → paused → active
 *   cancel  → active|paused → cancelled (sets endDate)
 *   expire  → any → expired
 *
 * Body for PATCH:
 *   action: 'pause' | 'resume' | 'cancel' | 'expire'  (optional — for status transitions)
 *   — OR direct field updates: status, endDate, nextBillingDate, lastBilledDate,
 *     inspectionsUsed, emergencyVisitsUsed, metadata, customerName, customerPhone, customerEmail
 *
 * Tenant scoping enforced on every read/write.
 */

const VALID_STATUSES = ['active', 'paused', 'cancelled', 'expired'];
const VALID_ACTIONS = ['pause', 'resume', 'cancel', 'expire'];

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
 * GET /api/service-plans/subscriptions/[id]
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
      return NextResponse.json({ error: 'Subscription id is required' }, { status: 400 });
    }

    const subscription = await db.servicePlanSubscription.findFirst({
      where: scopeWhere(authUser, id),
      include: {
        servicePlan: {
          select: {
            id: true,
            name: true,
            industry: true,
            inspectionsPerYear: true,
            emergencyVisits: true,
            discountPct: true,
            prioritySupport: true,
            featuresJson: true,
          },
        },
      },
    });
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Parse featuresJson for convenience
    let features: string[] = [];
    try {
      const parsed = JSON.parse(subscription.servicePlan.featuresJson);
      features = Array.isArray(parsed) ? parsed : [];
    } catch {
      features = [];
    }

    return NextResponse.json({ subscription, features });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch subscription');
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/service-plans/subscriptions/[id]
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
      return NextResponse.json({ error: 'Subscription id is required' }, { status: 400 });
    }

    const existing = await db.servicePlanSubscription.findFirst({
      where: scopeWhere(authUser, id),
    });
    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    // ── Action-driven status transitions ─────────────────────────────
    if (body.action !== undefined) {
      if (typeof body.action !== 'string' || !VALID_ACTIONS.includes(body.action)) {
        return NextResponse.json(
          { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
          { status: 400 },
        );
      }
      const action = body.action as string;
      // Validate the current status allows the transition
      if (action === 'pause') {
        if (existing.status !== 'active') {
          return NextResponse.json(
            { error: `Cannot pause a subscription in status '${existing.status}' (must be 'active')` },
            { status: 400 },
          );
        }
        updateData.status = 'paused';
      } else if (action === 'resume') {
        if (existing.status !== 'paused') {
          return NextResponse.json(
            { error: `Cannot resume a subscription in status '${existing.status}' (must be 'paused')` },
            { status: 400 },
          );
        }
        updateData.status = 'active';
      } else if (action === 'cancel') {
        if (existing.status === 'cancelled' || existing.status === 'expired') {
          return NextResponse.json(
            { error: `Subscription is already '${existing.status}'` },
            { status: 400 },
          );
        }
        updateData.status = 'cancelled';
        if (!existing.endDate) {
          updateData.endDate = new Date();
        }
      } else if (action === 'expire') {
        if (existing.status === 'expired') {
          return NextResponse.json(
            { error: 'Subscription is already expired' },
            { status: 400 },
          );
        }
        updateData.status = 'expired';
        if (!existing.endDate) {
          updateData.endDate = new Date();
        }
      }
    }

    // ── Direct field updates ─────────────────────────────────────────
    if (body.status !== undefined && body.action === undefined) {
      if (typeof body.status !== 'string' || !VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.status = body.status;
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }
    if (body.nextBillingDate !== undefined) {
      updateData.nextBillingDate = body.nextBillingDate ? new Date(body.nextBillingDate) : null;
    }
    if (body.lastBilledDate !== undefined) {
      updateData.lastBilledDate = body.lastBilledDate ? new Date(body.lastBilledDate) : null;
    }
    if (body.inspectionsUsed !== undefined) {
      const v = Number(body.inspectionsUsed);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json(
          { error: 'inspectionsUsed must be a non-negative number' },
          { status: 400 },
        );
      }
      updateData.inspectionsUsed = Math.floor(v);
    }
    if (body.emergencyVisitsUsed !== undefined) {
      const v = Number(body.emergencyVisitsUsed);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json(
          { error: 'emergencyVisitsUsed must be a non-negative number' },
          { status: 400 },
        );
      }
      updateData.emergencyVisitsUsed = Math.floor(v);
    }
    if (body.customerName !== undefined) {
      updateData.customerName =
        typeof body.customerName === 'string' && body.customerName.trim()
          ? body.customerName.trim()
          : null;
    }
    if (body.customerPhone !== undefined) {
      updateData.customerPhone =
        typeof body.customerPhone === 'string' && body.customerPhone.trim()
          ? body.customerPhone.trim()
          : null;
    }
    if (body.customerEmail !== undefined) {
      updateData.customerEmail =
        typeof body.customerEmail === 'string' && body.customerEmail.trim()
          ? body.customerEmail.trim()
          : null;
    }
    if (body.metadata !== undefined) {
      updateData.metadataJson = JSON.stringify(
        body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      );
    }

    const subscription = await db.servicePlanSubscription.update({
      where: { id },
      data: updateData,
      include: {
        servicePlan: {
          select: { id: true, name: true, industry: true },
        },
      },
    });

    log.info(
      {
        userId: authUser.id,
        subscriptionId: id,
        action: body.action ?? null,
        fields: Object.keys(updateData),
      },
      'Service plan subscription updated',
    );

    return NextResponse.json({ subscription });
  } catch (error) {
    log.error({ err: error }, 'Failed to update subscription');
    const message = error instanceof Error ? error.message : 'Failed to update subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
