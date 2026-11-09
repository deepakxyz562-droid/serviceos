import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUser } from '@/lib/auth';
import { activateBgosSubscription } from '@/lib/bgos-entitlement';

export const dynamic = 'force-dynamic';

function timingSafeHexMatch(expected: string, received: string): boolean {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

/**
 * POST /api/verify-payment
 *
 * Verifies Razorpay Standard Checkout (`order_id|payment_id`) OR
 * Payment Link (`payment_link_id|payment_link_reference_id|payment_link_status|payment_id`)
 * HMAC-SHA256 signatures, then activates the BGOS subscription cleanly.
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
      razorpay_payment_link_id,
      razorpay_payment_link_reference_id,
      razorpay_payment_link_status,
      planCode,
      billingCycle,
    } = body;

    const isPaymentLink = Boolean(razorpay_payment_link_id);
    const allowSandbox = process.env.NODE_ENV !== 'production';
    const isSandbox =
      allowSandbox &&
      !isPaymentLink &&
      ((typeof razorpay_order_id === 'string' && razorpay_order_id.startsWith('order_sandbox_')) ||
        razorpay_signature === 'sandbox_verified');

    if (isPaymentLink) {
      if (!razorpay_payment_link_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json(
          {
            error: 'Missing required payment link verification fields',
            details: {
              razorpay_payment_link_id: !razorpay_payment_link_id ? 'Missing' : 'Present',
              razorpay_payment_id: !razorpay_payment_id ? 'Missing' : 'Present',
              razorpay_signature: !razorpay_signature ? 'Missing' : 'Present',
            },
          },
          { status: 400 }
        );
      }
      if (razorpay_payment_link_status && razorpay_payment_link_status !== 'paid') {
        return NextResponse.json(
          { success: false, error: `Payment link status is "${razorpay_payment_link_status}", not paid.` },
          { status: 400 }
        );
      }

      const text = `${razorpay_payment_link_id}|${razorpay_payment_link_reference_id ?? ''}|${razorpay_payment_link_status || 'paid'}|${razorpay_payment_id}`;
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(text)
        .digest('hex');

      if (!timingSafeHexMatch(generatedSignature, String(razorpay_signature))) {
        console.warn('[verify-payment] Payment link signature mismatch:', razorpay_payment_link_id);
        return NextResponse.json(
          { success: false, error: 'Invalid payment signature. Payment verification failed.' },
          { status: 400 }
        );
      }
    } else {
      // Standard checkout validation
      if (!razorpay_order_id || !razorpay_payment_id || (!isSandbox && !razorpay_signature)) {
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

      if (!isSandbox) {
        const text = `${razorpay_order_id}|${razorpay_payment_id}`;
        const generatedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(text)
          .digest('hex');

        if (!timingSafeHexMatch(generatedSignature, String(razorpay_signature))) {
          console.warn('[verify-payment] Signature mismatch for order:', razorpay_order_id);
          return NextResponse.json(
            { success: false, error: 'Invalid payment signature. Payment verification failed.' },
            { status: 400 }
          );
        }
      }
    }

    // Activate plan if authenticated user or Razorpay payment/order/plink notes identify tenant + plan
    let planActivated = false;
    try {
      const authUser = await getAuthUser(request).catch(() => null);
      let resolvedTenantId = authUser?.tenantId || '';
      let resolvedEmail = authUser?.email || '';
      let resolvedPlanCode = typeof planCode === 'string' ? planCode : '';
      let resolvedCycle: 'monthly' | 'yearly' = billingCycle === 'yearly' ? 'yearly' : 'monthly';

      const keyId = process.env.RAZORPAY_KEY_ID;
      if (
        (!resolvedTenantId || !resolvedPlanCode) &&
        !isSandbox &&
        keyId &&
        (isPaymentLink || Boolean(resolvedPlanCode))
      ) {
        const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
        const endpoints = [
          razorpay_payment_link_id
            ? `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(String(razorpay_payment_link_id))}`
            : null,
          razorpay_order_id
            ? `https://api.razorpay.com/v1/orders/${encodeURIComponent(String(razorpay_order_id))}`
            : null,
          razorpay_payment_id
            ? `https://api.razorpay.com/v1/payments/${encodeURIComponent(String(razorpay_payment_id))}`
            : null,
        ].filter(Boolean) as string[];

        for (const url of endpoints) {
          try {
            const lookupRes = await fetch(url, {
              headers: { Authorization: authHeader },
              signal: AbortSignal.timeout(5000),
            });
            if (!lookupRes.ok) continue;
            const entity = await lookupRes.json().catch(() => ({}));
            const notes = (entity?.notes || {}) as Record<string, string>;
            if (!resolvedTenantId && notes.tenantId) resolvedTenantId = notes.tenantId;
            if (!resolvedPlanCode && (notes.planCode || notes.plan)) {
              resolvedPlanCode = notes.planCode || notes.plan;
            }
            if (notes.billingCycle === 'yearly') resolvedCycle = 'yearly';
            if (!resolvedEmail && typeof entity?.email === 'string') {
              resolvedEmail = entity.email;
            }
            if (resolvedTenantId && resolvedPlanCode) break;
          } catch {
            // keep checking fallback endpoint
          }
        }
      }

      if (resolvedTenantId && resolvedPlanCode) {
        await activateBgosSubscription({
          tenantId: resolvedTenantId,
          planCode: resolvedPlanCode,
          provider: 'razorpay',
          billingCycle: resolvedCycle,
          currency: 'INR',
          providerOrderId: razorpay_order_id || razorpay_payment_link_id || null,
          providerPaymentId: razorpay_payment_id,
          payerEmail: resolvedEmail || null,
        });
        planActivated = true;
      }
    } catch (activationErr) {
      console.warn('[verify-payment] Plan activation warning:', activationErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id || razorpay_payment_link_id,
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
