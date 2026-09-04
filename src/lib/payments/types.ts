/**
 * Provider-neutral payment domain types.
 *
 * This is the abstraction layer that decouples Fieseros's marketplace code
 * from any specific payment provider (Airwallex today; Stripe / PayPal /
 * Adyen in the future). Marketplace code depends on the `PaymentProvider`
 * interface + these types — NEVER on provider-specific SDKs or field names.
 *
 * Architecture contract:
 *   - Marketplace code  →  payments.service.{createPayment, getAccountStatus, ...}
 *   - payments.service  →  dispatches to the active provider (resolved from env)
 *   - providers/airwallex.ts  →  implements PaymentProvider against Airwallex's API
 *   - providers/<future>.ts   →  would implement PaymentProvider against another API
 *
 * The provider stores its own IDs in the provider-neutral columns:
 *   Tenant.paymentProviderAccountId  →  Airwallex `acct_...` / Stripe `acct_...` / etc.
 *   MarketplaceTransaction.paymentProviderPaymentId   →  Airwallex `int_...` / Stripe `pi_...`
 *   MarketplaceTransaction.paymentProviderTransferId  →  Airwallex transfer id / Stripe `tr_...`
 */

// ── Provider identity ──────────────────────────────────────────────────────

/**
 * The payment provider a tenant is connected to. Stored on
 * `Tenant.paymentProvider`. Only ONE provider per tenant (the marketplace
 * seller picks one at onboarding). Adding a new provider = adding a new
 * value here + a new adapter in `providers/`.
 */
export type PaymentProviderName = 'airwallex';

export const DEFAULT_PAYMENT_PROVIDER: PaymentProviderName = 'airwallex';

// ── Account / onboarding ─────────────────────────────────────────────────────

export interface CreateAccountInput {
  tenantId: string;
  /** Legal entity type. Most marketplace sellers are BUSINESS; sole traders are INDIVIDUAL. */
  legalEntityType: 'BUSINESS' | 'INDIVIDUAL';
  /** Primary contact email (used by the provider to send onboarding emails + verification). */
  email: string;
  /** Legal business name (as registered). */
  businessName?: string;
  /** Trading name / DBA (Doing Business As). */
  tradingName?: string;
  /** ISO 3166-1 alpha-2 country code where the business is registered. */
  country: string;
}

export interface CreateAccountResult {
  /** The provider's account ID (e.g. Airwallex `acct_...`). Persisted on Tenant.paymentProviderAccountId. */
  accountId: string;
  /** Initial onboarding status. */
  status: AccountStatus;
  /** URL the seller must visit to complete hosted KYC/KYB onboarding (null if hosted onboarding isn't used). */
  onboardingUrl: string | null;
}

export type AccountStatus =
  | 'created'        // account created but not yet submitted for verification
  | 'submitted'      // verification in progress
  | 'action_required'// provider needs more info (RFI)
  | 'active'         // verified, can receive payouts
  | 'suspended'      // temporarily suspended
  | 'closed'         // permanently closed
  | 'unknown';       // provider returned a status we don't recognise — handle gracefully

export interface AccountStatusResult {
  accountId: string;
  status: AccountStatus;
  /** True when payouts to this account are allowed (i.e. status === 'active' AND no requirements blocking payouts). */
  payoutsEnabled: boolean;
  /** Human-readable list of pending requirements (e.g. "Upload business registration document"). Empty when active. */
  pendingRequirements: string[];
}

// ── Payment intent (customer pays for a marketplace booking) ────────────────

export interface CreatePaymentInput {
  /** Smallest currency unit (e.g. cents). MUST be a positive integer. */
  amount: number;
  /** 3-letter ISO 4217 currency code. */
  currency: string;
  /** Our internal MarketplaceTransaction.id — passed as merchant_order_id for reconciliation. */
  marketplaceTransactionId: string;
  /** The seller's connected-account ID (Tenant.paymentProviderAccountId). */
  connectedAccountId: string;
  /** Free-form metadata (provider stores it on the payment; we use it for dispute defense). */
  metadata?: Record<string, string>;
  /** URL the customer is redirected to after paying on the hosted payment page. */
  returnUrl?: string;
}

export interface CreatePaymentResult {
  /** The provider's payment ID (e.g. Airwallex `int_...`). Persisted on MarketplaceTransaction.paymentProviderPaymentId. */
  paymentId: string;
  /** Client secret — passed to the browser so the Airwallex.js SDK can confirm the payment. */
  clientSecret: string;
  /** Initial status — always REQUIRES_PAYMENT_METHOD for a fresh intent. */
  status: PaymentStatus;
}

