import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';
import { renderQuotePdf, resolveTemplateName, type QuotePdfData } from '@/lib/quote-flow-pdf';
import { generateUpiQrDataUrl } from '@/lib/upi-qr';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let business: any = null;
    let invoice: any = null;

    try {
      const authRes = await requireQuoteFlowBusiness(req);
      business = authRes.business;
      invoice = await db.aiInvoice.findFirst({
        where: { id, businessId: business.id },
        include: { customer: true, items: true, payments: true },
      });
    } catch {
      // Public fallback: allow recipient with the direct link to view their PDF
      invoice = await db.aiInvoice.findUnique({
        where: { id },
        include: { customer: true, items: true, business: true, payments: true },
      });
      if (invoice) {
        business = invoice.business;
      }
    }

    if (!invoice || !business) {
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
        logoUrl: business.logoUrl,
        currencySymbol: business.currencySymbol,
        currency: business.currency,
        // Bank + UPI payment details (Phase 3)
        paymentCountry: business.paymentCountry,
        paymentInstructions: business.paymentInstructions,
        bankAccountName: business.bankAccountName,
        bankAccountNumber: business.bankAccountNumber,
        bankIfsc: business.bankIfsc,
        bankSwift: business.bankSwift,
        bankIban: business.bankIban,
        bankRoutingNumber: business.bankRoutingNumber,
        bankSortCode: business.bankSortCode,
        bankBsb: business.bankBsb,
        bankTransitNumber: business.bankTransitNumber,
        bankInstitutionNumber: business.bankInstitutionNumber,
        bankName: business.bankName,
        bankBranch: business.bankBranch,
        bankAddress: business.bankAddress,
        upiId: business.upiId,
        upiPayeeName: business.upiPayeeName,
        upiQrDataUrl: business.upiId
          ? await generateUpiQrDataUrl({
              upiId: business.upiId,
              payeeName: business.upiPayeeName || business.name,
              amount: balance > 0 ? balance : t.total,
              currency: business.currency,
              note: invoice.number,
            }).catch(() => null)
          : null,
        paypalHandle: business.paypalHandle,
        venmoHandle: business.venmoHandle,
        zelleIdentifier: business.zelleIdentifier,
        cashappCashtag: business.cashappCashtag,
        wiseIban: business.wiseIban,
        showBankOnInvoice: business.showBankOnInvoice,
        showUpiOnInvoice: business.showUpiOnInvoice,
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
      // Parse signature from notes JSON (Phase 2 — same as quotes)
      signature: (() => {
        try {
          if (invoice.notes && invoice.notes.startsWith('{') && invoice.notes.endsWith('}')) {
            const parsed = JSON.parse(invoice.notes);
            if (parsed.signatureDataUrl) {
              return {
                dataUrl: parsed.signatureDataUrl,
                signedAt: parsed.signedAt || null,
                signerName: parsed.signerName || null,
              };
            }
          }
        } catch {
          /* not JSON */
        }
        return null;
      })(),
    };
    const stream = await renderToStream(renderQuotePdf(data, resolveTemplateName(invoice.pdfTemplate as string)));
    // ?download=1 → Content-Disposition: attachment (forces browser Download).
    // Default → inline (opens PDF in a new tab for preview).
    const url = new URL(req.url);
    const isDownload = url.searchParams.get('download') === '1';
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${invoice.number}.pdf"`,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
