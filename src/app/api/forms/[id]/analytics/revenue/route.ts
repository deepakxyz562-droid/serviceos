import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, apiError } from '@/lib/api-auth';
import { checkFormTransactionLimit } from '@/lib/plan-gate-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/forms/[id]/analytics/revenue
 *
 * Provides transactional & revenue metrics for payment forms (Jotform revenue parity):
 * - Total processed revenue (USD & local currencies)
 * - Paid submission count vs unpaid / abandoned
 * - Average Transaction Value (AOV)
 * - Breakdown by gateway (Stripe, PayPal, Square, etc.)
 * - Plan monthly transaction limit utilization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  try {
    const { id } = await params;
    const workspaceId = user.workspaceId;
    const tenantId = user.tenantId;

    const scopeOR = [
      ...(workspaceId ? [{ workspaceId }] : []),
      ...(tenantId ? [{ tenantId }] : []),
    ] as const;

    if (!scopeOR.length) {
      return apiError(403, 'No workspace or tenant access', 'FORBIDDEN');
    }

    const form = await db.form.findFirst({
      where: { id, OR: [...scopeOR] },
      select: { id: true, name: true, tenantId: true },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Fetch all responses with payment data
    const responses = await db.formResponse.findMany({
      where: { formId: id },
      select: {
        id: true,
        paymentStatus: true,
        paymentAmount: true,
        paymentCurrency: true,
        paymentGatewayId: true,
        paymentMethod: true,
        paidAt: true,
        createdAt: true,
      },
    });

    let totalRevenue = 0;
    let successfulTransactions = 0;
    let pendingTransactions = 0;
    let failedTransactions = 0;
    const gatewayBreakdown: Record<string, { count: number; volume: number }> = {};
    const currencyBreakdown: Record<string, number> = {};

    for (const r of responses) {
      const isPaid = r.paymentStatus === 'succeeded' || r.paymentStatus === 'paid';
      const amount = Number(r.paymentAmount) || 0;
      const gateway = r.paymentGatewayId || r.paymentMethod || 'standard_card';
      const currency = r.paymentCurrency || 'USD';

      if (isPaid) {
        totalRevenue += amount;
        successfulTransactions++;
        currencyBreakdown[currency] = (currencyBreakdown[currency] || 0) + amount;

        if (!gatewayBreakdown[gateway]) {
          gatewayBreakdown[gateway] = { count: 0, volume: 0 };
        }
        gatewayBreakdown[gateway].count++;
        gatewayBreakdown[gateway].volume += amount;
      } else if (r.paymentStatus === 'pending') {
        pendingTransactions++;
      } else if (r.paymentStatus === 'failed') {
        failedTransactions++;
      }
    }

    const averageOrderValue = successfulTransactions > 0 ? totalRevenue / successfulTransactions : 0;

    // Check plan limits
    const limitCheck = form.tenantId ? await checkFormTransactionLimit(form.tenantId) : { allowed: true, limit: 1000, current: 0, tier: 'pro' };

    return NextResponse.json({
      success: true,
      formId: id,
      formName: form.name,
      metrics: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        successfulTransactions,
        pendingTransactions,
        failedTransactions,
        totalSubmissions: responses.length,
        paymentConversionRate: responses.length > 0 ? Math.round((successfulTransactions / responses.length) * 1000) / 10 : 0,
      },
      breakdowns: {
        byGateway: gatewayBreakdown,
        byCurrency: currencyBreakdown,
      },
      planLimits: {
        tier: limitCheck.tier,
        usedThisMonth: limitCheck.current,
        monthlyLimit: limitCheck.limit,
        isLimitReached: !limitCheck.allowed,
      },
    });
  } catch (error: any) {
    console.error('Form revenue analytics error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch revenue analytics' }, { status: 500 });
  }
}
