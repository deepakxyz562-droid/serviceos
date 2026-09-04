/**
 * Payment service — provider-neutral facade.
 *
 * Marketplace code calls `payments.createPayment(...)`, `payments.getAccountStatus(...)`,
 * etc. This service routes the call to the active provider's adapter based on
 * `Tenant.paymentProvider` (or the default provider if the tenant hasn't picked one).
 *
 * Adding a new provider:
 *   1. Create `providers/<name>.ts` implementing `PaymentProvider`.
 *   2. Register it in the `PROVIDERS` map below.
 *   3. Add the name to `PaymentProviderName` in `types.ts`.
 * No marketplace code changes required.
 */

import type {
  PaymentProvider,
  PaymentProviderName,
  CreateAccountInput,
  CreateAccountResult,
  AccountStatusResult,
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentStatus,
  CreateFundsSplitInput,
  CreateFundsSplitResult,
  ReleaseFundsSplitResult,
  CreatePayoutInput,
  CreatePayoutResult,
  PayoutStatus,
  CreateRefundInput,
  CreateRefundResult,
  WebhookVerifyResult,
} from './types';
import { DEFAULT_PAYMENT_PROVIDER } from './types';
import { airwallexProvider } from './providers/airwallex';
import { ProviderNotConfiguredError } from './errors';

// ── Provider registry ─────────────────────────────────────────────────────────

const PROVIDERS: Record<PaymentProviderName, PaymentProvider> = {
  airwallex: airwallexProvider,
  // Future: 'stripe': stripeProvider, 'paypal_marketplace': paypalMarketplaceProvider,
};

/**
 * Get the provider adapter by name.
 * Throws if the name isn't registered (defensive — should never happen since
 * the union type limits callers to known names).
 */
export function getProvider(name: PaymentProviderName): PaymentProvider {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown payment provider: ${name}. Register it in src/lib/payments/service.ts.`);
  }
  return provider;
}

/** The default provider — used when a tenant hasn't explicitly chosen one. */
export function getDefaultProvider(): PaymentProvider {
  return getProvider(DEFAULT_PAYMENT_PROVIDER);
}

/** True when at least one provider has its API credentials configured. */
export function isAnyProviderConfigured(): boolean {
  return Object.values(PROVIDERS).some((p) => p.isConfigured());
}

/**
 * True when the DEFAULT provider is configured. Marketplace onboarding uses
 * this to decide whether to show "Set up payments" (real) or a demo banner.
 */
export function isDefaultProviderConfigured(): boolean {
  return getDefaultProvider().isConfigured();
}

// ── Provider-neutral operations (the facade) ──────────────────────────────────

export const payments = {
  // ── Account lifecycle ──────────────────────────────────────────────────────

  /** Start provider onboarding for a tenant. Creates a connected account + returns onboarding URL. */
  async createAccount(
    providerName: PaymentProviderName,
    input: CreateAccountInput,
  ): Promise<CreateAccountResult> {
    const provider = getProvider(providerName);
    return provider.createAccount(input);
  },

  /** Get the onboarding/KYC status of a connected account. */
  async getAccountStatus(
    providerName: PaymentProviderName,
    accountId: string,
  ): Promise<AccountStatusResult> {
    const provider = getProvider(providerName);
    return provider.getAccountStatus(accountId);
  },

  /** Generate a hosted onboarding URL (for sellers who need to complete KYC later). */
  async getOnboardingUrl(
    providerName: PaymentProviderName,
    accountId: string,
    returnUrl: string,
  ): Promise<string> {
    const provider = getProvider(providerName);
    return provider.getOnboardingUrl(accountId, returnUrl);
  },

  // ── Payments ────────────────────────────────────────────────────────────────

  /** Create a payment intent for a customer paying for a marketplace booking. */
  async createPayment(
    providerName: PaymentProviderName,
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    const provider = getProvider(providerName);
    return provider.createPayment(input);
  },

  /** Get the current status of a payment (for polling / webhook reconciliation). */
  async getPaymentStatus(
    providerName: PaymentProviderName,
    paymentId: string,
  ): Promise<PaymentStatus> {
    const provider = getProvider(providerName);
    return provider.getPaymentStatus(paymentId);
  },

  // ── Funds split (marketplace hold/release) ──────────────────────────────────

  /** Hold part of a customer payment for later release to the seller. */
  async createFundsSplit(
    providerName: PaymentProviderName,
    input: CreateFundsSplitInput,
  ): Promise<CreateFundsSplitResult> {
    const provider = getProvider(providerName);
    return provider.createFundsSplit(input);
  },

  /** Release held funds to the seller (called when the job is completed). */
  async releaseFundsSplit(
    providerName: PaymentProviderName,
    fundsSplitId: string,
  ): Promise<ReleaseFundsSplitResult> {
    const provider = getProvider(providerName);
    return provider.releaseFundsSplit(fundsSplitId);
  },

  // ── Payouts ────────────────────────────────────────────────────────────────

  /** Pay a seller their earnings (instant intra-Airwallex transfer from platform wallet). */
  async createPayout(
    providerName: PaymentProviderName,
    input: CreatePayoutInput,
  ): Promise<CreatePayoutResult> {
    const provider = getProvider(providerName);
    return provider.createPayout(input);
  },

  /** Get the status of a payout (for the settlement cron + provider dashboard). */
  async getPayoutStatus(
    providerName: PaymentProviderName,
    payoutId: string,
  ): Promise<PayoutStatus> {
    const provider = getProvider(providerName);
    return provider.getPayoutStatus(payoutId);
  },

  // ── Refunds ────────────────────────────────────────────────────────────────

  /** Refund a customer payment (full or partial). */
  async createRefund(
    providerName: PaymentProviderName,
    input: CreateRefundInput,
  ): Promise<CreateRefundResult> {
    const provider = getProvider(providerName);
    return provider.createRefund(input);
  },

  // ── Webhooks ────────────────────────────────────────────────────────────────

  /** Verify a webhook signature + parse the event. Returns the normalised event. */
  async verifyWebhook(
    providerName: PaymentProviderName,
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<WebhookVerifyResult> {
    const provider = getProvider(providerName);
    return provider.verifyWebhook(rawBody, headers);
  },
};

// Re-export everything callers need from this single entry point.
export {
  DEFAULT_PAYMENT_PROVIDER,
  type PaymentProvider,
  type PaymentProviderName,
  type CreateAccountInput,
  type CreateAccountResult,
  type AccountStatusResult,
  type AccountStatus,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentStatus,
  type CreateFundsSplitInput,
  type CreateFundsSplitResult,
  type ReleaseFundsSplitResult,
  type CreatePayoutInput,
  type CreatePayoutResult,
  type PayoutStatus,
  type CreateRefundInput,
  type CreateRefundResult,
  type WebhookVerifyResult,
  type NormalisedWebhookEvent,
  type PaymentEventType,
  type MarketplaceTransactionStatus,
  paymentStatusToTransactionStatus,
} from './types';
export { PaymentError, ProviderNotConfiguredError } from './errors';
