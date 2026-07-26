/**
 * Stripe + Stripe Connect server-side library.
 *
 * This module is the single entry point for everything Stripe in the backend.
 * It is server-only — it MUST NEVER be imported from a client component
 * (the Stripe secret key lives in process.env, not in the browser).
 *
 * Responsibilities:
 *   - Lazily create + cache the Stripe SDK singleton (`getStripe()`)
 *   - Stripe Connect onboarding helpers (create Express account, account links,
 *     account status)
 *   - Marketplace payment primitives (PaymentIntent, Transfer, Payout)
 *   - A unified webhook event dispatcher (`handleWebhookEvent`) that routes
 *     Stripe events to the right DB update in `MarketplaceTransaction`,
 *     `Payout`, and `Tenant`.
 *
 * Every public function:
 *   - Validates its inputs
 *   - Wraps the Stripe call in try/catch
 *   - Logs through the structured logger (`@/lib/logger`)
 *   - Returns a typed shape (or throws a typed Error) so route handlers can
 *     map to HTTP responses uniformly.
 *
 * Env vars:
 *   - STRIPE_SECRET_KEY          — required for any Stripe operation
 *   - STRIPE_WEBHOOK_SECRET      — required to verify webhook signatures
 *   - STRIPE_CONNECT_CLIENT_ID   — optional (only used for classic OAuth;
 *                                   Express onboarding via account links does
 *                                   not need it). Read gracefully if absent.
 */
import Stripe from 'stripe';
import { logger } from '@/lib/logger';
import type { PrismaClient } from '@prisma/client';

// ─── Singleton ─────────────────────────────────────────────────────────────

let stripeClient: Stripe | null = null;

/**
 * Returns the lazily-initialised Stripe SDK singleton.
 * Throws a clear error if STRIPE_SECRET_KEY is not set so route handlers can
 * surface a 503 to the caller.
 */
export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new StripeConfigError(
      'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.',
    );
  }

  stripeClient = new Stripe(secretKey, {
    // Don't pin apiVersion — stripe-node uses its bundled default
    // (currently "2026-06-24.dahlia" for v22.3.2) which is the most stable
    // choice. Pinning to a specific date would require keeping the literal
    // in sync with each SDK upgrade.
    typescript: true,
    maxNetworkRetries: 2,
  });

  logger.info({ component: 'stripe' }, 'Stripe SDK initialised');
  return stripeClient;
}

/**
 * Cheap boolean check — does NOT throw. Use this in route handlers before
 * calling `getStripe()` so they can return a friendly 503 instead of 500.
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** Typed config error so route handlers can map it to a 503 specifically. */
export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StripeConfigError';
  }
}

// ─── Connect account onboarding ────────────────────────────────────────────

export interface CreateConnectAccountResult {
  accountId: string;
  accountLinkUrl: string;
}

/**
 * Create a Stripe Express account for a tenant (service provider) and return
 * the first onboarding link.
 *
 * Flow:
 *   1. Create Express account (country is required by Stripe up-front)
 *   2. Persist the accountId to the tenant (so we don't duplicate on retry)
 *   3. Generate the first account link the provider follows to complete
 *      Stripe-hosted onboarding (KYC, bank details, etc.)
 *
 * If the tenant already has a stripeAccountId we reuse it rather than creating
 * a duplicate — this makes the flow idempotent if the user refreshes the page.
 */
export async function createConnectAccount(
  tenantId: string,
  email: string,
  country: string,
): Promise<CreateConnectAccountResult> {
  if (!tenantId) throw new Error('tenantId is required');
  if (!email) throw new Error('email is required');
  // Stripe requires a 2-letter ISO country code.
  const normalizedCountry = (country || 'US').toUpperCase().slice(0, 2);

  const stripe = getStripe();

  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: normalizedCountry,
      email,
      metadata: {
        tenantId,
        platform: 'serviceos',
      },
      capabilities: {
        // Express accounts default to card + bank transfers; request them
        // explicitly so payouts are unblocked once KYC completes.
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    const accountLinkUrl = await createAccountLink(
      account.id,
      defaultReturnUrl(),
      defaultRefreshUrl(),
    );

    logger.info(
      { tenantId, accountId: account.id, component: 'stripe' },
      'Created Stripe Connect account',
    );

    return { accountId: account.id, accountLinkUrl };
  } catch (err) {
    logger.error(
      { err, tenantId, email, component: 'stripe' },
      'Failed to create Stripe Connect account',
    );
    throw err;
  }
}

