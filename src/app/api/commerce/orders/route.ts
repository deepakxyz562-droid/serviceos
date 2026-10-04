/**
 * Commerce orders API — GET list + POST create (POS / manual)
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
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const {
      customerPhone,
      customerName,
      items,
      total,
      deliveryType = 'pickup',
      deliveryAddress,
      notes,
      paymentMethod = 'CASH',
      paymentStatus,
    } = body;

    if (!customerPhone || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'customerPhone and at least one item are required' },
        { status: 400 },
      );
    }

    const parsedTotal = Number(total);
    if (isNaN(parsedTotal) || parsedTotal < 0) {
      return NextResponse.json({ error: 'Invalid total amount' }, { status: 400 });
    }

    const cleanPhone = String(customerPhone).replace(/\D/g, '');
    if (!cleanPhone) {
      return NextResponse.json({ error: 'Valid customer phone is required' }, { status: 400 });
    }

    // Resolve the merchant's commerce config (needed for the configId FK).
    let config = await db.gptformCommerceConfig.findFirst({
      where: { businessId: business.id },
    });
    if (!config) {
      config = await db.gptformCommerceConfig.create({
        data: {
          businessId: business.id,
          catalogJson: '[]',
          fieldsJson: '[]',
          currency: 'INR',
          currencySymbol: '₹',
        },
      });
    }

    // Compute payment status: if not provided, default to PAID for CASH
    // (POS walk-in = immediate payment), UNPAID otherwise.
    const resolvedPaymentStatus = paymentStatus || (paymentMethod === 'CASH' ? 'PAID' : 'UNPAID');

    const order = await db.gptformCommerceOrder.create({
      data: {
        configId: config.id,
        businessId: business.id,
        customerPhone: cleanPhone,
        customerName: customerName || null,
        status: 'CONFIRMED', // POS orders are immediately confirmed
        itemsJson: JSON.stringify(items),
        total: parsedTotal,
        deliveryType: deliveryType || 'pickup',
        deliveryAddress: deliveryAddress || null,
        notes: notes || null,
        paymentStatus: resolvedPaymentStatus,
        paymentMethod: paymentMethod || 'CASH',
      },
    });

    // Inventory auto-depletion: decrement stock for ordered items (best-effort).
    try {
      if (config.catalogJson) {
        const catalog = JSON.parse(config.catalogJson);
        if (Array.isArray(catalog)) {
          let catalogChanged = false;
          for (const it of items) {
            const pIdx = catalog.findIndex(
              (p: any) => p.id === it.productId || p.name === it.name,
            );
            if (pIdx !== -1) {
              const currentStock = typeof catalog[pIdx].stock === 'number' ? catalog[pIdx].stock : 0;
              catalog[pIdx].stock = Math.max(0, currentStock - (Number(it.qty) || 1));
              catalogChanged = true;
            }
          }
          if (catalogChanged) {
            await db.gptformCommerceConfig.update({
              where: { id: config.id },
              data: { catalogJson: JSON.stringify(catalog) },
            });
          }
        }
      }
    } catch (invErr) {
      console.warn('[commerce/orders POST] Inventory depletion non-fatal:', invErr);
    }

    return NextResponse.json({
      order: {
        ...order,
        items: JSON.parse(order.itemsJson || '[]'),
      },
    }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[commerce/orders POST]', e);
    return NextResponse.json({ error: e.message || 'Failed to create order' }, { status: 500 });
  }
}
