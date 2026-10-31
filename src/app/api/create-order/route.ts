import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export const dynamic = 'force-dynamic';

/**
 * POST /api/create-order
 *
 * Creates a Razorpay Order for Standard Checkout.
 * Amount must be in the smallest currency sub-unit (paise for INR).
 * Minimum amount: 100 paise (₹1.00).
 */
export async function POST(request: NextRequest) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay credentials are not configured on the server' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let amount = Number(body.amount);

    // If amount is not provided or NaN, validate
    if (isNaN(amount) || amount < 100) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum amount is 100 paise (₹1.00)' },
        { status: 400 }
      );
    }

    // Ensure amount is integer paise
    amount = Math.round(amount);

    const currency = (body.currency || 'INR').toUpperCase();
    const receipt = body.receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const notes = {
      ...(body.notes || {}),
      planCode: body.planCode || body.plan || '',
    };

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        notes,
      }),
    });

    const order = await orderRes.json();

    if (!orderRes.ok) {
      const errDescription = order?.error?.description || 'Razorpay order creation failed';
      return NextResponse.json({ error: errDescription }, { status: orderRes.status });
    }

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      receipt: order.receipt,
    });
  } catch (error: any) {
    console.error('[create-order] Error creating Razorpay order:', error);
    const statusCode = error?.statusCode || 500;
    const message = error?.error?.description || error?.message || 'Failed to create Razorpay order';
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