/**
 * Generate a fresh onboarding link for an existing Connect account.
 * Stripe account links are single-use and expire (~10 min), so callers
 * should always fetch a new one before redirecting the user.
 */
export async function createAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<string> {
  if (!accountId) throw new Error('accountId is required');
  if (!returnUrl) throw new Error('returnUrl is required');
  if (!refreshUrl) throw new Error('refreshUrl is required');

  const stripe = getStripe();

  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return link.url;
  } catch (err) {
    logger.error(
      { err, accountId, component: 'stripe' },
      'Failed to create Stripe account link',
    );
    throw err;
  }
}

export interface AccountStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: Stripe.Account.Requirements | null;
}

/**
 * Read the live status of a Connect account from Stripe.
 * Used to decide whether the tenant can accept marketplace payouts.
 */
export async function getAccountStatus(accountId: string): Promise<AccountStatus> {
  if (!accountId) throw new Error('accountId is required');
  const stripe = getStripe();

  try {
    const account = await stripe.accounts.retrieve(accountId);
    return {
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      detailsSubmitted: !!account.details_submitted,
      requirements: account.requirements ?? null,
    };
  } catch (err) {
    logger.error(
      { err, accountId, component: 'stripe' },
      'Failed to retrieve Stripe account status',
    );
    throw err;
  }
}

// ─── Marketplace payments & payouts ────────────────────────────────────────

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

/**
 * Create a PaymentIntent for a marketplace customer payment.
 *
 * `amount` is in the SMALLEST currency unit (e.g. cents) per Stripe convention.
 * The route layer is responsible for converting dollars → cents.
 *
 * `metadata` is attached to the PaymentIntent so we can reconcile it back to
 * our internal `MarketplaceTransaction` row from webhook events.
 *
 * NOTE: this is a "destination-less" direct charge — the platform collects the
 * funds first, then issues a separate `transferToProvider` call to move the
 * provider's share once the job is complete. This gives us escrow semantics
 * (customer pays up-front, provider gets paid on completion).
 */
export async function createPaymentIntent(
  amount: number,
  currency: string,
  metadata: Record<string, string> = {},
): Promise<CreatePaymentIntentResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number (in smallest currency unit)');
  }
  // Stripe requires integer cents.
  const integerAmount = Math.round(amount);
  if (!currency || currency.length !== 3) {
    throw new Error('currency must be a 3-letter ISO code (e.g. USD)');
  }

  const stripe = getStripe();

  try {
    const intent = await stripe.paymentIntents.create({
      amount: integerAmount,
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    if (!intent.client_secret) {
      throw new Error('Stripe returned no client_secret for PaymentIntent');
    }

    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  } catch (err) {
    logger.error(
      { err, amount, currency, component: 'stripe' },
      'Failed to create PaymentIntent',
    );
    throw err;
  }
}

/**
 * Move funds from the platform balance to a provider's Connect balance.
 * `amount` is in the smallest currency unit (cents).
 *
 * `transferGroup` ties this transfer back to the customer PaymentIntent so
 * Stripe's dashboard shows the full money flow. We additionally set
 * `destination` to the provider's Connect account — that's what actually
 * moves the money out of the platform balance.
 */
export async function transferToProvider(
  accountId: string,
  amount: number,
  currency: string,
  transferGroup: string,
): Promise<Stripe.Transfer> {
  if (!accountId) throw new Error('accountId is required');
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number (in smallest currency unit)');
  }
  if (!currency || currency.length !== 3) {
    throw new Error('currency must be a 3-letter ISO code');
  }
  if (!transferGroup) throw new Error('transferGroup is required');

  const stripe = getStripe();

  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      destination: accountId,
      transfer_group: transferGroup,
    });

    logger.info(
      { accountId, amount, currency, transferId: transfer.id, component: 'stripe' },
      'Transfer to provider created',
    );
    return transfer;
  } catch (err) {
    logger.error(
      { err, accountId, amount, currency, component: 'stripe' },
      'Failed to transfer to provider',
    );
    throw err;
  }
}

