/**
 * Commerce orders API — GET list + POST create (manual)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const today = searchParams.get('today') === '1';

    const orders = await db.gptformCommerceOrder.findMany({
      where: {
        businessId: business.id,
        ...(status ? { status } : {}),
        ...(today ? {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          }
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const enriched = orders.map((o) => ({
      ...o,
      items: JSON.parse(o.itemsJson || '[]'),
    }));

    return NextResponse.json({ orders: enriched });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
