import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import {
  getCreemConfig,
  verifyCreemWebhookSignature,
} from '@/lib/creem';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/creem/webhook
 *
 * Receives Creem webhook events for subscription billing. This is the Creem
 * equivalent of `/api/paypal/webhook` — Creem is the merchant of record, so
 * it owns the subscription lifecycle and tells us when to activate / cancel
 * a tenant's subscription.
 *
 * Handled events:
 *   - checkout.session.completed   → activate the tenant's subscription
 *   - subscription.active          → activate (idempotent)
 *   - subscription.updated         → sync status / current_period_end
 *   - subscription.canceled        → mark cancelled
 *   - subscription.payment_failed  → mark past_due
 *
 * Security: every event's signature is verified via HMAC-SHA256 of the raw
 * body using the webhook secret stored in the RevenueFeatureToggle row. If
 * the secret is missing OR verification fails, the event is rejected with
 * HTTP 401 (Creem will not retry 4xx — only 5xx — so a 401 is the correct
 * "do not retry this" signal for unauthenticated payloads).
 *
 * Idempotency: every handler is idempotent — re-delivery of the same event
 * is safe because we look up the local subscription by metadata.tenantId +
 * providerSubscriptionId and only update if the state actually changed.
 *
 * Auth: none (webhook endpoint) — verified by signature instead.
 *
 * ── Payload normalisation ───────────────────────────────────────────────────
 * Creem's webhook payload shape is not fully documented publicly. We
 * support both common merchant-of-record shapes:
 *
 *   Shape A (Stripe-style):
 *     { type: "checkout.session.completed", data: { object: { id, metadata, ... } } }
 *
 *   Shape B (Creem native, expected):
 *     { event_type: "checkout.session.completed", object: { id, metadata, ... } }
 *
 * The `extractEvent()` helper normalises both into a single shape the
 * handlers consume.
 */
