import { createHash } from 'crypto';
import { counterCustomerPhone } from '../../../../../shared/walk-in-customer';
import { NextRequest, NextResponse } from 'next/server';
import { readHomePages, postedOrderSales } from '@/lib/business-home-data';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';
import { logCommerceActivity } from '@/lib/commerce/audit';

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
      gstin?: string | null;
      partyType?: string | null;
      creditLimit?: number | null;
      itemFrequency: Record<string, number>;
      recentOrders: Array<{ id: string; total: number; date: Date; status: string }>;
    }

    const customerMap = new Map<string, CustomerAgg>();

    for (const customer of aiCustomers) {
      const phone = (customer.phone || '').replace(/\D/g, '');
      // Preserve contacts without a phone by ID; never combine unrelated walk-in customers.
      const key = phone || `customer:${customer.id}`;
      // gstin: column first; fall back to the legacy "GSTIN: …" notes encoding.
      const legacyNotesGstin = customer.notes ? (customer.notes.match(/GSTIN:\s*([A-Z0-9]{15})/i)?.[1] ?? null) : null;
      if (!customerMap.has(key)) customerMap.set(key, {
        id: customer.id, phone, name: customer.name || 'Customer', deliveryAddress: customer.address,
        ordersCount: 0, totalSpent: 0, firstVisit: null, lastVisit: null,
        itemFrequency: {}, recentOrders: [], gstin: customer.gstin || legacyNotesGstin,
        partyType: customer.partyType ?? null, creditLimit: customer.creditLimit ?? null,
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
          gstin: aiC ? (aiC.gstin || (aiC.notes ? (aiC.notes.match(/GSTIN:\s*([A-Z0-9]{15})/i)?.[1] ?? null) : null)) : null,
          partyType: aiC?.partyType ?? null,
          creditLimit: aiC?.creditLimit ?? null,
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
        address: c.deliveryAddress,
        gstin: c.gstin ?? null,
        partyType: c.partyType ?? null,
        creditLimit: c.creditLimit ?? null,
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
    const { business, user } = await requireQuoteFlowBusiness(req);
    const body = await req.json().catch(() => null);
    const key = req.headers.get('Idempotency-Key');
    if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200 || typeof body.phone !== 'string' || !key || !/^[\w-]{8,128}$/.test(key)) return NextResponse.json({ error: 'Enter a name, phone and request key.' }, { status: 400 });
    let phone: string;
    try { phone = counterCustomerPhone(body.phone); } catch { return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 }); }
    if (!phone) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
    const id = `contact_${createHash('sha256').update(JSON.stringify([business.id, key])).digest('hex')}`;
    const address = typeof body.address === 'string' && body.address.trim() ? body.address.trim() : null;
    const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
    const gstin = typeof body.gstin === 'string' && body.gstin.trim() ? body.gstin.trim().toUpperCase() : null;
    // GSTIN now lives in its own column (legacy encodings in `notes` are no longer written).
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    // Party metadata (Phase 1): CUSTOMER | SUPPLIER | BOTH + khata credit limit
    // (positive float). Invalid values are rejected, not silently coerced.
    const partyTypeRaw = body.partyType;
    if (partyTypeRaw != null && !['CUSTOMER', 'SUPPLIER', 'BOTH'].includes(String(partyTypeRaw).toUpperCase())) {
      return NextResponse.json({ error: 'Party type must be CUSTOMER, SUPPLIER or BOTH.' }, { status: 400 });
    }
    const partyType = partyTypeRaw == null ? null : String(partyTypeRaw).toUpperCase();
    if (body.creditLimit != null && body.creditLimit !== '' &&
        (!Number.isFinite(Number(body.creditLimit)) || Number(body.creditLimit) < 0)) {
      return NextResponse.json({ error: 'Credit limit must be a positive amount.' }, { status: 400 });
    }
    const creditLimit = body.creditLimit == null || body.creditLimit === '' ? null : Number(body.creditLimit);
    const data: any = { businessId: business.id, name: body.name.trim(), phone, address, email, notes, gstin, partyType, creditLimit };
    const replay = (customer: { businessId: string; name: string; phone: string | null }) => customer.businessId === data.businessId && customer.name === data.name && customer.phone === data.phone;
    const existing = await db.aiCustomer.findUnique({ where: { id } });
    if (existing) return replay(existing) ? NextResponse.json({ customer: existing, replayed: true }) : NextResponse.json({ error: 'This request was used for different customer details.' }, { status: 409 });
    try {
      const customer = await db.aiCustomer.create({ data: { id, ...data } });

      // Commerce audit trail — fire-and-forget; a logging failure can never
      // fail the customer that was just created (logCommerceActivity swallows).
      await logCommerceActivity({
        business,
        actorId: user.id,
        actorName: user.name || user.email || null,
        action: 'create',
        entityType: 'customer',
        entityId: customer.id,
        entityName: customer.name,
        description: `Customer ${customer.name}${customer.phone ? ` (${customer.phone})` : ''} added`,
        metadata: {
          customerId: customer.id,
          name: customer.name,
          phone: customer.phone,
          partyType: customer.partyType || null,
        },
      });

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

export async function PATCH(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const id = body.id || searchParams.get('id');

    if (!id && !body.phone) {
      return NextResponse.json({ error: 'Customer ID or phone number is required.' }, { status: 400 });
    }

    const cleanPhone = (id && typeof id === 'string' && id.startsWith('phone:'))
      ? id.replace('phone:', '').replace(/\D/g, '')
      : (body.phone ? String(body.phone).replace(/\D/g, '') : null);

    let existing = await db.aiCustomer.findFirst({
      where: {
        businessId: business.id,
        OR: [
          ...(id ? [{ id: String(id) }] : []),
          ...(cleanPhone ? [{ phone: cleanPhone }] : []),
        ],
      },
    });

    let updatedPhone = existing?.phone;
    if (body.phone) {
      try {
        updatedPhone = counterCustomerPhone(body.phone);
      } catch {
        updatedPhone = String(body.phone).replace(/\D/g, '');
      }
    }

    const updatedName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing?.name || 'Customer';
    const updatedAddress = body.address !== undefined ? (typeof body.address === 'string' && body.address.trim() ? body.address.trim() : null) : existing?.address;
    const updatedEmail = body.email !== undefined ? (typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null) : existing?.email;

    // Party metadata (Phase 1): CUSTOMER | SUPPLIER | BOTH + khata credit limit.
    const PARTY_TYPES = ['CUSTOMER', 'SUPPLIER', 'BOTH'];
    const updatedPartyType =
      body.partyType === undefined || body.partyType === null
        ? existing?.partyType ?? null
        : PARTY_TYPES.includes(String(body.partyType).toUpperCase())
          ? String(body.partyType).toUpperCase()
          : null;
    const updatedCreditLimit =
      body.creditLimit === undefined || body.creditLimit === null || body.creditLimit === ''
        ? existing?.creditLimit ?? null
        : Number.isFinite(Number(body.creditLimit)) && Number(body.creditLimit) > 0
          ? Number(body.creditLimit)
          : null;

    let updatedNotes = existing?.notes || null;
    let updatedGstin: string | null | undefined = existing?.gstin ?? null;
    if (body.gstin !== undefined) {
      // Single source of truth: the gstin column. Legacy "GSTIN: …" text in
      // notes is stripped so the two can never disagree.
      updatedGstin = typeof body.gstin === 'string' && body.gstin.trim() ? body.gstin.trim().toUpperCase() : null;
      updatedNotes = (existing?.notes || '').replace(/GSTIN:\s*[^|,\n]+/gi, '').replace(/^\|\s*|\s*\|$/g, '').trim() || null;
    } else if (body.notes !== undefined) {
      updatedNotes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    }

    let customer;
    if (existing) {
      customer = await db.aiCustomer.update({
        where: { id: existing.id },
        data: {
          name: updatedName,
          phone: updatedPhone,
          address: updatedAddress,
          email: updatedEmail,
          notes: updatedNotes,
          ...(body.gstin !== undefined ? { gstin: updatedGstin } : {}),
          ...(body.partyType !== undefined ? { partyType: updatedPartyType } : {}),
          ...(body.creditLimit !== undefined ? { creditLimit: updatedCreditLimit } : {}),
        },
      });
    } else {
      const targetId = id || `contact_${createHash('sha256').update(JSON.stringify([business.id, body.phone, Date.now()])).digest('hex')}`;
      customer = await db.aiCustomer.create({
        data: {
          id: targetId,
          businessId: business.id,
          name: updatedName,
          phone: updatedPhone || cleanPhone,
          address: updatedAddress,
          email: updatedEmail,
          notes: updatedNotes,
          gstin: updatedGstin ?? null,
          partyType: updatedPartyType,
          creditLimit: updatedCreditLimit,
        },
      });
    }

    if (customer.phone) {
      try {
        await db.gptformCommerceOrder.updateMany({
          where: {
            businessId: business.id,
            customerPhone: customer.phone,
          },
          data: {
            customerName: customer.name,
            ...(customer.address ? { deliveryAddress: customer.address } : {}),
          },
        });
      } catch (err) {
        console.warn('Non-fatal order update failure:', err);
      }
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
        gstin: customer.gstin ?? null,
        partyType: customer.partyType ?? null,
        creditLimit: customer.creditLimit ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json(
      { error: 'Could not update customer.' },
      { status: message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 500 }
    );
  }
}
