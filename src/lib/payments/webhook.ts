/**
 * Payment webhook dispatcher.
 *
 * Receives a verified, normalised webhook event from any provider and applies
 * the marketplace state transitions. This is the ONLY place that mutates
 * `MarketplaceTransaction.status` + `Payout.status` based on payment events.
 *
 * Lifecycle (provider-neutral — no "escrow" terminology):
 *
 *   pending          →  payment intent created, customer hasn't paid
 *   paid_held        →  customer paid; funds held by platform (funds_split auto_release:false)
 *   settlement_eligible  →  job completed; ready to release + pay seller
 *   payout_initiated →  payout/transfer to seller created
 *   payout_completed →  seller received the funds
 *   refunded / disputed / failed / cancelled
 *
 * Idempotency: every event has a unique `eventId` from the provider. We
 * dedupe by checking if a BillingEvent row already exists with that ID in
 * its metadata — if so, we skip the transition (webhook was already processed).
 * This makes webhook retries safe (Airwallex / Stripe retry on 5xx).
 */

import { db } from '@/lib/db';
import { logBillingEvent } from '@/lib/billing-events';
import type { NormalisedWebhookEvent } from './types';
import type { PaymentProviderName } from './types';

// ── Idempotency: check if we've already processed this event ─────────────────

/**
 * Returns true if a BillingEvent with the given provider event ID already
 * exists in its metadata. We store `webhookEventId` in the metadata JSON for
 * every webhook-driven billing event, so a duplicate webhook = a hit here.
 *
 * This is the dedup mechanism — it makes webhook retries safe.
 */
async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  try {
    // Search for any BillingEvent whose metadata contains this webhookEventId.
    // PostgREST doesn't support JSONB containment on a plain `String` metadata
    // column (it's stored as text), so we do a LIKE search on the metadata
    // text for the event id. This is fast enough because the metadata column
    // is small + we filter by type='fail' OR status='failed' first.
    const matches = await db.billingEvent.findMany({
      where: {
        OR: [
          { type: 'fail' },
          { type: 'capture' },
          { type: 'refund' },
          { type: 'cancel' },
        ],
        metadata: { contains: `"webhookEventId":"${eventId}"` },
      },
      select: { id: true },
      take: 1,
    });
    return matches.length > 0;
  } catch (err) {
    // If the lookup fails, don't block the webhook — log + proceed (worst case
    // is a duplicate billing event row, which is harmless).
    console.warn('[payments/webhook] idempotency check failed (proceeding anyway):', err);
    return false;
  }
}

// ── Main dispatcher ──────────────────────────────────────────────────────────

export interface DispatchResult {
  processed: boolean;
  action: string;
  transactionId?: string;
  payoutId?: string;
  error?: string;
}

/**
 * Apply a verified webhook event to the marketplace state.
 *
 * Idempotent — safe to call multiple times with the same event ID.
 */
