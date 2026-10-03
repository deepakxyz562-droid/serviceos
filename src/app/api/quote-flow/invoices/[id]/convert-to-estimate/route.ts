import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { id } = await params;

    const invoice = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
      include: { items: true, customer: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const updatedBiz = await db.aiBusiness.update({
      where: { id: business.id },
      data: { quoteSeq: { increment: 1 } },
    });
    const number = `Q-${updatedBiz.quoteSeq}`;

    const quote = await db.$transaction(async (tx) => {
      const q = await tx.aiQuote.create({
        data: {
          businessId: business.id,
          customerId: invoice.customerId,
          number,
          status: 'DRAFT',
          notes: invoice.notes,
          discountValue: invoice.discountValue,
          discountType: invoice.discountType,
          taxRate: invoice.taxRate,
          pdfTemplate: invoice.pdfTemplate,
        },
      });

      for (const it of invoice.items) {
        await tx.aiQuoteItem.create({
          data: {
            quoteId: q.id,
            description: it.description,
            qty: it.qty,
            unitPrice: it.unitPrice,
            hsnCode: it.hsnCode,
          },
        });
      }

      return tx.aiQuote.findUnique({
        where: { id: q.id },
        include: { customer: true, items: true },
      });
    });

    return NextResponse.json({ quote, success: true }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
