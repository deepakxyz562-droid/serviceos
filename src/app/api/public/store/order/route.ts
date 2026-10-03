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
    });
  } catch (err: any) {
    console.error('Failed to create public store order:', err);
    return NextResponse.json({ error: err.message || 'Failed to place order' }, { status: 500 });
  }
}
