import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { bgosStripe, bgosPrice } from '@/lib/bgos-billing';
import { BGOS_PLANS, type BgosPlan } from '../../../../../../shared/bgos-plans';
import { db } from '@/lib/db';
export async function POST(request: NextRequest) {
  const secret = process.env.BGOS_STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  let event: Stripe.Event;
  let stripe;
  try { stripe = bgosStripe(); event = stripe.webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature') || '', secret); }
  catch { return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 }); }
  if (!['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)) return NextResponse.json({ received: true });
  try {
    // Retrieve current provider state, rather than applying an old webhook snapshot.
    const subscription = await stripe.subscriptions.retrieve((event.data.object as Stripe.Subscription).id);
    const workspaceId = subscription.metadata.bgosWorkspaceId;
    if (!workspaceId) return NextResponse.json({ received: true });
    const workspace = await db.productWorkspace.findUnique({ where: { workspaceId } });
    if (!workspace || workspace.product !== 'bgos') return NextResponse.json({ error: 'Unknown BGOS workspace' }, { status: 409 });
    const item = subscription.items.data[0];
    const plan = (Object.keys(BGOS_PLANS) as BgosPlan[]).find(code => bgosPrice(code) === item?.price.id);
    if (!plan) return NextResponse.json({ error: 'Unrecognized subscription price' }, { status: 409 });
    const previous = await db.productSubscription.findUnique({ where: { workspaceId } });
    if (previous?.providerSubscriptionId && previous.providerSubscriptionId !== subscription.id) return NextResponse.json({ error: 'Another subscription is already connected' }, { status: 409 });
    await db.productSubscription.update({ where: { workspaceId }, data: { plan, status: subscription.status === 'trialing' ? 'trial' : subscription.status === 'canceled' ? 'cancelled' : subscription.status, provider: 'stripe', providerSubscriptionId: subscription.id, billingSource: 'product', currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null, trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null } });
    return NextResponse.json({ received: true });
  } catch { return NextResponse.json({ error: 'Could not reconcile billing; retry required' }, { status: 503 }); }
}
