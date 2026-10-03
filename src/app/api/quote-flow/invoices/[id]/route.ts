import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, computeTotals } from '@/lib/quote-flow-session';

const patchSchema = z.object({
  number: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'UNPAID']).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  discountValue: z.number().optional(),
  discountType: z.enum(['AMOUNT', 'PERCENT']).optional(),
  taxRate: z.number().optional(),
  pdfTemplate: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        qty: z.number().positive(),
        unitPrice: z.number().min(0),
      })
    )
    .optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { business } = await requireQuoteFlowBusiness(req);

    const invoice = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
      include: { customer: true, items: true, payments: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const totals = computeTotals(
      invoice.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
      invoice.discountValue,
      invoice.discountType,
      invoice.taxRate,
      business.currency
    );
    const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, totals.total - paid);

    return NextResponse.json({
      invoice: {
        ...invoice,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        paidAmount: Math.min(paid, totals.total),
        balance,
        totals: { ...totals, paid, balance },
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = await db.$transaction(async (tx) => {
      await tx.aiInvoice.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.number && { number: parsed.data.number }),
          ...(parsed.data.customerId && { customerId: parsed.data.customerId }),
          ...(parsed.data.status && {
            status: parsed.data.status === 'UNPAID' ? 'DRAFT' : parsed.data.status,
          }),
          ...(parsed.data.dueDate !== undefined && {
            dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
          }),
          ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
          ...(parsed.data.discountValue !== undefined && { discountValue: parsed.data.discountValue }),
          ...(parsed.data.discountType && { discountType: parsed.data.discountType }),
          ...(parsed.data.taxRate !== undefined && { taxRate: parsed.data.taxRate }),
          ...(parsed.data.pdfTemplate && { pdfTemplate: parsed.data.pdfTemplate }),
        },
      });

      if (parsed.data.items) {
        await tx.aiInvoiceItem.deleteMany({ where: { invoiceId: id } });
        for (const item of parsed.data.items) {
          await tx.aiInvoiceItem.create({
            data: {
              invoiceId: id,
              description: item.description,
              qty: item.qty,
              unitPrice: item.unitPrice,
            },
          });
        }
      }

      return tx.aiInvoice.findUnique({
        where: { id },
        include: { customer: true, items: true, payments: true },
      });
    });

    const totals = computeTotals(
      invoice?.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })) || [],
      invoice?.discountValue || 0,
      invoice?.discountType || 'AMOUNT',
      invoice?.taxRate || 0,
      business.currency
    );
    const paid = invoice?.payments.reduce((s, p) => s + p.amount, 0) || 0;
    const balance = Math.max(0, totals.total - paid);

    return NextResponse.json({
      invoice: {
        ...invoice,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        paidAmount: Math.min(paid, totals.total),
        balance,
        totals: { ...totals, paid, balance },
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { business } = await requireQuoteFlowBusiness(req);
    const existing = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    await db.aiInvoice.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
