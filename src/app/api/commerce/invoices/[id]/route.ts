import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';
import { computeTotals } from '@/lib/quote-flow-session';
import { atomicCommerce, commerceError } from '@/lib/commerce/atomic';

const patchSchema = z.object({
  number: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'UNPAID']).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  discountValue: z.number().min(0).optional(),
  discountType: z.enum(['AMOUNT', 'PERCENT']).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  paymentMethod: z.string().optional(),
  paidAmount: z.number().min(0).optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const business = await ownerBusiness(req);

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
    const failure = commerceError(e);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const business = await ownerBusiness(req);
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
      include: { payments: true, items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (parsed.data.status === 'PAID') {
      const total = computeTotals(
        existing.items,
        existing.discountValue,
        existing.discountType,
        existing.taxRate,
        business.currency
      ).total;
      const alreadyPaid = existing.payments.reduce((s, p) => s + p.amount, 0);
      const remaining = Math.max(0, total - alreadyPaid);

      if (remaining > 0) {
        // Record payment record on AiPayment
        await db.aiPayment.create({
          data: {
            businessId: business.id,
            invoiceId: existing.id,
            amount: remaining,
            method: parsed.data.paymentMethod || 'CASH',
            notes: 'Marked paid from BOS workstation',
          },
        });

        // Record in atomic money ledger (Daybook / Cash) via finance command
        const key = `pay_inv_${existing.id}_${Date.now()}`;
        await atomicCommerce('finance', [
          business.id,
          key,
          {
            kind: 'COLLECTION',
            amount: remaining,
            account: parsed.data.paymentMethod === 'BANK' ? 'BANK' : 'CASH',
            invoiceId: existing.id,
            reference: `Invoice ${existing.number} Paid`,
          },
        ]).catch(() => {});
      }

      const updated = await db.aiInvoice.update({
        where: { id: existing.id },
        data: { status: 'PAID' },
        include: { customer: true, items: true, payments: true },
      });

      return NextResponse.json({ invoice: updated });
    }

    const updated = await db.aiInvoice.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.dueDate ? { dueDate: new Date(parsed.data.dueDate) } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      },
      include: { customer: true, items: true, payments: true },
    });

    return NextResponse.json({ invoice: updated });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const failure = commerceError(e);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const business = await ownerBusiness(req);

    const existing = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
      include: { payments: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (existing.status === 'PAID' || existing.payments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete paid or partially-paid invoices' },
        { status: 400 }
      );
    }

    await db.aiInvoice.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const failure = commerceError(e);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
