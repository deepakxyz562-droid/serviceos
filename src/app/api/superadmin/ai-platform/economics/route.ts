import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/superadmin/ai-platform/economics
 * ─────────────────────────────────────────────────────────────────────────
 * Platform economics dashboard — provider costs, customer revenue, margins.
 *
 * Returns:
 *   - Total calls today
 *   - Total billable seconds today
 *   - Total provider cost today
 *   - Total attributed revenue today
 *   - Gross margin %
 *   - Active AI tenants count
 *   - Active calls right now
 *
 * Auth: superadmin only.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const isSuperAdmin =
      (user as Record<string, unknown>).isSuperAdmin === true ||
      user.role === 'superadmin' ||
      user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Total calls today
    const callsToday = await db.aiCall.count({
      where: { createdAt: { gte: startOfToday } },
    });

    // Total billable seconds today (from UsageLedger)
    const usageAgg = await db.usageLedger.aggregate({
      where: {
        occurredAt: { gte: startOfToday },
        usageType: 'VOICE_MINUTE',
      },
      _sum: {
        quantitySeconds: true,
        providerCostUsd: true,
        revenueUsd: true,
      },
      _count: { id: true },
    });

    const totalBillableSeconds = usageAgg._sum.quantitySeconds || 0;
    const totalProviderCost = usageAgg._sum.providerCostUsd || 0;
    const totalRevenue = usageAgg._sum.revenueUsd || 0;
    const grossMargin = totalRevenue > 0
      ? ((totalRevenue - totalProviderCost) / totalRevenue) * 100
      : 0;

    // Active AI tenants (tenants with an ACTIVE or PAST_DUE subscription)
    const activeTenants = await db.tenantAddonSubscription.count({
      where: {
        status: { in: ['ACTIVE', 'PAST_DUE'] },
        addonPlan: { addonProduct: { code: 'AI_RECEPTIONIST' } },
      },
    });

    // Active calls right now (in_progress AiCalls)
    const activeCalls = await db.aiCall.count({
      where: { status: 'in_progress' },
    });

    // Active reservations (calls with reserved capacity)
    const activeReservations = await db.usageReservation.count({
      where: { status: 'ACTIVE' },
    });

    return NextResponse.json({
      today: {
        calls: callsToday,
        billableSeconds: totalBillableSeconds,
        billableMinutes: Math.floor(totalBillableSeconds / 60),
        providerCostUsd: Number(totalProviderCost.toFixed(4)),
        revenueUsd: Number(totalRevenue.toFixed(4)),
        grossMarginPct: Number(grossMargin.toFixed(2)),
        ledgerEntries: usageAgg._count.id,
      },
      active: {
        tenants: activeTenants,
        calls: activeCalls,
        reservations: activeReservations,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/superadmin/ai-platform/economics] error:', error);
    return NextResponse.json({ error: 'Failed to fetch economics' }, { status: 500 });
  }
}
