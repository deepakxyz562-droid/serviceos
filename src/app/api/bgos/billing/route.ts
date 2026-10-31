import { leadUsage } from '@/lib/bgos-usage';
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getAuthUser } from '@/lib/auth';
import { resolveProductAccess } from '@/lib/product-access';
import { bgosStripe, bgosPrice, validateBgosPrice } from '@/lib/bgos-billing';
import { BGOS_PLANS, isBgosPlan } from '../../../../../shared/bgos-plans';
import { db } from '@/lib/db';
import { isCreemConfigured, createCreemCheckoutSession } from '@/lib/creem';

export async function GET() {
  const user = await getAuthUser();
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const access = await resolveProductAccess(user.id, 'bgos', user.workspaceId || undefined);
    const usedLeadCredits = await leadUsage(access.workspace.workspaceId);
    const contacts = await db.contact.count({ where: { tenantId: user.tenantId } });
    const forms = await db.form.count({ where: { tenantId: user.tenantId, status: 'active' } });

    const hasRazorpay = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    const hasCreem = await isCreemConfigured().catch(() => false);
    const hasStripe = !!(process.env.BGOS_STRIPE_SECRET_KEY && process.env.BGOS_STRIPE_WEBHOOK_SECRET);

    return NextResponse.json({
      subscription: {
        plan: access.subscription.plan,
        status: access.subscription.status,
        trialEndsAt: access.subscription.trialEndsAt,
        currentPeriodEnd: access.subscription.currentPeriodEnd,
        legacy: access.subscription.billingSource === 'legacy',
      },
      usage: {
        contacts,
        forms,
        usedLeadCredits,
        leadCreditLimit: access.subscription.plan === 'business' ? 2500 : 0,
      },
      plans: Object.entries(BGOS_PLANS).map(([code, plan]) => ({
        code,
        ...plan,
        checkoutEnabled: hasRazorpay || hasCreem || (hasStripe && !!bgosPrice(code as keyof typeof BGOS_PLANS)),
      })),
      gateways: {
        razorpay: hasRazorpay,
        creem: hasCreem,
        stripe: hasStripe,
      },
      portalEnabled: access.subscription.provider === 'stripe' && !!access.subscription.providerSubscriptionId,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Billing requires an active BGOS workspace. Complete workspace setup or contact your administrator.' }, { status: 409 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const access = await resolveProductAccess(user.id, 'bgos', user.workspaceId || undefined);
    if (!['owner','admin'].includes(access.membership.role)) return NextResponse.json({ error: 'Workspace owner access required' }, { status: 403 });
    const body = await request.json();
    const base = process.env.BGOS_PUBLIC_URL || 'https://bgos.fieseros.com';

    if (body.action === 'portal') {
      if (access.subscription.provider !== 'stripe' || !access.subscription.providerSubscriptionId) {
        return NextResponse.json({ error: 'No Stripe subscription is connected' }, { status: 409 });
      }
      const stripe = bgosStripe();
      const subscription = await stripe.subscriptions.retrieve(access.subscription.providerSubscriptionId);
      const session = await stripe.billingPortal.sessions.create({
        customer: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        return_url: `${base}/app?view=billing`,
      });
      return NextResponse.json({ url: session.url });
    }

    if (!isBgosPlan(body.plan) || body.plan === 'free') {
      return NextResponse.json({ error: 'Choose a paid BGOS plan' }, { status: 400 });
    }

    const chosenPlan = BGOS_PLANS[body.plan as keyof typeof BGOS_PLANS];

    // ── 1. Razorpay Order Creation (for Indian users · UPI, Netbanking, Cards in INR) ──
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (body.gateway === 'razorpay' || (!body.gateway && body.action !== 'activate' && keyId && keySecret)) {
      if (chosenPlan && chosenPlan.priceInr > 0) {
        const amountPaise = chosenPlan.priceInr * 100;
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt: `bgos_${body.plan}_${Date.now()}`,
            notes: {
              tenantId: user.tenantId,
              plan: body.plan,
              platform: 'bgos',
            },
          }),
        });

        const order = await orderRes.json();
        if (!orderRes.ok) {
          const errDesc = order?.error?.description || 'Razorpay order creation failed';
          return NextResponse.json({ error: errDesc }, { status: orderRes.status });
        }

        return NextResponse.json({
          gateway: 'razorpay',
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          key_id: keyId,
          plan: body.plan,
          planName: chosenPlan.name,
        });
      }
    }

    // ── 2. Creem Checkout Session (for International users · Global Cards, Apple/Google Pay in USD) ──
    if (body.gateway === 'creem') {
      const creemActive = await isCreemConfigured();
      if (creemActive) {
        const session = await createCreemCheckoutSession({
          planCode: body.plan,
          billingCycle: 'monthly',
          tenantId: user.tenantId,
          userEmail: user.email,
          successUrl: `${base}/app?view=billing&creem=success`,
          cancelUrl: `${base}/app?view=billing&creem=cancelled`,
        });
        return NextResponse.json({
          gateway: 'creem',
          url: session.checkoutUrl,
        });
      }
    }

    // ── 3. Direct in-app activation mode or fallback ──
    if (body.action === 'activate' || (!process.env.BGOS_STRIPE_WEBHOOK_SECRET && !keyId)) {
      if (chosenPlan) {
        const now = new Date();
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await db.subscription.updateMany({
          where: { tenantId: user.tenantId },
          data: {
            plan: body.plan,
            status: 'active',
            trialEndsAt: null,
            startDate: now,
            endDate: nextMonth,
          },
        });

        await db.tenant.update({
          where: { id: user.tenantId },
          data: { plan: body.plan },
        });

        return NextResponse.json({
          success: true,
          activated: true,
          plan: body.plan,
          message: `${chosenPlan.name} plan activated successfully!`,
        });
      }
    }

    // ── 4. Stripe fallback ──
    if (process.env.BGOS_STRIPE_WEBHOOK_SECRET && process.env.BGOS_STRIPE_SECRET_KEY) {
      const stripe = bgosStripe();
      const price = await validateBgosPrice(stripe, body.plan);
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        client_reference_id: access.workspace.workspaceId,
        customer_email: user.email,
        line_items: [{ price, quantity: 1 }],
        subscription_data: { metadata: { bgosWorkspaceId: access.workspace.workspaceId } },
        success_url: `${base}/app?view=billing&checkout=complete`,
        cancel_url: `${base}/app?view=billing`,
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      }, { idempotencyKey: `bgos:${access.workspace.workspaceId}:${body.plan}:${Math.floor(Date.now()/1800000)}` });
      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: 'No active payment gateway configured' }, { status: 503 });
  } catch (err: any) {
    console.error('[bgos/billing] Error:', err);
    return NextResponse.json({ error: err?.message || 'Billing could not be opened.' }, { status: 500 });
  }
}

