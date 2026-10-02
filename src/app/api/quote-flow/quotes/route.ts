import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';

export async function GET(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const quotes = await db.aiQuote.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: true,
      },
    });

    const enriched = quotes.map((q) => {
      const totals = computeTotals(
        q.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
        q.discountValue,
        q.discountType,
        q.taxRate,
        business.currency
      );
      return {
        ...q,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        totals,
      };
    });

    return NextResponse.json({ quotes: enriched });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
