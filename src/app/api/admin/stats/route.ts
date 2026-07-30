import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';

// GET /api/admin/stats - Platform-wide statistics (super admin only)
export async function GET() {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run all independent queries in parallel
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      totalUsers,
      totalLeads,
      totalJobs,
      tenantsByPlan,
      activeSubscriptions,
      trialSubscriptions,
      paidSubscriptions,
      churnedThisMonth,
      trialsConvertedThisMonth,
      trialsExpiredThisMonth,
      paidInvoiceAggregate,
      monthlyPaidInvoices,
    ] = await Promise.all([
      // Total tenants
      db.tenant.count(),

      // Active tenants (not suspended, planStatus = active)
      db.tenant.count({ where: { planStatus: 'active', suspendedAt: null } }),

      // Trial tenants
      db.tenant.count({ where: { planStatus: 'trial' } }),

      // Suspended tenants
      db.tenant.count({ where: { suspendedAt: { not: null } } }),

      // Total users (exclude platform admins)
      db.user.count({ where: { role: { not: 'admin' } } }),

      // Total leads
      db.lead.count(),

      // Total jobs
      db.job.count(),

      // Tenants by plan
      db.tenant.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),

      // Active subscriptions
      db.subscription.count({ where: { status: 'active' } }),

      // Trial subscriptions
      db.subscription.count({ where: { status: 'trial' } }),

      // Paid subscriptions
      db.subscription.count({ where: { status: 'active', paymentProvider: { not: 'none' } } }),

      // Churned this month (subscriptions cancelled/expired in last 30 days)
      db.subscription.count({
        where: {
          status: { in: ['cancelled', 'expired'] },
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),

      // Trials converted this month
      db.subscription.count({
        where: {
          status: 'active',
          startDate: { gte: thirtyDaysAgo },
          trialEndsAt: { not: null },
        },
      }),

      // Total trials that expired in last 30 days
      db.subscription.count({
        where: {
          status: { in: ['expired', 'cancelled'] },
          trialEndsAt: { gte: thirtyDaysAgo },
        },
      }),

      // Total revenue across all paid invoices — computed at the DB layer
      // with `aggregate` instead of loading every invoice row into Node
      // memory. Avoids O(N) row transfer just to sum a single column.
      db.invoice.aggregate({
        where: { status: 'paid', paidAt: { not: null } },
        _sum: { total: true },
      }),

      // Monthly paid invoices for revenue chart. We only need the `total`
      // and `paidAt` columns to bucket by month, so select just those two
      // (no tenantId, no other fields) to keep the row payload small.
      //
      // `take: 1000` caps the row count pulled into Node memory. The query
      // is already scoped to the last 12 months via `paidAt: { gte: ... }`,
      // so 1000 rows is well above any realistic monthly invoice volume for
      // a single tenant dashboard — but it bounds the worst case so an
      // unbounded history (e.g. a tenant that bulk-imported 100k legacy
      // invoices) can't OOM the stats endpoint.
      // `orderBy: { paidAt: 'desc' }` prefers the most recent invoices if
      // the take limit is ever hit, so the chart stays representative of
      // recent revenue rather than the oldest 1000 rows.
      db.invoice.findMany({
        where: { status: 'paid', paidAt: { gte: twelveMonthsAgo } },
        select: { total: true, paidAt: true },
        orderBy: { paidAt: 'desc' },
        take: 1000,
      }),
    ]);

    // Calculate MRR (sum of active subscription amounts)
    const subscriptionAmounts = await db.subscription.findMany({
      where: { status: 'active' },
      select: { amount: true, billingCycle: true },
    });

    let mrr = 0;
    subscriptionAmounts.forEach((sub) => {
      if (sub.billingCycle === 'yearly') {
        mrr += sub.amount / 12;
      } else {
        mrr += sub.amount;
      }
    });

    const arr = mrr * 12;

    // Calculate total revenue from paid invoices (computed at DB layer).
    const totalRevenue = paidInvoiceAggregate._sum.total ?? 0;

    // Calculate churn rate
    const churnRate =
      activeSubscriptions + churnedThisMonth > 0
        ? (churnedThisMonth / (activeSubscriptions + churnedThisMonth)) * 100
        : 0;

    // Calculate trial conversion rate
    const trialConversionRate =
      trialsExpiredThisMonth + trialsConvertedThisMonth > 0
        ? (trialsConvertedThisMonth / (trialsExpiredThisMonth + trialsConvertedThisMonth)) * 100
        : 0;

    // Build monthly revenue data (last 12 months)
    const monthlyRevenueMap: Record<string, number> = {};
    monthlyPaidInvoices.forEach((inv) => {
      if (inv.paidAt) {
        const monthKey = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + inv.total;
      }
    });

    const monthlyRevenueData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyRevenueData.push({
        month: monthKey,
        label: monthLabel,
        revenue: Math.round(monthlyRevenueMap[monthKey] || 0),
      });
    }

    // Build tenants by plan map. Include every plan the platform supports so
    // tenants on `trial` or `business` aren't silently dropped from the
    // by-plan breakdown (the previous map only had starter/growth/pro/
    // enterprise and silently swallowed the rest).
    const tenantsByPlanMap: Record<string, number> = {
      trial: 0,
      starter: 0,
      growth: 0,
      business: 0,
      pro: 0,
      enterprise: 0,
    };
    tenantsByPlan.forEach((item) => {
      // Only assign if the plan key is one we expose; unknown plans are
      // dropped intentionally to keep the breakdown stable for the UI.
      if (item.plan in tenantsByPlanMap) {
        tenantsByPlanMap[item.plan] = item._count.plan;
      }
    });

    return NextResponse.json({
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      totalUsers,
      totalLeads,
      totalJobs,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      trialConversionRate: Math.round(trialConversionRate * 100) / 100,
      monthlyRevenueData,
      tenantsByPlan: tenantsByPlanMap,
      subscriptions: {
        active: activeSubscriptions,
        trial: trialSubscriptions,
        paid: paidSubscriptions,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch platform statistics' }, { status: 500 });
  }
}
