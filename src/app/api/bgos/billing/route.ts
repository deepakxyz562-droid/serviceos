import { leadUsage } from '@/lib/bgos-usage';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { resolveProductAccess } from '@/lib/product-access';
import { bgosStripe, bgosPrice, validateBgosPrice } from '@/lib/bgos-billing';
import { BGOS_PLANS, isBgosPlan } from '../../../../../shared/bgos-plans';
import { db } from '@/lib/db';
export async function GET() {
  const user = await getAuthUser();
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const access = await resolveProductAccess(user.id, 'bgos', user.workspaceId || undefined);
    const usedLeadCredits = await leadUsage(access.workspace.workspaceId);
    const contacts = await db.contact.count({ where: { tenantId: user.tenantId } });
    const forms = await db.form.count({ where: { tenantId: user.tenantId, status: 'active' } });
    return NextResponse.json({ subscription: { plan: access.subscription.plan, status: access.subscription.status, currentPeriodEnd: access.subscription.currentPeriodEnd, legacy: access.subscription.billingSource === 'legacy' }, usage: { contacts, forms, usedLeadCredits, leadCreditLimit: access.subscription.plan === 'business' ? 2500 : 0 }, plans: Object.entries(BGOS_PLANS).map(([code,plan]) => ({ code, ...plan, checkoutEnabled: !!process.env.BGOS_STRIPE_SECRET_KEY && !!process.env.BGOS_STRIPE_WEBHOOK_SECRET && !!bgosPrice(code as keyof typeof BGOS_PLANS) })), portalEnabled: access.subscription.provider === 'stripe' && !!access.subscription.providerSubscriptionId }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Billing requires an active BGOS workspace. Complete workspace setup or contact your administrator.' }, { status: 409 }); }
}
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const access = await resolveProductAccess(user.id, 'bgos', user.workspaceId || undefined);
    if (!['owner','admin'].includes(access.membership.role)) return NextResponse.json({ error: 'Workspace owner access required' }, { status: 403 });
    const body = await request.json();
    const stripe = bgosStripe();
    const base = process.env.BGOS_PUBLIC_URL || 'https://bgos.fieseros.com';
    if (body.action === 'portal') {
      if (access.subscription.provider !== 'stripe' || !access.subscription.providerSubscriptionId) return NextResponse.json({ error: 'No Stripe subscription is connected' }, { status: 409 });
      const subscription = await stripe.subscriptions.retrieve(access.subscription.providerSubscriptionId);
      const session = await stripe.billingPortal.sessions.create({ customer: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id, return_url: `${base}/app?view=billing` });
      return NextResponse.json({ url: session.url });
    }
    if (!isBgosPlan(body.plan) || body.plan === 'free') return NextResponse.json({ error: 'Choose a paid BGOS plan' }, { status: 400 });
    if (!process.env.BGOS_STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Billing webhook is not configured' }, { status: 503 });
    if (access.subscription.providerSubscriptionId || (access.subscription.billingSource === 'legacy' && access.subscription.plan !== 'free')) return NextResponse.json({ error: 'Manage your existing subscription before starting a new one. Contact billing support for legacy migration.' }, { status: 409 });
    const price = await validateBgosPrice(stripe, body.plan);
    const session = await stripe.checkout.sessions.create({ mode: 'subscription', client_reference_id: access.workspace.workspaceId, customer_email: user.email, line_items: [{ price, quantity: 1 }], subscription_data: { metadata: { bgosWorkspaceId: access.workspace.workspaceId } }, success_url: `${base}/app?view=billing&checkout=complete`, cancel_url: `${base}/app?view=billing`, expires_at: Math.floor(Date.now() / 1000) + 1800 }, { idempotencyKey: `bgos:${access.workspace.workspaceId}:${body.plan}:${Math.floor(Date.now()/1800000)}` });
    return NextResponse.json({ url: session.url });
  } catch { return NextResponse.json({ error: 'Billing could not be opened. Check your workspace and payment configuration.' }, { status: 503 }); }
}
