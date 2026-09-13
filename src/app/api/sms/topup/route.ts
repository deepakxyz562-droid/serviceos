import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface SmsTopupPack {
  id: '500_sms' | '1000_sms' | '2500_sms';
  name: string;
  smsCount: number;
  price: number;
  currency: string;
  badge?: string;
  description: string;
}

export const SMS_TOPUP_PACKS: SmsTopupPack[] = [
  {
    id: '500_sms',
    name: '500 SMS Pack',
    smsCount: 500,
    price: 5.0,
    currency: 'USD',
    popular: true,
    description: 'Instant boost of 500 SMS for customer messaging, reminders & dispatch.',
  } as SmsTopupPack & { popular?: boolean },
  {
    id: '1000_sms',
    name: '1,000 SMS Pack',
    smsCount: 1000,
    price: 9.0,
    currency: 'USD',
    badge: 'Save 10%',
    description: 'Great value for busy field teams with high messaging volume.',
  },
  {
    id: '2500_sms',
    name: '2,500 SMS Pack',
    smsCount: 2500,
    price: 20.0,
    currency: 'USD',
    badge: 'Best Value · Save 20%',
    description: 'High-volume pack for multi-technician operations.',
  },
];

/**
 * GET /api/sms/topup
 * Returns available SMS top-up packs and the tenant's current SMS quota & usage.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await db.subscription.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        plan: true,
        status: true,
        smsQuota: true,
        smsUsageCount: true,
      },
    });

    const smsQuota = subscription?.smsQuota ?? 100;
    const smsUsage = subscription?.smsUsageCount ?? 0;
    const remaining = Math.max(0, smsQuota - smsUsage);

    return NextResponse.json({
      packs: SMS_TOPUP_PACKS,
      usage: {
        used: smsUsage,
        quota: smsQuota,
        remaining,
        percentUsed: smsQuota > 0 ? Math.min(100, Math.round((smsUsage / smsQuota) * 100)) : 0,
      },
    });
  } catch (err: any) {
    console.error('[SMS Top-up GET] error:', err);
    return NextResponse.json(
      { error: 'Failed to load SMS top-up options', detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sms/topup
 * Purchase an SMS top-up pack, atomically increasing the tenant's smsQuota.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { packId, paymentMethod = 'card' } = body as {
      packId?: string;
      paymentMethod?: string;
    };

    if (!packId) {
      return NextResponse.json({ error: 'packId is required' }, { status: 400 });
    }

    const pack = SMS_TOPUP_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json({ error: `Invalid packId "${packId}"` }, { status: 400 });
    }

    const subscription = await db.subscription.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found for tenant' }, { status: 404 });
    }

    // ── 1. Increment smsQuota on the tenant's subscription ───────────────
    const updatedSub = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        smsQuota: { increment: pack.smsCount },
      },
    });

    const invoiceNumber = `SMS-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // ── 2. Create a SubscriptionPayment audit row ─────────────────────────
    try {
      await db.subscriptionPayment.create({
        data: {
          tenantId: user.tenantId,
          subscriptionId: subscription.id,
          invoiceNumber,
          amount: pack.price,
          currency: pack.currency,
          status: 'paid',
          paymentMethod,
          paidAt: new Date(),
        },
      });
    } catch (payErr) {
      console.warn('[SMS Top-up] Failed to record SubscriptionPayment (non-fatal):', payErr);
    }

    // ── 3. Record a BillingEvent audit log ────────────────────────────────
    try {
      await db.billingEvent.create({
        data: {
          tenantId: user.tenantId,
          subscriptionId: subscription.id,
          type: 'addon_purchased',
          amount: pack.price,
          currency: pack.currency,
          description: `Purchased ${pack.name} (+${pack.smsCount.toLocaleString()} SMS) for $${pack.price.toFixed(2)}`,
        },
      });
    } catch (auditErr) {
      console.warn('[SMS Top-up] Failed to record BillingEvent (non-fatal):', auditErr);
    }

    // Bust Next.js cached data
    try {
      revalidatePath('/settings');
      revalidatePath('/billing');
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Successfully added ${pack.smsCount.toLocaleString()} SMS to your monthly quota!`,
      pack: {
        id: pack.id,
        name: pack.name,
        smsCount: pack.smsCount,
        price: pack.price,
      },
      newSmsQuota: updatedSub.smsQuota,
      smsUsageCount: updatedSub.smsUsageCount,
      remainingSms: Math.max(0, updatedSub.smsQuota - updatedSub.smsUsageCount),
      invoiceNumber,
    });
  } catch (err: any) {
    console.error('[SMS Top-up POST] error:', err);
    return NextResponse.json(
      { error: 'Failed to process SMS top-up', detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
