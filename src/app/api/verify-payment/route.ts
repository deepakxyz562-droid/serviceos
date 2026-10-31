import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/verify-payment
 *
 * Verifies Razorpay payment signature using HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET).
 * Timing-safe comparison guarantees tamper-proof verification.
 */
export async function POST(request: NextRequest) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { error: 'Razorpay secret key not configured on server' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planCode,
    } = body;

    // Missing fields validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          error: 'Missing required payment verification fields',
          details: {
            razorpay_order_id: !razorpay_order_id ? 'Missing' : 'Present',
            razorpay_payment_id: !razorpay_payment_id ? 'Missing' : 'Present',
            razorpay_signature: !razorpay_signature ? 'Missing' : 'Present',
          },
        },
        { status: 400 }
      );
    }

    // Generate expected HMAC-SHA256 signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    // Timing-safe signature comparison
    const expectedBuffer = Buffer.from(generatedSignature, 'utf8');
    const receivedBuffer = Buffer.from(razorpay_signature, 'utf8');

    const isValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isValid) {
      console.warn('[verify-payment] Signature mismatch for order:', razorpay_order_id);
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature. Payment verification failed.' },
        { status: 400 }
      );
    }

    // Activate plan if authenticated user and planCode are provided
    let planActivated = false;
    try {
      const authUser = await getAuthUser(request);
      if (authUser?.tenantId && planCode) {
        const now = new Date();
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await db.subscription.updateMany({
          where: { tenantId: authUser.tenantId },
          data: {
            plan: planCode,
            status: 'active',
            trialEndsAt: null,
            startDate: now,
            endDate: nextMonth,
          },
        });
        await db.tenant.update({
          where: { id: authUser.tenantId },
          data: { plan: planCode },
        });
        planActivated = true;
      }
    } catch {
      // Non-fatal if DB update fails or guest checkout
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      planActivated,
    });
  } catch (error: any) {
    console.error('[verify-payment] Unexpected verification error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal verification error' },
      { status: 500 }
    );
  }
}
