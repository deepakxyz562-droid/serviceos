import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';

export async function GET(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const invoices = await db.aiInvoice.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });

    const enriched = invoices.map((inv) => {
      const totals = computeTotals(
        inv.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
        inv.discountValue,
        inv.discountType,
        inv.taxRate,
        business.currency
      );
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const balance = Math.max(0, totals.total - paid);
      return {
        ...inv,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        paidAmount: Math.min(paid, totals.total),
        balance,
        totals: {
          ...totals,
          paid,
          balance,
        },
      };
    });

    return NextResponse.json({ invoices: enriched });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
