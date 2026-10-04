import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  TransactionalOrderPayload,
  formatCustomerOrderConfirmation,
  formatVendorNewOrderAlert,
  dispatchTransactionalWhatsApp,
} from '@/lib/whatsapp-transactional';

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

    const initialPaymentStatus = paymentMethod === 'UPI' ? 'DETECTION_PENDING' : 'UNPAID';

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
        paymentStatus: initialPaymentStatus,
        paymentMethod: paymentMethod || 'WHATSAPP_COD',
      },
    });

    // Inventory Auto-Depletion: Decrement stock for ordered items
    try {
      if (config && config.catalogJson) {
        const catalog = JSON.parse(config.catalogJson);
        if (Array.isArray(catalog)) {
          let catalogChanged = false;
          for (const it of items) {
            const pIdx = catalog.findIndex(
              (p: any) => p.id === it.productId || p.name === it.name
            );
            if (pIdx !== -1) {
              const currentStock = typeof catalog[pIdx].stock === 'number' ? catalog[pIdx].stock : 50;
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
      console.warn('Inventory auto-depletion non-fatal warning:', invErr);
    }

    // CRM Auto-Capture: Upsert Customer in AI Business & Tenant CRM
    try {
      const aiBiz = await db.aiBusiness.findFirst({
        where: { OR: [{ id: resolvedBusinessId }, { tenantId: resolvedBusinessId }] },
      });
      if (aiBiz) {
        const existingAiCustomer = await db.aiCustomer.findFirst({
          where: { businessId: aiBiz.id, phone: cleanPhone },
        });
        if (existingAiCustomer) {
          await db.aiCustomer.update({
            where: { id: existingAiCustomer.id },
            data: {
              name: customerName || existingAiCustomer.name,
              address: deliveryAddress || existingAiCustomer.address,
            },
          });
        } else {
          await db.aiCustomer.create({
            data: {
              businessId: aiBiz.id,
              phone: cleanPhone,
              name: customerName || 'Store Guest',
              address: deliveryAddress || null,
              notes: `Captured via QR Store on ${new Date().toLocaleDateString()}`,
            },
          });
        }
      }

      // Also upsert in tenant-level Customer if tenant exists
      const existingCustomer = await db.customer.findFirst({
        where: { phone: cleanPhone, tenantId: resolvedBusinessId },
      });
      if (existingCustomer) {
        await db.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name: customerName || existingCustomer.name,
            address: deliveryAddress || existingCustomer.address,
            marketingConsent: body.whatsappConsent ?? true,
          },
        });
      } else {
        await db.customer.create({
          data: {
            tenantId: resolvedBusinessId,
            phone: cleanPhone,
            name: customerName || 'Store Guest',
            address: deliveryAddress || null,
            marketingConsent: body.whatsappConsent ?? true,
            marketingConsentSource: 'store_qr',
          },
        });
      }
    } catch (crmErr) {
      console.warn('Customer CRM auto-capture non-fatal warning:', crmErr);
    }

    // 3. Automated Transactional WhatsApp Dispatch
    let customerWhatsAppUrl = '';
    let vendorWhatsAppUrl = '';
    try {
      const orderPayload: TransactionalOrderPayload = {
        orderId: order.id,
        orderNumber: order.id.slice(-6).toUpperCase(),
        businessName: tenant?.name || 'Our Store',
        businessPhone: tenant?.phone || '',
        customerName: customerName || 'Valued Customer',
        customerPhone: cleanPhone,
        total: order.total,
        items: (items || []).map((it: any) => ({
          name: it.name || 'Item',
          qty: Number(it.qty) || 1,
          price: Number(it.price) || 0,
        })),
        deliveryType: deliveryType || 'delivery',
        deliveryAddress: deliveryAddress || undefined,
        paymentMethod: paymentMethod || 'CASH',
        paymentStatus: initialPaymentStatus,
        status: order.status,
        storeSlug: resolvedBusinessId,
      };

      const custConf = formatCustomerOrderConfirmation(orderPayload);
      const vendAlert = formatVendorNewOrderAlert(orderPayload);

      customerWhatsAppUrl = custConf.whatsappUrl;
      vendorWhatsAppUrl = vendAlert.whatsappUrl;

      // Automated background notification dispatch
      dispatchTransactionalWhatsApp(cleanPhone, custConf.messageText).catch(() => {});
      if (tenant?.phone) {
        dispatchTransactionalWhatsApp(tenant.phone, vendAlert.messageText).catch(() => {});
      }
    } catch (waErr) {
      console.warn('Transactional WhatsApp non-fatal error:', waErr);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.id.slice(-6).toUpperCase(),
      paymentStatus: initialPaymentStatus,
      trackingUrl: `/store/${resolvedBusinessId}/order/${order.id}`,
      customerWhatsAppUrl,
      vendorWhatsAppUrl,
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

    const nextPaymentStatus =
      paymentStatus || (cleanUtr ? 'DETECTION_PENDING' : undefined);

    const updated = await db.gptformCommerceOrder.update({
      where: { id: order.id },
      data: {
        ...(cleanUtr ? { notes: updatedNotes, paymentRef: cleanUtr } : {}),
        ...(nextPaymentStatus ? { paymentStatus: nextPaymentStatus } : {}),
        ...(paymentMethod ? { paymentMethod } : cleanUtr ? { paymentMethod: 'UPI' } : {}),
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

