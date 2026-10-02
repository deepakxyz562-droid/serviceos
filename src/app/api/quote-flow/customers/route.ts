import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.toLowerCase() || '';

    const customers = await db.aiCustomer.findMany({
      where: {
        businessId: business.id,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { quotes: true, invoices: true },
        },
      },
    });

    const enriched = customers.map((c) => ({
      ...c,
      quoteCount: c._count?.quotes ?? 0,
      invoiceCount: c._count?.invoices ?? 0,
    }));

    return NextResponse.json({ customers: enriched });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const customer = await db.aiCustomer.create({
      data: {
        businessId: business.id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: parsed.data.address,
        notes: parsed.data.notes,
      },
    });

    return NextResponse.json({ customer });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
