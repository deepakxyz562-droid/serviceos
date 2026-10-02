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
    let quote: any = null;

    try {
      const authRes = await requireQuoteFlowBusiness(req);
      business = authRes.business;
      quote = await db.aiQuote.findFirst({
        where: { id, businessId: business.id },
        include: { customer: true, items: true },
      });
    } catch {
      // Public fallback: allow recipient with the direct link to view their PDF
      quote = await db.aiQuote.findUnique({
        where: { id },
        include: { customer: true, items: true, business: true },
      });
      if (quote) {
        business = quote.business;
      }
    }

    if (!quote || !business) {
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
              amount: t.total,
              currency: business.currency,
              note: quote.number,
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
      // Parse signature from notes JSON (Phase 4)
      signature: (() => {
        try {
          if (quote.notes && quote.notes.startsWith('{') && quote.notes.endsWith('}')) {
            const parsed = JSON.parse(quote.notes);
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
    const stream = await renderToStream(renderQuotePdf(data, resolveTemplateName(quote.pdfTemplate as string)));
    // ?download=1 → Content-Disposition: attachment (forces browser Download).
    // Default → inline (opens PDF in a new tab for preview).
    const url = new URL(req.url);
    const isDownload = url.searchParams.get('download') === '1';
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${quote.number}.pdf"`,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