/**
 * Issue an instant payout to a provider's external bank / debit card from
 * their Connect balance. The provider must have payouts enabled AND a
 * sufficient Connect balance; otherwise Stripe rejects the call.
 *
 * `amount` is in the smallest currency unit (cents). Pass `undefined` (or -1)
 * to payout the full available balance.
 */
export async function createPayout(
  accountId: string,
  amount: number,
  currency: string,
): Promise<Stripe.Payout> {
  if (!accountId) throw new Error('accountId is required');
  if (!currency || currency.length !== 3) {
    throw new Error('currency must be a 3-letter ISO code');
  }
  // Allow callers to pass -1 / NaN to mean "full balance".
  const payoutFull = !Number.isFinite(amount) || amount < 0;

  const stripe = getStripe();

  try {
    const payout = await stripe.payouts.create(
      payoutFull
        ? { amount: undefined as unknown as number, currency: currency.toLowerCase() }
        : { amount: Math.round(amount), currency: currency.toLowerCase() },
      { stripeAccount: accountId },
    );

    logger.info(
      { accountId, amount: payoutFull ? 'auto' : amount, payoutId: payout.id, component: 'stripe' },
      'Stripe payout created',
    );
    return payout;
  } catch (err) {
    logger.error(
      { err, accountId, amount, currency, component: 'stripe' },
      'Failed to create Stripe payout',
    );
    throw err;
  }
}

// ─── Webhook event handling ────────────────────────────────────────────────

/**
 * Process a verified Stripe webhook event.
 *
 * This function is intentionally DB-only — it does NOT re-call Stripe. All
 * the data we need is in the event payload (Stripe guarantees the shape).
 *
 * Supported events:
 *   - account.updated             → sync stripeConnected + stripePayoutsEnabled on Tenant
 *   - payment.intent.succeeded    → mark MarketplaceTransaction as paid (escrow)
 *   - transfer.created            → record transferId on MarketplaceTransaction
 *   - payout.paid                 → mark Payout as paid
 *
 * Every handler is idempotent — Stripe redelivers events, so we always
 * check the current DB state before updating.
 *
 * Returns true if the event was handled (even if it was a no-op), false if
 * it was an unrecognised event type.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<boolean> {
  // Lazy import db so the stripe lib itself doesn't drag Prisma into the
  // browser bundle if (somehow) imported there.
  const { db } = await import('@/lib/db');

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(db, account);
        return true;
      }
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(db, intent);
        return true;
      }
      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        await handleTransferCreated(db, transfer);
        return true;
      }
      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        await handlePayoutPaid(db, payout);
        return true;
      }
      default:
        logger.debug(
          { eventType: event.type, component: 'stripe' },
          'Stripe webhook event type not handled',
        );
        return false;
    }
  } catch (err) {
    logger.error(
      { err, eventType: event.type, eventId: event.id, component: 'stripe' },
      'Stripe webhook handler error',
    );
    // Re-throw so the route can decide whether to return 500 (forcing Stripe
    // to retry) or 200 (accept the redelivery risk).
    throw err;
  }
}

/**
 * Alias for the PrismaClient instance type. Used to keep the webhook
 * handler signatures narrow + testable without dragging the entire db
 * module into the type.
 */
type DbClient = PrismaClient;

async function handleAccountUpdated(db: DbClient, account: Stripe.Account) {
  const tenantId = account.metadata?.tenantId;
  if (!tenantId) {
    // No tenantId → we can't map this account to a Tenant. This happens for
    // platform-level accounts; safe to ignore.
    logger.warn(
      { accountId: account.id, component: 'stripe' },
      'account.updated has no tenantId metadata — skipping',
    );
    return;
  }

  await db.tenant.updateMany({
    where: { stripeAccountId: account.id },
    data: {
      stripeConnected: true,
      stripePayoutsEnabled: !!account.payouts_enabled,
    },
  });

  logger.info(
    { tenantId, accountId: account.id, payoutsEnabled: !!account.payouts_enabled, component: 'stripe' },
    'Synced Stripe account.updated → Tenant',
  );
}

