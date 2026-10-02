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
    const quote = await db.aiQuote.findFirst({
      where: { id, businessId: business.id },
      include: { items: true },
    });
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    const existing = await db.aiInvoice.findFirst({
      where: { fromQuoteId: quote.id, businessId: business.id },
    });
    if (existing) {
      return NextResponse.json({ invoice: existing, alreadyExists: true });
    }

    const updatedBiz = await db.aiBusiness.update({
      where: { id: business.id },
      data: { invoiceSeq: { increment: 1 } },
    });
    const number = `INV-${updatedBiz.invoiceSeq}`;

    const invoice = await db.$transaction(async (tx) => {
      const inv = await tx.aiInvoice.create({
        data: {
          businessId: business.id,
          customerId: quote.customerId,
          number,
          status: 'DRAFT',
          notes: quote.notes,
          discountValue: quote.discountValue,
          discountType: quote.discountType,
          taxRate: quote.taxRate,
          pdfTemplate: quote.pdfTemplate,
          fromQuoteId: quote.id,
        },
      });
      for (const it of quote.items) {
        await tx.aiInvoiceItem.create({
          data: {
            invoiceId: inv.id,
            description: it.description,
            qty: it.qty,
            unitPrice: it.unitPrice,
          },
        });
      }
      await tx.aiQuote.update({
        where: { id: quote.id },
        data: { convertedInvoiceId: inv.id, status: 'ACCEPTED' },
      });
      return inv;
    });

    return NextResponse.json({ invoice });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
