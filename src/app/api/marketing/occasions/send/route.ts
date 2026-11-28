import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { checkWhatsAppCredits } from '@/lib/credit-management';
import { requireBgosRepeatCampaignsAccess } from '@/lib/bgos-plan-access';
import { buildMetaTemplateSendPayload } from '@/lib/bgos-meta-templates';
import { recordWhatsAppOutboundInboxMessage } from '@/lib/whatsapp/inbox-sync';

export const dynamic = 'force-dynamic';

export type OccasionAudienceKey = 'all_leads' | 'past_customers' | 'inactive_60_days';

interface ResolvedRecipient {
  id: string;
  name: string;
  firstName: string;
  phone: string;
  email: string | null;
  source: 'customer' | 'lead';
}

function normalizePhoneDigits(phone?: string | null): string {
  const clean = (phone || '').replace(/[^\d+]/g, '').trim();
  if (clean.replace(/\D/g, '').length < 8) return '';
  return clean;
}

function normalizeAudienceKey(raw?: string | null): OccasionAudienceKey {
  if (raw === 'past_customers' || raw === 'inactive_60_days') return raw;
  return 'all_leads';
}

function personalizeText(template: string, firstName: string): string {
  return template
    .replace(/\{FirstName\}/gi, firstName || 'there')
    .replace(/\{first_name\}/gi, firstName || 'there')
    .replace(/\{Name\}/gi, firstName || 'there')
    .trim();
}

async function resolveOccasionRecipients(tenantId: string, audience: OccasionAudienceKey) {
  const cutoff60d = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [customers, leads] = await Promise.all([
    db.customer.findMany({
      where: {
        tenantId,
        marketingConsent: { not: false },
      },
      orderBy: { updatedAt: 'desc' },
      take: 250,
      select: {
        id: true,
        name: true,
        firstName: true,
        phone: true,
        email: true,
        updatedAt: true,
      },
    }),
    db.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    }),
  ]);

  const mapCustomers = (rows: typeof customers): ResolvedRecipient[] => {
    const out: ResolvedRecipient[] = [];
    const seen = new Set<string>();
    for (const c of rows) {
      const phone = normalizePhoneDigits(c.phone);
      if (!phone) continue;
      const key = phone.replace(/\D/g, '').slice(-10);
      if (seen.has(key)) continue;
      seen.add(key);
      const displayName = (c.name || '').trim() || 'Customer';
      const firstName = (c.firstName || displayName.split(/\s+/)[0] || 'there').trim();
      out.push({
        id: c.id,
        name: displayName,
        firstName,
        phone,
        email: c.email || null,
        source: 'customer',
      });
    }
    return out;
  };

  const pastCustomers = mapCustomers(customers);
  const inactiveCustomers = mapCustomers(
    customers.filter((c) => new Date(c.updatedAt).getTime() <= cutoff60d.getTime()),
  );

  const leadRecipients: ResolvedRecipient[] = [];
  const leadSeen = new Set<string>();
  for (const l of leads) {
    const phone = normalizePhoneDigits(l.phone);
    if (!phone) continue;
    const key = phone.replace(/\D/g, '').slice(-10);
    if (leadSeen.has(key)) continue;
    leadSeen.add(key);
    const displayName = (l.name || '').trim() || 'Lead';
    leadRecipients.push({
      id: l.id,
      name: displayName,
      firstName: displayName.split(/\s+/)[0] || 'there',
      phone,
      email: l.email || null,
      source: 'lead',
    });
  }

  const counts = {
    all_leads: leadRecipients.length,
    past_customers: pastCustomers.length,
    inactive_60_days: inactiveCustomers.length,
  };

  const list =
    audience === 'past_customers'
      ? pastCustomers
      : audience === 'inactive_60_days'
        ? inactiveCustomers
        : leadRecipients;

  return { counts, recipients: list };
}

