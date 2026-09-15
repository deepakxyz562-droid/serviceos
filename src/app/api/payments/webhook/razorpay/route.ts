import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { parsePaymentSettings } from '@/app/api/settings/payment-integrations/route';

/**
 * POST /api/payments/webhook/razorpay
 *
 * Automated webhook listener for Razorpay payment events.
 * Transitions invoices to 'paid' immediately upon payment capture.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!rawBody) {
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.event;

    // Handle payment.captured or order.paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const invoiceId = paymentEntity?.notes?.invoiceId || orderEntity?.notes?.invoiceId;
      const tenantId = paymentEntity?.notes?.tenantId || orderEntity?.notes?.tenantId;
      const paymentId = paymentEntity?.id || 'unknown';
      const paymentMethod = paymentEntity?.method || 'online';

      if (invoiceId) {
        // Fetch tenant to verify signature if secret configured
        if (tenantId && signature) {
          const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: { settingsJson: true },
          });
          const settings = parsePaymentSettings(tenant?.settingsJson);
          const secret = settings.razorpay?.webhookSecret || settings.razorpay?.keySecret;

          if (secret) {
            const expectedSig = crypto
              .createHmac('sha256', secret)
              .update(rawBody)
              .digest('hex');

            if (expectedSig !== signature) {
              console.warn('[razorpay-webhook] Signature verification failed');
              return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
          }
        }

        // Mark invoice as paid
        const invoice = await db.invoice.findUnique({
          where: { id: invoiceId },
          select: { id: true, status: true, notes: true },
        });

        if (invoice && invoice.status !== 'paid') {
          const paidNote = `[Automated Payment Verified via Razorpay ${paymentMethod.toUpperCase()} (ID: ${paymentId}) on ${new Date().toLocaleString()}]`;
          const updatedNotes = invoice.notes ? `${invoice.notes}\n${paidNote}` : paidNote;

          await db.invoice.update({
            where: { id: invoice.id },
            data: {
              status: 'paid',
              paidAt: new Date(),
              notes: updatedNotes,
            },
          });
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[razorpay-webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
