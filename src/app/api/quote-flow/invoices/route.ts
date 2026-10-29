import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';

export async function GET(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const invoices = await db.aiInvoice.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });

    const now = new Date();
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalOverdue = 0;

    const enriched = invoices.map((inv) => {
      // Canonical math (computeInvoiceTotals): per-line GST rate with the
      // invoice-level rate as fallback — mirrors how the rows were persisted.
      const totals = computeTotals(
        inv.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice, taxRate: i.gstRate ?? inv.taxRate })),
        inv.discountValue,
        inv.discountType,
        inv.taxRate,
        business.currency
      );
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const effectivePaid = Math.min(paid, totals.total);
      const balance = Math.max(0, totals.total - paid);

      totalPaid += effectivePaid;
      if (balance > 0) {
        const isOverdue = inv.status === 'OVERDUE' || (inv.dueDate && new Date(inv.dueDate) < now);
        if (isOverdue) {
          totalOverdue += balance;
        } else {
          totalUnpaid += balance;
        }
      }

      return {
        ...inv,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        paidAmount: effectivePaid,
        balance,
        totals: {
          ...totals,
          paid,
          balance,
        },
      };
    });

    const overview = {
      paid: Math.round(totalPaid * 100) / 100,
      unpaid: Math.round(totalUnpaid * 100) / 100,
      overdue: Math.round(totalOverdue * 100) / 100,
    };

    return NextResponse.json({ invoices: enriched, overview });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();

    // Optional GST context (persisted on the invoice — Phase 1).
    const placeOfSupply =
      typeof body.placeOfSupply === 'string' ? body.placeOfSupply.trim().slice(0, 60) : null;
    const customerGstin =
      typeof body.customerGstin === 'string'
        ? body.customerGstin.trim().toUpperCase().slice(0, 15)
        : null;

    let targetCustomerId = body.customerId;
    if (targetCustomerId) {
      const validCustomer = await db.aiCustomer.findFirst({
        where: { id: targetCustomerId, businessId: business.id },
      });
      if (!validCustomer) {
        targetCustomerId = undefined;
      }
    }
    if (!targetCustomerId) {
      const custName = body.customerName || 'Walk-in Customer';
      const custPhone = body.customerPhone ? String(body.customerPhone).replace(/\D/g, '') : null;
      // Find an existing customer by phone (preferred) or name, else create a new one.
      // This preserves the customer's identity so invoices/quotes attach to a real
      // AiCustomer record (instead of a generic "Valued Client"), and enables
      // WhatsApp deep-links like wa.me/<phone>?text=...
      let existing = custPhone
        ? await db.aiCustomer.findFirst({ where: { businessId: business.id, phone: custPhone } })
        : await db.aiCustomer.findFirst({ where: { businessId: business.id, name: custName } });
      if (existing) {
        // Refresh name/phone if the caller supplied newer info. GSTIN and
        // address are back-filled only when missing (never overwrite data
        // the merchant already curated on the customer record).
        existing = await db.aiCustomer.update({
          where: { id: existing.id },
          data: {
            name: body.customerName && existing.name !== custName ? custName : undefined,
            phone: custPhone || undefined,
            ...(customerGstin && !existing.gstin ? { gstin: customerGstin } : {}),
            ...(body.customerAddress && !existing.address
              ? { address: String(body.customerAddress).trim() }
              : {}),
          },
        });
        targetCustomerId = existing.id;
      } else {
        const newCust = await db.aiCustomer.create({
          data: {
            businessId: business.id,
            name: custName,
            phone: custPhone,
            ...(customerGstin ? { gstin: customerGstin } : {}),
            ...(body.customerAddress ? { address: String(body.customerAddress).trim() } : {}),
          },
        });
        targetCustomerId = newCust.id;
      }
    }

    const rawItems = Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : [{ description: 'Custom Service', qty: 1, unitPrice: 0 }];

    const totals = computeTotals(
      rawItems.map((i: any) => ({
        qty: Number(i.qty) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        taxRate: Number(i.gstRate) > 0 ? Number(i.gstRate) : Number(body.taxRate) || 0,
      })),
      Number(body.discountValue) || 0,
      body.discountType || 'AMOUNT',
      Number(body.taxRate) || 0,
      business.currency
    );

    let initialStatus = body.status === 'PARTIAL' ? 'PARTIALLY_PAID' : (body.status || 'DRAFT');
    const requestedPaid = Number(body.paidAmount) || 0;
    const effectivePaid = initialStatus === 'PAID'
      ? totals.total
      : Math.min(requestedPaid, totals.total);

    if (effectivePaid >= totals.total && totals.total > 0) {
      initialStatus = 'PAID';
    } else if (effectivePaid > 0) {
      initialStatus = 'PARTIALLY_PAID';
    }

    // Invoice + items + (optional) opening payment are created in ONE
    // db.$transaction. The invoiceSeq increment lives INSIDE the transaction
    // so a P2002 rollback also rolls the sequence back and the retry gets a
    // fresh number; after 3 conflicts we give up with 409.
    const createInvoiceTx = () =>
      db.$transaction(async (tx) => {
        const updatedBiz = await tx.aiBusiness.update({
          where: { id: business.id },
          data: { invoiceSeq: { increment: 1 } },
        });
        const number = `INV-${updatedBiz.invoiceSeq}`;

        const inv = await tx.aiInvoice.create({
          data: {
            businessId: business.id,
            customerId: targetCustomerId,
            number,
            status: initialStatus,
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            notes: body.notes || null,
            discountValue: Number(body.discountValue) || 0,
            discountType: body.discountType || 'AMOUNT',
            taxRate: Number(body.taxRate) || 0,
            placeOfSupply: placeOfSupply || null,
            customerGstin: customerGstin || null,
            pdfTemplate: body.pdfTemplate || 'classic-corporate-blue',
            fromQuoteId: body.fromQuoteId || null,
          },
        });

        for (const it of rawItems) {
          await tx.aiInvoiceItem.create({
            data: {
              invoiceId: inv.id,
              description: it.description || 'Service',
              qty: Number(it.qty) || 1,
              unitPrice: Number(it.unitPrice) || 0,
              hsnCode: it.hsnCode || null,
              gstRate: Number(it.gstRate) > 0 ? Number(it.gstRate) : null,
            },
          });
        }

        if (effectivePaid > 0) {
          await tx.aiPayment.create({
            data: {
              invoiceId: inv.id,
              amount: effectivePaid,
              method: body.paymentMethod || 'CASH',
              notes: 'Initial payment recorded at creation',
            },
          });
        }

        return tx.aiInvoice.findUnique({
          where: { id: inv.id },
          include: { customer: true, items: true, payments: true },
        });
      });

    let invoice: Awaited<ReturnType<typeof createInvoiceTx>> | null = null;
    for (let attempt = 0; attempt < 3 && !invoice; attempt++) {
      try {
        invoice = await createInvoiceTx();
      } catch (err: any) {
        // P2002 = unique constraint violation on (businessId, number) — a
        // concurrent creation consumed the same invoiceSeq value. Retry with
        // a fresh increment.
        if (err?.code === 'P2002') continue;
        throw err;
      }
    }
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice number conflict, please retry' }, { status: 409 });
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
