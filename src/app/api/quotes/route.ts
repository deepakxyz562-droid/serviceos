import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toISOString } from '@/lib/utils';
import { getExchangeRate, convertCurrency } from '@/lib/currency';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerIdParam = searchParams.get('customerId');

    const where: Record<string, unknown> = {};
    if (user.tenantId && !user.isSuperAdmin) {
      where.tenantId = user.tenantId;
    }

    // Customers can only see their own quotes.
    // getAuthUser() already strips the `cust_` prefix, so user.id is the
    // raw Customer.id that matches Quote.customerId.
    // For admin/employee sessions, honour the optional customerId query param.
    if (user.role === 'customer') {
      where.customerId = user.id;
    } else if (customerIdParam) {
      where.customerId = customerIdParam;
    }

    const quotes = await db.quote.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = quotes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      customerName: q.customer?.name || 'Unknown',
      customerId: q.customerId || '',
      customerPhone: q.customer?.phone,
      services: JSON.parse(q.itemsJson || '[]'),
      addOns: JSON.parse(q.addOnsJson || '[]'),
      subtotal: q.subtotal,
      discountType: q.discountType,
      discountValue: q.discountType === 'percentage'
        ? q.subtotal > 0 ? Math.round((q.discount / q.subtotal) * 100) : 0
        : q.discount,
      discount: q.discount,
      taxRate: q.taxRate,
      tax: q.tax,
      total: q.total,
      currency: q.currency || 'USD',
      exchangeRate: q.exchangeRate || 1,
      baseCurrency: q.baseCurrency || 'USD',
      baseAmount: q.baseAmount || q.total,
      status: q.status,
      validUntil: q.validUntil ? toISOString(q.validUntil as Date | string | null)?.split('T')[0] ?? null : null,
      whatsappSent: q.whatsappSent,
      createdAt: toISOString(q.createdAt as Date | string)?.split('T')[0] ?? '',
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch quotes:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title, description, customerId,
      services, addOns, discountType, discountValue, taxRate, validUntil,
      currency: quoteCurrency, tenantId: bodyTenantId,
    } = body;

    if (!title || !customerId) {
      return NextResponse.json({ error: 'Title and customer are required' }, { status: 400 });
    }

    const servicesList = services || [];
    const addOnsList = addOns || [];

    const servicesTotal = servicesList.reduce((s: number, item: any) => s + (item.price || 0) * (item.quantity || 1), 0);
    const addOnsTotal = addOnsList.reduce((s: number, a: any) => s + (a.price || 0), 0);
    const subtotal = servicesTotal + addOnsTotal;

    const discount = discountType === 'percentage'
      ? subtotal * ((discountValue || 0) / 100)
      : (discountValue || 0);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * ((taxRate || 0) / 100);
    const total = afterDiscount + tax;

    // Resolve base currency from tenant
    let baseCurrency = 'USD';
    try {
      const tenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
      if (tenant?.currency) baseCurrency = tenant.currency;
    } catch { /* fallback */ }

    const transactionCurrency = quoteCurrency || baseCurrency;
    const exchangeRate = transactionCurrency === baseCurrency ? 1 : getExchangeRate(transactionCurrency, baseCurrency);
    const baseAmount = transactionCurrency === baseCurrency ? total : convertCurrency(total, transactionCurrency, baseCurrency, exchangeRate);

    const quote = await db.quote.create({
      data: {
        title,
        description: description || null,
        customerId,
        itemsJson: JSON.stringify(servicesList),
        addOnsJson: JSON.stringify(addOnsList),
        subtotal,
        discount,
        discountType: discountType || 'fixed',
        taxRate: taxRate || 0,
        tax,
        total,
        currency: transactionCurrency,
        exchangeRate,
        baseCurrency,
        baseAmount,
        status: 'draft',
        validUntil: validUntil ? new Date(validUntil) : null,
        tenantId: bodyTenantId || null,
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Failed to create quote:', error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}
