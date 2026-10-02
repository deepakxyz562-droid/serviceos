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

    let totalAccepted = 0;
    let totalPending = 0;
    let totalDraft = 0;

    const enriched = quotes.map((q) => {
      const totals = computeTotals(
        q.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
        q.discountValue,
        q.discountType,
        q.taxRate,
        business.currency
      );

      if (q.status === 'ACCEPTED') {
        totalAccepted += totals.total;
      } else if (q.status === 'SENT') {
        totalPending += totals.total;
      } else if (q.status === 'DRAFT') {
        totalDraft += totals.total;
      }

      return {
        ...q,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        totals,
      };
    });

    const overview = {
      accepted: Math.round(totalAccepted * 100) / 100,
      pending: Math.round(totalPending * 100) / 100,
      draft: Math.round(totalDraft * 100) / 100,
    };

    return NextResponse.json({ quotes: enriched, overview });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
