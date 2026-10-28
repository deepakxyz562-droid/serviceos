import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/invoices/[id]/payments — payment history for one invoice.
 * POST /api/invoices/[id]/payments — record a (partial) payment against the
 * invoice. Every entry lands in the InvoicePayment ledger; the invoice's
 * status/paidAt are derived from the ledger sums (paid when sum >= total).
 */

const PAYMENT_METHODS = ['MANUAL', 'CASH', 'CARD', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER'];
const round2 = (n: number) => Math.round(n * 100) / 100;

async function loadInvoice(id: string, authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
  // Same tenant isolation rules as /api/invoices/[id]
  let tenantFilter: Record<string, unknown>;
  if (authUser.isSuperAdmin || authUser.role === 'superadmin' || authUser.role === 'super_admin') {
    tenantFilter = {};
  } else if (authUser.role === 'customer') {
    tenantFilter = { customerId: authUser.id };
  } else {
    tenantFilter = { tenantId: authUser.tenantId };
  }
  return db.invoice.findFirst({ where: { id, ...tenantFilter } });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;
    const invoice = await loadInvoice(id, authUser);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const payments = await db.invoicePayment.findMany({
      where: { invoiceId: id },
      orderBy: { paidAt: 'desc' },
    });
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    return NextResponse.json({
      payments,
      summary: {
        total: round2(invoice.total),
        paid: round2(paid),
        outstanding: round2(Math.max(0, invoice.total - paid)),
        currency: invoice.currency,
      },
    });
  } catch (error) {
    console.error('Failed to list invoice payments:', error);
    return NextResponse.json({ error: 'Failed to list payments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (authUser.role === 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    const invoice = await loadInvoice(id, authUser);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (invoice.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot record a payment on a cancelled invoice' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'A positive payment amount is required' }, { status: 400 });
    }
    if (body.method !== undefined && !PAYMENT_METHODS.includes(body.method)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const agg = await db.invoicePayment.aggregate({
      where: { invoiceId: id },
      _sum: { amount: true },
    });
    const paid = agg._sum.amount || 0;
    const outstanding = Number(invoice.total) - paid;
    if (amount > outstanding + 0.009) {
      return NextResponse.json(
        { error: 'Payment exceeds the outstanding balance', outstanding: round2(Math.max(0, outstanding)) },
        { status: 400 },
      );
    }

    const payment = await db.invoicePayment.create({
      data: {
        invoiceId: id,
        tenantId: invoice.tenantId,
        amount: round2(amount),
        currency: invoice.currency,
        method: PAYMENT_METHODS.includes(body.method) ? body.method : 'MANUAL',
        reference: typeof body.reference === 'string' ? body.reference : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
        recordedBy: authUser.id,
      },
    });

    const newPaid = paid + amount;
    const nowFullyPaid = newPaid >= Number(invoice.total) - 0.009;
    await db.invoice.updateMany({
      where: { id },
      data: {
        ...(nowFullyPaid ? { status: 'paid', paidAt: new Date() } : {}),
        ...(invoice.status === 'draft' && !nowFullyPaid ? { status: 'sent' } : {}),
      },
    });

    // Best-effort activity log + paid event (never fails the request)
    try {
      await logActivity({
        tenantId: invoice.tenantId,
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'payment_recorded',
        entityType: 'invoice',
        entityId: invoice.id,
        entityName: invoice.number,
        description: `Recorded ${invoice.currency} ${round2(amount)} payment on ${invoice.number}`,
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[InvoicePayments] activity log failed:', logErr);
    }
    if (nowFullyPaid && invoice.status !== 'paid') {
      try {
        const { EventBus } = await import('@/lib/event-bus');
        await EventBus.emit(
          'invoice.paid',
          {
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            customerId: invoice.customerId || null,
            tenantId: invoice.tenantId || null,
            total: Number(invoice.total),
            currency: invoice.currency,
            resourceType: 'invoice',
            resourceId: invoice.id,
          },
          { tenantId: invoice.tenantId || undefined },
        );
      } catch (eventErr) {
        console.error('[InvoicePayments] invoice.paid event failed:', eventErr);
      }
    }

    return NextResponse.json(
      {
        payment,
        summary: {
          total: round2(invoice.total),
          paid: round2(newPaid),
          outstanding: round2(Math.max(0, Number(invoice.total) - newPaid)),
          currency: invoice.currency,
        },
        status: nowFullyPaid ? 'paid' : invoice.status === 'draft' ? 'sent' : invoice.status,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to record invoice payment:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