export type PaymentStatus =
  | 'requires_payment_method'  // fresh intent, awaiting customer payment
  | 'requires_customer_action' // 3DS / QR scan / redirect needed
  | 'pending_review'           // authorized but under risk review
  | 'requires_capture'         // authorized, waiting for manual capture
  | 'pending'                  // pending final result from provider (async methods)
  | 'succeeded'                // payment complete
  | 'cancelled'                // cancelled by merchant
  | 'failed'                   // payment failed
  | 'unknown';

// ── Funds split / settlement (the marketplace "escrow" primitive) ───────────

/**
 * Hold part of a customer payment for later release to the seller.
 *
 * This is Airwallex's `funds_splits` primitive with `auto_release: false` —
 * the platform keeps the funds in its wallet until the job is completed,
 * then calls `releaseFundsSplit()`.
 *
 * Lifecycle (provider-neutral):
 *   created → released → settled   (happy path)
 *   created → released → failed     (rare — release failed at the bank)
 */
export interface CreateFundsSplitInput {
  /** The provider's payment ID (from createPayment). */
  sourcePaymentId: string;
  /** The seller's connected-account ID. */
  destinationAccountId: string;
  /** Amount to split to the seller (smallest currency unit). Platform keeps the rest as fee. */
  amount: number;
  /** 3-letter ISO 4217 currency. */
  currency: string;
  /** If true, funds are released immediately (no hold). Default false (hold until job done). */
  autoRelease?: boolean;
}

export interface CreateFundsSplitResult {
  /** The provider's funds-split ID (e.g. Airwallex `fs_...`). */
  fundsSplitId: string;
  status: 'created' | 'released' | 'settled' | 'failed' | 'unknown';
}

export interface ReleaseFundsSplitResult {
  fundsSplitId: string;
  status: 'released' | 'settled' | 'failed' | 'unknown';
}

// ── Payouts (platform pays seller their earnings) ──────────────────────────

export interface CreatePayoutInput {
  /** The seller's connected-account ID. */
  destinationAccountId: string;
  /** Smallest currency unit. */
  amount: number;
  /** 3-letter ISO 4217 currency. */
  currency: string;
  /** Internal reference (MarketplaceTransaction.id + Payout.id) — shown to beneficiary. */
  reference: string;
  /** Unique idempotency key (provider dedupes within a window — Airwallex: 7 days). */
  requestId: string;
}

export interface CreatePayoutResult {
  /** The provider's payout/transfer ID. Persisted on Payout.paymentProviderTransferId. */
  payoutId: string;
  status: PayoutStatus;
}

export type PayoutStatus =
  | 'new'         // created, awaiting processing
  | 'pending'     // in progress
  | 'settled'     // completed — funds arrived in seller's account
  | 'suspended'   // held for review
  | 'failed'      // failed — see failureReasons
  | 'cancelled'   // cancelled by platform
  | 'unknown';

// ── Refunds ─────────────────────────────────────────────────────────────────

export interface CreateRefundInput {
  /** The provider's payment ID to refund. */
  paymentId: string;
  /** Amount to refund (smallest currency unit). Partial refunds allowed. */
  amount: number;
  /** 3-letter ISO 4217 currency. */
  currency: string;
  /** Internal reason for audit log. */
  reason?: string;
}

export interface CreateRefundResult {
  refundId: string;
  status: 'succeeded' | 'pending' | 'failed' | 'unknown';
}

// ── Webhook events (provider-neutral) ───────────────────────────────────────

/**
 * Normalised webhook event — the provider adapter converts its native event
 * shape into this common shape so the webhook dispatcher doesn't need to
 * know which provider fired the event.
 */
export interface NormalisedWebhookEvent {
  /** The provider's unique event ID — used for idempotency (dedup). */
  eventId: string;
  /** Which provider fired this event. */
  provider: PaymentProviderName;
  /** The normalised event type (see PaymentEventType). */
  type: PaymentEventType;
  /** The provider's payment ID (if applicable to this event). */
  paymentId?: string;
  /** The provider's connected-account ID (if applicable). */
  accountId?: string;
  /** The provider's payout/transfer ID (if applicable). */
  payoutId?: string;
  /** The provider's funds-split ID (if applicable). */
  fundsSplitId?: string;
  /** Amount in smallest currency unit (when relevant). */
  amount?: number;
  /** 3-letter currency code (when relevant). */
  currency?: string;
  /** Human-readable reason (for failures / disputes). */
  reason?: string;
  /** Raw event payload (for audit log / debugging). */
  raw: Record<string, unknown>;
}

