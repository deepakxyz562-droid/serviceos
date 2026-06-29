import { NextResponse } from 'next/server';

/**
 * GET /api/paypal/config
 * Returns PayPal client ID for frontend (public key only, safe to expose)
 * and sandbox status for admin/billing UI.
 */
export async function GET() {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  const isSandbox = process.env.PAYPAL_SANDBOX === 'true';
  const configured = !!(clientId && clientSecret);

  if (!clientId) {
    return NextResponse.json({
      configured: false,
      isSandbox,
      message: 'PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your .env file.',
    });
  }

  return NextResponse.json({
    configured,
    clientId,
    isSandbox,
    merchantEmail: process.env.PAYPAL_MERCHANT_EMAIL || '',
  });
}
