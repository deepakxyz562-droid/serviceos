import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isPayPalConfigured } from '@/lib/paypal';

/**
 * POST /api/paypal/cancel-subscription
 * Cancels the current PayPal subscription
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: 'PayPal is not configured' },
        { status: 503 }
      );
    }

    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can manage subscriptions' }, { status: 403 });
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    // Find current active subscription
    const subscription = await db.subscription.findFirst({
      where: { tenantId, status: 'active', paymentProvider: 'paypal' },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'No active PayPal subscription found' }, { status: 404 });
    }

    // Update subscription status to cancelled
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled' },
    });

    // Downgrade tenant to starter
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        plan: 'starter',
        planStatus: 'cancelled',
      },
    });

    return NextResponse.json({ success: true, message: 'Subscription cancelled' });
  } catch (error) {
    console.error('PayPal cancel-subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
