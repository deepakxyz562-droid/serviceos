import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';
import { computeTotals } from '@/lib/quote-flow-session';
import { commerceError } from '@/lib/commerce/atomic';
import { round2 } from '@/lib/quote-flow-calc';

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

    const totals = computeTotals(
      invoice.items,
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

    const invoice = await db.aiInvoice.findFirst({
      where: { id, businessId: business.id },
      include: { payments: true, items: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const totals = computeTotals(
      invoice.items,
      invoice.discountValue,
      invoice.discountType,
      invoice.taxRate,
      business.currency
    );
    const paid = round2(invoice.payments.reduce((s, p) => s + p.amount, 0));
    const balance = Math.max(0, round2(totals.total - paid));

    if (balance <= 0.01) {
      return NextResponse.json({ error: 'This invoice is already fully paid.' }, { status: 400 });
    }
    if (round2(data.amount) > balance + 0.011) {
      return NextResponse.json(
        { error: `Amount exceeds the outstanding balance (${balance.toFixed(2)}).`, balance },
        { status: 400 }
      );
    }

    // Light idempotency: same reference + amount on the same invoice is a no-op.
    if (data.reference) {
      const duplicate = invoice.payments.find(
        (p) => p.reference === data.reference && Math.abs(p.amount - data.amount) < 0.011
      );
      if (duplicate) {
        return NextResponse.json({ payment: duplicate, duplicate: true });
      }
    }

    const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
    const payment = await db.aiPayment.create({
      data: {
        invoiceId: invoice.id,
        amount: round2(data.amount),
        method: data.method.toUpperCase().slice(0, 40),
        reference: data.reference?.trim() || null,
        notes: data.notes?.trim() || null,
        paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
      },
    });

    const nextPaid = round2(paid + payment.amount);
    const nextBalance = Math.max(0, round2(totals.total - nextPaid));
    const nextStatus = nextBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';
    await db.aiInvoice.update({ where: { id: invoice.id }, data: { status: nextStatus } });

    return NextResponse.json(
      {
        payment: {
          id: payment.id,
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference,
          notes: payment.notes,
          paidAt: payment.paidAt,
        },
        summary: {
          total: totals.total,
          paid: nextPaid,
          balance: nextBalance,
          status: nextStatus,
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
