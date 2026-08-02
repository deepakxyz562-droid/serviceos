import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/whatsapp/status
 *
 * Returns whether WhatsApp should be visible/enabled for the current tenant.
 *
 * Per Issue 5: The platform no longer provides WhatsApp. WhatsApp is BYO
 * (user connects their own Meta Cloud API). The WhatsApp menu item and all
 * WhatsApp UI surfaces should be HIDDEN unless BOTH of these are true:
 *
 *   1. The tenant is on a paid plan (status === 'active', NOT trial)
 *   2. The tenant has connected their own WhatsApp provider
 *      (a CommunicationProvider row with type='whatsapp', status='active',
 *       sendingEnabled=true, isPlatform=false, tenantId=current)
 *
 * If either condition is false, `enabled` is false and `reason` explains why.
 * The frontend uses this to hide the WhatsApp nav item + banner + composer.
 */
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ enabled: false, reason: 'no_tenant' });
    }

    // Fetch the latest subscription to determine plan status.
    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const planStatus = subscription?.status ?? 'trial';
    const isPaid = planStatus === 'active';

    // Check for a tenant-owned (non-platform) WhatsApp provider.
    const ownProvider = await db.communicationProvider.findFirst({
      where: {
        tenantId,
        type: 'whatsapp',
        status: 'active',
        sendingEnabled: true,
        isPlatform: false,
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, provider: true },
    });

    const ownConnected = !!ownProvider;

    // WhatsApp is enabled ONLY when paid AND own provider connected.
    const enabled = isPaid && ownConnected;

    let reason = 'enabled';
    if (!isPaid) {
      reason = 'not_paid'; // trial or other non-active status
    } else if (!ownConnected) {
      reason = 'own_not_connected';
    }

    return NextResponse.json({
      enabled,
      reason,
      planStatus,
      isPaid,
      ownConnected,
      ownProvider: ownConnected
        ? { id: ownProvider.id, name: ownProvider.name, provider: ownProvider.provider }
        : null,
    });
  } catch (error) {
    console.error('[/api/whatsapp/status] Error:', error);
    return NextResponse.json(
      { enabled: false, reason: 'error', error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
