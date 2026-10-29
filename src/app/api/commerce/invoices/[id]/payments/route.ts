import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';
import { computeTotals } from '@/lib/quote-flow-session';
import { commerceError } from '@/lib/commerce/atomic';
import { round2 } from '@/lib/quote-flow-calc';
import { auditAmountLabel, logCommerceActivity, resolveCommerceActor } from '@/lib/commerce/audit';

const paymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  method: z.string().min(1).max(40).default('CASH'),
  reference: z.string().max(120).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  paidAt: z.string().optional().nullable(),
});

/**
 * GET /api/commerce/invoices/[id]/payments
 * Payment history + live balance summary for one BOS invoice (AiInvoice family).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const business = await ownerBusiness(req);

    const invoice = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
      include: { payments: { orderBy: { paidAt: 'desc' } }, items: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Canonical math (computeInvoiceTotals): per-line GST rate with the
    // invoice-level rate as fallback — mirrors how the rows were persisted.
    const totals = computeTotals(
      invoice.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice, taxRate: i.gstRate ?? invoice.taxRate })),
      invoice.discountValue,
      invoice.discountType,
      invoice.taxRate,
      business.currency
    );
    const paid = round2(invoice.payments.reduce((s, p) => s + p.amount, 0));
    const balance = Math.max(0, round2(totals.total - paid));

    return NextResponse.json({
      payments: invoice.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        reference: p.reference || null,
        notes: p.notes || null,
        paidAt: p.paidAt,
        recordedBy: p.recordedBy || null,
      })),
      summary: {
        total: totals.total,
        paid,
        balance,
        status: balance <= 0.01 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : invoice.status,
        count: invoice.payments.length,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const failure = commerceError(e);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

/**
 * POST /api/commerce/invoices/[id]/payments
 * Record a PARTIAL payment against an invoice (Vyapar-style: any amount, any
 * method, optional UTR/cheque reference). Recomputes invoice status honestly:
 * PAID only when the balance reaches zero, PARTIALLY_PAID otherwise.
 * A duplicate submission with the same reference + amount is a no-op.
 *
 * IDEMPOTENCY: an `Idempotency-Key` header (8-128 chars, same contract as
 * /api/commerce/money) is accepted as the payment reference when the body
 * carries none — so the existing invoice+amount+reference dedupe below IS
 * the idempotency mechanism: a same-key/same-amount retry returns the
 * originally recorded payment instead of double-charging the invoice.
 *
 * ATOMICITY: the balance re-read, cap validation, payment insert and status
 * flip all run inside ONE db.$transaction (mirrors commerce/cheques/[id]),
 * so two concurrent payments cannot both pass the balance check.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const business = await ownerBusiness(req, 'canCreateInvoices');
    const body = await req.json().catch(() => null);
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payment input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Idempotency-Key support (mirrors /api/commerce/money): when present it
    // must be 8-128 chars; it doubles as the payment reference so the dedupe
    // below makes retries idempotent.
    const idempotencyKey = req.headers.get('Idempotency-Key');
    if (idempotencyKey !== null && (idempotencyKey.length < 8 || idempotencyKey.length > 128)) {
      return NextResponse.json({ error: 'Invalid payment input' }, { status: 400 });
    }
    const dedupeReference = data.reference?.trim() || idempotencyKey || null;

    const result = await db.$transaction(async (tx) => {
      // Re-read the invoice + payments INSIDE the transaction — the balance
      // and cap checks must see concurrently recorded payments.
      const invoice = await tx.aiInvoice.findFirst({
        where: { id, businessId: business.id },
        include: { payments: true, items: true },
      });
      if (!invoice) {
        return { kind: 'not_found' as const };
      }

      const totals = computeTotals(
        invoice.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice, taxRate: i.gstRate ?? invoice.taxRate })),
        invoice.discountValue,
        invoice.discountType,
        invoice.taxRate,
        business.currency
      );
      const paid = round2(invoice.payments.reduce((s, p) => s + p.amount, 0));
      const balance = Math.max(0, round2(totals.total - paid));

      if (balance <= 0.01) {
        return { kind: 'already_paid' as const };
      }
      if (round2(data.amount) > balance + 0.011) {
        return { kind: 'over_balance' as const, balance };
      }

      // Idempotency: same reference + amount on the same invoice is a no-op.
      if (dedupeReference) {
        const duplicate = invoice.payments.find(
          (p) => p.reference === dedupeReference && Math.abs(p.amount - data.amount) < 0.011
        );
        if (duplicate) {
          return { kind: 'duplicate' as const, payment: duplicate };
        }
      }

      const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
      const payment = await tx.aiPayment.create({
        data: {
          invoiceId: invoice.id,
          amount: round2(data.amount),
          method: data.method.toUpperCase().slice(0, 40),
          reference: dedupeReference,
          notes: data.notes?.trim() || null,
          paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
        },
      });

      // Status is derived from the balance recomputed inside this tx. The
      // conditional updateMany keeps the write scoped to this business.
      const nextPaid = round2(paid + payment.amount);
      const nextBalance = Math.max(0, round2(totals.total - nextPaid));
      const nextStatus = nextBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';
      await tx.aiInvoice.updateMany({
        where: { id: invoice.id, businessId: business.id },
        data: { status: nextStatus },
      });

      return { kind: 'created' as const, payment, invoiceNumber: invoice.number, totals, nextPaid, nextBalance, nextStatus };
    });

    if (result.kind === 'not_found') {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (result.kind === 'already_paid') {
      return NextResponse.json({ error: 'This invoice is already fully paid.' }, { status: 400 });
    }
    if (result.kind === 'over_balance') {
      return NextResponse.json(
        { error: `Amount exceeds the outstanding balance (${result.balance.toFixed(2)}).`, balance: result.balance },
        { status: 400 }
      );
    }
    if (result.kind === 'duplicate') {
      return NextResponse.json({ payment: result.payment, duplicate: true });
    }

    // Commerce audit trail — fire-and-forget; a logging failure can never
    // fail the payment that was just recorded (logCommerceActivity swallows).
    const paymentActor = await resolveCommerceActor(req);
    await logCommerceActivity({
      business,
      actorId: paymentActor.actorId,
      actorName: paymentActor.actorName,
      action: 'pay',
      entityType: 'payment',
      entityId: result.payment.id,
      entityName: result.invoiceNumber,
      description: `Payment ${auditAmountLabel(business, result.payment.amount)} recorded on ${result.invoiceNumber} via ${result.payment.method}`,
      metadata: {
        invoiceId: id,
        invoiceNumber: result.invoiceNumber,
        amount: result.payment.amount,
        method: result.payment.method,
        reference: result.payment.reference || null,
        balanceAfter: result.nextBalance,
        statusAfter: result.nextStatus,
      },
    });

    return NextResponse.json(
      {
        payment: {
          id: result.payment.id,
          amount: result.payment.amount,
          method: result.payment.method,
          reference: result.payment.reference,
          notes: result.payment.notes,
          paidAt: result.payment.paidAt,
        },
        summary: {
          total: result.totals.total,
          paid: result.nextPaid,
          balance: result.nextBalance,
          status: result.nextStatus,
        },
      },
      { status: 201 }
    );
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (e.message === 'FORBIDDEN' || e.message === 'FORBIDDEN_INSUFFICIENT_ROLE') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions for invoice payments' }, { status: 403 });
    }
    const failure = commerceError(e);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
