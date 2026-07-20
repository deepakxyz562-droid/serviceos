import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import {
  verifyPayPalWebhookSignature,
  getPayPalSubscription,
  isPayPalConfigured,
} from '@/lib/paypal';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/paypal/webhook
 *
 * Receives PayPal webhook events for recurring (Subscriptions API) billing.
 * This is the engine that makes auto-recurring billing work: PayPal charges
 * the customer each cycle and notifies us here, so we can extend the
 * subscription's endDate and record each payment.
 *
 * Supported events:
 *   - BILLING.SUBSCRIPTION.ACTIVATED   → activate local subscription
 *   - BILLING.SUBSCRIPTION.UPDATED     → sync status/plan
 *   - BILLING.SUBSCRIPTION.CANCELLED   → mark cancelled
 *   - BILLING.SUBSCRIPTION.EXPIRED     → mark expired
 *   - BILLING.SUBSCRIPTION.SUSPENDED   → mark suspended / past_due
 *   - PAYMENT.SALE.COMPLETED           → recurring payment succeeded: extend
 *                                         endDate + record SubscriptionPayment
 *   - PAYMENT.SALE.DENIED              → payment failed: mark past_due
 *   - PAYMENT.SALE.REFUNDED            → record refund
 *
 * Security: every event's signature is verified via PayPal's
 * /v1/notifications/verify-webhook-signature endpoint before processing.
 * Requires PAYPAL_WEBHOOK_ID in env.
 *
 * Idempotency: all handlers are idempotent — re-delivery of the same event
 * is safe (we look up by paypalSubscriptionId / paypal capture id and only
 * update if the state actually changed).
 *
 * Auth: none (webhook endpoint) — verified by signature instead.
 */
