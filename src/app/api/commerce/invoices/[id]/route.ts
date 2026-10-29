import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';
import { computeTotals } from '@/lib/quote-flow-session';
import { atomicCommerce, commerceError } from '@/lib/commerce/atomic';
import { auditAmountLabel, logCommerceActivity, resolveCommerceActor } from '@/lib/commerce/audit';

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

    // Canonical math (computeInvoiceTotals): per-line GST rate with the
    // invoice-level rate as fallback. The spread below already carries the
    // persisted placeOfSupply/customerGstin columns to the response.
    const totals = computeTotals(
      invoice.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice, taxRate: i.gstRate ?? invoice.taxRate })),
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
    const business = await ownerBusiness(req, 'canCreateInvoices');
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
      // Canonical math: per-line GST rate with invoice-level fallback.
      const total = computeTotals(
        existing.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice, taxRate: i.gstRate ?? existing.taxRate })),
        existing.discountValue,
        existing.discountType,
        existing.taxRate,
        business.currency
      ).total;

      // Atomic mark-paid (mirrors commerce/cheques/[id]): re-read, conditional
      // status guard, and payment create run in ONE db.$transaction. The
      // guard flips the status only from the observed non-PAID status, so a
      // concurrent payment/mark-paid race aborts our payment create instead
      // of double-recording. If the race already marked it PAID we return the
      // current state gracefully.
      const markPaidTx = () =>
        db.$transaction(async (tx) => {
          const current = await tx.aiInvoice.findUnique({
            where: { id: existing.id },
            include: { payments: true },
          });
          if (!current) {
            throw new Error('INVOICE_NOT_FOUND');
          }
          let settledRemaining = 0;
          if (current.status !== 'PAID') {
            // Conditional status guard: only flip when the row is still in
            // the observed status.
            const flip = await tx.aiInvoice.updateMany({
              where: { id: current.id, businessId: business.id, status: current.status },
              data: { status: 'PAID' },
            });
            if (flip.count !== 1) {
              throw new Error('INVOICE_STATE_CHANGED');
            }
            const alreadyPaid = current.payments.reduce((s, p) => s + p.amount, 0);
            const remaining = Math.max(0, total - alreadyPaid);
            if (remaining > 0) {
              // Record payment record on AiPayment (nuvora_invoice_receipt trigger logs ledger event)
              await tx.aiPayment.create({
                data: {
                  invoiceId: current.id,
                  amount: remaining,
                  method: parsed.data.paymentMethod || 'CASH',
                  notes: 'Marked paid from BOS workstation',
                },
              });
              settledRemaining = remaining;
            }
          }
          const invoice = await tx.aiInvoice.findUnique({
            where: { id: existing.id },
            include: { customer: true, items: true, payments: true },
          });
          return { invoice, settledRemaining };
        });

      let updated: Awaited<ReturnType<typeof markPaidTx>>;
      try {
        updated = await markPaidTx();
      } catch (txErr) {
        const message = txErr instanceof Error ? txErr.message : '';
        if (message === 'INVOICE_NOT_FOUND') {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }
        if (message === 'INVOICE_STATE_CHANGED') {
          // A concurrent request already transitioned this invoice — return
          // its current state instead of failing the caller.
          const current = await db.aiInvoice.findFirst({
            where: { id, businessId: business.id },
            include: { customer: true, items: true, payments: true },
          });
          if (!current) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
          }
          return NextResponse.json({ invoice: current });
        }
        throw txErr;
      }

      // Commerce audit trail — fire-and-forget; a logging failure can never
      // fail the mark-paid that just succeeded (logCommerceActivity swallows).
      const markPaidActor = await resolveCommerceActor(req);
      await logCommerceActivity({
        business,
        actorId: markPaidActor.actorId,
        actorName: markPaidActor.actorName,
        action: 'pay',
        entityType: 'invoice',
        entityId: updated.invoice?.id ?? existing.id,
        entityName: updated.invoice?.number ?? existing.number,
        description: `Invoice ${updated.invoice?.number ?? existing.number} marked paid — ${auditAmountLabel(business, updated.settledRemaining)} settled via ${parsed.data.paymentMethod || 'CASH'}`,
        metadata: {
          invoiceId: existing.id,
          number: updated.invoice?.number ?? existing.number,
          settledRemaining: updated.settledRemaining,
          method: parsed.data.paymentMethod || 'CASH',
        },
      });

      return NextResponse.json({ invoice: updated.invoice });
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
    if (e.message === 'FORBIDDEN' || e.message === 'FORBIDDEN_INSUFFICIENT_ROLE') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions for invoice operations' }, { status: 403 });
    }
    const failure = commerceError(e);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const business = await ownerBusiness(req, 'canCreateInvoices');

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

    // Commerce audit trail — fire-and-forget; a logging failure can never
    // fail the deletion that already succeeded (logCommerceActivity swallows).
    const deleteActor = await resolveCommerceActor(req);
    await logCommerceActivity({
      business,
      actorId: deleteActor.actorId,
      actorName: deleteActor.actorName,
      action: 'delete',
      entityType: 'invoice',
      entityId: existing.id,
      entityName: existing.number,
      description: `Invoice ${existing.number} deleted`,
      metadata: { invoiceId: existing.id, number: existing.number, status: existing.status },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (e.message === 'FORBIDDEN' || e.message === 'FORBIDDEN_INSUFFICIENT_ROLE') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions for invoice operations' }, { status: 403 });
    }
    const failure = commerceError(e);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