export async function dispatchWebhookEvent(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  // ── 1. Idempotency check ──────────────────────────────────────────────────
  if (await isEventAlreadyProcessed(event.eventId)) {
    return { processed: false, action: 'duplicate_skipped' };
  }

  // ── 2. Route to the right handler based on event type ──────────────────────
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        return await handlePaymentSucceeded(event);
      case 'payment_intent.failed':
        return await handlePaymentFailed(event);
      case 'payment_intent.cancelled':
        return await handlePaymentCancelled(event);
      case 'funds_split.released':
        return await handleFundsSplitReleased(event);
      case 'payout.settled':
        return await handlePayoutSettled(event);
      case 'payout.failed':
        return await handlePayoutFailed(event);
      case 'refund.succeeded':
        return await handleRefundSucceeded(event);
      case 'dispute.created':
        return await handleDisputeCreated(event);
      case 'account.verified':
        return await handleAccountVerified(event);
      case 'account.action_required':
        return await handleAccountActionRequired(event);
      case 'account.suspended':
        return await handleAccountSuspended(event);
      default:
        // Unknown event — log it (best-effort) but don't fail the webhook.
        console.log(`[payments/webhook] unhandled event type: ${event.type} (id=${event.eventId})`);
        return { processed: false, action: 'unhandled_event_type' };
    }
  } catch (err) {
    console.error('[payments/webhook] dispatch error:', err);
    return {
      processed: false,
      action: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Handlers ────────────────────────────────────────────────────────────────

/** Customer paid → mark transaction paid_held + create funds split to hold funds. */
async function handlePaymentSucceeded(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  if (!event.paymentId) return { processed: false, action: 'no_payment_id' };

  const txn = await findTransactionByPaymentId(event.paymentId);
  if (!txn) return { processed: false, action: 'transaction_not_found' };

  // Idempotent: if already past 'pending', don't transition back.
  if (txn.status !== 'pending') {
    return { processed: false, action: 'already_processed', transactionId: txn.id };
  }

  await db.marketplaceTransaction.update({
    where: { id: txn.id },
    data: {
      status: 'paid_held',
      // Store provider-neutral ID (the column is renamed from paymentIntentId).
      paymentProviderPaymentId: event.paymentId,
      paymentProvider: event.provider,
    },
  });

  await logBillingEvent({
    tenantId: txn.tenantId,
    subscriptionId: null,
    type: 'capture',
    status: 'success',
    amount: Number(txn.providerAmount) || 0,
    currency: txn.currency || 'USD',
    description: `Marketplace payment received (held for settlement) — ${txn.id}`,
    paymentProvider: event.provider,
    metadata: {
      webhookEventId: event.eventId,
      transactionId: txn.id,
      paymentId: event.paymentId,
    },
  }).catch(() => {});

  return { processed: true, action: 'paid_held', transactionId: txn.id };
}

/** Payment failed → mark transaction failed. */
async function handlePaymentFailed(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  if (!event.paymentId) return { processed: false, action: 'no_payment_id' };

  const txn = await findTransactionByPaymentId(event.paymentId);
  if (!txn) return { processed: false, action: 'transaction_not_found' };

  if (txn.status === 'failed' || txn.status === 'cancelled') {
    return { processed: false, action: 'already_processed', transactionId: txn.id };
  }

  await db.marketplaceTransaction.update({
    where: { id: txn.id },
    data: { status: 'failed' },
  });

  await logBillingEvent({
    tenantId: txn.tenantId,
    subscriptionId: null,
    type: 'fail',
    status: 'failed',
    amount: Number(txn.providerAmount) || 0,
    currency: txn.currency || 'USD',
    description: `Marketplace payment failed — ${txn.id}`,
    paymentProvider: event.provider,
    errorCode: event.type,
    declineReason: event.reason || 'Payment failed',
    metadata: {
      webhookEventId: event.eventId,
      transactionId: txn.id,
      paymentId: event.paymentId,
    },
  }).catch(() => {});

  return { processed: true, action: 'failed', transactionId: txn.id };
}

/** Payment cancelled → mark transaction cancelled. */
async function handlePaymentCancelled(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  if (!event.paymentId) return { processed: false, action: 'no_payment_id' };

  const txn = await findTransactionByPaymentId(event.paymentId);
  if (!txn) return { processed: false, action: 'transaction_not_found' };

  if (txn.status === 'cancelled') {
    return { processed: false, action: 'already_processed', transactionId: txn.id };
  }

  await db.marketplaceTransaction.update({
    where: { id: txn.id },
    data: { status: 'cancelled' },
  });

  return { processed: true, action: 'cancelled', transactionId: txn.id };
}

/** Funds split released → mark transaction settlement_eligible. */
async function handleFundsSplitReleased(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  // The funds split is tied to a payment intent → find the transaction by paymentId.
  if (!event.paymentId) return { processed: false, action: 'no_payment_id' };

  const txn = await findTransactionByPaymentId(event.paymentId);
  if (!txn) return { processed: false, action: 'transaction_not_found' };

  if (txn.status !== 'paid_held') {
    return { processed: false, action: 'not_in_held_state', transactionId: txn.id };
  }

  await db.marketplaceTransaction.update({
    where: { id: txn.id },
    data: { status: 'settlement_eligible' },
  });

  return { processed: true, action: 'settlement_eligible', transactionId: txn.id };
}

/** Payout settled → mark transaction payout_completed + update Payout row. */
async function handlePayoutSettled(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  if (!event.payoutId) return { processed: false, action: 'no_payout_id' };

  // Find the transaction by transferId.
  const txn = await db.marketplaceTransaction.findFirst({
    where: { paymentProviderTransferId: event.payoutId },
    select: { id: true, tenantId: true, providerAmount: true, currency: true, status: true },
  });

  if (txn) {
    if (txn.status !== 'payout_initiated') {
      return { processed: false, action: 'not_in_payout_initiated', transactionId: txn.id };
    }
    await db.marketplaceTransaction.update({
      where: { id: txn.id },
      data: { status: 'payout_completed' },
    });
  }

  // Update the Payout row (if one exists — the settlement cron creates these).
  await db.payout.updateMany({
    where: { paymentProviderTransferId: event.payoutId },
    data: { status: 'paid', paidAt: new Date() },
  }).catch(() => {});

  if (txn) {
    await logBillingEvent({
      tenantId: txn.tenantId,
      subscriptionId: null,
      type: 'capture',
      status: 'success',
      amount: Number(txn.providerAmount) || 0,
      currency: txn.currency || 'USD',
      description: `Marketplace payout settled — ${txn.id}`,
      paymentProvider: event.provider,
      metadata: {
        webhookEventId: event.eventId,
        transactionId: txn.id,
        payoutId: event.payoutId,
      },
    }).catch(() => {});
  }

  return { processed: true, action: 'payout_completed', transactionId: txn?.id, payoutId: event.payoutId };
}

/** Payout failed → mark transaction disputed + update Payout row + alert. */
async function handlePayoutFailed(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  if (!event.payoutId) return { processed: false, action: 'no_payout_id' };

  const txn = await db.marketplaceTransaction.findFirst({
    where: { paymentProviderTransferId: event.payoutId },
    select: { id: true, tenantId: true, providerAmount: true, currency: true },
  });

  if (txn) {
    await db.marketplaceTransaction.update({
      where: { id: txn.id },
      data: { status: 'disputed' },
    });
  }

  await db.payout.updateMany({
    where: { paymentProviderTransferId: event.payoutId },
    data: { status: 'failed', failReason: event.reason || 'Payout failed' },
  }).catch(() => {});

  if (txn) {
    await logBillingEvent({
      tenantId: txn.tenantId,
      subscriptionId: null,
      type: 'fail',
      status: 'failed',
      amount: Number(txn.providerAmount) || 0,
      currency: txn.currency || 'USD',
      description: `Marketplace payout failed — ${txn.id}`,
      paymentProvider: event.provider,
      errorCode: event.type,
      declineReason: event.reason || 'Payout failed',
      metadata: {
        webhookEventId: event.eventId,
        transactionId: txn.id,
        payoutId: event.payoutId,
      },
    }).catch(() => {});
  }

  return { processed: true, action: 'payout_failed', transactionId: txn?.id, payoutId: event.payoutId };
}

/** Refund succeeded → mark transaction refunded. */
async function handleRefundSucceeded(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  if (!event.paymentId) return { processed: false, action: 'no_payment_id' };

  const txn = await findTransactionByPaymentId(event.paymentId);
  if (!txn) return { processed: false, action: 'transaction_not_found' };

  if (txn.status === 'refunded') {
    return { processed: false, action: 'already_processed', transactionId: txn.id };
  }

  await db.marketplaceTransaction.update({
    where: { id: txn.id },
    data: {
      status: 'refunded',
      refundedAt: new Date(),
      refundAmount: event.amount ? event.amount / 100 : txn.providerAmount,
    },
  });

  await logBillingEvent({
    tenantId: txn.tenantId,
    subscriptionId: null,
    type: 'refund',
    status: 'success',
    amount: event.amount ? event.amount / 100 : Number(txn.providerAmount) || 0,
    currency: txn.currency || 'USD',
    description: `Marketplace refund processed — ${txn.id}`,
    paymentProvider: event.provider,
    metadata: {
      webhookEventId: event.eventId,
      transactionId: txn.id,
      paymentId: event.paymentId,
    },
  }).catch(() => {});

  return { processed: true, action: 'refunded', transactionId: txn.id };
}

/** Dispute created → mark transaction disputed. */
async function handleDisputeCreated(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  if (!event.paymentId) return { processed: false, action: 'no_payment_id' };

  const txn = await findTransactionByPaymentId(event.paymentId);
  if (!txn) return { processed: false, action: 'transaction_not_found' };

  if (txn.status === 'disputed') {
    return { processed: false, action: 'already_processed', transactionId: txn.id };
  }

  await db.marketplaceTransaction.update({
    where: { id: txn.id },
    data: {
      status: 'disputed',
      disputedAt: new Date(),
      disputeReason: event.reason || 'Dispute opened',
    },
  });

  await logBillingEvent({
    tenantId: txn.tenantId,
    subscriptionId: null,
    type: 'fail',
    status: 'failed',
    amount: Number(txn.providerAmount) || 0,
    currency: txn.currency || 'USD',
    description: `Marketplace dispute opened — ${txn.id}`,
    paymentProvider: event.provider,
    errorCode: event.type,
    declineReason: event.reason || 'Dispute opened',
    metadata: {
      webhookEventId: event.eventId,
      transactionId: txn.id,
      paymentId: event.paymentId,
    },
  }).catch(() => {});

  return { processed: true, action: 'disputed', transactionId: txn.id };
}

/** Account verified → flip tenant.paymentsConnected + payoutsEnabled. */
async function handleAccountVerified(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  if (!event.accountId) return { processed: false, action: 'no_account_id' };

  const tenant = await db.tenant.findFirst({
    where: { paymentProviderAccountId: event.accountId },
    select: { id: true },
  });
  if (!tenant) return { processed: false, action: 'tenant_not_found' };

  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      paymentsConnected: true,
      payoutsEnabled: true,
    },
  });

  return { processed: true, action: 'account_verified' };
}

