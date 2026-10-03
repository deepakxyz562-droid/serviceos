/**
 * Commerce dashboard API — overview stats
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const orders = await db.gptformCommerceOrder.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const todaysOrders = orders.filter((o) => o.createdAt >= todayStart);
    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
    const pendingOrders = orders.filter((o) => o.status === 'CONFIRMED' && o.paymentStatus === 'UNPAID');
    const newOrders = orders.filter((o) => o.status === 'PENDING');

    const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const todaysRevenue = todaysOrders
      .filter((o) => o.paymentStatus === 'PAID')
      .reduce((s, o) => s + o.total, 0);

    // Unique customers
    const customerPhones = [...new Set(orders.map((o) => o.customerPhone))];

    return NextResponse.json({
      overview: {
        totalOrders: orders.length,
        todaysOrders: todaysOrders.length,
        newOrders: newOrders.length,
        pendingPayment: pendingOrders.length,
        totalCustomers: customerPhones.length,
        totalRevenue,
        todaysRevenue,
      },
      recentOrders: orders.slice(0, 10).map((o) => ({
        ...o,
        items: JSON.parse(o.itemsJson || '[]'),
      })),
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
