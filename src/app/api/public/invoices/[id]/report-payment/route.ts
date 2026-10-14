import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/public/invoices/[id]/report-payment
 *
 * Public endpoint for customer to report an offline or direct payment
 * (e.g. Bank Transfer, UPI Direct, Cheque, Cash).
 * Sets status to 'payment_reported' or records in notes/metadata.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      paymentMethod?: string;
      referenceNumber?: string;
      notes?: string;
    };

    const invoice = await db.invoice.findFirst({
      where: { OR: [{ id }, { number: id }] },
      select: { id: true, number: true, status: true, notes: true, tenantId: true },
    });

    if (!invoice) {
      // ── Check BOS Commerce Invoices (AiInvoice) ──
      const aiInvoice = await db.aiInvoice.findFirst({
        where: { OR: [{ id }, { number: id }] },
        include: {
          items: true,
          payments: true,
          business: true,
        },
      });

      if (!aiInvoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      if (aiInvoice.status === 'PAID') {
        return NextResponse.json({ message: 'Invoice is already marked as paid' }, { status: 200 });
      }

      const ref = (body.referenceNumber || '').trim();
      const method = body.paymentMethod || 'UPI';
      const customerNotes = body.notes ? ` Notes: ${body.notes}` : '';
      const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const paymentReportNote = `[Payment Reported by Customer on ${dateStr} via ${method} (Ref: ${ref || 'None provided'})${customerNotes}]`;

      const updatedNotes = aiInvoice.notes
        ? `${aiInvoice.notes}\n${paymentReportNote}`
        : paymentReportNote;

      // Calculate total amount for this invoice
      const subtotal = aiInvoice.items.reduce((s, it) => s + (it.qty * it.unitPrice), 0);
      let discount = 0;
      if (aiInvoice.discountType === 'PERCENT') {
        discount = Number(((subtotal * aiInvoice.discountValue) / 100).toFixed(2));
      } else {
        discount = Number(Math.min(subtotal, aiInvoice.discountValue).toFixed(2));
      }
      const taxable = Math.max(0, subtotal - discount);
      const taxRate = Number(aiInvoice.taxRate) || 0;
      const tax = Number(((taxable * taxRate) / 100).toFixed(2));
      const total = Number((taxable + tax).toFixed(2));
      const totalPaidSoFar = aiInvoice.payments
        .filter((p) => p.gateway !== 'manual_report')
        .reduce((s, p) => s + p.amount, 0);
      const balance = Math.max(0, total - totalPaidSoFar);

      const paymentMethodEnum = method.toUpperCase().includes('UPI')
        ? 'UPI'
        : method.toUpperCase().includes('BANK')
          ? 'BANK_TRANSFER'
          : 'MANUAL';

      // Insert an AiPayment with gateway 'manual_report' so the merchant's ledger tracks the UTR/Ref
      await db.aiPayment.create({
        data: {
          invoiceId: aiInvoice.id,
          amount: balance,
          method: paymentMethodEnum,
          reference: ref || null,
          gateway: 'manual_report',
          currency: aiInvoice.business.currency || 'INR',
          notes: body.notes || 'Customer reported payment via public checkout page',
          recordedBy: 'Customer Portal',
        },
      });

      // Update invoice status to PARTIALLY_PAID (indicating payment received / verification pending)
      await db.aiInvoice.update({
        where: { id: aiInvoice.id },
        data: {
          status: 'PARTIALLY_PAID',
          notes: updatedNotes,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Payment report submitted. Your merchant has been notified to verify the transaction.',
        status: 'payment_reported',
      });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ message: 'Invoice is already marked as paid' }, { status: 200 });
    }

    const ref = (body.referenceNumber || '').trim();
    const method = body.paymentMethod || 'Direct Transfer';
    const customerNotes = body.notes ? ` Notes: ${body.notes}` : '';
    const paymentReportNote = `[Payment Reported by Customer on ${new Date().toLocaleString()} via ${method} (Ref: ${ref || 'None provided'})${customerNotes}]`;

    const updatedNotes = invoice.notes
      ? `${invoice.notes}\n${paymentReportNote}`
      : paymentReportNote;

    // Update the invoice: keep as 'pending_approval' or update notes
    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'pending_approval',
        notes: updatedNotes,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment report submitted. Your service provider has been notified to verify.',
      status: 'pending_approval',
    });
  } catch (error) {
    console.error('Report payment error:', error);
    return NextResponse.json({ error: 'Failed to report payment' }, { status: 500 });
  }
}