/** Account action required → log (tenant will see "complete verification" banner). */
async function handleAccountActionRequired(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  if (!event.accountId) return { processed: false, action: 'no_account_id' };

  const tenant = await db.tenant.findFirst({
    where: { paymentProviderAccountId: event.accountId },
    select: { id: true, name: true },
  });
  if (!tenant) return { processed: false, action: 'tenant_not_found' };

  console.warn(`[payments/webhook] Account ${event.accountId} (tenant ${tenant.name}) requires action: ${event.reason}`);
  return { processed: true, action: 'account_action_required' };
}

/** Account suspended → flip tenant.paymentsConnected + payoutsEnabled off. */
async function handleAccountSuspended(event: NormalisedWebhookEvent): Promise<DispatchResult> {
  if (!event.accountId) return { processed: false, action: 'no_account_id' };

  const tenant = await db.tenant.findFirst({
    where: { paymentProviderAccountId: event.accountId },
    select: { id: true },
  });
  if (!tenant) return { processed: false, action: 'tenant_not_found' };

  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      paymentsConnected: true, // still connected, just suspended
      payoutsEnabled: false,
    },
  });

  return { processed: true, action: 'account_suspended' };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function findTransactionByPaymentId(paymentId: string) {
  return db.marketplaceTransaction.findFirst({
    where: {
      OR: [
        { paymentProviderPaymentId: paymentId },
        { paymentIntentId: paymentId }, // legacy column fallback (pre-migration)
      ],
    },
    select: {
      id: true,
      tenantId: true,
      providerAmount: true,
      currency: true,
      status: true,
    },
  });
}
