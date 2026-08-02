import { NextRequest, NextResponse } from 'next/server';
import { logger, withRequestId } from '@/lib/logger';
import {
  constructWebhookEvent,
  handleWebhookEvent,
  isStripeConfigured,
} from '@/lib/stripe';

/**
 * POST /api/billing/stripe/webhook
 *
 * Receives Stripe webhook events for the marketplace + Connect flows.
 *
 * Verification:
 *   - The body MUST be read as raw text (NOT parsed JSON) because Stripe
 *     signs the exact bytes on the wire. We use `request.text()` and pass
 *     that string to `stripe.webhooks.constructEvent` along with the
 *     `stripe-signature` header and `STRIPE_WEBHOOK_SECRET`.
 *
 * Events handled (delegated to `handleWebhookEvent`):
 *   - account.updated             → sync stripeConnected + stripePayoutsEnabled
 *   - payment.intent.succeeded    → MarketplaceTransaction.status = 'escrow'
 *                                   + escrowedAt + metadata
 *   - transfer.created            → record transferId on MarketplaceTransaction
 *                                   + mark Payout as 'pending'
 *   - payout.paid                 → Payout.status = 'paid', paidAt = now
 *   - charge.refunded             → MarketplaceTransaction.status = 'refunded'
 *                                   + refundedAt + refundAmount
 *   - charge.dispute.created      → MarketplaceTransaction.status = 'disputed'
 *                                   + disputedAt + disputeReason
 *
 * Response strategy:
 *   - 200  → event processed (or unrecognised type — we ack so Stripe
 *            doesn't keep retrying noise)
 *   - 400  → malformed body / missing signature
 *   - 401  → signature verification failed (Stripe secret mismatch)
 *   - 503  → STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not configured
 *   - 500  → handler crashed; Stripe will retry the event with backoff
 *
 * Auth: none. Security comes from signature verification instead.
 *
 * Async processing: `handleWebhookEvent` runs inline so a 200 implies the DB
 * writes committed. If you ever need to fan out slow work, do it via a queue
 * and ack before processing — but for our 4 event types the inline cost is
 * well under Stripe's 30s timeout.
 */
export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Config guard ────────────────────────────────────────────────────
  if (!isStripeConfigured()) {
    logger.warn(
      { component: 'stripe-webhook' },
      'Stripe webhook received but STRIPE_SECRET_KEY not set — rejecting',
    );
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 },
    );
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.warn(
      { component: 'stripe-webhook' },
      'Stripe webhook received but STRIPE_WEBHOOK_SECRET not set — rejecting',
    );
    return NextResponse.json(
      { error: 'Stripe webhook secret not configured' },
      { status: 503 },
    );
  }

  // ── 2. Read RAW body + signature ───────────────────────────────────────
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    log.error({ err }, 'Failed to read Stripe webhook body');
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (!rawBody) {
    return NextResponse.json({ error: 'Empty body' }, { status: 400 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    logger.warn({ component: 'stripe-webhook' }, 'Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  // ── 3. Verify signature → Stripe.Event ─────────────────────────────────
  let event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    // Stripe's constructEvent throws a StripeSignatureVerificationError on
    // mismatch. Always log + 401 — accepting an unverifiable event would
    // let an attacker forge a "payment succeeded" notification.
    log.error(
      { err, component: 'stripe-webhook' },
      'Stripe webhook signature verification failed',
    );
    return NextResponse.json(
      { error: 'Signature verification failed' },
      { status: 401 },
    );
  }

  logger.info(
    { eventType: event.type, eventId: event.id, component: 'stripe-webhook' },
    'Received Stripe webhook',
  );

  // ── 4. Dispatch (inline) ───────────────────────────────────────────────
  try {
    const handled = await handleWebhookEvent(event);
    if (!handled) {
      logger.debug(
        { eventType: event.type, eventId: event.id, component: 'stripe-webhook' },
        'Stripe webhook event type not handled (acknowledged)',
      );
    }
    // Always 200 (even for unhandled types) so Stripe stops retrying.
    return NextResponse.json({ received: true, eventType: event.type });
  } catch (err) {
    // Handler crashed. Return 500 so Stripe retries with backoff.
    log.error(
      { err, eventType: event.type, eventId: event.id, component: 'stripe-webhook' },
      'Stripe webhook handler crashed',
    );
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/billing/stripe/webhook
 *
 * Returns basic health info for monitoring (used by the superadmin health
 * dashboard). Does NOT reveal the secret.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/billing/stripe/webhook',
    configured: isStripeConfigured(),
    webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    connectClientIdConfigured: !!process.env.STRIPE_CONNECT_CLIENT_ID,
  });
}
