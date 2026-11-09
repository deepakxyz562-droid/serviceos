import { NextResponse } from 'next/server';

/**
 * Legacy BGOS Stripe webhook route.
 * Stripe has been removed from BGOS — payments are handled exclusively
 * via Razorpay (/api/payments/webhook/razorpay) and Creem (/api/creem/webhook).
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Stripe is disabled for BGOS. Use Razorpay or Creem webhooks.' },
    { status: 410 },
  );
}