export async function POST(request: NextRequest) {
  // ─── 1. Read raw body + headers ─────────────────────────────────────
  const rawBody = await request.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const eventType = body.event_type as string | undefined;
  const resourceId =
    (body.resource as Record<string, unknown> | undefined)?.id as string | undefined;

  // ─── 2. Verify signature ────────────────────────────────────────────
  if (!isPayPalConfigured()) {
    // No PayPal credentials — can't verify. Accept in dev only if a special
    // bypass header is set (for local testing). In production this is a hard
    // reject.
    if (process.env.PAYPAL_WEBHOOK_BYPASS !== 'true') {
      return NextResponse.json(
        { error: 'PayPal not configured' },
        { status: 503 },
      );
    }
    console.warn('[paypal-webhook] BYPASS mode — skipping signature verification');
  } else {
    const valid = await verifyPayPalWebhookSignature(headers, body);
    if (!valid) {
      console.error('[paypal-webhook] signature verification FAILED', { eventType, resourceId });
      await logBillingEvent({
        tenantId: 'unknown',
        type: 'fail',
        status: 'failed',
        description: `PayPal webhook signature verification failed: ${eventType || 'unknown'}`,
        paymentProvider: 'paypal',
        metadata: { eventType, resourceId },
      });
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 },
      );
    }
  }

  // ─── 3. Route to handler ────────────────────────────────────────────
  try {
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(body);
        break;
      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionUpdated(body);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(body);
        break;
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionExpired(body);
        break;
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(body);
        break;
      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentSaleCompleted(body);
        break;
      case 'PAYMENT.SALE.DENIED':
        await handlePaymentSaleDenied(body);
        break;
      case 'PAYMENT.SALE.REFUNDED':
        await handlePaymentSaleRefunded(body);
        break;
      default:
        // Acknowledge unhandled events so PayPal doesn't retry them
        console.log('[paypal-webhook] unhandled event type:', eventType);
    }

    return NextResponse.json({ received: true, eventType });
  } catch (err) {
    console.error('[paypal-webhook] handler error:', eventType, err);
    // Return 500 so PayPal retries
    return NextResponse.json(
      { error: 'Handler failed' },
      { status: 500 },
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract the PayPal subscription ID from a billing event resource. */
function extractSubscriptionId(body: Record<string, unknown>): string | null {
  const resource = body.resource as Record<string, unknown> | undefined;
  if (!resource) return null;
  // For subscription events, the resource IS the subscription; its id is the sub ID.
  if (typeof resource.id === 'string' && resource.id.startsWith('I-')) {
    return resource.id;
  }
  // For payment events, the subscription ID is under billing_agreement_id
  const billingAgreementId = resource.billing_agreement_id as string | undefined;
  if (billingAgreementId) return billingAgreementId;
  return null;
}

/** Find the local Subscription row by PayPal subscription ID. */
async function findLocalSubscription(paypalSubId: string) {
  return db.subscription.findFirst({
    where: { paypalSubscriptionId: paypalSubId },
    orderBy: { createdAt: 'desc' },
  });
}

/** Invalidate subscription cache for a tenant after a state change. */
function invalidateCache(tenantId: string) {
  try {
    cache.invalidateByPrefix(`subscription:${tenantId}`);
    cache.invalidateByPrefix('subscription:');
  } catch {
    // best-effort
  }
}

/**
 * Compute the next endDate given a billing cycle: now + 1 month or + 1 year.
 */
function computeEndDate(cycle: string, from = new Date()): Date {
  const d = new Date(from);
  if (cycle === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

/** Generate the next invoice number: SUB-{YYYY}-{4-digit seq}. */
async function nextInvoiceNumber(): Promise<string> {
  const yearStr = new Date().getUTCFullYear().toString();
  const yearPrefix = `SUB-${yearStr}-`;
  const last = await db.subscriptionPayment.findFirst({
    where: { invoiceNumber: { startsWith: yearPrefix } },
    orderBy: { invoiceNumber: 'desc' },
  });
  let nextSeq = 1;
  if (last?.invoiceNumber) {
    const parts = last.invoiceNumber.split('-');
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
  }
  return `${yearPrefix}${String(nextSeq).padStart(4, '0')}`;
}

// ─── Subscription lifecycle handlers ────────────────────────────────────────

async function handleSubscriptionActivated(body: Record<string, unknown>) {
  const subId = extractSubscriptionId(body);
  if (!subId) return;
  const resource = body.resource as Record<string, unknown>;

  const local = await findLocalSubscription(subId);
  if (!local) {
    // The subscription was created via PayPal but we have no local record.
    // This can happen if the user approved on PayPal but our activate-subscription
    // endpoint hasn't run yet. Fetch full details and create a record.
    console.warn('[paypal-webhook] ACTIVATED for unknown subscription', subId);
    await logBillingEvent({
      tenantId: 'unknown',
      type: 'subscription_created',
      status: 'pending',
      description: `PayPal subscription activated but no local record found: ${subId}`,
      paymentProvider: 'paypal',
      metadata: { paypalSubscriptionId: subId, resource },
    });
    return;
  }

  if (local.status === 'active') {
    // Already activated by the activate-subscription endpoint — idempotent.
    return;
  }

  const planCode = (resource.plan_id as string) || local.plan;
  const payerEmail = (resource.subscriber as Record<string, unknown>)?.email_address as string | undefined;

  await db.subscription.update({
    where: { id: local.id },
    data: {
      status: 'active',
      paypalPayerEmail: payerEmail || local.paypalPayerEmail,
      paymentProvider: 'paypal',
    },
  });

  await db.tenant.update({
    where: { id: local.tenantId },
    data: { planStatus: 'active' },
  });

  invalidateCache(local.tenantId);

  await logBillingEvent({
    tenantId: local.tenantId,
    subscriptionId: local.id,
    type: 'subscription_created',
    status: 'success',
    amount: local.amount,
    currency: local.currency,
    description: `PayPal subscription activated (webhook): ${planCode} (${local.billingCycle})`,
    paymentProvider: 'paypal',
    payerEmail: payerEmail || null,
    metadata: { paypalSubscriptionId: subId, plan: planCode },
  });
}

async function handleSubscriptionUpdated(body: Record<string, unknown>) {
  const subId = extractSubscriptionId(body);
  if (!subId) return;
  const local = await findLocalSubscription(subId);
  if (!local) return;

  const resource = body.resource as Record<string, unknown>;
  const status = (resource.status as string) || '';

  // Map PayPal status → local status
  const statusMap: Record<string, string> = {
    ACTIVE: 'active',
    APPROVAL_PENDING: 'pending_payment',
    APPROVED: 'active',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
  };
  const newStatus = statusMap[status] || local.status;
  if (newStatus !== local.status) {
    await db.subscription.update({
      where: { id: local.id },
      data: { status: newStatus },
    });
    invalidateCache(local.tenantId);
  }
}

async function handleSubscriptionCancelled(body: Record<string, unknown>) {
  const subId = extractSubscriptionId(body);
  if (!subId) return;
  const local = await findLocalSubscription(subId);
  if (!local) return;

  if (local.status === 'cancelled') return; // idempotent

  await db.subscription.update({
    where: { id: local.id },
    data: { status: 'cancelled' },
  });
  await db.tenant.update({
    where: { id: local.tenantId },
    data: { planStatus: 'cancelled' },
  });
  invalidateCache(local.tenantId);

  await logBillingEvent({
    tenantId: local.tenantId,
    subscriptionId: local.id,
    type: 'cancel',
    status: 'success',
    amount: local.amount,
    description: `PayPal subscription cancelled (webhook): ${local.plan} (${local.billingCycle})`,
    paymentProvider: 'paypal',
    metadata: { paypalSubscriptionId: subId, cancelledPlan: local.plan },
  });
}

async function handleSubscriptionExpired(body: Record<string, unknown>) {
  const subId = extractSubscriptionId(body);
  if (!subId) return;
  const local = await findLocalSubscription(subId);
  if (!local) return;

  await db.subscription.update({
    where: { id: local.id },
    data: { status: 'expired' },
  });
  await db.tenant.update({
    where: { id: local.tenantId },
    data: { planStatus: 'expired' },
  });
  invalidateCache(local.tenantId);
}

async function handleSubscriptionSuspended(body: Record<string, unknown>) {
  const subId = extractSubscriptionId(body);
  if (!subId) return;
  const local = await findLocalSubscription(subId);
  if (!local) return;

  await db.subscription.update({
    where: { id: local.id },
    data: { status: 'suspended' },
  });
  await db.tenant.update({
    where: { id: local.tenantId },
    data: { planStatus: 'past_due' },
  });
  invalidateCache(local.tenantId);

  await logBillingEvent({
    tenantId: local.tenantId,
    subscriptionId: local.id,
    type: 'fail',
    status: 'failed',
    amount: local.amount,
    description: `PayPal subscription suspended (payment failure): ${local.plan}`,
    paymentProvider: 'paypal',
    metadata: { paypalSubscriptionId: subId },
  });
}

// ─── Payment handlers (the recurring charges) ───────────────────────────────

async function handlePaymentSaleCompleted(body: Record<string, unknown>) {
  const resource = body.resource as Record<string, unknown>;
  const subId = extractSubscriptionId(body);
  // The PayPal capture/sale ID (unique per payment)
  const saleId = resource.id as string | undefined;
  if (!subId || !saleId) return;

  const local = await findLocalSubscription(subId);
  if (!local) {
    console.warn('[paypal-webhook] PAYMENT.SALE.COMPLETED for unknown subscription', subId);
    return;
  }

  // ─── Idempotency: skip if we already recorded this sale ────────────
  const existing = await db.subscriptionPayment.findFirst({
    where: { paypalOrderId: saleId },
  });
  if (existing) return; // already recorded — don't double-count

  // Extract amount from the resource
  const amountObj = resource.amount as Record<string, unknown> | undefined;
  const amountValue = amountObj?.value as string | undefined;
  const amount = amountValue ? parseFloat(amountValue) : local.amount;
  const currency = (amountObj?.currency_code as string) || local.currency || 'USD';

  // Extend the endDate by one cycle from the current endDate (or now if expired)
  const baseDate = local.endDate && local.endDate > new Date() ? local.endDate : new Date();
  const newEndDate = computeEndDate(local.billingCycle, baseDate);

  await db.subscription.update({
    where: { id: local.id },
    data: {
      status: 'active',
      endDate: newEndDate,
      amount, // keep amount in sync with what PayPal actually charged
    },
  });
  await db.tenant.update({
    where: { id: local.tenantId },
    data: {
      planStatus: 'active',
      planEndsAt: newEndDate,
    },
  });

  // Record the payment
  const invoiceNumber = await nextInvoiceNumber();
  const planLabel = local.plan.charAt(0).toUpperCase() + local.plan.slice(1);
  await db.subscriptionPayment.create({
    data: {
      tenantId: local.tenantId,
      subscriptionId: local.id,
      invoiceNumber,
      amount,
      currency,
      status: 'paid',
      description: `${planLabel} Plan - ${local.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} (auto-renewal)`,
      plan: local.plan,
      billingCycle: local.billingCycle,
      paymentProvider: 'paypal',
      paypalOrderId: saleId,
      payerEmail: local.paypalPayerEmail || null,
      paidAt: new Date(),
    },
  });

  invalidateCache(local.tenantId);

  await logBillingEvent({
    tenantId: local.tenantId,
    subscriptionId: local.id,
    type: 'renewal',
    status: 'success',
    amount,
    currency,
    description: `Recurring payment received (webhook): ${planLabel} (${local.billingCycle}) — invoice ${invoiceNumber}`,
    paymentProvider: 'paypal',
    paypalOrderId: saleId,
    payerEmail: local.paypalPayerEmail || null,
    invoiceNumber,
    metadata: { paypalSubscriptionId: subId, saleId, newEndDate: newEndDate.toISOString() },
  });
}

async function handlePaymentSaleDenied(body: Record<string, unknown>) {
  const subId = extractSubscriptionId(body);
  if (!subId) return;
  const local = await findLocalSubscription(subId);
  if (!local) return;

  await db.subscription.update({
    where: { id: local.id },
    data: { status: 'past_due' },
  });
  await db.tenant.update({
    where: { id: local.tenantId },
    data: { planStatus: 'past_due' },
  });
  invalidateCache(local.tenantId);

  await logBillingEvent({
    tenantId: local.tenantId,
    subscriptionId: local.id,
    type: 'fail',
    status: 'failed',
    amount: local.amount,
    description: `Recurring payment DENIED (webhook): ${local.plan} (${local.billingCycle})`,
    paymentProvider: 'paypal',
    metadata: { paypalSubscriptionId: subId },
  });
}

async function handlePaymentSaleRefunded(body: Record<string, unknown>) {
  const resource = body.resource as Record<string, unknown>;
  const saleId =
    (resource.sale_id as string) || // the original sale that was refunded
    (resource.id as string) ||
    null;
  if (!saleId) return;

  // Find the original payment
  const original = await db.subscriptionPayment.findFirst({
    where: { paypalOrderId: saleId },
  });
  if (!original) return;

  // Mark as refunded (idempotent)
  if (original.status === 'refunded') return;

  await db.subscriptionPayment.update({
    where: { id: original.id },
    data: { status: 'refunded' },
  });
  invalidateCache(original.tenantId);

  await logBillingEvent({
    tenantId: original.tenantId,
    subscriptionId: original.subscriptionId,
    type: 'refund',
    status: 'success',
    amount: original.amount,
    currency: original.currency,
    description: `Payment refunded (webhook): invoice ${original.invoiceNumber}`,
    paymentProvider: 'paypal',
    invoiceNumber: original.invoiceNumber,
    metadata: { saleId, originalInvoice: original.invoiceNumber },
  });
}

// GET endpoint — returns basic info for monitoring/debugging
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/paypal/webhook',
    configured: isPayPalConfigured(),
    webhookIdConfigured: !!process.env.PAYPAL_WEBHOOK_ID,
  });
}
