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

/** Base URL — Creem currently has a single API host; test/live is determined by the key. */
function getBaseUrl(): string {
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

  // Creem expects the amount in the smallest currency unit (cents) — this is
  // the convention used by Stripe / Paddle / Lemon Squeezy. If Creem's live
  // API expects decimal dollars instead, change this single line.
  const unitPrice = Math.round(amount * 100);
  const currency = (plan.currency || 'USD').toUpperCase();

  const productId = cfg.products?.[input.planCode]?.[cycle];

  const body: Record<string, unknown> = {
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    // Embed matching metadata so the webhook can resolve the tenant + plan.
    metadata: {
      tenantId: input.tenantId,
      planCode: input.planCode,
      billingCycle: cycle,
      source: 'serviceos-billing',
    },
  };

  if (input.userEmail) {
    body.customer_email = input.userEmail;
  }

  if (productId) {
    // Preferred path — product + price are managed in the Creem dashboard.
    body.product_id = productId;
  } else {
    // Ad-hoc checkout — pass the price inline so the superadmin does NOT have
    // to pre-create every plan × cycle combination in Creem.
    body.unit_price = unitPrice;
    body.currency = currency;
    body.product_name = `${plan.name} Plan (${cycle})`;
    body.billing_type = cycle === 'yearly' ? 'yearly' : 'monthly';
  }

  const res = await fetch(`${getBaseUrl()}/v1/checkout/sessions`, {
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
    const message =
      (json.error as string | undefined) ||
      (json.message as string | undefined) ||
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
 * Ping the Creem API with the configured key by listing products.
 * Used by the superadmin "Test Connection" button so the admin can verify
 * the key works before saving.
 */
export async function testCreemConnection(
  cfg: CreemConfig
): Promise<CreemTestConnectionResult> {
  try {
    const res = await fetch(`${getBaseUrl()}/v1/products?limit=1`, {
      method: 'GET',
      headers: {
        'x-api-key': cfg.apiKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'Invalid API key (Creem rejected the credentials).' };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Creem API returned HTTP ${res.status}.`,
      };
    }

    const raw = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      /* ignore */
    }

    // Creem may return either `{ data: [...] }` or a bare array.
    const list =
      (json.data as Array<Record<string, unknown>> | undefined) ||
      (Array.isArray(json) ? (json as Array<Record<string, unknown>>) : []);
    const sample = list[0]
      ? {
          id: String(list[0].id ?? ''),
          name: list[0].name ? String(list[0].name) : undefined,
        }
      : null;

    return {
      ok: true,
      message: 'Connected successfully.',
      productCount: list.length,
      sampleProduct: sample,
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
