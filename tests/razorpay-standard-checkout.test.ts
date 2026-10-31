import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { POST as createOrderHandler } from '../src/app/api/create-order/route';
import { POST as verifyPaymentHandler } from '../src/app/api/verify-payment/route';
import { NextRequest } from 'next/server';

describe('Razorpay Standard Web Checkout Integration', () => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'QZqDYUWKVBCYi7eZUxfj4g9D';

  it('validates minimum amount >= 100 paise on order creation', async () => {
    const req = new NextRequest('http://localhost:3000/api/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount: 50 }),
    });

    const res = await createOrderHandler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Minimum amount is 100 paise');
  });

  it('successfully creates an order with Razorpay API for valid amount', async () => {
    const req = new NextRequest('http://localhost:3000/api/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount: 49900, currency: 'INR', planCode: 'starter' }),
    });

    const res = await createOrderHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.order_id).toBeDefined();
    expect(data.order_id).toMatch(/^order_/);
    expect(data.amount).toBe(49900);
    expect(data.currency).toBe('INR');
  });

  it('rejects signature verification with missing fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/verify-payment', {
      method: 'POST',
      body: JSON.stringify({ razorpay_order_id: 'order_123' }),
    });

    const res = await verifyPaymentHandler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Missing required');
  });

  it('rejects signature verification when signature is invalid / tampered', async () => {
    const req = new NextRequest('http://localhost:3000/api/verify-payment', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'invalid_tampered_signature_1234567890abcdef',
      }),
    });

    const res = await verifyPaymentHandler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid payment signature');
  });

  it('verifies payment signature successfully when HMAC-SHA256 matches', async () => {
    const orderId = 'order_test_999';
    const paymentId = 'pay_test_888';
    const validSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const req = new NextRequest('http://localhost:3000/api/verify-payment', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      }),
    });

    const res = await verifyPaymentHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Payment verified successfully');
    expect(data.payment_id).toBe(paymentId);
    expect(data.order_id).toBe(orderId);
  });

  it('creates razorpay orders for starter and growth plans with correct amounts in paise', async () => {
    // Starter: ₹499 -> 49900 paise
    const starterReq = new NextRequest('http://localhost:3000/api/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount: 49900, currency: 'INR', planCode: 'starter' }),
    });
    const starterRes = await createOrderHandler(starterReq);
    const starterData = await starterRes.json();
    expect(starterRes.status).toBe(200);
    expect(starterData.amount).toBe(49900);

    // Growth: ₹1,499 -> 149900 paise
    const growthReq = new NextRequest('http://localhost:3000/api/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount: 149900, currency: 'INR', planCode: 'growth' }),
    });
    const growthRes = await createOrderHandler(growthReq);
    const growthData = await growthRes.json();
    expect(growthRes.status).toBe(200);
    expect(growthData.amount).toBe(149900);
  });
});
