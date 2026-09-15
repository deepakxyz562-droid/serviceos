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
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
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
    });
  } catch (error) {
    console.error('Report payment error:', error);
    return NextResponse.json({ error: 'Failed to report payment' }, { status: 500 });
  }
}
