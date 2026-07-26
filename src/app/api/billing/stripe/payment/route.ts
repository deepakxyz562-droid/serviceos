import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import {
  createPaymentIntent,
  isStripeConfigured,
  StripeConfigError,
} from '@/lib/stripe';

/**
 * POST /api/billing/stripe/payment
 *
 * Creates a Stripe PaymentIntent for a marketplace booking. The customer
 * pays up-front; funds land in the platform balance (escrow); on job
 * completion the marketplace settlement worker calls `transferToProvider`
 * to move the provider's share into their Connect balance.
 *
 * Request body:
 *   {
 *     amount:             number,  // GROSS amount in MAJOR currency units (e.g. 49.99 USD)
 *     currency:           string,  // 3-letter ISO code (default USD)
 *     bookingType:        string,  // instant | quote_request | emergency | ai_auto
 *     serviceDescription: string,
 *     tenantId:           string   // the PROVIDER's tenantId
 *   }
 *
 * Response:
 *   { clientSecret, paymentIntentId, transactionId }
 *
 * Auth: any authenticated customer-side user. The auth user must have a
 * tenantId (their own customer-facing context); the BODY's tenantId is the
 * provider. We do NOT cross-check that the provider has Stripe Connect
 * enabled here — direct charges go through the platform account, so the
 * provider's Connect status only matters at payout time.
 */
