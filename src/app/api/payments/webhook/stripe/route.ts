import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { parsePaymentSettings } from '@/app/api/settings/payment-integrations/route';

/**
 * POST /api/payments/webhook/stripe
 *
 * Automated webhook listener for Stripe payment events (PaymentIntent succeeded).
 * Transitions invoices to 'paid' immediately upon payment.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const sigHeader = request.headers.get('stripe-signature');

    if (!rawBody) {
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data?.object;
      const invoiceId = paymentIntent?.metadata?.invoiceId;
      const tenantId = paymentIntent?.metadata?.tenantId;

      if (invoiceId) {
        // Fetch tenant to verify signature if webhook secret configured
        if (tenantId && sigHeader) {
          const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: { settingsJson: true },
          });
          const settings = parsePaymentSettings(tenant?.settingsJson);
          const endpointSecret = settings.stripe?.webhookSecret;

          if (endpointSecret) {
            const parts = sigHeader.split(',');
            const timestampPart = parts.find((p) => p.startsWith('t='))?.split('=')[1];
            const signaturePart = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

            if (timestampPart && signaturePart) {
              const payload = `${timestampPart}.${rawBody}`;
              const expectedSignature = crypto
                .createHmac('sha256', endpointSecret)
                .update(payload)
                .digest('hex');

              if (expectedSignature !== signaturePart) {
                console.warn('[stripe-webhook] Signature mismatch');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
              }
            }
          }
        }

        const invoice = await db.invoice.findUnique({
          where: { id: invoiceId },
          select: { id: true, status: true, notes: true },
        });

        if (invoice && invoice.status !== 'paid') {
          const paidNote = `[Automated Payment Verified via Stripe (Intent: ${paymentIntent.id}) on ${new Date().toLocaleString()}]`;
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[stripe-webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
