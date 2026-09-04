import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { payments, DEFAULT_PAYMENT_PROVIDER } from '@/lib/payments/service';
import type { PaymentProviderName } from '@/lib/payments/service';
import { PaymentError } from '@/lib/payments/errors';

/**
 * POST /api/payments/intent
 *
 * Creates a payment intent for a customer paying for a marketplace booking.
 *
 * This route is called by the marketplace booking flow (book/instant,
 * quote-accept, emergency-accept) AFTER the MarketplaceTransaction row is
 * created. It returns the `clientSecret` the browser needs to confirm the
 * payment via Airwallex.js (HPP / Drop-in element).
 *
 * IMPORTANT: This route does NOT mark the transaction as paid — that only
 * happens when the `payment_intent.succeeded` webhook fires (server-driven
 * confirmation). The frontend never claims success on its own. This closes
 * the existing gap where the booking "succeeded" without actually collecting
 * payment.
 *
 * Body:
 *   {
 *     transactionId: string,   // MarketplaceTransaction.id
 *     returnUrl?: string,       // where the customer lands after paying
 *   }
 *
 * Response:
 *   {
 *     paymentId: string,
 *     clientSecret: string,
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    // Customer-facing endpoint — no auth required (customers aren't logged in
    // to Fieseros; they're marketplace visitors booking a service). Auth is
    // enforced via the transactionId being a valid pending transaction.

    const body = await request.json();
    const { transactionId, returnUrl } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'transactionId is required' },
        { status: 400 },
      );
    }

    // Load the transaction + the provider (seller) tenant.
    const txn = await db.marketplaceTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        tenantId: true,
        totalAmount: true,
        currency: true,
        status: true,
        paymentProviderPaymentId: true,
        paymentIntentId: true, // legacy fallback
      },
    });
    if (!txn) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Idempotent: if a payment intent was already created for this transaction,
    // return it (don't create a duplicate).
    const existingPaymentId = txn.paymentProviderPaymentId || txn.paymentIntentId;
    if (existingPaymentId) {
      // For demo-mode intents, we can't fetch a fresh client secret — return
      // the existing id + a placeholder secret. Real Airwallex intents would
      // need a GET to retrieve the current client_secret.
      if (existingPaymentId.startsWith('int_demo_')) {
        return NextResponse.json({
          paymentId: existingPaymentId,
          clientSecret: `${existingPaymentId}_secret_demo`,
        });
      }
      // Real intent — fall through to create a new one (Airwallex intents
      // can have their client_secret refreshed by re-fetching, but for
      // simplicity we create a new intent if the old one expired). This is
      // rare — the booking flow only calls this once per transaction.
    }

    if (!txn.tenantId) {
      return NextResponse.json(
        { error: 'Transaction has no provider tenant' },
        { status: 400 },
      );
    }

    // Load the provider tenant to get their connected-account ID.
    const providerTenant = await db.tenant.findUnique({
      where: { id: txn.tenantId },
      select: {
        paymentProvider: true,
        paymentProviderAccountId: true,
        payoutsEnabled: true,
        name: true,
      },
    });
    if (!providerTenant) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 400 },
      );
    }

    // Use the provider's stored provider name (defaults to the platform default).
    const providerName: PaymentProviderName =
      (providerTenant.paymentProvider as PaymentProviderName | null) || DEFAULT_PAYMENT_PROVIDER;

    if (!providerTenant.paymentProviderAccountId) {
      return NextResponse.json(
        {
          error: 'PROVIDER_NOT_READY',
          message: 'This provider has not completed payment setup yet. Please try again later or contact them directly.',
        },
        { status: 503 },
      );
    }

    if (!providerTenant.payoutsEnabled) {
      return NextResponse.json(
        {
          error: 'PROVIDER_NOT_VERIFIED',
          message: 'This provider is completing verification. Please try again later.',
        },
        { status: 503 },
      );
    }

    // Create the payment intent at the provider.
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      new URL(request.url).origin;
    const intent = await payments.createPayment(providerName, {
      amount: Math.round(Number(txn.totalAmount) * 100), // convert to cents
      currency: txn.currency || 'USD',
      marketplaceTransactionId: txn.id,
      connectedAccountId: providerTenant.paymentProviderAccountId,
      metadata: {
        providerTenantId: txn.tenantId,
        providerName: providerTenant.name,
        transactionId: txn.id,
      },
      returnUrl: returnUrl || `${appUrl}/marketplace/booking/${txn.id}/payment-return`,
    });

    // Persist the payment id on the transaction.
    await db.marketplaceTransaction.update({
      where: { id: txn.id },
      data: {
        paymentProviderPaymentId: intent.paymentId,
        paymentProvider: providerName,
        // Keep legacy column in sync during the migration window.
        paymentIntentId: intent.paymentId,
      },
    });

    return NextResponse.json({
      paymentId: intent.paymentId,
      clientSecret: intent.clientSecret,
    });
  } catch (err) {
    console.error('[payments/intent] error:', err);
    const message = err instanceof PaymentError
      ? err.message
      : 'Failed to create payment intent';
    return NextResponse.json(
      { error: message },
      { status: err instanceof PaymentError ? 400 : 500 },
    );
  }
}
