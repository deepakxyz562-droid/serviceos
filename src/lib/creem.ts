/**
 * Creem payment integration library.
 *
 * Creem is a merchant-of-record platform (similar to Paddle / Lemon Squeezy /
 * Stripe Checkout). This module wraps the small slice of the Creem REST API we
 * need to power subscription billing as a PayPal fallback:
 *
 *   - Read credentials from the `RevenueFeatureToggle` table (featureKey =
 *     `'creem_billing'`) so the superadmin can configure Creem from the admin
 *     panel without editing `.env`.
 *   - Create a hosted Checkout Session (returns a `checkout_url` the client
 *     redirects to).
 *   - Verify webhook signatures so the webhook route can trust incoming
 *     events.
 *
 * ── Credentials storage ────────────────────────────────────────────────────
 * The `RevenueFeatureToggle.configJson` field stores:
 *   {
 *     "apiKey": "creem_xxx",
 *     "webhookSecret": "whsec_xxx",
 *     "testMode": true,
 *     "products": {                       // optional — map plan code → Creem product_id
 *       "growth":   { "monthly": "prod_xxx", "yearly": "prod_yyy" },
 *       "business": { "monthly": "prod_aaa", "yearly": "prod_bbb" }
 *     }
 *   }
 * If `products` is absent for a plan/cycle, `createCreemCheckoutSession`
 * falls back to an ad-hoc checkout (passing `unit_price` / `currency` /
 * `product_name` inline) — this is the standard merchant-of-record pattern
 * supported by Creem when you don't want to pre-create a product for every
 * price point.
 *
 * ── API assumptions (Creem docs were not fetchable in this sandbox) ────────
 *   Base URL:        https://api.creem.io
 *   Auth header:     x-api-key: <apiKey>
 *   Create session:  POST /v1/checkout/sessions
 *   List products:   GET  /v1/products   (used by the "Test Connection" button)
 *   Webhook header:  creem-signature: <hex HMAC-SHA256 of raw body>
 *   Webhook events:  checkout.session.completed, subscription.active,
 *                    subscription.canceled, subscription.updated
 *   Payload shape:   { event_type, object: { id, metadata, ... } }
 *                    (Creem may also send `{ type, data: { object } }` —
 *                     the webhook route normalises both shapes.)
 *
 * These assumptions follow the Stripe / Paddle merchant-of-record convention.
 * If the live Creem API differs, adjust the request/response handling here —
 * the rest of the app (API routes, UI) does not depend on the wire format.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { getPlanByCode } from '@/lib/billing-seed';
import { logger } from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreemConfig {
  apiKey: string;
  webhookSecret: string;
  testMode: boolean;
  /** Optional map: planCode → { monthly, yearly } Creem product IDs. */
  products?: Record<string, { monthly?: string; yearly?: string }>;
}

