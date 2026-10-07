/**
 * Commerce orders API — GET list + POST create (POS / manual)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';
import { createCommerceOrder } from '@/lib/commerce/order-service';
import { commerceError } from '@/lib/commerce/atomic';

export async function GET(req: NextRequest) {
  try {
    const business = await ownerBusiness(req);
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

/**
 * POST /api/commerce/orders
 * Create a manual order from the POS register (cashier walk-in, phone order, etc.)
 *
 * Body:
 *   customerPhone, customerName?, items: [{name, qty, price, amount}],
 *   total, deliveryType?, deliveryAddress?, notes?, paymentMethod?, paymentStatus?
 *
 * Returns: { order } with parsed items array.
 */
export async function POST(req: NextRequest) {
  try {
    const business = await ownerBusiness(req);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid order' }, { status: 400 });
    const result = await createCommerceOrder(business, body, req.headers.get('Idempotency-Key') || body.requestKey || '', false);
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && ['UNAUTHORIZED','FORBIDDEN'].includes(error.message)) return NextResponse.json({ error: 'Unauthorized' }, { status: error instanceof Error && error.message==='FORBIDDEN'?403:401 });
    const failure = commerceError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
