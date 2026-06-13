import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toISOString } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const quotes = await db.quote.findMany({
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
        status: 'draft',
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Failed to create quote:', error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}