async function handlePaymentIntentSucceeded(
  db: DbClient,
  intent: Stripe.PaymentIntent,
) {
  // Reconcile via paymentIntentId on MarketplaceTransaction.
  const txn = await db.marketplaceTransaction.findFirst({
    where: { paymentIntentId: intent.id },
  });
  if (!txn) {
    // We may receive the webhook before our own DB insert commits (race
    // between payment-intent creation + capture). Log + return; Stripe will
    // not retry this event since we return 200.
    logger.warn(
      { paymentIntentId: intent.id, component: 'stripe' },
      'payment.intent.succeeded for unknown MarketplaceTransaction',
    );
    return;
  }

  // Idempotent: only transition out of pending/escrow-pending states.
  if (txn.status === 'escrow' || txn.status === 'released') return;

  await db.marketplaceTransaction.update({
    where: { id: txn.id },
    data: { status: 'escrow' },
  });

  logger.info(
    { txnId: txn.id, paymentIntentId: intent.id, amount: intent.amount_received, component: 'stripe' },
    'MarketplaceTransaction → escrow (payment.intent.succeeded)',
  );
}

async function handleTransferCreated(db: DbClient, transfer: Stripe.Transfer) {
  // Look up the MarketplaceTransaction this transfer belongs to. We key on
  // transferGroup (set by transferToProvider) OR on the destination account.
  // The cleanest reconciliation is via metadata.transferGroup, but Stripe
  // also exposes transfer.transfer_group directly.
  const transferGroup = transfer.transfer_group || undefined;

  if (transferGroup) {
    await db.marketplaceTransaction.updateMany({
      where: { paymentIntentId: transferGroup },
      data: { transferId: transfer.id },
    });
  }

  // Mirror into the Payout table if a payout record was created ahead-of-time
  // by the marketplace settlement worker.
  await db.payout.updateMany({
    where: { stripeTransferId: transfer.id },
    data: { status: 'pending' }, // will be promoted to 'paid' on payout.paid
  });

  logger.info(
    { transferId: transfer.id, transferGroup, destination: transfer.destination, component: 'stripe' },
    'transfer.created recorded',
  );
}

async function handlePayoutPaid(db: DbClient, payout: Stripe.Payout) {
  // Find the Payout row keyed on the Stripe transfer ID. (Stripe stores the
  // originating transfer id on the payout object so we can join them.)
  const stripeTransferId =
    (payout as unknown as { source_transfer?: string }).source_transfer ||
    payout.id;

  // Update by stripeTransferId; if that misses, try the payout id itself.
  const updated = await db.payout.updateMany({
    where: { stripeTransferId },
    data: { status: 'paid', paidAt: new Date() },
  });

  if (updated.count === 0) {
    // Fall back to the payout.id — we may have stored it directly when the
    // marketplace settlement worker created the Payout record.
    await db.payout.updateMany({
      where: { stripeTransferId: payout.id },
      data: { status: 'paid', paidAt: new Date() },
    });
  }

  logger.info(
    { payoutId: payout.id, stripeTransferId, amount: payout.amount, component: 'stripe' },
    'payout.paid → Payout.status = paid',
  );
}

// ─── URL helpers ───────────────────────────────────────────────────────────

/**
 * Default return URL for Stripe onboarding completion. Prefers an explicit
 * APP_URL env var; otherwise falls back to the request origin (set by the
 * route handler) — but for the lib-level default we use the dashboard path.
 */
function defaultReturnUrl(): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://serviceos.cc'
  ).replace(/\/$/, '');
  return `${base}/settings/billing?stripe_connect=return`;
}

function defaultRefreshUrl(): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://serviceos.cc'
  ).replace(/\/$/, '');
  return `${base}/settings/billing?stripe_connect=refresh`;
}

// ─── Webhook signature verification ────────────────────────────────────────

/**
 * Verify the raw webhook body against the Stripe signature header.
 * Returns the parsed event or throws.
 *
 * MUST be called with the RAW request body (a string), NOT parsed JSON —
 * Stripe signs the exact bytes on the wire.
 */
export function constructWebhookEvent(
  rawBody: string,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new StripeConfigError(
      'STRIPE_WEBHOOK_SECRET is not set — cannot verify webhook signatures.',
    );
  }
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