/**
 * GET /api/marketing/occasions/send?audience=all_leads|past_customers|inactive_60_days
 * Returns tenant audience counts, WhatsApp Business API connection readiness, and recipient preview.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const planGate = await requireBgosRepeatCampaignsAccess(user);
    if (!planGate.ok) return planGate.response;

    const audience = normalizeAudienceKey(new URL(request.url).searchParams.get('audience'));
    const [{ counts, recipients }, waStatus, templates] = await Promise.all([
      resolveOccasionRecipients(user.tenantId, audience),
      checkWhatsAppCredits(user.tenantId).catch(() => ({ allowed: false, reason: 'Unavailable' })),
      db.campaignTemplate
        .findMany({
          where: {
            tenantId: user.tenantId,
            isApproved: true,
          },
          take: 25,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, content: true },
        })
        .then((rows) =>
          rows.map((r) => ({ id: r.id, name: r.name, bodyText: r.content, status: 'approved' })),
        )
        .catch(() => []),
    ]);

    return NextResponse.json({
      success: true,
      audience,
      counts,
      whatsappConnected: Boolean(waStatus?.allowed),
      whatsappReason: waStatus?.allowed ? null : waStatus?.reason || null,
      approvedTemplates: templates,
      recipients: recipients.slice(0, 50),
    });
  } catch (error: unknown) {
    console.error('[marketing/occasions/send] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load campaign audience' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/marketing/occasions/send
 * Dispatches or prepares a ready-to-send WhatsApp occasion / comeback campaign for the selected segment.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!['owner', 'admin', 'standalone_user'].includes(user.role)) {
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    const planGate = await requireBgosRepeatCampaignsAccess(user);
    if (!planGate.ok) return planGate.response;

    const body = (await request.json().catch(() => ({}))) as {
      audience?: string;
      message?: string;
      title?: string;
      posterUrl?: string | null;
      brochureUrl?: string | null;
      templateName?: string;
      templateLanguage?: string;
      sendVia?: 'whatsapp_api' | 'prepare_share';
      campaignId?: string | null;
      recipientIds?: string[];
    };

    const rawMessage = (body.message || '').trim();
    if (!rawMessage) {
      return NextResponse.json({ error: 'Campaign message is required' }, { status: 400 });
    }

    const audience = normalizeAudienceKey(body.audience);
    const { recipients: allSegmentRecipients } = await resolveOccasionRecipients(user.tenantId, audience);

    const filterIds = Array.isArray(body.recipientIds) && body.recipientIds.length > 0
      ? new Set(body.recipientIds)
      : null;
    const selectedRecipients = (filterIds
      ? allSegmentRecipients.filter((r) => filterIds.has(r.id))
      : allSegmentRecipients
    ).slice(0, 50);

    const cleanBrochureUrl = body.brochureUrl?.trim() || '';
    const extraLinks: string[] = [];
    if (cleanBrochureUrl && body.sendVia !== 'whatsapp_api') {
      extraLinks.push(`Brochure & Rates: ${cleanBrochureUrl}`);
    }
    if (body.posterUrl?.trim() && body.sendVia !== 'whatsapp_api') {
      extraLinks.push(`Offer Details: ${body.posterUrl.trim()}`);
    }
    const suffix = extraLinks.length > 0 ? `\n\n${extraLinks.join('\n')}` : '';

    const prepared = selectedRecipients.map((r) => {
      const personalizedMessage = `${personalizeText(rawMessage, r.firstName)}${suffix}`;
      const digits = r.phone.replace(/\D/g, '');
      const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(personalizedMessage)}`;
      return {
        ...r,
        personalizedMessage,
        waUrl,
      };
    });

    const campaignTitle = (body.title || 'WhatsApp Repeat Campaign').trim();
    const sendVia = body.sendVia === 'whatsapp_api' ? 'whatsapp_api' : 'prepare_share';

    if (sendVia === 'prepare_share') {
      let campaignId = body.campaignId || null;
      if (campaignId) {
        await db.campaign
          .updateMany({
            where: { id: campaignId, tenantId: user.tenantId },
            data: {
              status: 'active',
              totalRecipients: prepared.length,
              messageContent: rawMessage,
              mediaUrl: body.posterUrl || null,
              mediaType: body.posterUrl ? 'image' : null,
            },
          })
          .catch(() => {});
      } else {
        const created = await db.campaign
          .create({
            data: {
              tenantId: user.tenantId,
              workspaceId: user.workspaceId || null,
              name: campaignTitle,
              channel: 'whatsapp',
              type: audience === 'inactive_60_days' ? 're_engagement' : 'seasonal',
              status: 'active',
              messageContent: rawMessage,
              mediaUrl: body.posterUrl || null,
              mediaType: body.posterUrl ? 'image' : null,
              audienceType: 'segment',
              audienceFiltersJson: JSON.stringify({ segment: audience }),
              totalRecipients: prepared.length,
              createdById: user.id || 'system',
            },
          })
          .catch(() => null);
        campaignId = created?.id || null;
      }

      return NextResponse.json({
        success: true,
        mode: 'prepare_share',
        campaignId,
        totalRecipients: prepared.length,
        recipients: prepared,
      });
    }

    // Meta Cloud API dispatch requires connected WhatsApp Business account
    const waStatus = await checkWhatsAppCredits(user.tenantId);
    if (!waStatus.allowed) {
      return NextResponse.json(
        {
          error:
            waStatus.reason ||
            'Connect your WhatsApp Business API account in Integrations first, or use 1-Tap WhatsApp Share.',
        },
        { status: 403 },
      );
    }

    if (prepared.length === 0) {
      return NextResponse.json({ error: 'No contacts with valid phone numbers in this group.' }, { status: 400 });
    }

    let businessName = 'Our Team';
    let matchedTemplate: { name: string; content: string; language: string } | null = null;
    try {
      const tenantRow = await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true, settingsJson: true },
      });
      if (tenantRow?.name) businessName = tenantRow.name;
      if (tenantRow?.settingsJson) {
        const parsedSettings = JSON.parse(tenantRow.settingsJson) as Record<string, any>;
        const bpcName = parsedSettings?.bookingPageConfig?.businessName;
        if (typeof bpcName === 'string' && bpcName.trim()) businessName = bpcName.trim();
      }
    } catch {}

    if (body.templateName) {
      matchedTemplate = await db.campaignTemplate
        .findFirst({
          where: { tenantId: user.tenantId, name: body.templateName },
          select: { name: true, content: true, language: true },
        })
        .catch(() => null);
    }

    const templateBodySource = matchedTemplate?.content || '';
    const templateVarMatches = templateBodySource.match(/\{\{(\d+)\}\}/g) || [];
    const templateMaxVar = templateVarMatches.reduce((max, tok) => {
      const n = Number.parseInt(tok.replace(/[{}]/g, ''), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const safeFilename = `${businessName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Business'}-Brochure.pdf`;

    for (const r of selectedRecipients) {
      const preparedItem = prepared.find((p) => p.id === r.id) || {
        ...r,
        personalizedMessage: personalizeText(rawMessage, r.firstName),
      };

      let sendResult;
      if (body.templateName) {
        const defaultSlots = [r.firstName || 'there', businessName, rawMessage.slice(0, 120)];
        const templateParams = Array.from({ length: templateMaxVar }, (_, i) => defaultSlots[i] || businessName);
        const built = buildMetaTemplateSendPayload(
          body.templateName,
          templateParams,
          body.templateLanguage || matchedTemplate?.language || 'en',
        );
        sendResult = await sendWhatsAppMessage({
          tenantId: user.tenantId,
          to: r.phone,
          message: preparedItem.personalizedMessage,
          type: 'template',
          templateName: built.templateName,
          templateLanguage: built.templateLanguage,
          templateComponents: built.templateComponents,
        });
      } else if (body.posterUrl) {
        sendResult = await sendWhatsAppMessage({
          tenantId: user.tenantId,
          to: r.phone,
          message: preparedItem.personalizedMessage,
          type: 'image',
          mediaUrl: body.posterUrl,
        });
      } else if (cleanBrochureUrl) {
        sendResult = await sendWhatsAppMessage({
          tenantId: user.tenantId,
          to: r.phone,
          message: preparedItem.personalizedMessage,
          type: 'document',
          mediaUrl: cleanBrochureUrl,
          mediaFilename: safeFilename,
        });
      } else {
        sendResult = await sendWhatsAppMessage({
          tenantId: user.tenantId,
          to: r.phone,
          message: preparedItem.personalizedMessage,
          type: 'text',
        });
      }

      if (sendResult.success) {
        sentCount += 1;
        await recordWhatsAppOutboundInboxMessage({
          tenantId: user.tenantId,
          workspaceId: user.workspaceId || null,
          phone: r.phone,
          customerName: r.name,
          leadId: r.source === 'lead' ? r.id : null,
          content: preparedItem.personalizedMessage,
          messageType: body.templateName ? 'template' : body.posterUrl ? 'image' : cleanBrochureUrl ? 'document' : 'text',
          mediaUrl: body.posterUrl || cleanBrochureUrl || null,
          externalId: sendResult.messageId || null,
          senderName: `${businessName} Campaign`,
          metadataJson: {
            campaignTitle,
            campaignId: body.campaignId || undefined,
            audience,
            templateName: body.templateName || undefined,
            brochureUrl: cleanBrochureUrl || undefined,
          },
        });

        // Follow up with PDF document attachment if primary message was template or image
        if (cleanBrochureUrl && (body.templateName || body.posterUrl)) {
          const docCaption = `Here is our updated brochure & rates for ${businessName} 📄 Reply anytime to ask questions or book!`;
          const docRes = await sendWhatsAppMessage({
            tenantId: user.tenantId,
            to: r.phone,
            message: docCaption,
            type: 'document',
            mediaUrl: cleanBrochureUrl,
            mediaFilename: safeFilename,
          });
          if (docRes.success) {
            await recordWhatsAppOutboundInboxMessage({
              tenantId: user.tenantId,
              workspaceId: user.workspaceId || null,
              phone: r.phone,
              customerName: r.name,
              leadId: r.source === 'lead' ? r.id : null,
              content: docCaption,
              messageType: 'document',
              mediaUrl: cleanBrochureUrl,
              externalId: docRes.messageId || null,
              senderName: `${businessName} Campaign`,
              metadataJson: {
                campaignTitle,
                campaignId: body.campaignId || undefined,
                brochureAttachment: true,
              },
            });
          }
        }
      } else {
        failedCount += 1;
        if (sendResult.error && errors.length < 3) errors.push(`${r.name}: ${sendResult.error}`);
      }
    }

    const campaignStatus = sentCount > 0 ? 'completed' : 'draft';
    let campaignId = body.campaignId || null;
    if (campaignId) {
      await db.campaign
        .updateMany({
          where: { id: campaignId, tenantId: user.tenantId },
          data: {
            status: campaignStatus,
            totalRecipients: prepared.length,
            sentCount,
            failedCount,
          },
        })
        .catch(() => {});
    } else {
      const created = await db.campaign
        .create({
          data: {
            tenantId: user.tenantId,
            workspaceId: user.workspaceId || null,
            name: campaignTitle,
            channel: 'whatsapp',
            type: audience === 'inactive_60_days' ? 're_engagement' : 'seasonal',
            status: campaignStatus,
            messageContent: rawMessage,
            mediaUrl: body.posterUrl || null,
            mediaType: body.posterUrl ? 'image' : null,
            audienceType: 'segment',
            audienceFiltersJson: JSON.stringify({ segment: audience }),
            totalRecipients: prepared.length,
            sentCount,
            failedCount,
            createdById: user.id || 'system',
          },
        })
        .catch(() => null);
      campaignId = created?.id || null;
    }

    return NextResponse.json({
      success: true,
      mode: 'whatsapp_api',
      campaignId,
      totalRecipients: prepared.length,
      sentCount,
      failedCount,
      errors,
    });
  } catch (error: unknown) {
    console.error('[marketing/occasions/send] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to dispatch campaign' },
      { status: 500 },
    );
  }
}
