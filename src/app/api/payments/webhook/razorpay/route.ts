import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { parsePaymentSettings } from '@/app/api/settings/payment-integrations/route';
import { activateBgosSubscription } from '@/lib/bgos-entitlement';
import { logBillingEvent } from '@/lib/billing-events';
import { cache } from '@/lib/cache';

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

    // 0. Razorpay Recurring Subscription Webhook Events (Monthly / Yearly Auto-Pay)
    if (
      eventType === 'subscription.authenticated' ||
      eventType === 'subscription.activated' ||
      eventType === 'subscription.charged' ||
      eventType === 'subscription.pending' ||
      eventType === 'subscription.halted' ||
      eventType === 'subscription.cancelled'
    ) {
      const globalSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
      if (!globalSecret || !verifyRazorpayWebhookSig(rawBody, signature, globalSecret)) {
        console.warn('[razorpay-webhook] Subscription webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const subEntity = event.payload?.subscription?.entity;
      const paymentEntity = event.payload?.payment?.entity;
      const mergedNotes = {
        ...(subEntity?.notes || {}),
        ...(paymentEntity?.notes || {}),
      };

      const subId = subEntity?.id ? String(subEntity.id) : null;
      let tenantId = mergedNotes.tenantId ? String(mergedNotes.tenantId) : '';
      let existingSub = subId
        ? await db.subscription
            .findFirst({ where: { paypalSubscriptionId: subId }, orderBy: { createdAt: 'desc' } })
            .catch(() => null)
        : null;
      if (!tenantId && existingSub?.tenantId) tenantId = existingSub.tenantId;

      if (!tenantId && subId) {
        const prodSub = await db.productSubscription
          .findFirst({ where: { providerSubscriptionId: subId } })
          .catch(() => null);
        if (prodSub?.workspaceId) {
          const pw = await db.productWorkspace
            .findFirst({ where: { workspaceId: prodSub.workspaceId }, select: { tenantId: true } })
            .catch(() => null);
          if (pw?.tenantId) tenantId = pw.tenantId;
        }
      }

      if (!tenantId) {
        return NextResponse.json({ status: 'ignored', reason: 'tenant_not_found' });
      }

      if (
        eventType === 'subscription.authenticated' ||
        eventType === 'subscription.activated' ||
        eventType === 'subscription.charged'
      ) {
        const planCode = String(mergedNotes.planCode || mergedNotes.plan || existingSub?.plan || 'starter');
        const billingCycle =
          mergedNotes.billingCycle === 'yearly' || existingSub?.billingCycle === 'yearly'
            ? 'yearly'
            : 'monthly';
        const amountPaise = Number(paymentEntity?.amount || 0);

        await activateBgosSubscription({
          tenantId,
          planCode,
          provider: 'razorpay',
          billingCycle,
          currency: paymentEntity?.currency || 'INR',
          amount: amountPaise > 0 ? Math.round(amountPaise / 100) : undefined,
          providerSubscriptionId: subId,
          providerOrderId: paymentEntity?.order_id ? String(paymentEntity.order_id) : null,
          providerPaymentId: paymentEntity?.id ? String(paymentEntity.id) : null,
          payerEmail: paymentEntity?.email || null,
          description: `Razorpay auto-pay (${eventType}) for ${planCode.toUpperCase()} (${billingCycle})`,
        });

        try {
          const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { settingsJson: true } });
          const s = t?.settingsJson ? JSON.parse(t.settingsJson) : {};
          if (s.autoPayCancelled) {
            s.autoPayCancelled = false;
            await db.tenant.update({ where: { id: tenantId }, data: { settingsJson: JSON.stringify(s) } });
          }
        } catch {}

        return NextResponse.json({ status: 'ok', event: eventType, activated: true });
      }

      if (eventType === 'subscription.halted' || eventType === 'subscription.cancelled') {
        const nextStatus = eventType === 'subscription.cancelled' ? 'cancelled' : 'past_due';
        if (existingSub) {
          await db.subscription
            .update({ where: { id: existingSub.id }, data: { status: nextStatus } })
            .catch(() => {});
        }
        await db.tenant
          .update({ where: { id: tenantId }, data: { planStatus: nextStatus } })
          .catch(() => {});
        try {
          const pws = await db.productWorkspace.findMany({
            where: { tenantId, product: 'bgos' },
            select: { workspaceId: true },
          });
          for (const pw of pws) {
            await db.productSubscription
              .update({ where: { workspaceId: pw.workspaceId }, data: { status: nextStatus } })
              .catch(() => {});
          }
        } catch {}

        await logBillingEvent({
          tenantId,
          subscriptionId: existingSub?.id ?? null,
          type: eventType === 'subscription.cancelled' ? 'cancel' : 'fail',
          status: eventType === 'subscription.cancelled' ? 'success' : 'failed',
          paymentProvider: 'razorpay',
          description: `Razorpay subscription ${eventType} (${subId || 'unknown'})`,
          metadata: { razorpaySubscriptionId: subId, eventType },
        }).catch(() => {});

        try {
          cache.invalidateByPrefix(`subscription:${tenantId}`);
        } catch {}
      }

      return NextResponse.json({ status: 'ok', event: eventType });
    }

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
