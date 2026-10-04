import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryDate,
      deliveryType,
      tableNumber,
      notes,
      items,
      total,
      paymentMethod,
    } = body;

    if (!customerPhone || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Customer phone and at least one item are required' },
        { status: 400 }
      );
    }

    // Resolve or find config
    let config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [{ businessId: businessId || '' }, { id: businessId || '' }],
      },
    });

    if (!config) {
      // Find tenant
      const tenant = await db.tenant.findFirst({
        where: { OR: [{ id: businessId || '' }, { slug: businessId || '' }] },
      });
      if (tenant) {
        config = await db.gptformCommerceConfig.findFirst({
          where: { businessId: tenant.id },
        });
        if (!config) {
          config = await db.gptformCommerceConfig.create({
            data: {
              businessId: tenant.id,
              catalogJson: JSON.stringify([]),
              fieldsJson: JSON.stringify([]),
              currency: 'INR',
              currencySymbol: '₹',
            },
          });
        }
      }
    }

    const resolvedBusinessId = config?.businessId || businessId || 'default';
    const resolvedConfigId = config?.id || 'default-config';

    const cleanPhone = String(customerPhone).replace(/\D/g, '');

    const orderNotes = [
      tableNumber ? `Dine-In Table #${tableNumber}` : null,
      notes || null,
    ]
      .filter(Boolean)
      .join(' • ');

    const order = await db.gptformCommerceOrder.create({
      data: {
        configId: resolvedConfigId,
        businessId: resolvedBusinessId,
        customerPhone: cleanPhone,
        customerName: customerName || null,
        status: 'PENDING',
        itemsJson: JSON.stringify(items),
        total: Number(total) || 0,
        deliveryAddress: tableNumber ? `Table #${tableNumber}` : deliveryAddress || null,
        deliveryDate: deliveryDate || null,
        deliveryType: tableNumber ? 'dine_in' : deliveryType || 'delivery',
        notes: orderNotes || null,
        paymentStatus: 'UNPAID',
        paymentMethod: paymentMethod || 'WHATSAPP_COD',
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.id.slice(-6).toUpperCase(),
      trackingUrl: `/store/${resolvedBusinessId}/order/${order.id}`,
    });
  } catch (err: any) {
    console.error('Failed to create public store order:', err);
    return NextResponse.json({ error: err.message || 'Failed to place order' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await db.gptformCommerceOrder.findFirst({
      where: {
        OR: [
          { id: orderId },
          { id: { endsWith: orderId.toLowerCase() } },
        ],
      },
      include: {
        config: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Count how many orders are ahead in the queue today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const ordersAhead = await db.gptformCommerceOrder.count({
      where: {
        businessId: order.businessId,
        createdAt: {
          gte: startOfDay,
          lt: order.createdAt,
        },
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] },
      },
    });

    let items = [];
    try {
      items = JSON.parse(order.itemsJson || '[]');
    } catch {}

    // Find tenant for clean business name
    let storeName = order.config?.businessId || 'Store';
    const tenant = await db.tenant.findFirst({
      where: { OR: [{ id: order.businessId }, { slug: order.businessId }] },
      select: { name: true, phone: true },
    });
    if (tenant?.name) {
      storeName = tenant.name;
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.id.slice(-6).toUpperCase(),
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryType: order.deliveryType,
        deliveryAddress: order.deliveryAddress,
        deliveryDate: order.deliveryDate,
        notes: order.notes,
        total: order.total,
        createdAt: order.createdAt,
        items,
        currencySymbol: order.config?.currencySymbol || '₹',
        businessName: storeName,
        businessPhone: tenant?.phone || '',
      },
      queue: {
        ordersAhead,
        estimatedWaitMinutes: Math.max(3, ordersAhead * 3),
        counterNumber: 'Counter 1',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch order status' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, utrNumber, paymentStatus, paymentMethod } = body;
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await db.gptformCommerceOrder.findFirst({
      where: {
        OR: [{ id: orderId }, { id: { endsWith: orderId.toLowerCase() } }],
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const cleanUtr = utrNumber ? String(utrNumber).trim() : null;
    let updatedNotes = order.notes || '';
    if (cleanUtr && !updatedNotes.includes(`UTR: ${cleanUtr}`)) {
      updatedNotes = updatedNotes ? `${updatedNotes} • UTR: ${cleanUtr}` : `UTR: ${cleanUtr}`;
    }

    const updated = await db.gptformCommerceOrder.update({
      where: { id: order.id },
      data: {
        ...(cleanUtr ? { notes: updatedNotes } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      order: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update order' }, { status: 500 });
  }
}

