/**
 * Airwallex payment provider adapter.
 *
 * Implements the `PaymentProvider` interface against Airwallex's actual API:
 *
 *   - Auth: POST /api/v1/authentication/login (x-api-key + x-client-id → Bearer token, 30-min)
 *   - Connected Accounts: POST /api/v1/accounts/create, GET /api/v1/accounts/{id}
 *   - Onboarding: POST /api/v1/accounts/invitation_links/create (mode: scale_connect)
 *   - Payment Intents: POST /api/v1/pa/payment_intents/create
 *   - Funds Split (escrow primitive): POST /api/v1/pa/funds_splits/create, /release
 *   - Payouts: POST /api/v1/connected_account_transfers/create (instant intra-Airwallex)
 *   - Refunds: POST /api/v1/pa/refunds/create
 *   - Webhooks: HMAC-SHA256 over (`x-timestamp` + raw body) with webhook secret
 *
 * Env vars:
 *   AIRWALLEX_CLIENT_ID   — platform client id (from Airwallex dashboard)
 *   AIRWALLEX_API_KEY     — platform API key
 *   AIRWALLEX_WEBHOOK_SECRET — webhook signing secret (per webhook endpoint)
 *   AIRWALLEX_ENV         — 'demo' (sandbox) | 'prod' (default: 'demo')
 *
 * Demo mode: when AIRWALLEX_* env vars are unset, the adapter returns MOCK
 * responses (account IDs prefixed `acct_demo_`, payment IDs `int_demo_`, etc.)
 * so the marketplace flow works end-to-end in dev without real credentials.
 * This mirrors the legacy `acct_demo_*` Stripe fallback we're replacing.
 */

import crypto from 'crypto';
import type {
  PaymentProvider,
  PaymentProviderName,
  CreateAccountInput,
  CreateAccountResult,
  AccountStatusResult,
  AccountStatus,
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
  NormalisedWebhookEvent,
  PaymentEventType,
} from '../types';
import {
  PaymentError,
  ProviderNotConfiguredError,
  ProviderAuthError,
  InvalidPaymentInputError,
  WebhookSignatureError,
} from '../errors';

// ── Configuration ─────────────────────────────────────────────────────────────

const PROVIDER: PaymentProviderName = 'airwallex';

interface AirwallexConfig {
  clientId: string;
  apiKey: string;
  webhookSecret: string;
  baseUrl: string;
  /** True when real API credentials are set; false → demo/mock mode. */
  configured: boolean;
}

function getConfig(): AirwallexConfig {
  const env = process.env.AIRWALLEX_ENV || 'demo';
  const baseUrl = env === 'prod'
    ? 'https://api.airwallex.com'
    : 'https://api.sandbox.airwallex.com';
  const clientId = process.env.AIRWALLEX_CLIENT_ID || '';
  const apiKey = process.env.AIRWALLEX_API_KEY || '';
  const webhookSecret = process.env.AIRWALLEX_WEBHOOK_SECRET || '';
  return {
    clientId,
    apiKey,
    webhookSecret,
    baseUrl,
    configured: !!(clientId && apiKey),
  };
}

// ── Access-token cache (30-min lifetime, refresh 5 min before expiry) ──────

