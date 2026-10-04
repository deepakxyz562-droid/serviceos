import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  TransactionalOrderPayload,
  formatCustomerOrderConfirmation,
  formatVendorNewOrderAlert,
  dispatchTransactionalWhatsApp,
} from '@/lib/whatsapp-transactional';

export const runtime = 'nodejs';

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

    // Hoist `tenant` so it stays in scope for the WhatsApp dispatch block
    // later in the handler. Previously it was declared with `const` *inside*
    // the `if (!config)` branch, so whenever a config already existed (the
    // common case) `tenant` was undefined and the vendor alert was silently
    // skipped.
    let tenant: any = null;

    // Resolve or find config
    let config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [{ businessId: businessId || '' }, { id: businessId || '' }],
      },
    });

    if (!config) {
      // Find tenant — assign to the outer `tenant` so it remains in scope.
      tenant = await db.tenant.findFirst({
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

    // Fallback tenant lookup: if a pre-existing config short-circuited the
    // `if (!config)` branch above, `tenant` is still null. Look it up now so
    // the vendor WhatsApp alert can fire whenever `tenant.phone` exists.
    if (!tenant && resolvedBusinessId && resolvedBusinessId !== 'default') {
      try {
        tenant = await db.tenant.findFirst({
          where: { OR: [{ id: resolvedBusinessId }, { slug: resolvedBusinessId }] },
        });
      } catch (tenantLookupErr) {
        console.warn('order route: tenant fallback lookup failed:', tenantLookupErr);
        tenant = null;
      }
    }

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

    // Inventory Auto-Depletion: Decrement stock for ordered items.
    //
    // Two layers run here, both wrapped in try/catch so a stock-write
    // failure never blocks order placement:
    //
    //   1. Legacy catalogJson decrement (kept for backward compat with
    //      the catalog UI that still reads stock from the JSON blob).
    //      Default stock for un-metered products is now 0 (was 50 — see
    //      audit Section B #8). Un-tracked products simply don't decrement.
    //
    //   2. Real InventoryItem decrement (atomic) + StockTransaction
    //      audit row + LowStockAlert reactivation. This is the source of
    //      truth going forward (Phase 2 migration).
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
              // Honest default: 0 for un-metered products. Do NOT silently
              // mask zero-stock with 50 units (the legacy magic number).
              const currentStock =
                typeof catalog[pIdx].stock === 'number' ? catalog[pIdx].stock : 0;
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
      console.warn('Inventory auto-depletion non-fatal warning (catalogJson):', invErr);
    }

    // Real InventoryItem decrement — atomic, with audit row + low-stock alert.
    // Non-blocking: failures are logged but never abort the order.
    try {
      for (const it of items) {
        const invItem = await db.inventoryItem.findFirst({
          where: {
            tenantId: resolvedBusinessId,
            OR: [
              { sku: it.productId || it.sku || undefined },
              { name: it.name || undefined },
            ],
          },
        });
        if (!invItem) continue;

        const qty = Math.max(1, Number(it.qty) || 1);
        await db.inventoryItem.update({
          where: { id: invItem.id },
          data: {
            totalStock: { decrement: qty },
            availableStock: { decrement: qty },
          },
        });
        await db.stockTransaction.create({
          data: {
            tenantId: resolvedBusinessId,
            inventoryItemId: invItem.id,
            type: 'sale',
            direction: 'out',
            quantity: qty,
            unitCost: invItem.salePrice,
            totalCost: qty * invItem.salePrice,
            reference: 'store_order',
            referenceId: order.id,
            notes: `Order ${order.id.slice(-6).toUpperCase()}`,
          },
        });

        // Re-fetch the updated row to evaluate low-stock state.
        const updatedInv = await db.inventoryItem.findUnique({
          where: { id: invItem.id },
        });
        if (
          updatedInv &&
          updatedInv.reorderLevel > 0 &&
          updatedInv.availableStock <= updatedInv.reorderLevel
        ) {
          // Create or reactivate an alert (no unique constraint on
          // inventoryItemId — use findFirst + upsert-by-hand).
          const existingAlert = await db.lowStockAlert.findFirst({
            where: {
              inventoryItemId: invItem.id,
              status: { in: ['active', 'acknowledged'] },
            },
            orderBy: { createdAt: 'desc' },
          });
          if (existingAlert) {
            await db.lowStockAlert.update({
              where: { id: existingAlert.id },
              data: {
                currentStock: updatedInv.availableStock,
                reorderLevel: updatedInv.reorderLevel,
                status: 'active',
                resolvedAt: null,
              },
            });
          } else {
            await db.lowStockAlert.create({
              data: {
                tenantId: resolvedBusinessId,
                inventoryItemId: invItem.id,
                currentStock: updatedInv.availableStock,
                reorderLevel: updatedInv.reorderLevel,
                status: 'active',
              },
            });
          }
        }
      }
    } catch (invErr) {
      console.warn('Inventory auto-depletion non-fatal warning (InventoryItem):', invErr);
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

      // Automated background notification dispatch.
      // Fire-and-forget for latency, but surface dispatch failures via
      // console.warn so a misconfigured WABA token doesn't vanish silently
      // (the dispatch itself also persists a WhatsAppMessageAction row).
      dispatchTransactionalWhatsApp(cleanPhone, custConf.messageText).catch((e) =>
        console.warn('[whatsapp dispatch] customer failed:', e)
      );
      if (tenant?.phone) {
        dispatchTransactionalWhatsApp(tenant.phone, vendAlert.messageText).catch((e) =>
          console.warn('[whatsapp dispatch] vendor failed:', e)
        );
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

