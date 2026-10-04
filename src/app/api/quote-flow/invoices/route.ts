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
      const totals = computeTotals(
        inv.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
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

    let targetCustomerId = body.customerId;
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
        // Refresh name/phone if the caller supplied newer info.
        if (body.customerName && existing.name !== custName) {
          existing = await db.aiCustomer.update({
            where: { id: existing.id },
            data: { name: custName, phone: custPhone || existing.phone },
          });
        }
        targetCustomerId = existing.id;
      } else {
        const newCust = await db.aiCustomer.create({
          data: { businessId: business.id, name: custName, phone: custPhone },
        });
        targetCustomerId = newCust.id;
      }
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
          customerId: targetCustomerId,
          number,
          status: body.status || 'DRAFT',
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          notes: body.notes || null,
          discountValue: Number(body.discountValue) || 0,
          discountType: body.discountType || 'AMOUNT',
          taxRate: Number(body.taxRate) || 0,
          pdfTemplate: body.pdfTemplate || 'classic-corporate-blue',
          fromQuoteId: body.fromQuoteId || null,
        },
      });

      const rawItems = Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : [{ description: 'Custom Service', qty: 1, unitPrice: 0 }];

      for (const it of rawItems) {
        await tx.aiInvoiceItem.create({
          data: {
            invoiceId: inv.id,
            description: it.description || 'Service',
            qty: Number(it.qty) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            hsnCode: it.hsnCode || null,
          },
        });
      }

      return tx.aiInvoice.findUnique({
        where: { id: inv.id },
        include: { customer: true, items: true, payments: true },
      });
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