interface TokenCache {
  token: string;
  expiresAt: number; // ms epoch
}
let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const cfg = getConfig();
  if (!cfg.configured) {
    throw new ProviderNotConfiguredError(PROVIDER);
  }

  // Return cached token if still valid (with 5-min safety margin).
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - now > 5 * 60 * 1000) {
    return tokenCache.token;
  }

  // POST /api/v1/authentication/login with x-api-key + x-client-id
  const res = await fetch(`${cfg.baseUrl}/api/v1/authentication/login`, {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'x-client-id': cfg.clientId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderAuthError(PROVIDER, `login failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as { token?: string; expires_at?: string };
  if (!body.token) {
    throw new ProviderAuthError(PROVIDER, 'login response missing token');
  }
  // expires_at is an ISO string; default to 25 min if missing.
  const expiresAt = body.expires_at ? new Date(body.expires_at).getTime() : now + 25 * 60 * 1000;
  tokenCache = { token: body.token, expiresAt };
  return body.token;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isDemoMode(): boolean {
  return !getConfig().configured;
}

/** Generate a mock ID for demo mode. */
function mockId(prefix: string): string {
  return `${prefix}demo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Convert our amount (cents) to Airwallex's amount (number — minor units). */
function toAirwallexAmount(cents: number): number {
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new InvalidPaymentInputError(PROVIDER, 'amount', 'must be a positive integer (cents)');
  }
  return cents;
}

/** Map Airwallex account status to our AccountStatus. */
function mapAccountStatus(raw: string): AccountStatus {
  const mapping: Record<string, AccountStatus> = {
    CREATED: 'created',
    SUBMITTED: 'submitted',
    ACTION_REQUIRED: 'action_required',
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    DORMANT: 'suspended', // treat dormant as suspended (long inactivity)
    CLOSED: 'closed',
  };
  return mapping[raw] || 'unknown';
}

/** Map Airwallex payment-intent status to our PaymentStatus. */
function mapPaymentStatus(raw: string): PaymentStatus {
  const mapping: Record<string, PaymentStatus> = {
    REQUIRES_PAYMENT_METHOD: 'requires_payment_method',
    REQUIRES_CUSTOMER_ACTION: 'requires_customer_action',
    PENDING_REVIEW: 'pending_review',
    REQUIRES_CAPTURE: 'requires_capture',
    PENDING: 'pending',
    SUCCEEDED: 'succeeded',
    CANCELLED: 'cancelled',
    FAILED: 'failed',
    EXPIRED: 'failed', // treat expired as failed
  };
  return mapping[raw] || 'unknown';
}

/** Map Airwallex payout status to our PayoutStatus. */
function mapPayoutStatus(raw: string): PayoutStatus {
  const mapping: Record<string, PayoutStatus> = {
    NEW: 'new',
    SETTLED: 'settled',
    PENDING: 'pending',
    SUSPENDED: 'suspended',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
  };
  return mapping[raw] || 'unknown';
}

// ── Airwallex webhook event-name mapping ────────────────────────────────────

function mapWebhookEventType(raw: string): PaymentEventType {
  const mapping: Record<string, PaymentEventType> = {
    'payment_intent.succeeded': 'payment_intent.succeeded',
    'payment_intent.payment_failed': 'payment_intent.failed',
    'payment_intent.cancelled': 'payment_intent.cancelled',
    'funds_split.created': 'funds_split.created',
    'funds_split.released': 'funds_split.released',
    'funds_split.settled': 'funds_split.settled',
    'funds_split.failed': 'funds_split.failed',
    'payout.created': 'payout.created',
    'payout.settled': 'payout.settled',
    'payout.failed': 'payout.failed',
    'refund.succeeded': 'refund.succeeded',
    'refund.failed': 'refund.failed',
    'payment_dispute.created': 'dispute.created',
    'payment_dispute.won': 'dispute.won',
    'payment_dispute.lost': 'dispute.lost',
    'account.verified': 'account.verified',
    'account.action_required': 'account.action_required',
    'account.suspended': 'account.suspended',
  };
  return mapping[raw] || 'unknown';
}

// ── The adapter ──────────────────────────────────────────────────────────────

export const airwallexProvider: PaymentProvider = {
  name: PROVIDER,

  isConfigured(): boolean {
    return getConfig().configured;
  },

  // ── Account lifecycle ───────────────────────────────────────────────────

  async createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
    if (isDemoMode()) {
      return {
        accountId: mockId('acct_'),
        status: 'active', // demo mode: instantly active so the flow works end-to-end
        onboardingUrl: null,
      };
    }

    const token = await getAccessToken();
    const cfg = getConfig();

    // POST /api/v1/accounts/create
    // Minimal required fields for a CREATED account. The seller completes
    // KYB via the hosted onboarding URL (invitation_links scale_connect).
    const body: Record<string, unknown> = {
      account_details: {
        legal_entity_type: input.legalEntityType,
        ...(input.legalEntityType === 'BUSINESS'
          ? {
              business_details: {
                business_name: input.businessName || input.tenantId,
                ...(input.tradingName ? { business_name_trading: input.tradingName } : {}),
                business_address: { country_code: input.country },
                registration_address: { country_code: input.country },
                // Declare intent: marketplace seller collecting proceeds.
                account_usage: {
                  product_reference: ['COLLECT_MARKETPLACE_PROCEEDS', 'RECEIVE_TRANSFERS'],
                },
              },
            }
          : {
              individual_details: {
                residential_address: { country_code: input.country },
              },
            }),
      },
      customer_agreements: {
        agreed_to_terms_and_conditions: true,
        agreed_to_data_usage: true,
      },
      primary_contact: { email: input.email },
    };

    const res = await fetch(`${cfg.baseUrl}/api/v1/accounts/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PaymentError({
        message: `Airwallex createAccount failed (HTTP ${res.status}): ${text.slice(0, 400)}`,
        provider: PROVIDER,
        httpStatus: res.status,
        retryable: res.status >= 500,
      });
    }
    const data = (await res.json()) as { id?: string; status?: string };
    if (!data.id) {
      throw new PaymentError({
        message: 'Airwallex createAccount response missing id',
        provider: PROVIDER,
      });
    }

    // Generate hosted onboarding URL for the seller to complete KYC.
    const onboardingUrl = await this.getOnboardingUrl(
      data.id,
      input.businessName || input.tenantId,
    ).catch((err) => {
      // Non-fatal — account is created; seller can be sent to onboarding later.
      console.warn('[airwallex] getOnboardingUrl failed (non-fatal):', err);
      return null;
    });

    return {
      accountId: data.id,
      status: mapAccountStatus(data.status || 'CREATED'),
      onboardingUrl,
    };
  },

  async getAccountStatus(accountId: string): Promise<AccountStatusResult> {
    if (isDemoMode() || accountId.startsWith('acct_demo_')) {
      return {
        accountId,
        status: 'active',
        payoutsEnabled: true,
        pendingRequirements: [],
      };
    }

    const token = await getAccessToken();
    const cfg = getConfig();
    const res = await fetch(`${cfg.baseUrl}/api/v1/accounts/${accountId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PaymentError({
        message: `Airwallex getAccountStatus failed (HTTP ${res.status}): ${text.slice(0, 300)}`,
        provider: PROVIDER,
        httpStatus: res.status,
        retryable: res.status >= 500,
      });
    }
    const data = (await res.json()) as {
      id: string;
      status: string;
      requirements?: { pending_fields?: string[] };
    };
    const status = mapAccountStatus(data.status);
    const pendingRequirements = data.requirements?.pending_fields || [];
    return {
      accountId: data.id,
      status,
      payoutsEnabled: status === 'active' && pendingRequirements.length === 0,
      pendingRequirements,
    };
  },

  async getOnboardingUrl(accountId: string, returnUrl: string): Promise<string> {
    if (isDemoMode() || accountId.startsWith('acct_demo_')) {
      // Demo mode: return a fake URL that just redirects back to the app.
      return `${returnUrl}?payments_demo=onboarding`;
    }

    const token = await getAccessToken();
    const cfg = getConfig();

    // POST /api/v1/accounts/invitation_links/create with mode: scale_connect
    // This generates a hosted onboarding URL the seller visits to complete KYB.
    const res = await fetch(`${cfg.baseUrl}/api/v1/accounts/invitation_links/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        mode: 'scale_connect',
        account_id: accountId,
        scale_connect: {
          redirect_uri: returnUrl,
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PaymentError({
        message: `Airwallex invitation_links create failed (HTTP ${res.status}): ${text.slice(0, 300)}`,
        provider: PROVIDER,
        httpStatus: res.status,
        retryable: res.status >= 500,
      });
    }
    const data = (await res.json()) as { url?: string };
    if (!data.url) {
      throw new PaymentError({
        message: 'Airwallex invitation_links response missing url',
        provider: PROVIDER,
      });
    }
    return data.url;
  },

  // ── Payments ────────────────────────────────────────────────────────────

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!input.connectedAccountId || input.connectedAccountId.startsWith('acct_demo_')) {
      // Demo mode OR demo account — return a mock intent so the booking flow
      // can proceed. The webhook handler will simulate success for these.
      const mockPaymentId = mockId('int_');
      return {
        paymentId: mockPaymentId,
        clientSecret: `${mockPaymentId}_secret_demo`,
        status: 'requires_payment_method',
      };
    }

    const token = await getAccessToken();
    const cfg = getConfig();
    const requestId = `fieseros_${input.marketplaceTransactionId}_${Date.now()}`;

    // POST /api/v1/pa/payment_intents/create
    const body: Record<string, unknown> = {
      request_id: requestId,
      amount: toAirwallexAmount(input.amount),
      currency: input.currency.toUpperCase(),
      merchant_order_id: input.marketplaceTransactionId,
      connected_account_id: input.connectedAccountId,
      metadata: input.metadata || {},
    };
    if (input.returnUrl) body.return_url = input.returnUrl;

    const res = await fetch(`${cfg.baseUrl}/api/v1/pa/payment_intents/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PaymentError({
        message: `Airwallex createPaymentIntent failed (HTTP ${res.status}): ${text.slice(0, 400)}`,
        provider: PROVIDER,
        httpStatus: res.status,
        retryable: res.status >= 500,
      });
    }
    const data = (await res.json()) as {
      id?: string;
      client_secret?: string;
      status?: string;
    };
    if (!data.id || !data.client_secret) {
      throw new PaymentError({
        message: 'Airwallex payment_intent create response missing id/client_secret',
        provider: PROVIDER,
      });
    }
    return {
      paymentId: data.id,
      clientSecret: data.client_secret,
      status: mapPaymentStatus(data.status || 'REQUIRES_PAYMENT_METHOD'),
    };
  },

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    if (paymentId.startsWith('int_demo_')) {
      return 'succeeded'; // demo mode simulates success
    }

    const token = await getAccessToken();
    const cfg = getConfig();
    const res = await fetch(`${cfg.baseUrl}/api/v1/pa/payment_intents/${paymentId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PaymentError({
        message: `Airwallex getPaymentStatus failed (HTTP ${res.status}): ${text.slice(0, 300)}`,
        provider: PROVIDER,
        httpStatus: res.status,
        retryable: res.status >= 500,
      });
    }
    const data = (await res.json()) as { status?: string };
    return mapPaymentStatus(data.status || 'REQUIRES_PAYMENT_METHOD');
  },

  // ── Funds split (the marketplace escrow primitive) ─────────────────────────

  async createFundsSplit(input: CreateFundsSplitInput): Promise<CreateFundsSplitResult> {
    if (input.sourcePaymentId.startsWith('int_demo_')) {
      return {
        fundsSplitId: mockId('fs_'),
        status: 'created',
      };
    }

    const token = await getAccessToken();
    const cfg = getConfig();
    const requestId = `fieseros_split_${input.sourcePaymentId}_${Date.now()}`;

    // POST /api/v1/pa/funds_splits/create
    // auto_release: false → funds held in platform wallet until releaseFundsSplit() called.
    const res = await fetch(`${cfg.baseUrl}/api/v1/pa/funds_splits/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        request_id: requestId,
        source_id: input.sourcePaymentId,
        source_type: 'PAYMENT_INTENT',
        amount: toAirwallexAmount(input.amount),
        currency: input.currency.toUpperCase(),
        destination: input.destinationAccountId,
        auto_release: input.autoRelease ?? false,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PaymentError({
        message: `Airwallex funds_splits create failed (HTTP ${res.status}): ${text.slice(0, 400)}`,
        provider: PROVIDER,
        httpStatus: res.status,
        retryable: res.status >= 500,
      });
    }
    const data = (await res.json()) as { id?: string; status?: string };
    if (!data.id) {
      throw new PaymentError({
        message: 'Airwallex funds_splits create response missing id',
        provider: PROVIDER,
      });
    }
    const statusRaw = (data.status || 'CREATED').toLowerCase();
    const status: CreateFundsSplitResult['status'] =
      statusRaw === 'released' ? 'released' :
      statusRaw === 'settled' ? 'settled' :
      statusRaw === 'failed' ? 'failed' : 'created';
    return { fundsSplitId: data.id, status };
  },

  async releaseFundsSplit(fundsSplitId: string): Promise<ReleaseFundsSplitResult> {
    if (fundsSplitId.startsWith('fs_demo_')) {
      return { fundsSplitId, status: 'released' };
    }

    const token = await getAccessToken();
    const cfg = getConfig();

    // POST /api/v1/pa/funds_splits/{id}/release
    const res = await fetch(`${cfg.baseUrl}/api/v1/pa/funds_splits/${fundsSplitId}/release`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PaymentError({
        message: `Airwallex funds_splits release failed (HTTP ${res.status}): ${text.slice(0, 300)}`,
        provider: PROVIDER,
        httpStatus: res.status,
        retryable: res.status >= 500,
      });
    }
    const data = (await res.json()) as { id?: string; status?: string };
    const statusRaw = (data.status || 'RELEASED').toLowerCase();
    const status: ReleaseFundsSplitResult['status'] =
      statusRaw === 'settled' ? 'settled' :
      statusRaw === 'failed' ? 'failed' : 'released';
    return { fundsSplitId: data.id || fundsSplitId, status };
  },

  // ── Payouts ─────────────────────────────────────────────────────────────

  async createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult> {
    if (input.destinationAccountId.startsWith('acct_demo_')) {
      return {
        payoutId: mockId('cat_'), // connected_account_transfer id
        status: 'settled', // demo: instant settle
      };
    }

    const token = await getAccessToken();
    const cfg = getConfig();

    // POST /api/v1/connected_account_transfers/create
    // This is the intra-Airwallex instant transfer from platform wallet → seller wallet.
    const res = await fetch(`${cfg.baseUrl}/api/v1/connected_account_transfers/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        request_id: input.requestId,
        amount: String(toAirwallexAmount(input.amount)),
        currency: input.currency.toUpperCase(),
        destination: input.destinationAccountId,
        reason: 'professional_business_services', // closest match for marketplace service payments
        reference: input.reference.slice(0, 140),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PaymentError({
        message: `Airwallex connected_account_transfers create failed (HTTP ${res.status}): ${text.slice(0, 400)}`,
        provider: PROVIDER,
        httpStatus: res.status,
        retryable: res.status >= 500,
      });
    }
    const data = (await res.json()) as { id?: string; status?: string };
    if (!data.id) {
      throw new PaymentError({
        message: 'Airwallex connected_account_transfer response missing id',
        provider: PROVIDER,
      });
    }
    return {
      payoutId: data.id,
      status: mapPayoutStatus(data.status || 'NEW'),
    };
  },

  async getPayoutStatus(payoutId: string): Promise<PayoutStatus> {
    if (payoutId.startsWith('cat_demo_')) {
      return 'settled';
    }

    const token = await getAccessToken();
    const cfg = getConfig();
    const res = await fetch(`${cfg.baseUrl}/api/v1/connected_account_transfers/${payoutId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PaymentError({
        message: `Airwallex getTransferStatus failed (HTTP ${res.status}): ${text.slice(0, 300)}`,
        provider: PROVIDER,
        httpStatus: res.status,
        retryable: res.status >= 500,
      });
    }
    const data = (await res.json()) as { status?: string };
    return mapPayoutStatus(data.status || 'NEW');
  },

  // ── Refunds ──────────────────────────────────────────────────────────────

  async createRefund(input: CreateRefundInput): Promise<CreateRefundResult> {
    if (input.paymentId.startsWith('int_demo_')) {
      return {
        refundId: mockId('rfd_'),
        status: 'succeeded',
      };
    }

    const token = await getAccessToken();
    const cfg = getConfig();
    const requestId = `fieseros_refund_${input.paymentId}_${Date.now()}`;

    // POST /api/v1/pa/refunds/create
    const res = await fetch(`${cfg.baseUrl}/api/v1/pa/refunds/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        request_id: requestId,
        payment_intent_id: input.paymentId,
        amount: toAirwallexAmount(input.amount),
        currency: input.currency.toUpperCase(),
        ...(input.reason ? { reason: input.reason } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PaymentError({
        message: `Airwallex refunds create failed (HTTP ${res.status}): ${text.slice(0, 400)}`,
        provider: PROVIDER,
        httpStatus: res.status,
        retryable: res.status >= 500,
      });
    }
    const data = (await res.json()) as { id?: string; status?: string };
    if (!data.id) {
      throw new PaymentError({
        message: 'Airwallex refund response missing id',
        provider: PROVIDER,
      });
    }
    const statusRaw = (data.status || 'SUCCEEDED').toUpperCase();
    const status: CreateRefundResult['status'] =
      statusRaw === 'SUCCEEDED' ? 'succeeded' :
      statusRaw === 'FAILED' ? 'failed' :
      'pending';
    return { refundId: data.id, status };
  },

  // ── Webhook verification ──────────────────────────────────────────────────

  async verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookVerifyResult> {
    const cfg = getConfig();
    const timestamp = headers['x-timestamp'];
    const signature = headers['x-signature'];

    if (!timestamp || !signature) {
      return { verified: false, error: 'Missing x-timestamp or x-signature header' };
    }

    // Demo mode (no webhook secret configured): accept all webhooks.
    // Useful for local dev testing. Production MUST set AIRWALLEX_WEBHOOK_SECRET.
    if (!cfg.webhookSecret) {
      if (cfg.configured) {
        console.warn('[airwallex] AIRWALLEX_WEBHOOK_SECRET not set — accepting webhook without verification (dev only!)');
      }
      try {
        const event = parseWebhookEvent(rawBody);
        return { verified: true, event };
      } catch (err) {
        return { verified: false, error: `Failed to parse webhook body: ${err}` };
      }
    }

    // Verify HMAC-SHA256 over (timestamp + raw body) with webhook secret.
    const expected = crypto
      .createHmac('sha256', cfg.webhookSecret)
      .update(timestamp + rawBody)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks.
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { verified: false, error: 'Signature mismatch' };
    }

    try {
      const event = parseWebhookEvent(rawBody);
      return { verified: true, event };
    } catch (err) {
      return { verified: false, error: `Failed to parse webhook body: ${err}` };
    }
  },
};

// ── Webhook body parser ──────────────────────────────────────────────────────

/**
 * Parse the Airwallex webhook JSON body into a NormalisedWebhookEvent.
 *
 * Airwallex webhook body shape:
 *   {
 *     "id": "evt_...",          ← event id (for idempotency/dedup)
 *     "name": "payment_intent.succeeded",
 *     "account_id": "acct_...",
 *     "data": {
 *       "object": { ... }       ← the resource (payment_intent, payout, etc.)
 *     },
 *     "created_at": "..."
 *   }
 */
function parseWebhookEvent(rawBody: string): NormalisedWebhookEvent {
  const body = JSON.parse(rawBody) as {
    id?: string;
    name?: string;
    account_id?: string;
    data?: { object?: Record<string, unknown> };
  };

  const eventName = body.name || 'unknown';
  const obj = body.data?.object || {};
  const eventId = body.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Extract provider IDs from the data.object based on event type.
  const paymentId = (obj.id as string | undefined) || undefined;
  const accountId = body.account_id || (obj.account_id as string | undefined);
  const payoutId = (obj.id as string | undefined) || undefined;
  const fundsSplitId = (obj.id as string | undefined) || undefined;
  const amount = typeof obj.amount === 'number' ? obj.amount : undefined;
  const currency = (obj.currency as string | undefined) || undefined;
  const reason =
    (obj.failure_reason as string | undefined) ||
    (obj.reason as string | undefined) ||
    (typeof obj.failure_reasons === 'object' && obj.failure_reasons && Array.isArray(obj.failure_reasons)
      ? JSON.stringify(obj.failure_reasons)
      : undefined);

  return {
    eventId,
    provider: PROVIDER,
    type: mapWebhookEventType(eventName),
    paymentId,
    accountId,
    payoutId,
    fundsSplitId,
    amount,
    currency,
    reason,
    raw: body as Record<string, unknown>,
  };
}
