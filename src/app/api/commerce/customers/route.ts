import { createHash } from 'crypto';
import { counterCustomerPhone } from '../../../../../shared/walk-in-customer';
import { NextRequest, NextResponse } from 'next/server';
import { readHomePages, postedOrderSales } from '@/lib/business-home-data';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

/**
 * GET /api/commerce/customers
 * Returns the business customer directory with order history, posted sales, and saved contacts.
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim();
    const tagFilter = searchParams.get('tag')?.toUpperCase().trim();

    // 1. Fetch all commerce orders for this business
    const orders = await readHomePages((skip, take) => db.gptformCommerceOrder.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip, take,
    }));

    // 2. Fetch AI Customers for this business
    const aiCustomers = await readHomePages((skip, take) => db.aiCustomer.findMany({
      where: { businessId: business.id }, orderBy: { id: 'asc' }, skip, take,
    }));
    const aiCustomerByPhone = new Map<string, typeof aiCustomers[0]>();
    aiCustomers.forEach((c) => {
      if (c.phone) {
        const clean = c.phone.replace(/\D/g, '');
        aiCustomerByPhone.set(clean, c);
      }
    });

    // 3. Aggregate customer history from orders
    interface CustomerAgg {
      id?: string;
      phone: string;
      name: string;
      deliveryAddress?: string | null;
      ordersCount: number;
      totalSpent: number;
      firstVisit: Date | null;
      lastVisit: Date | null;
      itemFrequency: Record<string, number>;
      recentOrders: Array<{ id: string; total: number; date: Date; status: string }>;
    }

    const customerMap = new Map<string, CustomerAgg>();

    for (const customer of aiCustomers) {
      const phone = (customer.phone || '').replace(/\D/g, '');
      // Preserve contacts without a phone by ID; never combine unrelated walk-in customers.
      const key = phone || `customer:${customer.id}`;
      if (!customerMap.has(key)) customerMap.set(key, {
        id: customer.id, phone, name: customer.name || 'Customer', deliveryAddress: customer.address,
        ordersCount: 0, totalSpent: 0, firstVisit: null, lastVisit: null,
        itemFrequency: {}, recentOrders: [],
      });
    }
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
      existing.totalSpent += postedOrderSales([ord]);
      if (!existing.lastVisit || new Date(ord.createdAt) > new Date(existing.lastVisit)) {
        existing.lastVisit = ord.createdAt;
      }
      if (!existing.firstVisit || new Date(ord.createdAt) < new Date(existing.firstVisit)) {
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
        id: c.id || `phone:${c.phone}`,
        phone: c.phone,
        name: c.name,
        deliveryAddress: c.deliveryAddress,
        ordersCount: c.ordersCount,
        totalSpent: Number(c.totalSpent.toFixed(2)),
        avgOrderValue: c.ordersCount ? Number((c.totalSpent / c.ordersCount).toFixed(2)) : 0,
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
    enriched.sort((a, b) => new Date(b.lastVisit || 0).getTime() - new Date(a.lastVisit || 0).getTime());

    // Summary metrics
    const totalCustomers = customerMap.size;
    const repeatCustomers = Array.from(customerMap.values()).filter((c) => c.ordersCount > 1).length;
    const totalRevenue = Array.from(customerMap.values()).reduce((sum, c) => sum + c.totalSpent, 0);

    return NextResponse.json({
      currency: business.currency || 'INR',
      customers: enriched,
      summary: {
        totalCustomers,
        repeatCustomers,
        repeatRate: totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
        totalRevenue: Number(totalRevenue.toFixed(2)),
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch commerce customers:', e);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json().catch(() => null);
    const key = req.headers.get('Idempotency-Key');
    if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200 || typeof body.phone !== 'string' || !key || !/^[\w-]{8,128}$/.test(key)) return NextResponse.json({ error: 'Enter a name, phone and request key.' }, { status: 400 });
    let phone: string;
    try { phone = counterCustomerPhone(body.phone); } catch { return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 }); }
    if (!phone) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
    const id = `contact_${createHash('sha256').update(JSON.stringify([business.id, key])).digest('hex')}`;
    const data = { businessId: business.id, name: body.name.trim(), phone };
    const replay = (customer: { businessId: string; name: string; phone: string | null }) => customer.businessId === data.businessId && customer.name === data.name && customer.phone === data.phone;
    const existing = await db.aiCustomer.findUnique({ where: { id } });
    if (existing) return replay(existing) ? NextResponse.json({ customer: existing, replayed: true }) : NextResponse.json({ error: 'This request was used for different customer details.' }, { status: 409 });
    try {
      const customer = await db.aiCustomer.create({ data: { id, ...data } });
      return NextResponse.json({ customer }, { status: 201 });
    } catch (error) {
      const saved = await db.aiCustomer.findUnique({ where: { id } });
      if (saved && replay(saved)) return NextResponse.json({ customer: saved, replayed: true });
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json({ error: 'Could not save customer.' }, { status: message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 503 });
  }
}
