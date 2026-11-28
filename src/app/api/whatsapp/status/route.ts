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
      select: { id: true, name: true, provider: true, configJson: true },
    });

    const ownConnected = !!ownProvider;

    let ownPhoneNumber: string | null = null;
    if (ownProvider?.configJson) {
      try {
        const cfg = JSON.parse(ownProvider.configJson);
        ownPhoneNumber = cfg.displayPhoneNumber || cfg.phoneNumber || cfg.phone_number || null;
      } catch {
        /* ignore */
      }
    }

    // Check for pending tenant-owned WhatsApp provider awaiting Meta activation
    const pendingProvider = !ownConnected
      ? await db.communicationProvider.findFirst({
          where: {
            tenantId,
            type: 'whatsapp',
            status: 'pending',
            isPlatform: false,
          },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, name: true, provider: true, configJson: true },
        })
      : null;

    let pendingPhoneNumber: string | null = null;
    let pendingVerifiedName: string | null = null;
    if (pendingProvider?.configJson) {
      try {
        const cfg = JSON.parse(pendingProvider.configJson);
        pendingPhoneNumber = cfg.displayPhoneNumber || cfg.phoneNumber || null;
        pendingVerifiedName = cfg.verifiedName || null;
      } catch {
        /* ignore */
      }
    }

    // Check for a platform-managed WhatsApp provider fallback
    const platformProvider = !ownConnected && !pendingProvider ? await db.communicationProvider.findFirst({
      where: {
        type: 'whatsapp',
        status: 'active',
        sendingEnabled: true,
        isPlatform: true,
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, provider: true, configJson: true },
    }) : null;

    const hasPlatform = !!platformProvider || !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

    // WhatsApp is enabled when tenant has own provider OR platform provider is configured.
    const enabled = (isPaid && ownConnected) || hasPlatform;

    let reason = 'enabled';
    if (!enabled) {
      if (!isPaid) {
        reason = 'not_paid';
      } else if (pendingProvider) {
        reason = 'pending_activation';
      } else if (!ownConnected) {
        reason = 'own_not_connected';
      }
    }

    return NextResponse.json({
      enabled,
      reason,
      planStatus,
      isPaid,
      ownConnected,
      pendingActivation: Boolean(!ownConnected && pendingProvider),
      ownPendingProvider: pendingProvider
        ? {
            id: pendingProvider.id,
            name: pendingProvider.name,
            provider: pendingProvider.provider,
            phoneNumber: pendingPhoneNumber,
            verifiedName: pendingVerifiedName,
          }
        : null,
      ownProvider: ownConnected
        ? {
            id: ownProvider.id,
            name: ownProvider.name,
            provider: ownProvider.provider,
            phoneNumber: ownPhoneNumber,
          }
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
