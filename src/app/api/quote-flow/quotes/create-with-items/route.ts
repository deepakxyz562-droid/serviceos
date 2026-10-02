import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';

const createQuoteSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  aiRawInput: z.string().optional().nullable(),
  aiEditHistory: z.string().optional().nullable(),
  discountValue: z.number().default(0),
  discountType: z.enum(['AMOUNT', 'PERCENT']).default('AMOUNT'),
  taxRate: z.number().default(0),
  pdfTemplate: z.string().default('modern'),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        qty: z.number().positive(),
        unitPrice: z.number().min(0),
      })
    )
    .min(1),
});

export async function POST(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);

    // Free plan quota check (3 quotes/mo limit on FREE tier)
    if (business.plan === 'FREE') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const countThisMonth = await db.aiQuote.count({
        where: {
          businessId: business.id,
          createdAt: { gte: startOfMonth },
        },
      });
      if (countThisMonth >= 3) {
        return NextResponse.json(
          {
            error: 'You have reached your Free plan limit of 3 quotes this month. Please upgrade to Pro for unlimited quotes.',
            code: 'PLAN_LIMIT',
          },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const parsed = createQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Resolve customer
    let targetCustomerId = parsed.data.customerId;
    if (!targetCustomerId && parsed.data.customerName) {
      const newCust = await db.aiCustomer.create({
        data: {
          businessId: business.id,
          name: parsed.data.customerName,
          email: parsed.data.customerEmail,
          phone: parsed.data.customerPhone,
          address: parsed.data.customerAddress,
        },
      });
      targetCustomerId = newCust.id;
    }

    if (!targetCustomerId) {
      return NextResponse.json({ error: 'Customer is required' }, { status: 400 });
    }

    // Sequence number
    const updatedBiz = await db.aiBusiness.update({
      where: { id: business.id },
      data: { quoteSeq: { increment: 1 } },
    });
    const quoteNumber = `Q-${updatedBiz.quoteSeq}`;

    // Create quote + items in transaction
    const quote = await db.$transaction(async (tx) => {
      const q = await tx.aiQuote.create({
        data: {
          businessId: business.id,
          customerId: targetCustomerId!,
          number: quoteNumber,
          status: 'DRAFT',
          validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
          notes: parsed.data.notes,
          aiRawInput: parsed.data.aiRawInput,
          aiEditHistory: parsed.data.aiEditHistory,
          discountValue: parsed.data.discountValue,
          discountType: parsed.data.discountType,
          taxRate: parsed.data.taxRate,
          pdfTemplate: parsed.data.pdfTemplate,
        },
      });

      for (const item of parsed.data.items) {
        await tx.aiQuoteItem.create({
          data: {
            quoteId: q.id,
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
          },
        });
      }

      return tx.aiQuote.findUnique({
        where: { id: q.id },
        include: { customer: true, items: true },
      });
    });

    const totals = computeTotals(
      quote?.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })) || [],
      quote?.discountValue || 0,
      quote?.discountType || 'AMOUNT',
      quote?.taxRate || 0,
      business.currency
    );

    return NextResponse.json({ quote: { ...quote, totals } });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
