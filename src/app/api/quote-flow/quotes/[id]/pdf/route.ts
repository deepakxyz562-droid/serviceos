import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';
import { renderQuotePdf, type QuotePdfData } from '@/lib/quote-flow-pdf';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { id } = await params;
    const quote = await db.aiQuote.findFirst({
      where: { id, businessId: business.id },
      include: { customer: true, items: true },
    });
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    const t = computeTotals(
      quote.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
      quote.discountValue,
      quote.discountType as 'AMOUNT' | 'PERCENT',
      quote.taxRate,
      business.currency
    );
    const data: QuotePdfData = {
      business: {
        name: business.name,
        ownerName: business.ownerName,
        phone: business.phone,
        email: business.email,
        address: business.address,
        currencySymbol: business.currencySymbol,
      },
      customer: {
        name: quote.customer.name,
        email: quote.customer.email,
        phone: quote.customer.phone,
        address: quote.customer.address,
      },
      doc: {
        kind: 'QUOTE',
        number: quote.number,
        status: quote.status,
        validUntil: quote.validUntil?.toISOString() ?? null,
        notes: quote.notes,
        items: quote.items.map((i) => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
        subtotal: t.subtotal,
        discount: t.discount,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        tax: t.tax,
        taxRate: quote.taxRate,
        total: t.total,
        createdAt: quote.createdAt.toISOString(),
      },
    };
    const stream = await renderToStream(renderQuotePdf(data, (quote.pdfTemplate as any) || 'modern'));
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quote.number}.pdf"`,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
