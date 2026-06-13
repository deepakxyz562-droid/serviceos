import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const planFilter = searchParams.get('plan') || '';
    const statusFilter = searchParams.get('status') || '';

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (planFilter) {
      where.plan = planFilter;
    }

    if (statusFilter) {
      where.planStatus = statusFilter;
    }

    const tenants = await db.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        plan: true,
        planStatus: true,
        industry: true,
        country: true,
        currency: true,
        onboardingCompleted: true,
        suspendedAt: true,
        suspensionReason: true,
        mrr: true,
        arr: true,
        createdAt: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get subscription statuses for each tenant
    const tenantIds = tenants.map((t: Record<string, unknown>) => t.id).filter(Boolean) as string[];

    let subscriptions: Record<string, unknown>[] = [];
    if (tenantIds.length > 0) {
      try {
        subscriptions = await db.subscription.findMany({
          where: {
            tenantId: { in: tenantIds },
          },
          select: {
            id: true,
            tenantId: true,
            status: true,
            plan: true,
            amount: true,
            billingCycle: true,
          },
          orderBy: { createdAt: 'desc' },
        }) as Record<string, unknown>[];
      } catch {
        // Subscription table might not have all columns
      }
    }

    // Group subscriptions by tenantId
    const subsByTenant = new Map<string, Record<string, unknown>>();
    for (const sub of subscriptions) {
      const tid = sub.tenantId as string;
      if (!subsByTenant.has(tid)) {
        subsByTenant.set(tid, sub);
      }
    }

    const formatted = tenants.map((t: Record<string, unknown>) => {
      const sub = subsByTenant.get(t.id as string);
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        email: t.email || '',
        phone: t.phone || '',
        plan: t.plan,
        planStatus: t.planStatus,
        industry: t.industry || '',
        country: t.country || 'US',
        currency: t.currency || 'USD',
        onboardingCompleted: t.onboardingCompleted || false,
        suspendedAt: t.suspendedAt ? new Date(t.suspendedAt as string).toISOString() : null,
        suspensionReason: t.suspensionReason || null,
        mrr: Number(t.mrr) || 0,
        arr: Number(t.arr) || 0,
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : null,
        userCount: (t._count as Record<string, number>)?.users || 0,
        subscriptionStatus: sub?.status || null,
      };
    });

    return NextResponse.json({ tenants: formatted, total: formatted.length });
  } catch (error) {
    console.error('[SuperAdmin Tenants] Error:', error);
    return NextResponse.json({ tenants: [], total: 0 });
  }
}