export type PaymentEventType =
  | 'payment_intent.succeeded'
  | 'payment_intent.failed'
  | 'payment_intent.cancelled'
  | 'funds_split.created'
  | 'funds_split.released'
  | 'funds_split.settled'
  | 'funds_split.failed'
  | 'payout.created'
  | 'payout.settled'
  | 'payout.failed'
  | 'refund.succeeded'
  | 'refund.failed'
  | 'dispute.created'
  | 'dispute.won'
  | 'dispute.lost'
  | 'account.verified'
  | 'account.action_required'
  | 'account.suspended'
  | 'unknown';

export interface WebhookVerifyResult {
  verified: boolean;
  /** The parsed event, if verified. Null if not. */
  event?: NormalisedWebhookEvent;
  /** Reason for verification failure. */
  error?: string;
}

// ── The provider interface ──────────────────────────────────────────────────

/**
 * Every payment provider adapter implements this interface.
 *
 * The `name` field lets the service layer route to the right provider based
 * on `Tenant.paymentProvider`. Adding a new provider = implementing this
 * interface + registering it in `service.ts`.
 */
export interface PaymentProvider {
  /** Provider identifier — matches `Tenant.paymentProvider`. */
  readonly name: PaymentProviderName;

  /** True when the provider's API credentials are configured (env vars set). */
  isConfigured(): boolean;

  // ── Account lifecycle ──
  createAccount(input: CreateAccountInput): Promise<CreateAccountResult>;
  getAccountStatus(accountId: string): Promise<AccountStatusResult>;
  /** Generate a hosted onboarding URL for the seller to complete KYC/KYB. */
  getOnboardingUrl(accountId: string, returnUrl: string): Promise<string>;

  // ── Payments ──
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;

  // ── Funds split (marketplace escrow primitive) ──
  createFundsSplit(input: CreateFundsSplitInput): Promise<CreateFundsSplitResult>;
  releaseFundsSplit(fundsSplitId: string): Promise<ReleaseFundsSplitResult>;

  // ── Payouts ──
  createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult>;
  getPayoutStatus(payoutId: string): Promise<PayoutStatus>;

  // ── Refunds ──
  createRefund(input: CreateRefundInput): Promise<CreateRefundResult>;

  // ── Webhooks ──
  /**
   * Verify the webhook signature + parse the raw body into a normalised event.
   * Returns `{ verified: false, error }` on signature mismatch.
   */
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookVerifyResult>;
}

// ── Provider-neutral marketplace transaction lifecycle ──────────────────────

/**
 * MarketplaceTransaction.status values — provider-neutral.
 *
 * The lifecycle (no "escrow" terminology — see architecture decision):
 *
 *   pending          →  payment intent created, customer hasn't paid yet
 *   paid_held        →  customer paid; funds held by platform (via funds_split auto_release:false)
 *   settlement_eligible  →  job completed; ready to release funds + pay seller
 *   payout_initiated →  payout/transfer to seller created
 *   payout_completed →  seller received the funds
 *   refunded         →  customer refunded
 *   disputed         →  chargeback / dispute opened
 *   failed           →  payment failed (declined, insufficient funds, etc.)
 *   cancelled        →  booking cancelled before payment
 *
 * Status transitions are driven ONLY by webhook events + the settlement cron,
 * NEVER by frontend calls. This closes the existing gap where the booking
 * "succeeded" without the customer actually paying.
 */
export type MarketplaceTransactionStatus =
  | 'pending'
  | 'paid_held'
  | 'settlement_eligible'
  | 'payout_initiated'
  | 'payout_completed'
  | 'refunded'
  | 'disputed'
  | 'failed'
  | 'cancelled';

/**
 * Map a provider's payment status to our transaction status.
 * Used by webhook handlers to update MarketplaceTransaction.status.
 */
export function paymentStatusToTransactionStatus(status: PaymentStatus): MarketplaceTransactionStatus | null {
  switch (status) {
    case 'succeeded': return 'paid_held';
    case 'failed': return 'failed';
    case 'cancelled': return 'cancelled';
    // Other statuses (requires_payment_method, requires_customer_action, etc.)
    // don't change the transaction status — the transaction stays in its current state.
    default: return null;
  }
}
