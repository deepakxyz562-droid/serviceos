import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeInvoiceTotals, type ProposalTier } from '@/lib/quote-flow-calc';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Try Quote
    const quote = await db.aiQuote.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        business: true,
      },
    });

    if (quote) {
      // Parse multi-tier or signature metadata if stored in notes
      let parsedNotes: any = null;
      let isMultiTier = false;
      let tiers: ProposalTier[] = [];
      let signature: any = null;
      let rawNoteText = quote.notes || '';

      if (quote.notes && quote.notes.startsWith('{') && quote.notes.endsWith('}')) {
        try {
          parsedNotes = JSON.parse(quote.notes);
          rawNoteText = parsedNotes.noteText ?? '';
          isMultiTier = Boolean(parsedNotes.isMultiTier);
          tiers = Array.isArray(parsedNotes.tiers) ? parsedNotes.tiers : [];
          if (parsedNotes.signatureDataUrl) {
            signature = {
              dataUrl: parsedNotes.signatureDataUrl,
              signedAt: parsedNotes.signedAt,
              signerName: parsedNotes.signerName,
            };
          }
        } catch {
          // Plain text notes
        }
      }

      const totals = computeInvoiceTotals({
        items: quote.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
        discountValue: quote.discountValue,
        discountType: quote.discountType,
        globalTaxRate: quote.taxRate,
      });

      return NextResponse.json({
        docType: 'QUOTE',
        id: quote.id,
        number: quote.number,
        status: quote.status,
        validUntil: quote.validUntil?.toISOString() ?? null,
        createdAt: quote.createdAt.toISOString(),
        notes: rawNoteText,
        discountValue: quote.discountValue,
        discountType: quote.discountType,
        taxRate: quote.taxRate,
        pdfTemplate: quote.pdfTemplate,
        items: quote.items.map((i) => ({
          id: i.id,
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
        totals,
        isMultiTier,
        tiers,
        signature,
        customer: {
          name: quote.customer.name,
          email: quote.customer.email,
          phone: quote.customer.phone,
          address: quote.customer.address,
        },
        business: {
          name: quote.business.name,
          ownerName: quote.business.ownerName,
          phone: quote.business.phone,
          email: quote.business.email,
          address: quote.business.address,
          logoUrl: quote.business.logoUrl,
          currency: quote.business.currency,
          currencySymbol: quote.business.currencySymbol,
          // Bank + UPI payment details (Phase 3)
          paymentCountry: quote.business.paymentCountry,
          paymentInstructions: quote.business.paymentInstructions,
          bankAccountName: quote.business.bankAccountName,
          bankAccountNumber: quote.business.bankAccountNumber,
          bankIfsc: quote.business.bankIfsc,
          bankSwift: quote.business.bankSwift,
          bankIban: quote.business.bankIban,
          bankRoutingNumber: quote.business.bankRoutingNumber,
          bankSortCode: quote.business.bankSortCode,
          bankBsb: quote.business.bankBsb,
          bankTransitNumber: quote.business.bankTransitNumber,
          bankInstitutionNumber: quote.business.bankInstitutionNumber,
          bankName: quote.business.bankName,
          bankBranch: quote.business.bankBranch,
          bankAddress: quote.business.bankAddress,
          upiId: quote.business.upiId,
          upiPayeeName: quote.business.upiPayeeName,
          paypalHandle: quote.business.paypalHandle,
          venmoHandle: quote.business.venmoHandle,
          zelleIdentifier: quote.business.zelleIdentifier,
          cashappCashtag: quote.business.cashappCashtag,
          wiseIban: quote.business.wiseIban,
          showBankOnInvoice: quote.business.showBankOnInvoice,
          showUpiOnInvoice: quote.business.showUpiOnInvoice,
        },
      });
    }

    // 2. Try Invoice
    const invoice = await db.aiInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        business: true,
        payments: true,
      },
    });

    if (invoice) {
      let parsedNotes: any = null;
      let rawNoteText = invoice.notes || '';
      let signature: any = null;

      if (invoice.notes && invoice.notes.startsWith('{') && invoice.notes.endsWith('}')) {
        try {
          parsedNotes = JSON.parse(invoice.notes);
          rawNoteText = parsedNotes.noteText ?? '';
          if (parsedNotes.signatureDataUrl) {
            signature = {
              dataUrl: parsedNotes.signatureDataUrl,
              signedAt: parsedNotes.signedAt,
              signerName: parsedNotes.signerName,
            };
          }
        } catch {}
      }

      const totals = computeInvoiceTotals({
        items: invoice.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
        discountValue: invoice.discountValue,
        discountType: invoice.discountType,
        globalTaxRate: invoice.taxRate,
      });

      const paidAmount = invoice.payments.reduce((s, p) => s + p.amount, 0);
      const balanceDue = Math.max(0, totals.total - paidAmount);

      return NextResponse.json({
        docType: 'INVOICE',
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
        notes: rawNoteText,
        discountValue: invoice.discountValue,
        discountType: invoice.discountType,
        taxRate: invoice.taxRate,
        pdfTemplate: invoice.pdfTemplate,
        items: invoice.items.map((i) => ({
          id: i.id,
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
        totals,
        paidAmount,
        balanceDue,
        signature,
        customer: {
          name: invoice.customer.name,
          email: invoice.customer.email,
          phone: invoice.customer.phone,
          address: invoice.customer.address,
        },
        business: {
          name: invoice.business.name,
          ownerName: invoice.business.ownerName,
          phone: invoice.business.phone,
          email: invoice.business.email,
          address: invoice.business.address,
          logoUrl: invoice.business.logoUrl,
          currency: invoice.business.currency,
          currencySymbol: invoice.business.currencySymbol,
          // Bank + UPI payment details (Phase 3)
          paymentCountry: invoice.business.paymentCountry,
          paymentInstructions: invoice.business.paymentInstructions,
          bankAccountName: invoice.business.bankAccountName,
          bankAccountNumber: invoice.business.bankAccountNumber,
          bankIfsc: invoice.business.bankIfsc,
          bankSwift: invoice.business.bankSwift,
          bankIban: invoice.business.bankIban,
          bankRoutingNumber: invoice.business.bankRoutingNumber,
          bankSortCode: invoice.business.bankSortCode,
          bankBsb: invoice.business.bankBsb,
          bankTransitNumber: invoice.business.bankTransitNumber,
          bankInstitutionNumber: invoice.business.bankInstitutionNumber,
          bankName: invoice.business.bankName,
          bankBranch: invoice.business.bankBranch,
          bankAddress: invoice.business.bankAddress,
          upiId: invoice.business.upiId,
          upiPayeeName: invoice.business.upiPayeeName,
          paypalHandle: invoice.business.paypalHandle,
          venmoHandle: invoice.business.venmoHandle,
          zelleIdentifier: invoice.business.zelleIdentifier,
          cashappCashtag: invoice.business.cashappCashtag,
          wiseIban: invoice.business.wiseIban,
          showBankOnInvoice: invoice.business.showBankOnInvoice,
          showUpiOnInvoice: invoice.business.showUpiOnInvoice,
        },
      });
    }

    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action = 'ACCEPT', signatureDataUrl, signerName, selectedTierId, reason } = body;

    // 1. Check if Quote
    const quote = await db.aiQuote.findUnique({
      where: { id },
      include: { items: true, business: true },
    });

    if (quote) {
      if (action === 'ACCEPT') {
        let existingNotesMeta: any = {};
        if (quote.notes && quote.notes.startsWith('{') && quote.notes.endsWith('}')) {
          try {
            existingNotesMeta = JSON.parse(quote.notes);
          } catch {}
        } else if (quote.notes) {
          existingNotesMeta.noteText = quote.notes;
        }

        // Check if selectedTierId was specified
        let updatedItems: { description: string; qty: number; unitPrice: number }[] | null = null;
        if (selectedTierId && Array.isArray(existingNotesMeta.tiers)) {
          const matchedTier = existingNotesMeta.tiers.find((t: any) => t.id === selectedTierId);
          if (matchedTier && Array.isArray(matchedTier.items)) {
            updatedItems = matchedTier.items;
          }
        }

        const newNotes = JSON.stringify({
          ...existingNotesMeta,
          selectedTierId: selectedTierId || existingNotesMeta.selectedTierId,
          signatureDataUrl: signatureDataUrl || null,
          signerName: signerName || 'Client',
          signedAt: new Date().toISOString(),
        });

        await db.$transaction(async (tx) => {
          await tx.aiQuote.update({
            where: { id: quote.id },
            data: {
              status: 'ACCEPTED',
              notes: newNotes,
            },
          });

          // If a specific tier was chosen, update quote items to that tier
          if (updatedItems && updatedItems.length > 0) {
            await tx.aiQuoteItem.deleteMany({ where: { quoteId: quote.id } });
            await tx.aiQuoteItem.createMany({
              data: updatedItems.map((i) => ({
                quoteId: quote.id,
                description: i.description || 'Item',
                qty: Number(i.qty) || 1,
                unitPrice: Number(i.unitPrice) || 0,
              })),
            });
          }
        });

        return NextResponse.json({
          success: true,
          status: 'ACCEPTED',
          message: 'Proposal accepted and signed successfully!',
        });
      }

      if (action === 'DECLINE') {
        await db.aiQuote.update({
          where: { id: quote.id },
          data: {
            status: 'DECLINED',
            notes: quote.notes ? `${quote.notes}\n[Declined: ${reason || 'Client declined'}]` : `[Declined: ${reason || 'Client declined'}]`,
          },
        });

        return NextResponse.json({
          success: true,
          status: 'DECLINED',
          message: 'Proposal marked as declined.',
        });
      }
    }

    // 2. Check if Invoice
    const invoice = await db.aiInvoice.findUnique({
      where: { id },
    });

    if (invoice) {
      if (action === 'RECORD_PAYMENT_SIMULATION') {
        // Record a payment (now with proper reference column from Phase 3).
        // The customer portal submits a UTR/reference when paying via bank
        // transfer or UPI. Method is recorded properly.
        const amount = Number(body.amount) || 100;
        await db.aiPayment.create({
          data: {
            invoiceId: invoice.id,
            amount,
            method: body.method || 'ONLINE',
            reference: body.reference || `SIM-${Date.now()}`,
            gateway: body.gateway || 'manual',
            notes: body.notes || null,
          },
        });

        // Check if invoice total is now covered
        const allPayments = await db.aiPayment.findMany({ where: { invoiceId: invoice.id } });
        const items = await db.aiInvoiceItem.findMany({ where: { invoiceId: invoice.id } });
        const totals = computeInvoiceTotals({
          items: items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
          discountValue: invoice.discountValue,
          discountType: invoice.discountType,
          globalTaxRate: invoice.taxRate,
        });

        const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
        const newStatus = totalPaid >= totals.total ? 'PAID' : 'PARTIALLY_PAID';

        await db.aiInvoice.update({
          where: { id: invoice.id },
          data: { status: newStatus },
        });

        return NextResponse.json({
          success: true,
          status: newStatus,
          message: 'Payment recorded successfully!',
        });
      }
    }

    return NextResponse.json({ error: 'Document not found or action not supported' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
