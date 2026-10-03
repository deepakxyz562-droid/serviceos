import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
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

    // Sanitize business logoUrl (must not be svg or invalid for @react-pdf/renderer)
    let sanitizedLogoUrl = business.logoUrl;
    if (sanitizedLogoUrl && (sanitizedLogoUrl.startsWith('data:image/svg') || sanitizedLogoUrl.endsWith('.svg'))) {
      sanitizedLogoUrl = null;
    }

    // Extract human-readable notes and signature from notes JSON if present
    let cleanNotes: string | null = invoice.notes;
    let signatureObj: { dataUrl: string | null; signedAt?: string | null; signerName?: string | null } | null = null;

    if (invoice.notes && invoice.notes.startsWith('{') && invoice.notes.endsWith('}')) {
      try {
        const parsed = JSON.parse(invoice.notes);
        if (parsed.notes) {
          cleanNotes = String(parsed.notes);
        } else if (Array.isArray(parsed.terms) && parsed.terms.length > 0) {
          cleanNotes = parsed.terms.join('\n');
        } else if (parsed.terms) {
          cleanNotes = String(parsed.terms);
        } else if (parsed.termsAndConditions) {
          cleanNotes = String(parsed.termsAndConditions);
        } else {
          cleanNotes = null;
        }

        const sigData = parsed.signatureDataUrl || parsed.signature;
        if (sigData && typeof sigData === 'string' && (sigData.startsWith('data:image/') || sigData.startsWith('http'))) {
          if (!sigData.startsWith('data:image/svg') && !sigData.endsWith('.svg')) {
            signatureObj = {
              dataUrl: sigData,
              signedAt: parsed.signedAt || null,
              signerName: parsed.signerName || null,
            };
          }
        }
      } catch {
        cleanNotes = invoice.notes;
      }
    }

    const data: QuotePdfData = {
      business: {
        name: business.name,
        ownerName: business.ownerName,
        phone: business.phone,
        email: business.email,
        address: business.address,
        logoUrl: sanitizedLogoUrl,
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
        notes: cleanNotes,
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
      signature: signatureObj,
    };

    let buffer: Buffer;
    const tplName = resolveTemplateName(invoice.pdfTemplate as string);
    try {
      buffer = await renderToBuffer(renderQuotePdf(data, tplName));
    } catch (renderErr) {
      console.error('Invoice PDF generation failed with primary template, retrying with fallback:', renderErr);
      const fallbackData: QuotePdfData = {
        ...data,
        business: { ...data.business, logoUrl: null, upiQrDataUrl: null },
        signature: null,
      };
      buffer = await renderToBuffer(renderQuotePdf(fallbackData, 'simple'));
    }

    // ?download=1 → Content-Disposition: attachment (forces browser Download).
    // Default → inline (opens PDF in a new tab for preview).
    const url = new URL(req.url);
    const isDownload = url.searchParams.get('download') === '1';
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${invoice.number}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (e: any) {
    console.error('PDF route fatal error:', e);
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
