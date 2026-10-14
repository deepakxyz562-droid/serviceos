import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderAccessToken } from '@/lib/commerce/order-access';
import { apiLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const limited = applyRateLimit(apiLimiter, req);
  if (limited) return rateLimitResponse(limited.resetAtMs);

  try {
    const { searchParams } = new URL(req.url);
    const phone = (searchParams.get('phone') || '').trim();
    const businessId = (searchParams.get('businessId') || '').trim();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 7) {
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 });
    }

    const phoneLast10 = cleanDigits.slice(-10);

    // Resolve business or tenant
    let targetBusinessId = businessId;
    let tenantSlug = '';
    if (businessId) {
      const biz = await db.aiBusiness.findFirst({
        where: { OR: [{ id: businessId }, { tenantId: businessId }] },
      });
      if (biz) {
        targetBusinessId = biz.id;
        if (biz.tenantId) {
          const tenant = await db.tenant.findUnique({ where: { id: biz.tenantId }, select: { slug: true } });
          tenantSlug = tenant?.slug || '';
        }
      } else {
        const tenant = await db.tenant.findFirst({ where: { OR: [{ id: businessId }, { slug: businessId }] } });
        if (tenant) {
          tenantSlug = tenant.slug || '';
          const b = await db.aiBusiness.findFirst({ where: { tenantId: tenant.id } });
          if (b) targetBusinessId = b.id;
        }
      }
    }

    // Find customer profile
    let customerName = '';
    let customerAddress = '';

    const savedAiCust = await db.aiCustomer.findFirst({
      where: {
        ...(targetBusinessId ? { businessId: targetBusinessId } : {}),
        phone: { contains: phoneLast10 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (savedAiCust) {
      customerName = savedAiCust.name || '';
      customerAddress = savedAiCust.address || '';
    }

    // Find orders for this phone number
    const orders = await db.gptformCommerceOrder.findMany({
      where: {
        ...(targetBusinessId ? { businessId: targetBusinessId } : {}),
        customerPhone: { contains: phoneLast10 },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    if (!customerName && orders.length > 0) {
      customerName = orders[0].customerName || 'Customer';
      customerAddress = orders[0].deliveryAddress || '';
    }

    const formattedOrders = orders.map((ord) => {
      let items: any[] = [];
      try {
        items = JSON.parse(ord.itemsJson);
      } catch {}

      const token = orderAccessToken(ord.id, ord.businessId);
      const trackingSlug = tenantSlug || ord.businessId;

      return {
        id: ord.id,
        orderNumber: ord.id.slice(-6).toUpperCase(),
        status: ord.status,
        paymentStatus: ord.paymentStatus,
        paymentMethod: ord.paymentMethod,
        total: ord.total,
        deliveryType: ord.deliveryType,
        deliveryAddress: ord.deliveryAddress,
        createdAt: ord.createdAt,
        items,
        trackingUrl: `/store/${encodeURIComponent(trackingSlug)}/order/${ord.id}?token=${encodeURIComponent(token)}`,
      };
    });

    return NextResponse.json({
      customer: {
        name: customerName || 'Customer',
        phone: phoneLast10,
        address: customerAddress,
      },
      orders: formattedOrders,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Could not load customer account' },
      { status: 500 }
    );
  }
}
