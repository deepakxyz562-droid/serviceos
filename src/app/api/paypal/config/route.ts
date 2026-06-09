import { NextResponse } from 'next/server';

/**
 * GET /api/paypal/config
 * Returns PayPal client ID for frontend (public key only, safe to expose)
 */
export async function GET() {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const isSandbox = process.env.PAYPAL_SANDBOX === 'true';

  if (!clientId) {
    return NextResponse.json({
      configured: false,
      message: 'PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your .env file.',
    });
  }

  return NextResponse.json({
    configured: true,
    clientId,
    isSandbox,
    merchantEmail: process.env.PAYPAL_MERCHANT_EMAIL || '',
  });
}
