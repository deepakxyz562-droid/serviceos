import { NextRequest, NextResponse } from 'next/server';
import { payments, DEFAULT_PAYMENT_PROVIDER } from '@/lib/payments/service';
import type { PaymentProviderName } from '@/lib/payments/service';
import { dispatchWebhookEvent } from '@/lib/payments/webhook';
import type { NormalisedWebhookEvent } from '@/lib/payments/types';

/**
 * POST /api/payments/webhook
 *
 * Receiver for payment-provider webhooks. Currently only Airwallex.
 *
 * Flow:
 *   1. Read the raw body (MUST be the raw string — not JSON-parsed — because
 *      the HMAC signature is computed over the raw bytes).
 *   2. Verify the signature via the provider adapter (HMAC-SHA256 over
 *      `x-timestamp` + raw body with AIRWALLEX_WEBHOOK_SECRET).
 *   3. If verified, dispatch the normalised event to the webhook dispatcher
 *      which applies marketplace state transitions (idempotent — safe to retry).
 *   4. Always return HTTP 200 to the provider (so they don't retry) UNLESS
 *      signature verification failed (return 401).
 *
 * Idempotency: the dispatcher dedupes by `event.eventId` (the provider's
 * unique event ID). If the same event arrives twice (provider retry), the
 * second call is a no-op.
 *
 * NOTE: We register this route in BOTH the proxy.ts PUBLIC_PATHS exemption
 * AND the rate-limit exemption so Airwallex can reach it without auth.
 */

// Force dynamic — webhooks must never be cached or statically rendered.
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // ── 1. Read the RAW body (signature is over raw bytes) ──────────────
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Empty body' },
        { status: 400 },
      );
    }

    // Collect headers (case-insensitive lookup).
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // ── 2. Verify signature + parse event ────────────────────────────────
    // For now we only have Airwallex as the active provider. Future: route
    // by a path prefix or header (e.g. /api/payments/webhook/airwallex).
    const providerName: PaymentProviderName = DEFAULT_PAYMENT_PROVIDER;

    const verifyResult = await payments.verifyWebhook(providerName, rawBody, headers);

    if (!verifyResult.verified || !verifyResult.event) {
      console.warn('[payments/webhook] verification failed:', verifyResult.error);
      // Return 401 so the provider knows the signature was bad. They won't
      // retry a 401 (only 5xx).
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 401 },
      );
    }

    const event: NormalisedWebhookEvent = verifyResult.event;

    // ── 3. Dispatch the event (idempotent) ──────────────────────────────
    const result = await dispatchWebhookEvent(event);

    if (result.processed) {
      console.log(`[payments/webhook] ${event.type} → ${result.action} (event=${event.eventId})`);
    } else if (result.action === 'duplicate_skipped') {
      console.log(`[payments/webhook] ${event.type} duplicate skipped (event=${event.eventId})`);
    } else {
      console.log(`[payments/webhook] ${event.type} not processed: ${result.action} (event=${event.eventId})`);
    }

    // Always return 200 to the provider (even for duplicates + unhandled events)
    // so they don't retry. The only exception is a signature failure (above).
    return NextResponse.json({
      received: true,
      eventId: event.eventId,
      eventType: event.type,
      processed: result.processed,
      action: result.action,
    });
  } catch (err) {
    console.error('[payments/webhook] fatal error:', err);
    // Return 500 so the provider retries (the error might be transient —
    // DB connection blip, etc.). The idempotency check will prevent duplicates
    // when the retry succeeds.
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}

// GET alias — some webhook providers (Vercel Cron, monitoring tools) use GET
// for health-check pings. Return 200 so the endpoint appears "alive".
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'payments-webhook' });
}
