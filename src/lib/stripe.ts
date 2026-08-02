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
        platform: 'fieseros',
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
 * Low-level primitive: move funds from the platform balance to a provider's
 * Connect balance. `amount` is in the smallest currency unit (cents).
 *
 * `transferGroup` ties this transfer back to the customer PaymentIntent so
 * Stripe's dashboard shows the full money flow. We additionally set
 * `destination` to the provider's Connect account — that's what actually
 * moves the money out of the platform balance.
 *
 * Most callers should use the higher-level `transferToProvider(tenantId, ...)`
 * wrapper below which handles the tenant lookup + payouts-enabled guard +
 * demo-mode fallback. This primitive exists for the (rare) case where the
 * caller already has the Stripe Connect accountId in hand.
 */
export async function createStripeTransfer(
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
 * Typed error thrown by `transferToProvider` when the tenant is missing a
 * Connect account or payouts aren't enabled. Route handlers / the settlement
 * cron can catch this and surface a meaningful status instead of crashing.
 */
export class StripePayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StripePayoutError';
  }
}

export interface TransferToProviderResult {
  transferId: string;
  status: string;
  /** True when we returned a mock transfer (no real Stripe call was made). */
  mock: boolean;
}

/**
 * High-level settlement primitive used by the marketplace settlement cron.
 *
 * Looks up the tenant's Stripe Connect accountId, verifies payouts are
 * enabled, then issues a Stripe Transfer of `amountInCents` to the provider's
 * Connect balance. The MarketplaceTransaction.id is used as the
 * `transfer_group` so Stripe's dashboard shows the full money flow.
 *
 * Args:
 *   - tenantId                   — the provider's Tenant.id
 *   - amountInCents              — providerAmount in SMALLEST currency unit (cents)
 *   - marketplaceTransactionId   — used as transfer_group + metadata key
 *
 * Returns `{ transferId, status, mock }` on success.
 *
 * Throws `StripePayoutError` (typed) if:
 *   - the tenant doesn't exist
 *   - the tenant has no `stripeAccountId`
 *   - `stripePayoutsEnabled === false`
 *
 * Demo/dev mode: if `STRIPE_SECRET_KEY` is not set in env (or the tenant's
 * `stripeAccountId` starts with the reserved `acct_demo_` prefix used by the
 * seed data), this function returns a mock success result and logs a warning
 * rather than crashing — the seeded marketplace providers all use
 * `acct_demo_*` IDs which are not real Stripe accounts.
 */