export interface CreateCreemCheckoutInput {
  planCode: string;
  billingCycle: 'monthly' | 'yearly';
  tenantId: string;
  userEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCreemCheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CREEM_FEATURE_KEY = 'creem_billing';
const CREEM_BASE_URL = 'https://api.creem.io';
const CREEM_TEST_BASE_URL = 'https://test-api.creem.io';

// ─── Config resolution ───────────────────────────────────────────────────────

/**
 * Load the Creem config from the `RevenueFeatureToggle` table.
 * Returns `null` if not configured (no row, no API key, or globally disabled).
 */
export async function getCreemConfig(): Promise<CreemConfig | null> {
  try {
    const toggle = await db.revenueFeatureToggle.findUnique({
      where: { featureKey: CREEM_FEATURE_KEY },
    });
    if (!toggle) return null;
    // The `enabled` flag is the master on/off. If the superadmin has
    // disabled the toggle, treat Creem as "not configured" so the billing
    // UI falls through to the next available payment method.
    if (!toggle.enabled) return null;

    let parsed: Record<string, unknown> = {};
    try {
      parsed = toggle.configJson ? JSON.parse(toggle.configJson) : {};
    } catch {
      parsed = {};
    }

    const apiKey = (parsed.apiKey as string) || '';
    const webhookSecret = (parsed.webhookSecret as string) || '';
    if (!apiKey) return null;

    return {
      apiKey,
      webhookSecret,
      testMode: parsed.testMode === true,
      products: (parsed.products as CreemConfig['products']) || undefined,
    };
  } catch (err) {
    logger.error({ err }, '[creem] getCreemConfig failed');
    return null;
  }
}

/** True if a usable Creem API key is configured (and the toggle is enabled). */
export async function isCreemConfigured(): Promise<boolean> {
  const cfg = await getCreemConfig();
  return !!cfg && !!cfg.apiKey;
}

/**
 * Base URL — Creem isolates test and production by host AND key. Test keys
 * (creem_test_*) only work with test-api.creem.io; production keys only work
 * with api.creem.io. Select the host from the key prefix so the superadmin
 * never has to pick a host manually.
 */
function getBaseUrl(apiKey?: string): string {
  if (apiKey && apiKey.startsWith('creem_test_')) {
    return CREEM_TEST_BASE_URL;
  }
  return CREEM_BASE_URL;
}

// ─── Checkout session ────────────────────────────────────────────────────────

/**
 * Create a Creem hosted Checkout Session for a plan + billing cycle.
 *
 * Behaviour:
 *   1. Look up the plan from the DB catalog (to get the price + currency).
 *   2. If `config.products[planCode][cycle]` is set, send `product_id` to
 *      Creem (preferred path — the product/price is pre-created in the
 *      Creem dashboard so currency + tax are handled by Creem).
 *   3. Otherwise send an ad-hoc checkout with `unit_price` + `currency` +
 *      `product_name` inline (the standard merchant-of-record fallback).
 *   4. Embed `tenantId`, `planCode`, `billingCycle` in `metadata` so the
 *      webhook can match the payment back to the tenant.
 *   5. Return `{ checkoutUrl, sessionId }`.
 */
export async function createCreemCheckoutSession(
  input: CreateCreemCheckoutInput
): Promise<CreateCreemCheckoutResult> {
  const cfg = await getCreemConfig();
  if (!cfg) {
    throw new Error('Creem is not configured. Ask the platform admin to add a Creem API key.');
  }

  const plan = await getPlanByCode(input.planCode);
  if (!plan) {
    throw new Error(`Plan "${input.planCode}" not found in the plan catalog.`);
  }

  const cycle = input.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const amount = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  if (amount <= 0) {
    throw new Error('Free plans do not require a Creem checkout session.');
  }

  // Creem requires a pre-created product for every checkout — there is NO
  // ad-hoc / inline-pricing mode. The superadmin must map each plan × cycle
  // to a Creem product_id in the admin panel (stored in config.products).
  const productId = cfg.products?.[input.planCode]?.[cycle];
  if (!productId) {
    throw new Error(
      `No Creem product_id mapped for plan "${input.planCode}" (${cycle}). ` +
        `Ask the platform admin to map this plan in the Creem billing settings.`
    );
  }

  // ── Build the POST /v1/checkouts request body (verified against Creem docs) ──
  // Required:  product_id, success_url
  // Optional:  request_id (idempotency/ref), customer { email }, metadata
  // NOT supported by Creem:  cancel_url, customer_email (flat), unit_price,
  //   currency, product_name, billing_type (ad-hoc pricing)
  const body: Record<string, unknown> = {
    product_id: productId,
    success_url: input.successUrl,
    // request_id surfaces in the success-URL query params + webhook payload,
    // making it easy to correlate a checkout back to this tenant+plan.
    request_id: `co_${input.tenantId}_${input.planCode}_${cycle}_${Date.now()}`,
    // Embed matching metadata so the webhook can resolve the tenant + plan.
    metadata: {
      tenantId: input.tenantId,
      planCode: input.planCode,
      billingCycle: cycle,
      source: 'serviceos-billing',
    },
  };

  // Creem expects the customer email as a nested object, NOT a flat field.
  if (input.userEmail) {
    body.customer = { email: input.userEmail };
  }

  // NOTE: input.cancelUrl is intentionally NOT sent — Creem has no cancel_url
  // field. Sending it would trigger a 400 "property cancel_url should not exist".

  const res = await fetch(`${getBaseUrl(cfg.apiKey)}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    // Don't let a hung Creem API block the request indefinitely.
    signal: AbortSignal.timeout(15_000),
  });

  const rawText = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = rawText ? JSON.parse(rawText) : {};
  } catch {
    /* keep rawText for the error message */
  }

  if (!res.ok) {
    // Creem's `message` field can be a string OR an array of validation
    // errors (e.g. ["product_id must be a string"]). Handle both.
    const msgField = json.message;
    const message =
      (typeof msgField === 'string' && msgField) ||
      (Array.isArray(msgField) && msgField.join('; ')) ||
      (json.error as string | undefined) ||
      rawText.slice(0, 300) ||
      `Creem API returned HTTP ${res.status}`;
    throw new Error(`Failed to create Creem checkout session: ${message}`);
  }

  // Creem returns either `checkout_url` (snake_case) or `checkoutUrl`
  // (camelCase) depending on the API version. Accept both.
  const checkoutUrl =
    (json.checkout_url as string | undefined) ||
    (json.checkoutUrl as string | undefined) ||
    (json.url as string | undefined);
  const sessionId =
    (json.id as string | undefined) ||
    (json.session_id as string | undefined) ||
    (json.sessionId as string | undefined) ||
    '';

  if (!checkoutUrl) {
    throw new Error(
      `Creem checkout response did not include a checkout_url (HTTP ${res.status}).`
    );
  }

  return { checkoutUrl, sessionId };
}

// ─── Webhook signature verification ──────────────────────────────────────────

/**
 * Verify a Creem webhook signature.
 *
 * Creem signs the raw request body with HMAC-SHA256 using the webhook
 * secret and sends the hex digest in the `creem-signature` header. We
 * recompute the digest and compare it in constant time.
 *
 * Returns `false` if the secret is empty or the signatures don't match.
 */
export function verifyCreemWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string
): boolean {
  if (!secret || !signature) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  // The header may contain just the hex digest, or a Stripe-style
  // `t=...,v1=...` comma-separated payload. Handle both.
  let provided = signature.trim();
  if (provided.startsWith('t=')) {
    const parts = provided.split(',');
    const v1 = parts.find((p) => p.startsWith('v1='));
    if (!v1) return false;
    provided = v1.slice(3);
  }

  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── Test connection (used by the superadmin "Test Connection" button) ───────

export interface CreemTestConnectionResult {
  ok: boolean;
  message: string;
  productCount?: number;
  sampleProduct?: { id: string; name?: string } | null;
}

/**
 * Ping the Creem API with the configured key to verify it works.
 * Used by the superadmin "Test Connection" button so the admin can verify
 * the key works before saving. Uses a sentinel product_id fetch — a 404
 * response proves the key was authenticated (Creem only 404s after auth).
 */
export async function testCreemConnection(
  cfg: CreemConfig
): Promise<CreemTestConnectionResult> {
  try {
    // Creem has NO list-all-products endpoint. `/v1/products` is fetch-one-by-id
    // and requires `?product_id=<id>`. To verify the key works without needing
    // a real product ID, we fetch a sentinel ID and treat 404 "Product not
    // found" as SUCCESS — Creem only returns 404 AFTER auth passes, so a 404
    // proves the key was accepted. (A bad key returns 401 "API Key is missing".)
    const res = await fetch(
      `${getBaseUrl(cfg.apiKey)}/v1/products?product_id=__connection_test__`,
      {
        method: 'GET',
        headers: {
          'x-api-key': cfg.apiKey,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'Invalid API key (Creem rejected the credentials).' };
    }

    // 404 is the SUCCESS case — it proves the key was authenticated (Creem
    // only returns 404 after auth passes). There is no list-products
    // endpoint, so we can't enumerate real products to return as a sample.
    if (res.status === 404 || res.ok) {
      const env = cfg.apiKey.startsWith('creem_test_') ? 'test' : 'live';
      return {
        ok: true,
        message: `Connected successfully. API key verified (${env} mode).`,
        productCount: 0,
        sampleProduct: null,
      };
    }

    // Any other non-OK status is a real failure.
    let detail = '';
    try {
      const raw = await res.text();
      const j = raw ? JSON.parse(raw) : {};
      const msg = j.message;
      detail =
        (typeof msg === 'string' && msg) ||
        (Array.isArray(msg) && msg.join('; ')) ||
        (j.error as string | undefined) ||
        '';
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      message: detail
        ? `Creem API returned HTTP ${res.status}: ${detail}`
        : `Creem API returned HTTP ${res.status}.`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Connection failed: ${err.message}`
          : 'Connection failed (unknown error).',
    };
  }
}
