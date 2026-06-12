import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';

// GET /api/admin/billing - Platform billing stats
export async function GET() {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    // Run independent queries in parallel
    const [
      subscriptionsByPlan,
      activeSubscriptionsByPlan,
      allPaidInvoices,
      recentInvoices,
      totalSubscriptions,
      activeSubscriptionAmounts,
    ] = await Promise.all([
      // Subscriptions by plan (all statuses)
      db.subscription.groupBy({
        by: ['plan'],
        _count: { plan: true },
        _sum: { amount: true },
      }),

      // Active subscriptions by plan
      db.subscription.groupBy({
        by: ['plan'],
        where: { status: 'active' },
        _count: { plan: true },
        _sum: { amount: true },
      }),

      // All paid invoices for total revenue
      db.invoice.findMany({
        where: { status: 'paid' },
        select: { total: true, tenantId: true, paidAt: true },
      }),

      // Recent transactions across all tenants
      db.invoice.findMany({
        where: { status: 'paid', paidAt: { not: null } },
        orderBy: { paidAt: 'desc' },
        take: 20,
        select: {
          id: true,
          number: true,
          amount: true,
          total: true,
          currency: true,
          paidAt: true,
          tenantId: true,
          tenant: {
            select: { id: true, name: true, slug: true, plan: true },
          },
        },
      }),

      // Total subscription count
      db.subscription.count(),

      // Active subscription amounts for MRR
      db.subscription.findMany({
        where: { status: 'active' },
        select: { amount: true, billingCycle: true, plan: true },
      }),
    ]);

    // Calculate total revenue
    const totalRevenue = allPaidInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // Revenue by plan (from active subscriptions)
    const revenueByPlan: Record<string, number> = {};
    activeSubscriptionAmounts.forEach((sub) => {
      const monthlyAmount = sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount;
      revenueByPlan[sub.plan] = (revenueByPlan[sub.plan] || 0) + monthlyAmount;
    });

    // Round revenue by plan values
    Object.keys(revenueByPlan).forEach((key) => {
      revenueByPlan[key] = Math.round(revenueByPlan[key] * 100) / 100;
    });

    // Active subscriptions by plan map
    const activeByPlanMap: Record<string, number> = {};
    activeSubscriptionsByPlan.forEach((item) => {
      activeByPlanMap[item.plan] = item._count.plan;
    });

    // All subscriptions by plan map
    const allByPlanMap: Record<string, { count: number; revenue: number }> = {};
    subscriptionsByPlan.forEach((item) => {
      allByPlanMap[item.plan] = {
        count: item._count.plan,
        revenue: item._sum.amount || 0,
      };
    });

    // Calculate MRR
    let mrr = 0;
    activeSubscriptionAmounts.forEach((sub) => {
      mrr += sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount;
    });
    mrr = Math.round(mrr * 100) / 100;

    // Format recent transactions
    const recentTransactions = recentInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.number,
      amount: inv.amount,
      total: inv.total,
      currency: inv.currency,
      paidAt: inv.paidAt?.toISOString() || null,
      tenantId: inv.tenantId,
      tenantName: inv.tenant?.name || null,
      tenantPlan: inv.tenant?.plan || null,
    }));

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      mrr,
      arr: Math.round(mrr * 12 * 100) / 100,
      totalSubscriptions,
      revenueByPlan,
      activeSubscriptionsByPlan: activeByPlanMap,
      subscriptionsByPlan: allByPlanMap,
      recentTransactions,
    });
  } catch (error) {
    console.error('Admin billing GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch billing stats' }, { status: 500 });
  }
}