export async function transferToProvider(
  tenantId: string,
  amountInCents: number,
  marketplaceTransactionId: string,
): Promise<TransferToProviderResult> {
  if (!tenantId) throw new StripePayoutError('tenantId is required');
  if (!marketplaceTransactionId) throw new StripePayoutError('marketplaceTransactionId is required');
  if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
    throw new StripePayoutError('amountInCents must be a positive integer (cents)');
  }

  // Lazy import db so this lib stays import-safe from contexts that don't
  // drag Prisma in (e.g. the Stripe SDK unit tests).
  const { db } = await import('@/lib/db');

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      stripeAccountId: true,
      stripePayoutsEnabled: true,
      stripeConnected: true,
      currency: true,
    },
  });

  if (!tenant) {
    throw new StripePayoutError(`Tenant ${tenantId} not found`);
  }

  const stripeAccountId = tenant.stripeAccountId;
  const isDemoAccount = !!stripeAccountId && stripeAccountId.startsWith('acct_demo_');
  const stripeConfigured = isStripeConfigured();

  // ── Demo / dev fallback ───────────────────────────────────────────────
  // If Stripe isn't configured at all OR the tenant is using a seeded demo
  // account (acct_demo_*), return a mock transfer so the settlement cron
  // can still complete end-to-end in a dev environment. We must NOT call
  // Stripe with a fake accountId — the API would 400.
  if (!stripeConfigured || isDemoAccount) {
    const mockTransferId = `tr_demo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    logger.warn(
      {
        tenantId,
        tenantName: tenant.name,
        stripeAccountId: stripeAccountId || null,
        marketplaceTransactionId,
        amountInCents,
        mockTransferId,
        reason: !stripeConfigured ? 'STRIPE_SECRET_KEY not set' : 'demo Connect account (acct_demo_*)',
        component: 'stripe',
      },
      'transferToProvider: returning MOCK transfer (dev/demo mode)',
    );
    return { transferId: mockTransferId, status: 'succeeded', mock: true };
  }

  if (!stripeAccountId) {
    throw new StripePayoutError(
      `Tenant ${tenantId} (${tenant.name}) has no Stripe Connect account — cannot transfer`,
    );
  }
  if (!tenant.stripePayoutsEnabled) {
    throw new StripePayoutError(
      `Tenant ${tenantId} (${tenant.name}) Stripe payouts are not enabled — complete Connect onboarding first`,
    );
  }

  // ── Real Stripe call ──────────────────────────────────────────────────
  // Use the tenant's currency (default USD); MarketplaceTransaction.amount
  // is stored in major units so the cron converts to cents before calling.
  const currency = (tenant.currency || 'USD').toUpperCase().slice(0, 3);

  const transfer = await createStripeTransfer(
    stripeAccountId,
    amountInCents,
    currency,
    marketplaceTransactionId,
  );

  return { transferId: transfer.id, status: transfer.status ?? 'succeeded', mock: false };
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
 *                                    + set escrowedAt + store event metadata
 *   - transfer.created            → record transferId on MarketplaceTransaction
 *   - payout.paid                 → mark Payout as paid
 *   - charge.refunded             → mark MarketplaceTransaction as 'refunded'
 *                                    + set refundedAt + refundAmount
 *   - charge.dispute.created      → mark MarketplaceTransaction as 'disputed'
 *                                    + set disputedAt + store dispute metadata
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
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(db, charge);
        return true;
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleChargeDisputeCreated(db, dispute);
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
    // We may receive the webhook for subscription payments (not marketplace
    // transactions) — these are ignored. Also covers the rare race where
    // the webhook fires before our own DB insert commits. Log + return;
    // Stripe will not retry this event since we return 200.
    logger.warn(
      { paymentIntentId: intent.id, component: 'stripe' },
      'payment_intent.succeeded for unknown MarketplaceTransaction (likely a subscription payment)',
    );
    return;
  }

  // Idempotent: only transition out of pending (or null) state. If the
  // transaction is already in escrow / released / refunded / disputed we
  // leave it alone — Stripe redelivers events and we must not regress.
  if (txn.status && txn.status !== 'pending') {
    logger.debug(
      { txnId: txn.id, paymentIntentId: intent.id, currentStatus: txn.status, component: 'stripe' },
      'payment_intent.succeeded received for already-processed MarketplaceTransaction — skipping',
    );
    return;
  }

  // Merge the Stripe event metadata into the existing metadataJson so we
  // keep an audit trail of when escrow started.
  const priorMeta = safeParseJsonRecord(txn.metadataJson);
  const updatedMetadata = {
    ...priorMeta,
    escrowEvent: {
      paymentIntentId: intent.id,
      amountReceived: intent.amount_received,
      currency: intent.currency,
      capturedAt: new Date().toISOString(),
      stripeEventId: intent.id,
    },
  };

  await db.marketplaceTransaction.update({
    where: { id: txn.id },
    data: {
      status: 'escrow',
      escrowedAt: new Date(),
      metadataJson: JSON.stringify(updatedMetadata),
    },
  });

  logger.info(
    { txnId: txn.id, paymentIntentId: intent.id, amount: intent.amount_received, component: 'stripe' },
    'MarketplaceTransaction → escrow (payment_intent.succeeded)',
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

/**
 * charge.refunded — a previously captured charge has been refunded (fully or
 * partially). We transition the MarketplaceTransaction to 'refunded' and
 * record the refund amount + metadata.
 *
 * Reconciliation: the charge object's `payment_intent` field carries the
 * PaymentIntent ID, which we persist on the MarketplaceTransaction row at
 * payment-creation time.
 *
 * Edge case — refund AFTER release: if the settlement worker has already
 * moved the funds to the provider's Connect balance (status='released'),
 * we still flip the transaction to 'refunded' for accurate reporting, but
 * we log a warning so an operator can manually claw back the transfer
 * (Stripe requires `stripe.transfers.createReversal` for this — out of
 * scope for the cron, but flagged here).
 */
async function handleChargeRefunded(db: DbClient, charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) {
    logger.warn(
      { chargeId: charge.id, component: 'stripe' },
      'charge.refunded has no payment_intent — cannot reconcile to MarketplaceTransaction',
    );
    return;
  }

  const txn = await db.marketplaceTransaction.findFirst({
    where: { paymentIntentId },
  });

  if (!txn) {
    // Not a marketplace transaction (likely a subscription refund).
    logger.debug(
      { paymentIntentId, chargeId: charge.id, component: 'stripe' },
      'charge.refunded for unknown MarketplaceTransaction — ignoring',
    );
    return;
  }

  // If the transaction was already released, the provider has the money —
  // we need a manual clawback. Log loudly so an operator sees it.
  if (txn.status === 'released') {
    logger.warn(
      {
        txnId: txn.id,
        paymentIntentId,
        transferId: txn.transferId,
        amountRefunded: charge.amount_refunded,
        component: 'stripe',
      },
      'charge.refunded for RELEASED MarketplaceTransaction — manual transfer reversal required (clawback)',
    );
  }

  // amount_refunded is in smallest currency unit (cents). Convert to major
  // units to match our schema (refundAmount Float is in dollars).
  const refundAmountMajor = charge.amount_refunded
    ? Math.round(charge.amount_refunded) / 100
    : txn.totalAmount;

  // Idempotent: if already refunded, just refresh the metadata (Stripe
  // redelivers events; partial refunds may fire multiple times).
  const priorMeta = safeParseJsonRecord(txn.metadataJson);
  const updatedMetadata = {
    ...priorMeta,
    refundEvent: {
      chargeId: charge.id,
      amountRefundedCents: charge.amount_refunded,
      amountRefundedMajor: refundAmountMajor,
      currency: charge.currency,
      refundedAt: new Date().toISOString(),
      reason: charge.reason || null,
      priorStatus: txn.status,
    },
  };

  await db.marketplaceTransaction.update({
    where: { id: txn.id },
    data: {
      status: 'refunded',
      refundedAt: new Date(),
      refundAmount: refundAmountMajor,
      metadataJson: JSON.stringify(updatedMetadata),
    },
  });

  logger.info(
    {
      txnId: txn.id,
      paymentIntentId,
      chargeId: charge.id,
      refundAmountMajor,
      priorStatus: txn.status,
      component: 'stripe',
    },
    'MarketplaceTransaction → refunded (charge.refunded)',
  );
}

/**
 * charge.dispute.created — a customer has disputed the charge with their
 * bank. We transition the MarketplaceTransaction to 'disputed' and store
 * the dispute metadata. The dispute lifecycle (won/lost/closed) is handled
 * by separate `charge.dispute.*` events which we don't yet wire up — for
 * now we just flag it.
 */
async function handleChargeDisputeCreated(db: DbClient, dispute: Stripe.Dispute) {
  const paymentIntentId =
    typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

  if (!paymentIntentId) {
    logger.warn(
      { disputeId: dispute.id, component: 'stripe' },
      'charge.dispute.created has no payment_intent — cannot reconcile to MarketplaceTransaction',
    );
    return;
  }

  const txn = await db.marketplaceTransaction.findFirst({
    where: { paymentIntentId },
  });

  if (!txn) {
    logger.debug(
      { paymentIntentId, disputeId: dispute.id, component: 'stripe' },
      'charge.dispute.created for unknown MarketplaceTransaction — ignoring',
    );
    return;
  }

  // Idempotent — if already disputed, just refresh the metadata.
  const priorMeta = safeParseJsonRecord(txn.metadataJson);
  const updatedMetadata = {
    ...priorMeta,
    disputeEvent: {
      disputeId: dispute.id,
      amountCents: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason || null,
      status: dispute.status,
      priorStatus: txn.status,
      disputedAt: new Date().toISOString(),
    },
  };

  await db.marketplaceTransaction.update({
    where: { id: txn.id },
    data: {
      status: 'disputed',
      disputedAt: new Date(),
      disputeReason: dispute.reason || null,
      metadataJson: JSON.stringify(updatedMetadata),
    },
  });

  logger.warn(
    {
      txnId: txn.id,
      paymentIntentId,
      disputeId: dispute.id,
      amountCents: dispute.amount,
      reason: dispute.reason,
      priorStatus: txn.status,
      component: 'stripe',
    },
    'MarketplaceTransaction → disputed (charge.dispute.created)',
  );
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/**
 * Safely parse a metadataJson string into a Record. Returns `{}` if the
 * string is invalid JSON, is null/empty, or isn't a plain object. Used by
 * the webhook handlers so a corrupt metadataJson never crashes a Stripe
 * event (Stripe would keep retrying if we returned 500).
 */
function safeParseJsonRecord(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return {};
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
    'https://fieseros.com'
  ).replace(/\/$/, '');
  return `${base}/settings/billing?stripe_connect=return`;
}

function defaultRefreshUrl(): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://fieseros.com'
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
