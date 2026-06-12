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
export const PAYPAL_PLANS: Record<string, PayPalPlanConfig> = {
  starter: {
    planId: 'starter',
    name: 'Starter',
    monthlyPrice: 10,
    yearlyPrice: 100,
  },
  growth: {
    planId: 'growth',
    name: 'Growth',
    monthlyPrice: 25,
    yearlyPrice: 250,
  },
  pro: {
    planId: 'pro',
    name: 'Pro',
    monthlyPrice: 50,
    yearlyPrice: 500,
  },
};

export function getPayPalBaseUrl(): string {
  return PAYPAL_BASE;
}

export function isPayPalConfigured(): boolean {
  return !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}
