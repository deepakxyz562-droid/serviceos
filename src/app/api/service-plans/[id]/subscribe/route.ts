import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Service Plan Subscribe API
 * ---------------------------
 * POST /api/service-plans/[id]/subscribe
 *
 * Subscribes a customer to a service plan. Creates a ServicePlanSubscription
 * with the plan's pricing snapshotted at subscription time.
 *
 * Body:
 *   customerId (required if no customerName+phone provided), customerName,
 *   customerPhone, customerEmail, startDate, endDate, billingCycle (override),
 *   price (override), metadata
 *
 * The subscription starts in status='active'. nextBillingDate is computed
 * from startDate + 1 billingCycle.
 *
 * Tenant scoping enforced on the plan + the new subscription.
 */

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

const VALID_BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'];

/**
 * Compute the next billing date from a start date + billing cycle.
 */
function computeNextBillingDate(start: Date, cycle: string): Date {
  const next = new Date(start);
  if (cycle === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else if (cycle === 'quarterly') {
    next.setMonth(next.getMonth() + 3);
  } else if (cycle === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'Tenant not found for user' }, { status: 400 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Plan id is required' }, { status: 400 });
    }

    const plan = await db.servicePlan.findFirst({ where: scopeWhere(authUser, id) });
    if (!plan) {
      return NextResponse.json({ error: 'Service plan not found' }, { status: 404 });
    }
    if (!plan.isActive) {
      return NextResponse.json(
        { error: 'Cannot subscribe to an inactive service plan' },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      startDate,
      endDate,
      billingCycle,
      price,
      metadata,
    } = body as Record<string, unknown>;

    // Require either customerId or (customerName + customerPhone)
    const hasCustomerId = typeof customerId === 'string' && customerId.trim();
    const hasNameAndPhone =
      typeof customerName === 'string' && customerName.trim() &&
      typeof customerPhone === 'string' && customerPhone.trim();

    if (!hasCustomerId && !hasNameAndPhone) {
      return NextResponse.json(
        { error: 'Either customerId, or customerName + customerPhone, is required' },
        { status: 400 },
      );
    }

    // Optional: resolve customer name/phone from Customer record if customerId provided
    let resolvedCustomerName = typeof customerName === 'string' && customerName.trim() ? customerName.trim() : null;
    let resolvedCustomerPhone = typeof customerPhone === 'string' && customerPhone.trim() ? customerPhone.trim() : null;
    let resolvedCustomerEmail = typeof customerEmail === 'string' && customerEmail.trim() ? customerEmail.trim() : null;
    if (hasCustomerId) {
      try {
        const customer = await db.customer.findUnique({
          where: { id: (customerId as string).trim() },
          select: { id: true, name: true, phone: true, email: true, workspaceId: true },
        });
        if (customer) {
          if (!resolvedCustomerName && customer.name) resolvedCustomerName = customer.name;
          if (!resolvedCustomerPhone && customer.phone) resolvedCustomerPhone = customer.phone;
          if (!resolvedCustomerEmail && customer.email) resolvedCustomerEmail = customer.email;
        }
      } catch {
        // ignore — caller may pass a customerId that's external; we still accept
      }
    }

    // Resolve billing cycle + price snapshot
    const finalBillingCycle =
      typeof billingCycle === 'string' && VALID_BILLING_CYCLES.includes(billingCycle)
        ? billingCycle
        : plan.billingCycle;
    const finalPrice =
      typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : plan.price;

    const start = startDate ? new Date(startDate as string) : new Date();
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }

    let end: Date | null = null;
    if (endDate) {
      end = new Date(endDate as string);
      if (Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
      }
    } else if (plan.contractLengthMonths && plan.contractLengthMonths > 0) {
      end = new Date(start);
      end.setMonth(end.getMonth() + plan.contractLengthMonths);
    }

    const nextBilling = computeNextBillingDate(start, finalBillingCycle);

    // Prevent duplicate active subscriptions for the same customer + plan
    if (hasCustomerId) {
      const existingActive = await db.servicePlanSubscription.findFirst({
        where: {
          servicePlanId: id,
          customerId: (customerId as string).trim(),
          status: 'active',
        },
        select: { id: true },
      });
      if (existingActive) {
        return NextResponse.json(
          {
            error: 'Customer already has an active subscription to this plan',
            existingSubscriptionId: existingActive.id,
          },
          { status: 409 },
        );
      }
    }

    const subscription = await db.servicePlanSubscription.create({
      data: {
        tenantId: authUser.tenantId,
        servicePlanId: id,
        customerId: hasCustomerId ? (customerId as string).trim() : null,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        customerEmail: resolvedCustomerEmail,
        status: 'active',
        startDate: start,
        endDate: end,
        nextBillingDate: nextBilling,
        lastBilledDate: null,
        inspectionsUsed: 0,
        emergencyVisitsUsed: 0,
        price: finalPrice,
        currency: plan.currency,
        billingCycle: finalBillingCycle,
        metadataJson: JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {}),
      },
      include: { servicePlan: { select: { id: true, name: true, industry: true } } },
    });

    log.info(
      {
        userId: authUser.id,
        planId: id,
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        billingCycle: finalBillingCycle,
        price: finalPrice,
      },
      'Customer subscribed to service plan',
    );

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to subscribe customer to service plan');
    const message = error instanceof Error ? error.message : 'Failed to create subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
