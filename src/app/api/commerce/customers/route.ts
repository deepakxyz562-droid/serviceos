import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

/**
 * GET /api/commerce/customers
 * Returns customer CRM list with visit counts, lifetime spend, favorites, and loyalty tags.
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim();
    const tagFilter = searchParams.get('tag')?.toUpperCase().trim();

    // 1. Fetch all commerce orders for this business
    const orders = await db.gptformCommerceOrder.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // 2. Fetch AI Customers for this business
    const aiCustomers = await db.aiCustomer.findMany({
      where: { businessId: business.id },
    });
    const aiCustomerByPhone = new Map<string, typeof aiCustomers[0]>();
    aiCustomers.forEach((c) => {
      if (c.phone) {
        const clean = c.phone.replace(/\D/g, '');
        aiCustomerByPhone.set(clean, c);
      }
    });

    // 3. Aggregate customer history from orders
    interface CustomerAgg {
      phone: string;
      name: string;
      deliveryAddress?: string | null;
      ordersCount: number;
      totalSpent: number;
      firstVisit: Date;
      lastVisit: Date;
      itemFrequency: Record<string, number>;
      recentOrders: Array<{ id: string; total: number; date: Date; status: string }>;
    }

    const customerMap = new Map<string, CustomerAgg>();

    for (const ord of orders) {
      const cleanPhone = (ord.customerPhone || '').replace(/\D/g, '');
      if (!cleanPhone) continue;

      let existing = customerMap.get(cleanPhone);
      if (!existing) {
        const aiC = aiCustomerByPhone.get(cleanPhone);
        existing = {
          phone: cleanPhone,
          name: ord.customerName || aiC?.name || 'Customer',
          deliveryAddress: ord.deliveryAddress || aiC?.address || null,
          ordersCount: 0,
          totalSpent: 0,
          firstVisit: ord.createdAt,
          lastVisit: ord.createdAt,
          itemFrequency: {},
          recentOrders: [],
        };
        customerMap.set(cleanPhone, existing);
      }

      existing.ordersCount += 1;
      existing.totalSpent += Number(ord.total) || 0;
      if (new Date(ord.createdAt) > new Date(existing.lastVisit)) {
        existing.lastVisit = ord.createdAt;
      }
      if (new Date(ord.createdAt) < new Date(existing.firstVisit)) {
        existing.firstVisit = ord.createdAt;
      }
      if (ord.customerName && existing.name === 'Customer') {
        existing.name = ord.customerName;
      }
      if (ord.deliveryAddress && !existing.deliveryAddress) {
        existing.deliveryAddress = ord.deliveryAddress;
      }

      // Parse items
      try {
        const items = JSON.parse(ord.itemsJson || '[]');
        if (Array.isArray(items)) {
          for (const it of items) {
            const itemName = it.name || 'Item';
            existing.itemFrequency[itemName] = (existing.itemFrequency[itemName] || 0) + (Number(it.qty) || 1);
          }
        }
      } catch {}

      if (existing.recentOrders.length < 5) {
        existing.recentOrders.push({
          id: ord.id,
          total: ord.total,
          date: ord.createdAt,
          status: ord.status,
        });
      }
    }

    // 4. Map to enriched customer objects
    let enriched = Array.from(customerMap.values()).map((c) => {
      // Find top 3 favorite dishes
      const topItems = Object.entries(c.itemFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      // Determine Tag
      let tag: 'VIP' | 'REGULAR' | 'NEW' = 'NEW';
      if (c.totalSpent >= 1000 || c.ordersCount >= 5) {
        tag = 'VIP';
      } else if (c.ordersCount >= 2) {
        tag = 'REGULAR';
      }

      return {
        phone: c.phone,
        name: c.name,
        deliveryAddress: c.deliveryAddress,
        ordersCount: c.ordersCount,
        totalSpent: Number(c.totalSpent.toFixed(2)),
        avgOrderValue: Number((c.totalSpent / c.ordersCount).toFixed(2)),
        firstVisit: c.firstVisit,
        lastVisit: c.lastVisit,
        favoriteItems: topItems,
        recentOrders: c.recentOrders,
        tag,
      };
    });

    // 5. Apply filters
    if (search) {
      enriched = enriched.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.phone.includes(search) ||
          c.favoriteItems.some((it) => it.name.toLowerCase().includes(search))
      );
    }

    if (tagFilter && ['VIP', 'REGULAR', 'NEW'].includes(tagFilter)) {
      enriched = enriched.filter((c) => c.tag === tagFilter);
    }

    // Sort by last visit descending
    enriched.sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());

    // Summary metrics
    const totalCustomers = customerMap.size;
    const repeatCustomers = Array.from(customerMap.values()).filter((c) => c.ordersCount > 1).length;
    const totalRevenue = Array.from(customerMap.values()).reduce((sum, c) => sum + c.totalSpent, 0);

    return NextResponse.json({
      customers: enriched,
      summary: {
        totalCustomers,
        repeatCustomers,
        repeatRate: totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
        totalRevenue: Number(totalRevenue.toFixed(2)),
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch commerce customers:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch customers' }, { status: 500 });
  }
}