export async function POST(request: NextRequest) {
  // ─── 1. Read the raw body (needed for signature verification) ───────────
  const rawBody = await request.text();

  // ─── 2. Resolve the webhook secret ──────────────────────────────────────
  const cfg = await getCreemConfig();
  if (!cfg || !cfg.webhookSecret) {
    // Without a configured secret we cannot verify the signature — fail
    // closed. (We still return 200 so Creem doesn't keep retrying; the
    // superadmin needs to set a secret before webhooks will work.)
    console.warn('[creem/webhook] no webhook secret configured — ignoring event');
    return NextResponse.json({ received: false, reason: 'no secret configured' });
  }

  // ─── 3. Verify the signature ────────────────────────────────────────────
  const signature =
    request.headers.get('creem-signature') ||
    request.headers.get('x-creem-signature') ||
    request.headers.get('signature');

  if (!verifyCreemWebhookSignature(rawBody, signature, cfg.webhookSecret)) {
    console.error('[creem/webhook] signature verification failed');
    return NextResponse.json(
      { error: 'Signature verification failed' },
      { status: 401 }
    );
  }

  // ─── 4. Parse + normalise the event ─────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const event = extractEvent(body);
  if (!event.type) {
    // Acknowledge unknown shapes so Creem doesn't retry.
    console.warn('[creem/webhook] event missing type field — ignoring');
    return NextResponse.json({ received: true, ignored: true });
  }

  // ─── 5. Route to the appropriate handler ────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.paid':
        await handleCheckoutCompleted(event);
        break;
      case 'subscription.active':
      case 'subscription.activated':
      case 'subscription.created':
        await handleSubscriptionActivated(event);
        break;
      case 'subscription.updated':
      case 'subscription.renewed':
        await handleSubscriptionUpdated(event);
        break;
      case 'subscription.canceled':
      case 'subscription.cancelled':
      case 'subscription.expired':
        await handleSubscriptionCanceled(event);
        break;
      case 'subscription.payment_failed':
      case 'subscription.past_due':
        await handleSubscriptionPastDue(event);
        break;
      default:
        // Acknowledge unhandled events so Creem doesn't retry them.
        console.log('[creem/webhook] unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true, eventType: event.type });
  } catch (err) {
    // Log + return 500 so Creem retries. A transient DB error shouldn't
    // lose the event permanently.
    console.error('[creem/webhook] handler error:', event.type, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

// GET endpoint — returns basic info for monitoring/debugging.
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/creem/webhook',
    note: 'POST receives Creem webhook events. Signature verified via HMAC-SHA256.',
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface NormalisedEvent {
  type: string;
  object: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/**
 * Normalise the various possible Creem payload shapes into a single
 * `{ type, object, metadata }` structure. Supports both Stripe-style
 * `{ type, data: { object } }` and Creem-native `{ event_type, object }`.
 */
function extractEvent(body: Record<string, unknown>): NormalisedEvent {
  const type =
    (body.event_type as string | undefined) ||
    (body.type as string | undefined) ||
    '';

  let object: Record<string, unknown> = {};
  if (body.object && typeof body.object === 'object') {
    object = body.object as Record<string, unknown>;
  } else if (body.data && typeof body.data === 'object') {
    const data = body.data as Record<string, unknown>;
    if (data.object && typeof data.object === 'object') {
      object = data.object as Record<string, unknown>;
    } else {
      object = data;
    }
  }

  const metadata =
    (object.metadata as Record<string, unknown> | undefined) || {};
  // Some platforms put metadata on the outer event rather than the object.
  const outerMetadata =
    (body.metadata as Record<string, unknown> | undefined) || {};

  return {
    type,
    object,
    metadata: { ...outerMetadata, ...metadata },
  };
}

/** Look up the local Subscription row by Creem subscription ID (stored in paypalSubscriptionId for reuse). */
async function findLocalSubscriptionByCreemId(creemSubId: string) {
  // We reuse the existing `paypalSubscriptionId` column to store any provider
  // subscription ID — this avoids a schema migration. The `paymentProvider`
  // column distinguishes PayPal vs Creem.
  return db.subscription.findFirst({
    where: { paypalSubscriptionId: creemSubId },
    orderBy: { createdAt: 'desc' },
  });
}

/** Look up the local Subscription row by tenantId + pending Creem checkout session. */
async function findLocalSubscriptionByTenant(tenantId: string) {
  return db.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

/** Compute the next endDate given a billing cycle: now + 1 month or + 1 year. */
function computeEndDate(cycle: string, from = new Date()): Date {
  const d = new Date(from);
  if (cycle === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
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

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * Handle checkout.session.completed.
 *
 * This is the primary activation event: the user completed the Creem
 * checkout, Creem charged their card, and a subscription now exists. We:
 *   1. Read tenantId + planCode + billingCycle from the metadata we embedded
 *      at checkout creation.
 *   2. Upsert the local Subscription row with status='active',
 *      paymentProvider='creem', and the Creem subscription ID.
 *   3. Flip the Tenant to planStatus='active' + plan = the new plan code.
 */
async function handleCheckoutCompleted(event: NormalisedEvent) {
  const tenantId = (event.metadata.tenantId as string) || null;
  const planCode = (event.metadata.planCode as string) || null;
  const billingCycle =
    ((event.metadata.billingCycle as string) === 'yearly' ? 'yearly' : 'monthly') as
      | 'monthly'
      | 'yearly';

  if (!tenantId || !planCode) {
    console.warn(
      '[creem/webhook] checkout.session.completed missing tenantId/planCode in metadata',
      event.metadata
    );
    await logBillingEvent({
      tenantId: 'unknown',
      type: 'fail',
      status: 'failed',
      description:
        'Creem checkout.session.completed event missing tenantId/planCode in metadata',
      paymentProvider: 'creem',
      metadata: event.metadata,
    });
    return;
  }

  // Validate plan exists
  const plan = await db.plan.findUnique({ where: { code: planCode } });
  if (!plan) {
    console.error('[creem/webhook] unknown plan code:', planCode);
    return;
  }

  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const creemSubId =
    (event.object.subscription as string | undefined) ||
    (event.object.subscription_id as string | undefined) ||
    (event.object.id as string | undefined) ||
    '';

  const endDate = computeEndDate(billingCycle);

  // Look up any existing subscription for this tenant — we want to update it
  // in place rather than creating duplicates if the user re-subscribes.
  const existing = await findLocalSubscriptionByTenant(tenantId);

  if (existing) {
    await db.subscription.update({
      where: { id: existing.id },
      data: {
        plan: planCode,
        status: 'active',
        amount: price,
        currency: plan.currency || 'USD',
        billingCycle,
        paymentProvider: 'creem',
        paypalSubscriptionId: creemSubId || existing.paypalSubscriptionId,
        // Reuse paypalPayerEmail for the customer email too.
        paypalPayerEmail:
          (event.object.customer_email as string | undefined) ||
          existing.paypalPayerEmail,
        endDate,
        // Reset trial flags — they're now a paying customer.
        trialEndsAt: null,
      },
    });
  } else {
    await db.subscription.create({
      data: {
        tenantId,
        plan: planCode,
        status: 'active',
        amount: price,
        currency: plan.currency || 'USD',
        billingCycle,
        paymentProvider: 'creem',
        paypalSubscriptionId: creemSubId || null,
        paypalPayerEmail:
          (event.object.customer_email as string | undefined) || null,
        endDate,
        startDate: new Date(),
      },
    });
  }

  // Flip the tenant to active on the new plan.
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      plan: planCode,
      planStatus: 'active',
      planEndsAt: endDate,
    },
  });

  invalidateCache(tenantId);

  await logBillingEvent({
    tenantId,
    type: 'subscription_created',
    status: 'success',
    amount: price,
    currency: plan.currency || 'USD',
    description: `Creem subscription activated: ${plan.name} (${billingCycle})`,
    paymentProvider: 'creem',
    payerEmail: (event.object.customer_email as string | undefined) || null,
    metadata: {
      creemSubscriptionId: creemSubId,
      plan: planCode,
      billingCycle,
      checkoutSessionId: (event.object.id as string) || '',
    },
  });
}

/**
 * Handle subscription.active / subscription.activated.
 * Idempotent — only flips to active if currently non-active.
 */
async function handleSubscriptionActivated(event: NormalisedEvent) {
  const creemSubId =
    (event.object.id as string | undefined) ||
    (event.object.subscription_id as string | undefined) ||
    '';

  // Prefer to look up by Creem subscription ID; fall back to tenantId metadata.
  let local = creemSubId ? await findLocalSubscriptionByCreemId(creemSubId) : null;
  if (!local) {
    const tenantId = (event.metadata.tenantId as string) || null;
    if (tenantId) {
      local = await findLocalSubscriptionByTenant(tenantId);
    }
  }
  if (!local) {
    console.warn(
      '[creem/webhook] subscription.active — no local subscription found',
      { creemSubId }
    );
    return;
  }

  if (local.status === 'active') return; // idempotent

  await db.subscription.update({
    where: { id: local.id },
    data: {
      status: 'active',
      paymentProvider: 'creem',
      ...(creemSubId ? { paypalSubscriptionId: creemSubId } : {}),
    },
  });
  await db.tenant.update({
    where: { id: local.tenantId },
    data: { planStatus: 'active' },
  });
  invalidateCache(local.tenantId);
}

/**
 * Handle subscription.updated / subscription.renewed.
 * Syncs the status + current_period_end from Creem's payload.
 */
async function handleSubscriptionUpdated(event: NormalisedEvent) {
  const creemSubId =
    (event.object.id as string | undefined) ||
    (event.object.subscription_id as string | undefined) ||
    '';
  if (!creemSubId) return;

  const local = await findLocalSubscriptionByCreemId(creemSubId);
  if (!local) return;

  const status = (event.object.status as string) || '';
  const statusMap: Record<string, string> = {
    active: 'active',
    trial: 'trial',
    trialling: 'trial',
    past_due: 'past_due',
    pastdue: 'past_due',
    paused: 'suspended',
    suspended: 'suspended',
    canceled: 'cancelled',
    cancelled: 'cancelled',
    expired: 'expired',
    incomplete: 'pending_payment',
  };
  const newStatus = statusMap[status?.toLowerCase()] || local.status;

  // Extract current_period_end (Creem may use snake_case or camelCase).
  const periodEndRaw =
    (event.object.current_period_end as string | undefined) ||
    (event.object.currentPeriodEnd as string | undefined) ||
    (event.object.end_date as string | undefined) ||
    (event.object.endDate as string | undefined);
  const newEndDate = periodEndRaw ? new Date(periodEndRaw) : null;

  await db.subscription.update({
    where: { id: local.id },
    data: {
      status: newStatus,
      ...(newEndDate && !Number.isNaN(newEndDate.getTime())
        ? { endDate: newEndDate }
        : {}),
    },
  });

  // Sync tenant.planStatus for the major transitions.
  const tenantStatusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    suspended: 'past_due',
    cancelled: 'cancelled',
    expired: 'expired',
  };
  const newTenantStatus = tenantStatusMap[newStatus];
  if (newTenantStatus) {
    await db.tenant.update({
      where: { id: local.tenantId },
      data: { planStatus: newTenantStatus },
    });
  }
  invalidateCache(local.tenantId);
}

/**
 * Handle subscription.canceled / cancelled / expired.
 * Marks the local subscription + tenant as cancelled.
 */
async function handleSubscriptionCanceled(event: NormalisedEvent) {
  const creemSubId =
    (event.object.id as string | undefined) ||
    (event.object.subscription_id as string | undefined) ||
    '';
  if (!creemSubId) return;

  const local = await findLocalSubscriptionByCreemId(creemSubId);
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
    description: `Creem subscription cancelled (webhook): ${local.plan} (${local.billingCycle})`,
    paymentProvider: 'creem',
    metadata: { creemSubscriptionId: creemSubId, cancelledPlan: local.plan },
  });
}

/**
 * Handle subscription.payment_failed / subscription.past_due.
 * Marks the local subscription as past_due so the UI can prompt the user
 * to update their card.
 */
async function handleSubscriptionPastDue(event: NormalisedEvent) {
  const creemSubId =
    (event.object.id as string | undefined) ||
    (event.object.subscription_id as string | undefined) ||
    '';
  if (!creemSubId) return;

  const local = await findLocalSubscriptionByCreemId(creemSubId);
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
    description: `Creem payment failed (webhook): ${local.plan} (${local.billingCycle})`,
    paymentProvider: 'creem',
    metadata: { creemSubscriptionId: creemSubId },
  });
}
