import { db } from '@/lib/db';
import { checkWhatsAppCredits } from '@/lib/credit-management';
import { resolveAuthoritativeBgosPlanState } from '@/lib/bgos-plan-access';
import { isFeatureEnabledForPlan, resolvePlanTier } from '@/lib/plan-features';
import { sanitizePublicImageUrl } from '@/lib/bgos-business-sanitizers';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { normalizePhoneVariants, recordWhatsAppOutboundInboxMessage } from '@/lib/whatsapp/inbox-sync';

export interface LeadWhatsAppWelcomeInput {
  tenantId: string;
  workspaceId?: string | null;
  leadId: string;
  leadName?: string | null;
  leadPhone?: string | null;
  serviceType?: string | null;
}

export interface LeadWhatsAppWelcomeResult {
  sent: boolean;
  reason?: string;
  messageId?: string;
}

function parseSettings(raw?: string | null): Record<string, any> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

/**
 * Event-driven WhatsApp welcome sender fired asynchronously when a new lead joins.
 * Checks tenant opt-in (`leadAutoWelcome.enabled`), WhatsApp plan & credentials,
 * avoids duplicate welcomes within 12 hours, dispatches interactive quick-reply buttons
 * (View Brochure / Book a Slot), and logs to the Unified Inbox for Chat AI takeover.
 */
export async function maybeSendNewLeadWhatsAppWelcome(
  input: LeadWhatsAppWelcomeInput,
): Promise<LeadWhatsAppWelcomeResult> {
  try {
    const { tenantId, workspaceId, leadId, leadName, leadPhone, serviceType } = input;
    const { cleaned, digits, last10 } = normalizePhoneVariants(leadPhone);
    if (!tenantId || digits.length < 8) {
      return { sent: false, reason: 'invalid_phone_or_tenant' };
    }

    const tenant = await db.tenant
      .findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          publicSlug: true,
          plan: true,
          planStatus: true,
          settingsJson: true,
          brandProfile: { select: { businessName: true } },
        },
      })
      .catch(() => null);

    if (!tenant) {
      return { sent: false, reason: 'tenant_not_found' };
    }

    const settings = parseSettings(tenant.settingsJson);
    const welcomeCfg = settings.leadAutoWelcome;
    if (welcomeCfg?.enabled !== true) {
      return { sent: false, reason: 'disabled' };
    }

    const authPlan = await resolveAuthoritativeBgosPlanState(tenantId, {
      workspaceId,
      fallbackPlan: tenant.plan,
      fallbackStatus: tenant.planStatus,
    });
    const tier = resolvePlanTier(authPlan.plan || tenant.plan, authPlan.status || tenant.planStatus);
    const hasWhatsAppFeature = await isFeatureEnabledForPlan('whatsapp', tier);
    if (!hasWhatsAppFeature) {
      return { sent: false, reason: 'plan_ineligible' };
    }

    const waCredits = await checkWhatsAppCredits(tenantId);
    if (!waCredits.allowed) {
      return { sent: false, reason: 'whatsapp_not_connected' };
    }

    // Deduplicate: do not auto-welcome the same lead phone more than once in 12 hours
    const cutoff12h = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const convClauses: Array<Record<string, unknown>> = [
      { customerPhone: cleaned },
      { customerPhone: digits },
      { customerPhone: `+${digits}` },
    ];
    if (last10.length >= 10) convClauses.push({ customerPhone: { endsWith: last10 } });

    const existingConv = await db.conversation
      .findFirst({
        where: { tenantId, channel: 'whatsapp', OR: convClauses },
        select: { conversationId: true },
      })
      .catch(() => null);

    if (existingConv?.conversationId) {
      const recentWelcome = await db.inboxMessage
        .findFirst({
          where: {
            tenantId,
            conversationId: existingConv.conversationId,
            direction: 'outbound',
            createdAt: { gte: cutoff12h },
            metadataJson: { contains: 'lead_auto_welcome' },
          },
          select: { id: true },
        })
        .catch(() => null);

      if (recentWelcome) {
        return { sent: false, reason: 'recently_welcomed' };
      }
    }

    const businessName =
      (typeof settings.activeGbpTitle === 'string' && settings.activeGbpTitle.trim()) ||
      (typeof settings.bookingPageConfig?.businessName === 'string' && settings.bookingPageConfig.businessName.trim()) ||
      tenant.brandProfile?.businessName?.trim() ||
      tenant.name?.trim() ||
      'our team';

    const firstName = (leadName || '').trim().split(/\s+/)[0] || 'there';
    const servicePhrase = serviceType?.trim() ? ` about ${serviceType.trim()}` : '';
    const brochureUrl = sanitizePublicImageUrl(settings.brochureUrl) || null;
    const includeBrochureBtn = Boolean(brochureUrl) && welcomeCfg?.sendBrochure !== false;

    const customTemplate = typeof welcomeCfg?.message === 'string' ? welcomeCfg.message.trim() : '';
    const bodyText = customTemplate
      ? customTemplate
          .replace(/\{FirstName\}/gi, firstName)
          .replace(/\{Name\}/gi, leadName?.trim() || firstName)
          .replace(/\{BusinessName\}/gi, businessName)
      : `Hi ${firstName}! 👋 Thanks for reaching out to ${businessName}${servicePhrase}. Would you like to ${includeBrochureBtn ? 'check our brochure & rates or book a time slot' : 'ask a quick question or book a convenient time slot'}?`;

    const interactiveButtons = includeBrochureBtn
      ? [
          { id: 'bgos_view_brochure', title: 'View Brochure' },
          { id: 'bgos_book_slot', title: 'Book a Slot' },
        ]
      : [
          { id: 'bgos_book_slot', title: 'Book a Slot' },
          { id: 'bgos_ask_question', title: 'Ask a Question' },
        ];

    const sendRes = await sendWhatsAppMessage({
      tenantId,
      to: cleaned,
      message: bodyText,
      type: 'interactive',
      interactiveButtons,
      interactiveFooter: businessName,
    });

    if (!sendRes.success) {
      return { sent: false, reason: sendRes.error || 'send_failed' };
    }

    await recordWhatsAppOutboundInboxMessage({
      tenantId,
      workspaceId,
      phone: cleaned,
      customerName: leadName,
      leadId,
      content: bodyText,
      messageType: 'interactive',
      externalId: sendRes.messageId || null,
      senderName: `${businessName} AI`,
      metadataJson: {
        reason: 'lead_auto_welcome',
        leadId,
        brochureUrl: includeBrochureBtn ? brochureUrl : undefined,
        buttons: interactiveButtons.map((b) => b.title),
      },
    });

    return { sent: true, messageId: sendRes.messageId };
  } catch (err) {
    console.warn('[Lead Auto-Welcome] Failed:', err);
    return { sent: false, reason: err instanceof Error ? err.message : 'unexpected_error' };
  }
}
