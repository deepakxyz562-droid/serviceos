import { NextResponse } from 'next/server';

/**
 * Legacy BGOS Stripe webhook route.
 * Stripe has been removed from BGOS — payments are handled exclusively
 * via Razorpay (/api/payments/webhook/razorpay) and Creem (/api/creem/webhook).
 */
export async function POST() {
  return NextResponse.json(
    { error: 'This payment webhook endpoint is deprecated.' },
    { status: 410 },
  );
}
