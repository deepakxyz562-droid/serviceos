import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const subscriptions = await db.subscription.findMany({
      include: {
        tenant: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = subscriptions.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      tenantName: s.tenant?.name || 'Unknown',
      plan: s.plan,
      status: s.status,
      amount: s.amount,
      billingCycle: s.billingCycle,
      startDate: s.startDate.toISOString(),
      pausedDate: s.pausedAt ? s.pausedAt.toISOString() : null,
      pauseReason: s.pauseReason,
    }));

    return NextResponse.json({ subscriptions: formatted });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions GET] Error:', error);
    return NextResponse.json({ subscriptions: [] });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const body = await request.json();
    const { subscriptionId, action, reason, newPlan } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    if (action === 'pause') {
      if (!reason?.trim()) {
        return NextResponse.json({ error: 'Reason is required for pausing' }, { status: 400 });
      }
      const subscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'paused',
          pausedAt: new Date(),
          pauseReason: reason.trim(),
        },
      });
      return NextResponse.json({ subscription });
    }

    if (action === 'resume') {
      const subscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'active',
          pausedAt: null,
          pauseReason: null,
        },
      });
      return NextResponse.json({ subscription });
    }

    if (action === 'change_plan') {
      if (!newPlan) {
        return NextResponse.json({ error: 'New plan is required' }, { status: 400 });
      }

      const planAmounts: Record<string, number> = {
        starter: 29,
        growth: 79,
        pro: 149,
        enterprise: 0,
      };

      const subscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          plan: newPlan,
          amount: planAmounts[newPlan] ?? 0,
        },
      });

      // Also update the tenant's plan
      await db.tenant.update({
        where: { id: subscription.tenantId },
        data: { plan: newPlan },
      });

      return NextResponse.json({ subscription });
    }

    return NextResponse.json({ error: 'Invalid action. Use "pause", "resume", or "change_plan"' }, { status: 400 });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
