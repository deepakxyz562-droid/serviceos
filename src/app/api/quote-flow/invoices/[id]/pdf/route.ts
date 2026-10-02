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
    const invoice = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
      include: { customer: true, items: true, payments: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const t = computeTotals(
      invoice.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
      invoice.discountValue,
      invoice.discountType as 'AMOUNT' | 'PERCENT',
      invoice.taxRate,
      business.currency
    );
    const paidAmount = invoice.payments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, t.total - paidAmount);

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
        name: invoice.customer.name,
        email: invoice.customer.email,
        phone: invoice.customer.phone,
        address: invoice.customer.address,
      },
      doc: {
        kind: 'INVOICE',
        number: invoice.number,
        status: invoice.status,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        notes: invoice.notes,
        items: invoice.items.map((i) => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
        subtotal: t.subtotal,
        discount: t.discount,
        discountType: invoice.discountType,
        discountValue: invoice.discountValue,
        tax: t.tax,
        taxRate: invoice.taxRate,
        total: t.total,
        paidAmount,
        balance,
        createdAt: invoice.createdAt.toISOString(),
      },
    };
    const stream = await renderToStream(renderQuotePdf(data, (invoice.pdfTemplate as any) || 'modern'));
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
