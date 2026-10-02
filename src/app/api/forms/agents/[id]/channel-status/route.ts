import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getActiveSubscription } from '@/lib/addon-billing-service';
import { getActiveEntitlement, computeRemainingSeconds } from '@/lib/entitlement-service';

/**
 * GET /api/forms/agents/[id]/channel-status
 * ─────────────────────────────────────────────────────────────────────────
 * Returns the REAL connection state for every publishable channel of the
 * given agent, sourced from the platform's authoritative DB tables — NOT
 * from the free-text `FormAgent.configJson` blob.
 *
 * The Publish tab uses this response (instead of `agent.channels.*` JSON
 * fields) to render the WhatsApp / Phone / SMS / Instagram cards, so the
 * cards always reflect the tenant's actual subscription / number /
 * social-account state.
 *
 * Response shape:
 *   {
 *     whatsapp:  { connected, phoneNumber?, providerName?, reason? },
 *     phone:     { addonActive, planCode?, includedMinutes?, usedMinutes?,
 *                 remainingMinutes?, phoneNumber?, phoneNumberId?, status?, reason? },
 *     sms:       { connected, numbers: [{ id, number, displayName? }] },
 *     instagram: { connected, accountHandle?, accountName?, accountId? }
 *   }
 *
 * Auth: any authenticated tenant user. The agent must belong to the caller's
 * tenant (404 otherwise).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: agentId } = await params;

    // Verify the agent belongs to the caller's tenant.
    const agent = await db.formAgent.findFirst({
      where: { id: agentId, tenantId: authUser.tenantId },
      select: { id: true, slug: true },
    });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const tenantId = authUser.tenantId;

    // ── 1. WhatsApp ────────────────────────────────────────────────────
    // WhatsApp is BYO (tenant connects their own Meta Cloud API). A
    // CommunicationProvider row with type='whatsapp', status='active',
    // sendingEnabled=true, isPlatform=false is the source of truth.
    const waProvider = await db.communicationProvider.findFirst({
      where: {
        tenantId,
        type: 'whatsapp',
        status: 'active',
        sendingEnabled: true,
        isPlatform: false,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        provider: true,
        configJson: true,
      },
    });

    let whatsappPhoneNumber: string | null = null;
    if (waProvider) {
      try {
        const cfg = waProvider.configJson ? JSON.parse(waProvider.configJson) : {};
        whatsappPhoneNumber =
          cfg.displayPhoneNumber ||
          cfg.phone_number ||
          cfg.phoneNumber ||
          cfg.whatsappPhoneNumber ||
          null;
      } catch {
        /* ignore */
      }
    }

    const whatsapp = {
      connected: !!waProvider,
      phoneNumber: whatsappPhoneNumber,
      providerName: waProvider?.name ?? null,
      reason: waProvider ? null : 'not_connected',
    };

    // ── 2. Phone Agent (AI Receptionist addon) ─────────────────────────
    const phoneSub = await getActiveSubscription(tenantId, 'AI_RECEPTIONIST');

    let phoneNumber: string | null = null;
    let phoneNumberId: string | null = null;
    let phoneStatus: string | null = null;
    if (phoneSub) {
      const voiceNumber = await db.phoneNumber.findFirst({
        where: {
          tenantId,
          capabilities: { contains: 'voice' },
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, number: true, displayName: true, status: true },
      });
      if (voiceNumber) {
        phoneNumber = voiceNumber.number;
        phoneNumberId = voiceNumber.id;
        phoneStatus = voiceNumber.status;
      }
    }

    let includedMinutes = 0;
    let usedSeconds = 0;
    let remainingMinutes = 0;
    if (phoneSub) {
      includedMinutes = Math.floor(
        (phoneSub.addonPlan.includedSeconds || 0) / 60,
      );
      const entitlement = await getActiveEntitlement(tenantId, 'AI_RECEPTIONIST');
      if (entitlement) {
        const calc = await computeRemainingSeconds(entitlement.id);
        usedSeconds = calc.usedSeconds;
        remainingMinutes = Math.floor(calc.remainingSeconds / 60);
      }
    }

    const phone = {
      addonActive: !!phoneSub,
      planCode: phoneSub?.addonPlan.code ?? null,
      includedMinutes,
      usedMinutes: Math.floor(usedSeconds / 60),
      remainingMinutes,
      phoneNumber,
      phoneNumberId,
      status: phoneStatus,
      reason: phoneSub ? null : 'no_active_addon',
    };

    // ── 3. SMS ─────────────────────────────────────────────────────────
    const smsNumbers = await db.phoneNumber.findMany({
      where: {
        tenantId,
        capabilities: { contains: 'sms' },
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, number: true, displayName: true },
    });

    const sms = {
      connected: smsNumbers.length > 0,
      numbers: smsNumbers.map((n) => ({
        id: n.id,
        number: n.number,
        displayName: n.displayName,
      })),
    };

    // ── 4. Instagram ───────────────────────────────────────────────────
    const igAccount = await db.socialAccount.findFirst({
      where: {
        tenantId,
        platform: 'instagram',
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, accountId: true, accountName: true, metadata: true },
    });

    let igHandle: string | null = null;
    if (igAccount) {
      igHandle = igAccount.accountName || '';
      if (igAccount.metadata) {
        try {
          const meta = JSON.parse(igAccount.metadata);
          if (meta.handle) igHandle = meta.handle;
          else if (meta.username) igHandle = meta.username;
        } catch {
          /* ignore */
        }
      }
      if (igHandle && !igHandle.startsWith('@')) {
        igHandle = `@${igHandle}`;
      }
    }

    const instagram = {
      connected: !!igAccount,
      accountHandle: igHandle,
      accountName: igAccount?.accountName ?? null,
      accountId: igAccount?.accountId ?? null,
      reason: igAccount ? null : 'not_connected',
    };

    // ── 5. Messenger ───────────────────────────────────────────────────
    // Source of truth: SocialAccount(platform='facebook', isActive=true).
    // The Meta webhook routes Messenger DMs by recipient Page ID, which
    // we store as SocialAccount.accountId.
    const fbAccount = await db.socialAccount.findFirst({
      where: {
        tenantId,
        platform: 'facebook',
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, accountId: true, accountName: true, metadata: true },
    });

    const messenger = {
      connected: !!fbAccount,
      pageName: fbAccount?.accountName ?? null,
      pageId: fbAccount?.accountId ?? null,
      reason: fbAccount ? null : 'not_connected',
    };

    // ── 6. Gmail ──────────────────────────────────────────────────────
    // Source of truth: IntegrationConnection(provider='gmail', status='connected').
    const gmailConn = await db.integrationConnection.findFirst({
      where: {
        tenantId,
        provider: 'gmail',
        status: 'connected',
      },
      orderBy: { lastSyncAt: 'desc' },
      select: { id: true, name: true, configJson: true, lastSyncAt: true },
    }).catch(() => null);

    let gmailAddress: string | null = null;
    if (gmailConn?.configJson) {
      try {
        const cfg = JSON.parse(gmailConn.configJson);
        gmailAddress = cfg.gmailAddress || null;
      } catch {
        /* ignore */
      }
    }

    const gmail = {
      connected: !!gmailConn,
      emailAddress: gmailAddress,
      connectedAt: gmailConn?.lastSyncAt ?? null,
      reason: gmailConn ? null : 'not_connected',
    };

    return NextResponse.json({
      whatsapp,
      phone,
      sms,
      instagram,
      messenger,
      gmail,
    });
  } catch (error) {
    console.error('[GET /api/forms/agents/[id]/channel-status] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channel status' },
      { status: 500 },
    );
  }
}
