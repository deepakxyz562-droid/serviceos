import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import {
  buildOrderCustomerWhatsappMessage,
  buildWaMeUrl,
  extractOrderFromLead,
  formatOrderNumber,
  isProductOrderLead,
  mapOrderStatusToLeadStatus,
  VALID_ORDER_STATUSES,
} from '@/lib/bgos-orders';
import type { BgosOrderStatus } from '../../../../../shared/bgos-contracts';

function safeParseArray(raw: string | null | undefined): unknown[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId || user.role === 'customer') {
    return NextResponse.json({ error: 'Workspace authentication required' }, { status: 401 });
  }

  try {
    const [tenant, waProvider, rows] = await Promise.all([
      db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { id: true, name: true, currency: true, country: true },
      }),
      db.communicationProvider.findFirst({
        where: { tenantId: user.tenantId, channel: 'whatsapp', isActive: true },
        select: { id: true },
      }),
      db.lead.findMany({
        where: {
          tenantId: user.tenantId,
          deletedAt: null,
          OR: [
            { title: { startsWith: '[Product Order]' } },
            { serviceType: { startsWith: '[Order' } },
            { serviceType: { startsWith: 'Product Order' } },
            { tagsJson: { contains: '"product_order"' } },
          ],
        },
        select: {
          id: true,
          title: true,
          name: true,
          phone: true,
          status: true,
          value: true,
          description: true,
          address: true,
          serviceType: true,
          tagsJson: true,
          lineItemsJson: true,
          notesJson: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const currency = tenant.currency || (tenant.country === 'IN' ? 'INR' : 'USD');
    const orders = rows
      .filter((r) => isProductOrderLead(r))
      .map((r) => extractOrderFromLead(r, currency));

    const pendingCount = orders.filter((o) => o.status === 'pending').length;
    const activeCount = orders.filter(
      (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'ready',
    ).length;

    return NextResponse.json({
      orders,
      pendingCount,
      activeCount,
      currency,
      whatsappConnected: Boolean(waProvider?.id),
    });
  } catch (err) {
    console.error('[bgos/orders] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId || user.role === 'customer') {
    return NextResponse.json({ error: 'Workspace authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
    const nextStatus = typeof body?.status === 'string' ? (body.status.trim() as BgosOrderStatus) : undefined;
    const notifyWhatsapp = body?.notifyCustomerWhatsapp === true;
    const customMessage = typeof body?.customMessage === 'string' ? body.customMessage.trim() : undefined;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }
    if (!nextStatus || !(VALID_ORDER_STATUSES as readonly string[]).includes(nextStatus)) {
      return NextResponse.json({ error: 'Valid order status is required' }, { status: 400 });
    }

    const [tenant, existingLead] = await Promise.all([
      db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { id: true, name: true, currency: true, country: true },
      }),
      db.lead.findFirst({
        where: { id: orderId, tenantId: user.tenantId, deletedAt: null },
        select: {
          id: true,
          title: true,
          name: true,
          phone: true,
          status: true,
          value: true,
          description: true,
          address: true,
          serviceType: true,
          tagsJson: true,
          lineItemsJson: true,
          notesJson: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    if (!tenant || !existingLead) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currency = tenant.currency || (tenant.country === 'IN' ? 'INR' : 'USD');
    const prevTags = safeParseArray(existingLead.tagsJson).filter(
      (t): t is string => typeof t === 'string' && !t.startsWith('order_status:'),
    );
    if (!prevTags.includes('product_order')) prevTags.push('product_order');
    prevTags.push(`order_status:${nextStatus}`);

    const prevNotes = safeParseArray(existingLead.notesJson);
    prevNotes.push({
      at: new Date().toISOString(),
      by: user.id,
      type: 'order_status',
      orderStatus: nextStatus,
      text: `Order status changed to ${nextStatus}.`,
    });

    const nextLeadStatus = mapOrderStatusToLeadStatus(nextStatus);
    const updatedRow = await db.lead.update({
      where: { id: existingLead.id },
      data: {
        status: nextLeadStatus,
        tagsJson: JSON.stringify(Array.from(new Set(prevTags))),
        notesJson: JSON.stringify(prevNotes),
        ...(nextStatus === 'completed' ? { convertedAt: new Date() } : {}),
      },
      select: {
        id: true,
        title: true,
        name: true,
        phone: true,
        status: true,
        value: true,
        description: true,
        address: true,
        serviceType: true,
        tagsJson: true,
        lineItemsJson: true,
        notesJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const updatedOrder = extractOrderFromLead(updatedRow, currency);
    const customerMessage = buildOrderCustomerWhatsappMessage({
      businessName: tenant.name,
      orderNumber: formatOrderNumber(updatedOrder.id),
      customerName: updatedOrder.customerName,
      items: updatedOrder.items,
      fulfillment: updatedOrder.fulfillment,
      status: nextStatus,
      totalAmount: updatedOrder.totalAmount,
      currency,
      customMessage,
    });
    const whatsappFallbackUrl = buildWaMeUrl(updatedOrder.customerPhone, customerMessage);

    let whatsappSent = false;
    let whatsappError: string | undefined;

    if (notifyWhatsapp && updatedOrder.customerPhone) {
      try {
        const sendRes = await sendWhatsAppMessage({
          tenantId: user.tenantId,
          to: updatedOrder.customerPhone,
          message: customerMessage,
        });
        whatsappSent = Boolean(sendRes.success && !sendRes.simulated);
        if (!whatsappSent) {
          whatsappError = sendRes.error || 'WhatsApp Business API is not connected';
        }
      } catch (waErr) {
        whatsappError = waErr instanceof Error ? waErr.message : 'Could not send WhatsApp update';
      }
    }

    return NextResponse.json({
      ok: true,
      order: { ...updatedOrder, whatsappUrl: whatsappFallbackUrl },
      whatsappSent,
      whatsappError,
      whatsappFallbackUrl,
    });
  } catch (err) {
    console.error('[bgos/orders] PATCH failed:', err);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
