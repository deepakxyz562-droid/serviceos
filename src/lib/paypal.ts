/**
 * PayPal API Helper Library
 * Handles authentication and API calls to PayPal REST API
 */

const PAYPAL_BASE = process.env.PAYPAL_SANDBOX === 'true'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

// Cached access token
let accessToken: string | null = null;
let tokenExpiry = 0;

export async function getPayPalAccessToken(): Promise<string> {
  // Check cache
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal token error:', error);
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Expire 1 minute early

  return accessToken!;
}

export interface PayPalPlanConfig {
  planId: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

// Plan definitions matching our SaaS tiers
// IMPORTANT: Keep in sync with billing-seed.ts and billing-view.tsx PLANS
// Yearly price = 50% off (annual total). Starter $60/yr, Growth $150/yr, Pro $300/yr.
export const PAYPAL_PLANS: Record<string, PayPalPlanConfig> = {
  starter: {
    planId: 'starter',
    name: 'Starter',
    monthlyPrice: 10,
    yearlyPrice: 60,
  },
  growth: {
    planId: 'growth',
    name: 'Growth',
    monthlyPrice: 25,
    yearlyPrice: 150,
  },
  pro: {
    planId: 'pro',
    name: 'Pro',
    monthlyPrice: 50,
    yearlyPrice: 300,
  },
};

export function getPayPalBaseUrl(): string {
  return PAYPAL_BASE;
}

export function isPayPalConfigured(): boolean {
  return !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}

// ─── PayPal Subscriptions API helpers (recurring billing) ───────────────────
// These wrap the PayPal Billing/Subscriptions REST endpoints used by the
// auto-recurring billing flow (Option B). All return parsed JSON or throw.

/**
 * Verify a PayPal webhook signature. Required before trusting ANY webhook
 * payload — otherwise an attacker could forge a "payment succeeded" event.
 *
 * Uses POST /v1/notifications/verify-webhook-signature. Requires
 * PAYPAL_WEBHOOK_ID env (the webhook ID from the PayPal dashboard).
 *
 * Returns true if the signature is valid.
 */
export async function verifyPayPalWebhookSignature(
  headers: Record<string, string>,
  body: unknown,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID || '';
  if (!webhookId) {
    // If no webhook ID is configured, fail CLOSED (reject the event). This
    // forces the operator to configure webhook verification before going live.
    // In development with no PayPal credentials at all, webhooks can't arrive
    // anyway, so this is safe.
    console.warn('[paypal] PAYPAL_WEBHOOK_ID not set — rejecting webhook');
    return false;
  }

  const token = await getPayPalAccessToken();
  const transmissionId = headers['paypal-transmission-id'] || '';
  const transmissionTime = headers['paypal-transmission-time'] || '';
  const certUrl = headers['paypal-cert-url'] || '';
  const authAlgo = headers['paypal-auth-algo'] || '';
  const transmissionSig = headers['paypal-transmission-sig'] || '';

  const res = await fetch(
    `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: body,
      }),
    },
  );

  if (!res.ok) {
    console.error('[paypal] webhook verify HTTP error:', res.status);
    return false;
  }
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}

/**
 * Fetch a subscription's current state from PayPal.
 * GET /v1/billing/subscriptions/{id}
 */
export async function getPayPalSubscription(
  subscriptionId: string,
): Promise<Record<string, unknown>> {
  const token = await getPayPalAccessToken();
  const res = await fetch(
    `${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal get-subscription failed (${res.status}): ${err}`);
  }
  return res.json();
}

/**
 * Cancel a PayPal subscription. POST /v1/billing/subscriptions/{id}/cancel
 * Stops future recurring charges. The subscription remains in PayPal's records
 * as CANCELLED.
 */
export async function cancelPayPalSubscription(
  subscriptionId: string,
  reason = 'Cancelled by user',
): Promise<boolean> {
  const token = await getPayPalAccessToken();
  const res = await fetch(
    `${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    },
  );
  // PayPal returns 204 No Content on success
  return res.status === 204 || res.ok;
}

/**
 * Suspend a PayPal subscription (e.g. on payment failure).
 * POST /v1/billing/subscriptions/{id}/suspend
 */
export async function suspendPayPalSubscription(
  subscriptionId: string,
  reason = 'Suspended due to payment failure',
): Promise<boolean> {
  const token = await getPayPalAccessToken();
  const res = await fetch(
    `${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/suspend`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    },
  );
  return res.status === 204 || res.ok;
}