export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Auth ────────────────────────────────────────────────────────────
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ── 2. Config check ────────────────────────────────────────────────────
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.',
      },
      { status: 503 },
    );
  }

  // ── 3. Parse + validate body ───────────────────────────────────────────
  let body: {
    amount?: number;
    currency?: string;
    bookingType?: string;
    serviceDescription?: string;
    tenantId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    amount,
    currency,
    bookingType,
    serviceDescription,
    tenantId: providerTenantId,
    customerName,
    customerEmail,
    customerPhone,
  } = body;

  // Amount: must be a positive number in major units (e.g. dollars). We
  // convert to cents below — most currencies are 2-decimal, but Stripe's
  // zero-decimal currencies (JPY, KRW, etc.) are handled by the same
  // multiply-by-100 path because the route contract says "major units".
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: 'amount must be a positive number' },
      { status: 400 },
    );
  }
  if (amount > 1_000_000) {
    return NextResponse.json(
      { error: 'amount exceeds single-transaction limit (1,000,000)' },
      { status: 400 },
    );
  }

  const normalizedCurrency = (currency || 'USD').toUpperCase();
  if (normalizedCurrency.length !== 3) {
    return NextResponse.json(
      { error: 'currency must be a 3-letter ISO code (e.g. USD)' },
      { status: 400 },
    );
  }

  // Booking type — validate against the MarketplaceTransaction schema's
  // allowed values.
  const allowedBookingTypes = ['instant', 'quote_request', 'emergency', 'ai_auto'];
  const normalizedBookingType = bookingType || 'instant';
  if (!allowedBookingTypes.includes(normalizedBookingType)) {
    return NextResponse.json(
      { error: `bookingType must be one of: ${allowedBookingTypes.join(', ')}` },
      { status: 400 },
    );
  }

  if (!providerTenantId) {
    return NextResponse.json(
      { error: 'tenantId (provider) is required' },
      { status: 400 },
    );
  }

  // ── 4. Verify the provider exists ──────────────────────────────────────
  // We don't strictly need the provider to be Stripe-Connect-enabled at
  // payment time (the funds sit in escrow on the platform), but we DO need
  // to know the MarketplaceTransaction row will be valid. Reject early if
  // the provider tenant is missing.
  let providerTenant: { id: string; currency: string } | null;
  try {
    providerTenant = await db.tenant.findUnique({
      where: { id: providerTenantId },
      select: { id: true, currency: true },
    });
  } catch (err) {
    log.error({ err, providerTenantId }, 'DB error fetching provider tenant');
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!providerTenant) {
    return NextResponse.json(
      { error: 'Provider tenant not found' },
      { status: 404 },
    );
  }

  // ── 5. Compute the platform commission + provider share ────────────────
  // The marketplace takes 5% by default. We persist this on the transaction
  // so the settlement worker knows exactly how much to transfer to the
  // provider (and how much the platform keeps).
  const COMMISSION_PCT = 5;
  const grossAmount = amount;
  const commissionAmount = Math.round(grossAmount * COMMISSION_PCT) / 100;
  const providerAmount = Math.round((grossAmount - commissionAmount) * 100) / 100;

  // Stripe expects the amount in the smallest currency unit (cents for
  // 2-decimal currencies). Multiply by 100 + round to avoid float drift.
  const stripeAmount = Math.round(grossAmount * 100);

  // ── 6. Create a pending MarketplaceTransaction row first ───────────────
  // We create the row BEFORE calling Stripe so that when the webhook fires
  // (payment.intent.succeeded) we have something to reconcile against —
  // Stripe occasionally delivers the webhook before the create-PaymentIntent
  // fetch returns, and we'd otherwise log a "unknown transaction" warning.
  let transaction: { id: string };
  try {
    transaction = await db.marketplaceTransaction.create({
      data: {
        tenantId: providerTenantId,
        customerId: authUser.id,
        customerName: customerName || authUser.name || null,
        customerEmail: customerEmail || authUser.email || null,
        customerPhone: customerPhone || authUser.phone || null,
        bookingType: normalizedBookingType,
        serviceDescription: serviceDescription || null,
        totalAmount: grossAmount,
        commissionPct: COMMISSION_PCT,
        commissionAmount,
        providerAmount,
        currency: normalizedCurrency,
        status: 'pending',
        metadataJson: JSON.stringify({
          createdBy: authUser.id,
          createdAt: new Date().toISOString(),
        }),
      },
      select: { id: true },
    });
  } catch (err) {
    log.error(
      { err, providerTenantId, authUserId: authUser.id },
      'Failed to create MarketplaceTransaction',
    );
    return NextResponse.json(
      { error: 'Failed to initialise marketplace transaction' },
      { status: 500 },
    );
  }

  // ── 7. Create the Stripe PaymentIntent ────────────────────────────────
  try {
    const result = await createPaymentIntent(stripeAmount, normalizedCurrency, {
      transactionId: transaction.id,
      providerTenantId,
      customerUserId: authUser.id,
      bookingType: normalizedBookingType,
      // Stripe metadata values must be ≤ 500 chars and stringified.
      serviceDescription: (serviceDescription || '').slice(0, 500),
    });

    // Persist the paymentIntentId so the webhook can reconcile.
    await db.marketplaceTransaction.update({
      where: { id: transaction.id },
      data: { paymentIntentId: result.paymentIntentId },
    });

    log.info(
      {
        transactionId: transaction.id,
        paymentIntentId: result.paymentIntentId,
        providerTenantId,
        amount: grossAmount,
        currency: normalizedCurrency,
      },
      'Created marketplace PaymentIntent',
    );

    return NextResponse.json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      transactionId: transaction.id,
    });
  } catch (err) {
    if (err instanceof StripeConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }

    log.error(
      { err, transactionId: transaction.id, providerTenantId },
      'Failed to create Stripe PaymentIntent',
    );

    // Mark the transaction as failed so it doesn't sit in 'pending' forever.
    // The MarketplaceTransaction will be cleaned up by a separate sweeper job.
    db.marketplaceTransaction
      .update({
        where: { id: transaction.id },
        data: {
          status: 'pending',
          metadataJson: JSON.stringify({
            createdBy: authUser.id,
            error:
              err instanceof Error
                ? err.message
                : 'Failed to create PaymentIntent',
            failedAt: new Date().toISOString(),
          }),
        },
      })
      .catch((err: unknown) =>
        log.error({ err, transactionId: transaction.id }, 'Failed to mark MarketplaceTransaction as failed'),
      );

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to create PaymentIntent',
        transactionId: transaction.id,
      },
      { status: 500 },
    );
  }
}
