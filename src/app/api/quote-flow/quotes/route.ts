import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';

export async function GET(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const quotes = await db.aiQuote.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: true,
      },
    });

    let totalAccepted = 0;
    let totalPending = 0;
    let totalDraft = 0;

    const enriched = quotes.map((q) => {
      const totals = computeTotals(
        q.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
        q.discountValue,
        q.discountType,
        q.taxRate,
        business.currency
      );

      if (q.status === 'ACCEPTED') {
        totalAccepted += totals.total;
      } else if (q.status === 'SENT') {
        totalPending += totals.total;
      } else if (q.status === 'DRAFT') {
        totalDraft += totals.total;
      }

      return {
        ...q,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        totals,
      };
    });

    const overview = {
      accepted: Math.round(totalAccepted * 100) / 100,
      pending: Math.round(totalPending * 100) / 100,
      draft: Math.round(totalDraft * 100) / 100,
    };

    return NextResponse.json({ quotes: enriched, overview });
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
      data: { quoteSeq: { increment: 1 } },
    });
    const number = `Q-${updatedBiz.quoteSeq}`;

    const quote = await db.$transaction(async (tx) => {
      const q = await tx.aiQuote.create({
        data: {
          businessId: business.id,
          customerId: targetCustomerId,
          number,
          status: body.status || 'DRAFT',
          discountValue: Number(body.discountValue) || 0,
          discountType: body.discountType || 'AMOUNT',
          taxRate: Number(body.taxRate) || 0,
          notes: body.notes || null,
          pdfTemplate: body.pdfTemplate || 'classic-corporate-blue',
          validUntil: (body.validUntil || body.expiresAt) ? new Date(body.validUntil || body.expiresAt) : null,
        },
      });

      const rawItems = Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : [{ description: 'Custom Service', qty: 1, unitPrice: 0 }];

      for (const it of rawItems) {
        await tx.aiQuoteItem.create({
          data: {
            quoteId: q.id,
            description: it.description || 'Service',
            qty: Number(it.qty) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            hsnCode: it.hsnCode || null,
          },
        });
      }

      return tx.aiQuote.findUnique({
        where: { id: q.id },
        include: { customer: true, items: true },
      });
    });

    return NextResponse.json({ quote }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
