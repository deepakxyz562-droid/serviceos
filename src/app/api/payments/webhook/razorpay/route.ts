import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { parsePaymentSettings } from '@/app/api/settings/payment-integrations/route';
import { activateBgosSubscription } from '@/lib/bgos-entitlement';

function verifyRazorpayWebhookSig(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expectedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  const receivedBuf = Buffer.from(signature, 'utf8');
  return expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * POST /api/payments/webhook/razorpay
 *
 * Automated webhook listener for Razorpay payment events.
 * Transitions invoices to 'paid' AND activates BGOS subscriptions upon capture/order/payment_link.
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

    if (
      eventType === 'payment.captured' ||
      eventType === 'order.paid' ||
      eventType === 'payment_link.paid'
    ) {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;
      const paymentLinkEntity = event.payload?.payment_link?.entity;

      const mergedNotes = {
        ...(paymentLinkEntity?.notes || {}),
        ...(orderEntity?.notes || {}),
        ...(paymentEntity?.notes || {}),
      };

      const invoiceId = mergedNotes.invoiceId;
      const tenantId = mergedNotes.tenantId;
      const paymentId = paymentEntity?.id || 'unknown';
      const orderId = orderEntity?.id || paymentEntity?.order_id || paymentLinkEntity?.id || null;
      const paymentMethod = paymentEntity?.method || 'online';

      // 1. BGOS SaaS Subscription Activation (Razorpay INR)
      const isBgosPayment =
        mergedNotes.platform === 'bgos' ||
        mergedNotes.product === 'bgos' ||
        (!invoiceId && Boolean(mergedNotes.planCode || mergedNotes.plan));

      if (isBgosPayment && tenantId) {
        const globalSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
        if (!globalSecret || !verifyRazorpayWebhookSig(rawBody, signature, globalSecret)) {
          console.warn('[razorpay-webhook] BGOS webhook signature verification failed');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const planCode = String(mergedNotes.planCode || mergedNotes.plan || 'starter');
        const billingCycle = mergedNotes.billingCycle === 'yearly' ? 'yearly' : 'monthly';
        const amountPaise = Number(paymentEntity?.amount || orderEntity?.amount || 0);

        await activateBgosSubscription({
          tenantId: String(tenantId),
          planCode,
          provider: 'razorpay',
          billingCycle,
          currency: paymentEntity?.currency || 'INR',
          amount: amountPaise > 0 ? Math.round(amountPaise / 100) : undefined,
          providerOrderId: orderId ? String(orderId) : null,
          providerPaymentId: paymentId !== 'unknown' ? String(paymentId) : null,
          payerEmail: paymentEntity?.email || null,
          description: `Razorpay webhook activated ${planCode.toUpperCase()} (${billingCycle})`,
        });

        return NextResponse.json({ status: 'ok', activated: true });
      }

      // 2. CRM Tenant Invoice Payment
      if (invoiceId) {
        if (tenantId && signature) {
          const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: { settingsJson: true },
          });
          const settings = parsePaymentSettings(tenant?.settingsJson);
          const secret = settings.razorpay?.webhookSecret || settings.razorpay?.keySecret;

          if (secret && !verifyRazorpayWebhookSig(rawBody, signature, secret)) {
            console.warn('[razorpay-webhook] Signature verification failed');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
          }
        }

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
