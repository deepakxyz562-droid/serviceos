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
      allPaidInvoices,
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

      // All paid invoices for revenue
      db.invoice.findMany({
        where: { status: 'paid', paidAt: { not: null } },
        select: { total: true, paidAt: true, tenantId: true },
      }),

      // Monthly paid invoices for revenue chart
      db.invoice.findMany({
        where: { status: 'paid', paidAt: { gte: twelveMonthsAgo } },
        select: { total: true, paidAt: true },
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

    // Calculate total revenue from paid invoices
    const totalRevenue = allPaidInvoices.reduce((sum, inv) => sum + inv.total, 0);

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

    // Build tenants by plan map
    const tenantsByPlanMap: Record<string, number> = {
      starter: 0,
      growth: 0,
      pro: 0,
      enterprise: 0,
    };
    tenantsByPlan.forEach((item) => {
      tenantsByPlanMap[item.plan] = item._count.plan;
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
