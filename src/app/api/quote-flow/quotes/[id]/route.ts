import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';

const patchSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']).optional(),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  discountValue: z.number().optional(),
  discountType: z.enum(['AMOUNT', 'PERCENT']).optional(),
  taxRate: z.number().optional(),
  pdfTemplate: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        qty: z.number().positive(),
        unitPrice: z.number().min(0),
      })
    )
    .optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { business } = await requireQuoteFlowBusiness(req);

    const quote = await db.aiQuote.findFirst({
      where: { id, businessId: business.id },
      include: { customer: true, items: true },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const totals = computeTotals(
      quote.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
      quote.discountValue,
      quote.discountType,
      quote.taxRate,
      business.currency
    );

    return NextResponse.json({
      quote: {
        ...quote,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        totals,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.aiQuote.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const quote = await db.$transaction(async (tx) => {
      await tx.aiQuote.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.status && { status: parsed.data.status }),
          ...(parsed.data.validUntil !== undefined && {
            validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
          }),
          ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
          ...(parsed.data.discountValue !== undefined && { discountValue: parsed.data.discountValue }),
          ...(parsed.data.discountType && { discountType: parsed.data.discountType }),
          ...(parsed.data.taxRate !== undefined && { taxRate: parsed.data.taxRate }),
          ...(parsed.data.pdfTemplate && { pdfTemplate: parsed.data.pdfTemplate }),
        },
      });

      if (parsed.data.items) {
        await tx.aiQuoteItem.deleteMany({ where: { quoteId: id } });
        for (const item of parsed.data.items) {
          await tx.aiQuoteItem.create({
            data: {
              quoteId: id,
              description: item.description,
              qty: item.qty,
              unitPrice: item.unitPrice,
            },
          });
        }
      }

      return tx.aiQuote.findUnique({
        where: { id },
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

    return NextResponse.json({
      quote: {
        ...quote,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        totals,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { business } = await requireQuoteFlowBusiness(req);
    const existing = await db.aiQuote.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    await db.aiQuote.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
