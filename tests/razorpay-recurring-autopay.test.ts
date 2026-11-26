import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  tenant: {
    id: 'tenant-autopay',
    name: 'Test AutoPay Tenant',
    plan: 'starter',
    planStatus: 'trial',
    trialEndsAt: new Date(Date.now() + 3 * 86400_000),
    planEndsAt: null as Date | null,
    country: 'IN',
    settingsJson: '{}',
  },
  sub: null as any,
  prodSub: null as any,
  billingEvents: [] as any[],
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => ({
    id: 'user-autopay',
    email: 'owner@example.com',
    tenantId: state.tenant.id,
    role: 'owner',
  })),
  getProductAppUrl: vi.fn(() => 'https://bgos.site'),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => state.tenant),
      update: vi.fn(async ({ data }: any) => {
        Object.assign(state.tenant, data);
        return state.tenant;
      }),
    },
    subscription: {
      findFirst: vi.fn(async () => state.sub),
      findMany: vi.fn(async () => (state.sub ? [state.sub] : [])),
      create: vi.fn(async ({ data }: any) => {
        state.sub = { id: 'sub-row-1', ...data };
        return state.sub;
      }),
      update: vi.fn(async ({ data }: any) => {
        state.sub = { ...(state.sub || { id: 'sub-row-1' }), ...data };
        return state.sub;
      }),
    },
    productWorkspace: {
      findMany: vi.fn(async () => [{ workspaceId: 'ws-autopay', tenantId: state.tenant.id, product: 'bgos' }]),
      findFirst: vi.fn(async () => ({ workspaceId: 'ws-autopay', tenantId: state.tenant.id, product: 'bgos' })),
    },
    productSubscription: {
      findUnique: vi.fn(async () => state.prodSub),
      findFirst: vi.fn(async () => state.prodSub),
      findMany: vi.fn(async () => (state.prodSub ? [state.prodSub] : [])),
      create: vi.fn(async ({ data }: any) => {
        state.prodSub = { ...data };
        return state.prodSub;
      }),
      update: vi.fn(async ({ data }: any) => {
        state.prodSub = { ...(state.prodSub || {}), ...data };
        return state.prodSub;
      }),
    },
    billingEvent: {
      create: vi.fn(async ({ data }: any) => {
        state.billingEvents.push(data);
        return data;
      }),
    },
  },
}));

vi.mock('@/lib/billing-events', () => ({
  logBillingEvent: vi.fn(async (ev: any) => {
    state.billingEvents.push(ev);
  }),
}));

describe('Razorpay Monthly & Yearly Recurring Auto-Pay', () => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_123456';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_unit_key';
    process.env.RAZORPAY_KEY_SECRET = keySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = keySecret;
    state.tenant.plan = 'starter';
    state.tenant.planStatus = 'trial';
    state.tenant.planEndsAt = null;
    state.tenant.settingsJson = '{}';
    state.sub = null;
    state.prodSub = null;
    state.billingEvents = [];
  });

  it('creates Razorpay plans and recurring subscriptions for monthly and yearly auto-pay', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/v1/plans') && (!init?.method || init.method === 'GET')) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }
      if (urlStr.includes('/v1/plans') && init?.method === 'POST') {
        const body = JSON.parse(init.body);
        return new Response(
          JSON.stringify({ id: `plan_${body.period}_123`, period: body.period, item: body.item }),
          { status: 200 },
        );
      }
      if (urlStr.includes('/v1/subscriptions') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            id: 'sub_recurring_999',
            short_url: 'https://rzp.io/i/sub999',
            status: 'created',
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    const { createRazorpaySubscription } = await import('@/lib/razorpay-subscriptions');
    const sub = await createRazorpaySubscription({
      keyId: 'rzp_test_unit_key',
      keySecret,
      planCode: 'growth',
      planName: 'Growth',
      billingCycle: 'yearly',
      amountPaise: 1499000,
      tenantId: state.tenant.id,
    });

    expect(sub.subscriptionId).toBe('sub_recurring_999');
    expect(sub.shortUrl).toBe('https://rzp.io/i/sub999');
    expect(sub.planId).toBe('plan_yearly_123');
    fetchSpy.mockRestore();
  });

  it('verifies subscription payment signature (payment_id|subscription_id) and activates auto-pay entitlement', async () => {
    const subscriptionId = 'sub_live_abc123';
    const paymentId = 'pay_live_xyz789';
    const signature = crypto
      .createHmac('sha256', keySecret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest('hex');

    const { POST: verifyPayment } = await import('@/app/api/verify-payment/route');
    const req = new NextRequest('http://localhost:3000/api/verify-payment', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_subscription_id: subscriptionId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        planCode: 'starter',
        billingCycle: 'monthly',
      }),
    });

    const res = await verifyPayment(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.subscription_id).toBe(subscriptionId);
    expect(data.planActivated).toBe(true);
    expect(state.tenant.planStatus).toBe('active');
    expect(state.sub?.paypalSubscriptionId).toBe(subscriptionId);
    expect(state.prodSub?.providerSubscriptionId).toBe(subscriptionId);
  });

  it('handles subscription.charged webhook to renew monthly subscription and subscription.cancelled to stop auto-pay', async () => {
    const subId = 'sub_webhook_777';
    const chargedPayload = JSON.stringify({
      event: 'subscription.charged',
      payload: {
        subscription: {
          entity: {
            id: subId,
            notes: {
              tenantId: state.tenant.id,
              planCode: 'growth',
              billingCycle: 'monthly',
              platform: 'bgos',
            },
          },
        },
        payment: {
          entity: {
            id: 'pay_auto_1',
            order_id: 'order_auto_1',
            amount: 149900,
            currency: 'INR',
            email: 'owner@example.com',
          },
        },
      },
    });

    const chargedSig = crypto.createHmac('sha256', keySecret).update(chargedPayload).digest('hex');
    const { POST: webhookHandler } = await import('@/app/api/payments/webhook/razorpay/route');
    const chargedRes = await webhookHandler(
      new NextRequest('http://localhost:3000/api/payments/webhook/razorpay', {
        method: 'POST',
        headers: { 'x-razorpay-signature': chargedSig },
        body: chargedPayload,
      }),
    );

    expect(chargedRes.status).toBe(200);
    const chargedJson = await chargedRes.json();
    expect(chargedJson.activated).toBe(true);
    expect(state.tenant.plan).toBe('growth');
    expect(state.tenant.planStatus).toBe('active');
    expect(state.prodSub?.providerSubscriptionId).toBe(subId);

    const cancelPayload = JSON.stringify({
      event: 'subscription.cancelled',
      payload: {
        subscription: {
          entity: {
            id: subId,
            notes: { tenantId: state.tenant.id },
          },
        },
      },
    });
    const cancelSig = crypto.createHmac('sha256', keySecret).update(cancelPayload).digest('hex');
    const cancelRes = await webhookHandler(
      new NextRequest('http://localhost:3000/api/payments/webhook/razorpay', {
        method: 'POST',
        headers: { 'x-razorpay-signature': cancelSig },
        body: cancelPayload,
      }),
    );
    expect(cancelRes.status).toBe(200);
    expect(state.tenant.planStatus).toBe('cancelled');
  });
});
