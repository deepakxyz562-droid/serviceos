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
 * ── API spec (verified against https://docs.creem.io/api-reference) ──────────
 *   Base URL:        https://api.creem.io (live) / https://test-api.creem.io (test)
 *                    Host is selected by key prefix: `creem_test_*` → test host.
 *   Auth header:     x-api-key: <apiKey>   (API keys start with `creem_`)
 *   Idempotency:     Idempotency-Key: <string>  (optional, recommended on writes)
 *   Create session:  POST /v1/checkouts
 *   Create product:  POST /v1/products
 *                    Body: { name, description, price (cents), currency,
 *                            billing_type: "recurring"|"onetime",
 *                            billing_period: "every-month"|"every-year"|...,
 *                            tax_mode: "inclusive"|"exclusive",
 *                            tax_category: "saas"|... }
 *                    `price` is an integer in CENTS (e.g. $29 → 2900).
 *                    Must be 0 (free) or >= 100 (>= $1.00).
 *   List products:   GET  /v1/products?product_id=<id>
 *                    (used by the "Test Connection" button — 404 proves auth OK)
 *   Webhook header:  creem-signature: <hex HMAC-SHA256 of raw body>
 *   Webhook events:  checkout.session.completed, subscription.active,
 *                    subscription.canceled, subscription.updated
 *   Payload shape:   { event_type, object: { id, metadata, ... } }
 *                    (Creem may also send `{ type, data: { object } }` —
 *                     the webhook route normalises both shapes.)
 *
 * NOTE: API keys (`creem_...`) and webhook secrets (`whsec_...`) are DIFFERENT
 * credentials. The API key authenticates outbound API calls; the webhook secret
 * verifies inbound webhook signatures. Confusing the two is the most common
 * setup mistake — the superadmin UI clarifies the distinction inline.
 */
import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
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

  // Phase 9.8: Look up the plan from BOTH the main Plan table AND the AddonPlan table.
  // This lets the same checkout function serve SaaS subscriptions AND addon purchases.
  const plan = await getPlanByCode(input.planCode);
  let monthlyPrice = 0;
  let yearlyPrice = 0;

  if (plan) {
    monthlyPrice = plan.monthlyPrice;
    yearlyPrice = plan.yearlyPrice;
  } else {
    // Try AddonPlan (AI Receptionist, AI Phone Number, etc.)
    const addonPlan = await db.addonPlan.findUnique({
      where: { code: input.planCode },
      select: { price: true, billingCycle: true },
    });
    if (addonPlan) {
      monthlyPrice = addonPlan.price;
      yearlyPrice = addonPlan.price * 12; // approximate yearly price
    } else {
      throw new Error(`Plan "${input.planCode}" not found in the plan catalog or addon catalog.`);
    }
  }

  const cycle = input.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const amount = cycle === 'yearly' ? yearlyPrice : monthlyPrice;
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
      source: 'fieseros-billing',
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

// ─── Product creation ────────────────────────────────────────────────────────

/**
 * Creem `billing_type` enum — verified against the Create Product API docs.
 * - `recurring` → a subscription that bills on a `billing_period` schedule.
 * - `onetime`   → a one-off purchase (no `billing_period` needed).
 */
export type CreemBillingType = 'recurring' | 'onetime';

/**
 * Creem `billing_period` enum — verified against the Create Product API docs.
 * Only meaningful when `billing_type` = `recurring`.
 */
export type CreemBillingPeriod =
  | 'once'
  | 'every-day'
  | 'every-month'
  | 'every-three-months'
  | 'every-six-months'
  | 'every-year';

export interface CreateCreemProductInput {
  /** Human-readable product name, e.g. "Fieseros Professional — Monthly". */
  name: string;
  /**
   * REQUIRED by the Creem API — long-form description shown in the Creem
   * dashboard. The function throws early if this is missing/empty so the
   * caller gets a clear validation message rather than an HTTP 400.
   */
  description: string;
  /**
   * Price in MAJOR currency units (e.g. `29` for $29, `0.29` for $0.29).
   * The function converts this to CENTS internally (`priceInDollars * 100`)
   * because Creem's `price` field is an integer in the smallest currency
   * unit. Free products are sent as `price: 0`.
   */
  priceInDollars: number;
  /** ISO currency code, e.g. 'USD' or 'EUR'. Sent as a TOP-LEVEL field. */
  currency: string;
  /** Creem billing_type — 'recurring' (subscription) or 'onetime' (one-off). */
  billingType: CreemBillingType;
  /**
   * Required when `billingType`='recurring'. Creem enum:
   * 'once' | 'every-day' | 'every-month' | 'every-three-months' |
   * 'every-six-months' | 'every-year'.
   */
  billingPeriod?: CreemBillingPeriod;
  /** Tax mode — default 'exclusive' (tax added on top at checkout). */
  taxMode?: 'inclusive' | 'exclusive';
  /**
   * Optional idempotency key — sent as the `Idempotency-Key` header so the
   * admin can safely retry "Create All" without creating duplicate products.
   * Defaults to a per-call UUID.
   */
  idempotencyKey?: string;
}

export interface CreateCreemProductResult {
  /** The newly-created Creem product ID (e.g. "prod_xxx"). */
  productId: string;
  /** The raw Creem API response, for debugging / logging. */
  raw: Record<string, unknown>;
}

/**
 * Create a Creem Product via `POST /v1/products`.
 *
 * Verified against the official Creem API docs
 * (https://docs.creem.io/api-reference/endpoint/create-product):
 *   - `name`, `description`, `price`, `currency`, `billing_type` are all
 *     REQUIRED top-level fields.
 *   - `price` is an INTEGER in CENTS — e.g. $29 → `2900`, $0.29 → `29`.
 *     Must be `0` (free product) or `>= 100` (>= $1.00); values 1–99 are
 *     rejected by Creem with HTTP 400.
 *   - `currency` is a TOP-LEVEL field (NOT inside a `prices[]` array).
 *     Enum: `"USD"` | `"EUR"`.
 *   - `billing_type` enum: `"recurring"` | `"onetime"`.
 *   - `billing_period` is REQUIRED when `billing_type`="recurring". Enum:
 *     `"once"` | `"every-day"` | `"every-month"` | `"every-three-months"` |
 *     `"every-six-months"` | `"every-year"`.
 *   - `tax_mode` enum: `"inclusive"` | `"exclusive"` (default `exclusive`).
 *   - `tax_category` enum: `"saas"` | `"digital-goods-service"` | `"ebooks"`.
 *     We send `"saas"` for all Fieseros products (recommended for SaaS).
 *
 * Auth: `x-api-key: <apiKey>` header. Idempotency: `Idempotency-Key: <string>`
 * header (recommended so retries don't duplicate products).
 *
 * Throws a clear Error on non-2xx with the response body included.
 */
export async function createCreemProduct(
  input: CreateCreemProductInput
): Promise<CreateCreemProductResult> {
  const cfg = await getCreemConfig();
  if (!cfg) {
    throw new Error(
      'Creem is not configured. Ask the platform admin to add a Creem API key before creating products.'
    );
  }

  // ── Validate required fields BEFORE calling Creem ───────────────────────
  // Creem's API returns a generic 400 for missing `description`, so we throw
  // a clearer error here to make debugging easier.
  if (!input.description || input.description.trim().length === 0) {
    throw new Error(
      `createCreemProduct: \`description\` is required by the Creem API and cannot be empty (product "${input.name}").`
    );
  }
  if (input.billingType === 'recurring' && !input.billingPeriod) {
    throw new Error(
      `createCreemProduct: \`billingPeriod\` is required when billingType='recurring' (product "${input.name}"). ` +
        `Use one of: every-day, every-month, every-three-months, every-six-months, every-year.`
    );
  }

  const billingType = input.billingType;
  const taxMode = input.taxMode ?? 'exclusive';
  const currency = input.currency ?? 'USD';

  // Convert price from MAJOR units (dollars) to CENTS — Creem's `price` field
  // is an integer in the smallest currency unit. e.g. $29 → 2900, $0.29 → 29.
  // Free products are sent as 0. Values 1–99 are rejected by Creem.
  const priceCents = Math.round(input.priceInDollars * 100);

  // ── Build the POST /v1/products request body (verified against docs) ────
  // Required:  name, description, price (cents), currency, billing_type
  // Optional:  billing_period (required when billing_type=recurring),
  //            tax_mode, tax_category, image_url, etc.
  const body: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    price: priceCents,
    currency,
    billing_type: billingType,
    tax_mode: taxMode,
    // Recommended for SaaS subscriptions so Creem applies the correct tax
    // rules in supported jurisdictions.
    tax_category: 'saas',
  };
  if (billingType === 'recurring') {
    body.billing_period = input.billingPeriod;
  }

  // Idempotency-Key lets the admin retry "Create All" safely without
  // creating duplicate products. Default to a per-call UUID.
  const idempotencyKey = input.idempotencyKey || randomUUID();

  const res = await fetch(`${getBaseUrl(cfg.apiKey)}/v1/products`, {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Idempotency-Key': idempotencyKey,
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
    // errors (e.g. ["name must be a string"]). Handle both.
    const msgField = json.message;
    const message =
      (typeof msgField === 'string' && msgField) ||
      (Array.isArray(msgField) && msgField.join('; ')) ||
      (json.error as string | undefined) ||
      rawText.slice(0, 300) ||
      `Creem API returned HTTP ${res.status}`;
    throw new Error(
      `Failed to create Creem product "${input.name}" (HTTP ${res.status}): ${message}`
    );
  }

  // Creem returns the product `id` at the top level (e.g. "prod_xxx"). Accept
  // a few fallback keys in case the response shape differs across versions.
  const productId =
    (json.id as string | undefined) ||
    (json.product_id as string | undefined) ||
    (json.productId as string | undefined) ||
    '';

  if (!productId) {
    throw new Error(
      `Creem create-product response did not include an id (HTTP ${res.status}). Raw: ${rawText.slice(0, 300)}`
    );
  }

  return { productId, raw: json };
}

// ─── Bulk product creation ───────────────────────────────────────────────────

export interface CreateAllProductsResult {
  created: Array<{
    /** Stable key like "growth_monthly" / "sms_number_monthly". */
    key: string;
    /** Plan code (e.g. "growth") or add-on key (e.g. "sms_number"). */
    planCode: string;
    /** "monthly" | "yearly". */
    cycle: string;
    /** Newly-created Creem product ID. */
    productId: string;
    /** Human-readable name passed to Creem. */
    name: string;
  }>;
  failed: Array<{
    key: string;
    planCode: string;
    cycle: string;
    error: string;
  }>;
}

/**
 * Create all expected Creem products in sequence:
 *   - starter     × (monthly + yearly)
 *   - growth      × (monthly + yearly)   [plan name displayed as "Professional"]
 *   - business    × (monthly + yearly)
 *   - sms_number  (monthly only — $5/month add-on)
 *
 * That's 6 plan products + 1 SMS product = up to 7 products.
 *
 * Enterprise is "Custom" pricing (monthlyPrice=0 / contact-sales) so it is
 * SKIPPED — Creem's checkout flow cannot process $0 plans, and an Enterprise
 * subscription is activated via a separate manual flow (superadmin confirmation).
 *
 * Only MAIN plans are synced (`isAddon: false`). The 3 add-on plans
 * (`ai_pro_addon`, `marketplace_featured`, `marketplace_premium`) are billed
 * via `paymentProvider='none'` in the addon-subscriptions route and have no
 * Creem checkout flow, so creating Creem products for them would waste API
 * calls for IDs that are never read.
 *
 * Phase 9.8: AI Receptionist AddonPlans (AI_RECEPTIONIST_STARTER/PRO/BUSINESS)
 * are ALSO synced — they use the SAME RevenueFeatureToggle.configJson.products
 * catalog as the SaaS plans. This function creates Creem products for all
 * active, paid AddonPlans and returns the IDs for persistence.
 *
 * This function ONLY reads the Plan catalog from the DB and calls Creem. It
 * does NOT write to the DB. The caller (admin route) is responsible for
 * persisting the returned product IDs into
 * `RevenueFeatureToggle.configJson.products`.
 *
 * Failures are COLLECTED, not thrown, so the UI can show partial success —
 * e.g. if Creem rejects one name as a duplicate, the other 6 still get
 * created and their IDs are returned.
 */
export async function createAllCreemProducts(): Promise<CreateAllProductsResult> {
  const created: CreateAllProductsResult['created'] = [];
  const failed: CreateAllProductsResult['failed'] = [];

  // Load the plan catalog. Filter `isAddon: false` so we ONLY sync the 4 main
  // plans (starter, growth/"Professional", business, enterprise), NOT the
  // 3 add-on plans (ai_pro_addon, marketplace_featured, marketplace_premium)
  // which are billed via a separate manual confirmation flow.
  const plans = await db.plan.findMany({
    where: { isActive: true, isAddon: false },
    orderBy: { sortOrder: 'asc' },
  });

  for (const plan of plans) {
    // Skip Enterprise — "Custom" pricing (monthlyPrice=0). Creem's checkout
    // cannot process $0 plans, so creating an Enterprise product would be
    // useless. The admin can still create one manually if they later add a
    // paid Enterprise tier.
    if (!plan.monthlyPrice || plan.monthlyPrice <= 0) continue;

    for (const cycle of ['monthly', 'yearly'] as const) {
      const price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
      if (!price || price <= 0) continue;

      // Map internal cycle → Creem `billing_period` enum (verified against docs).
      const billingPeriod: CreemBillingPeriod =
        cycle === 'yearly' ? 'every-year' : 'every-month';
      const cycleLabel = cycle === 'yearly' ? 'Yearly' : 'Monthly';
      const name = `Fieseros ${plan.name} — ${cycleLabel}`;
      const description =
        plan.description || `Fieseros ${plan.name} plan, ${cycle} subscription`;

      try {
        const result = await createCreemProduct({
          name,
          description,
          billingType: 'recurring',
          billingPeriod,
          priceInDollars: price,
          currency: plan.currency || 'USD',
          // Stable idempotency key per plan×cycle so retrying "Create All"
          // doesn't create duplicate products in the Creem dashboard.
          idempotencyKey: `${plan.code}-${cycle}`,
        });
        created.push({
          key: `${plan.code}_${cycle}`,
          planCode: plan.code,
          cycle,
          productId: result.productId,
          name,
        });
      } catch (err) {
        failed.push({
          key: `${plan.code}_${cycle}`,
          planCode: plan.code,
          cycle,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // ── SMS number add-on (monthly, $5) ─────────────────────────────────────
  // Mirrors the expectation in src/app/api/sms/numbers/buy/route.ts which
  // looks up cfg.products['sms_number'].monthly as the Creem product_id for
  // the dedicated-SMS-number checkout.
  const smsName = 'Fieseros Dedicated SMS Number — Monthly';
  try {
    const result = await createCreemProduct({
      name: smsName,
      description:
        'Dedicated phone number for SMS + voice. Billed monthly per number.',
      billingType: 'recurring',
      billingPeriod: 'every-month',
      priceInDollars: 5,
      currency: 'USD',
      idempotencyKey: 'sms_number-monthly',
    });
    created.push({
      key: 'sms_number_monthly',
      planCode: 'sms_number',
      cycle: 'monthly',
      productId: result.productId,
      name: smsName,
    });
  } catch (err) {
    failed.push({
      key: 'sms_number_monthly',
      planCode: 'sms_number',
      cycle: 'monthly',
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── Phase 9.8: AI Receptionist add-on plans (AddonPlan table) ─────────────
  // Create Creem products for all active, paid AddonPlans (e.g., AI Receptionist
  // Starter/Pro/Business). These are stored in RevenueFeatureToggle.configJson.products
  // under the addonPlan.code key — the SAME catalog the SaaS plans use.
  //
  // Idempotent: the idempotency key per addonPlan×cycle prevents duplicate
  // products in the Creem dashboard on repeated runs.
  const addonPlans = await db.addonPlan.findMany({
    where: {
      isActive: true,
      price: { gt: 0 }, // skip free/Enterprise-style plans
      addonProduct: { isActive: true },
    },
    include: { addonProduct: { select: { code: true, name: true } } },
    orderBy: { sortOrder: 'asc' },
  });

  for (const addon of addonPlans) {
    // Addon plans are monthly only (no yearly variant in the current schema)
    const cycle = 'monthly' as const;
    const billingPeriod: CreemBillingPeriod = 'every-month';
    const name = `Fieseros ${addon.name} — Monthly`;
    const description = addon.description || `Fieseros ${addon.name}, monthly subscription`;

    try {
      const result = await createCreemProduct({
        name,
        description,
        billingType: 'recurring',
        billingPeriod,
        priceInDollars: addon.price,
        currency: addon.currency || 'USD',
        idempotencyKey: `${addon.code}-${cycle}`,
      });
      created.push({
        key: `${addon.code}_${cycle}`,
        planCode: addon.code,
        cycle,
        productId: result.productId,
        name,
      });
    } catch (err) {
      failed.push({
        key: `${addon.code}_${cycle}`,
        planCode: addon.code,
        cycle,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { created, failed };
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
