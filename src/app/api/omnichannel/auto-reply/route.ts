import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/omnichannel/auto-reply
 * Fetch omnichannel auto-reply configuration across WhatsApp, Instagram, Facebook, and SMS.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const [tenant, socialAccounts] = await Promise.all([
      db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { settingsJson: true, name: true, phone: true },
      }),
      db.socialAccount.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { platform: true },
      }),
    ]);

    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant?.settingsJson || '{}');
    } catch {}

    const connectedPlatforms = new Set(socialAccounts.map((a) => a.platform));

    const autoReplyConfig = {
      whatsapp: {
        enabled: settings.omnichannelAutoReply?.whatsapp?.enabled ?? settings.autoReplyOffline?.enabled ?? true,
        mode: settings.omnichannelAutoReply?.whatsapp?.mode ?? settings.autoReplyOffline?.mode ?? 'ai',
        scriptedMessage:
          settings.omnichannelAutoReply?.whatsapp?.scriptedMessage ??
          settings.autoReplyOffline?.scriptedMessage ??
          `Hi! Thanks for contacting ${tenant?.name || 'us'}. We are currently assisting other clients. How can we help you today?`,
        respectBusinessHours: settings.omnichannelAutoReply?.whatsapp?.respectBusinessHours ?? false,
      },
      instagram: {
        enabled: settings.omnichannelAutoReply?.instagram?.enabled ?? true,
        commentToDmEnabled: settings.omnichannelAutoReply?.instagram?.commentToDmEnabled ?? true,
        commentKeywords: settings.omnichannelAutoReply?.instagram?.commentKeywords ?? [
          'price', 'cost', 'quote', 'book', 'available', 'how much', 'info', 'service',
        ],
        aiPersonaPrompt:
          settings.omnichannelAutoReply?.instagram?.aiPersonaPrompt ??
          'Friendly, helpful local service assistant. Answers questions and provides direct booking link.',
      },
      facebook: {
        enabled: settings.omnichannelAutoReply?.facebook?.enabled ?? true,
        commentToDmEnabled: settings.omnichannelAutoReply?.facebook?.commentToDmEnabled ?? true,
        messengerAutoReply: settings.omnichannelAutoReply?.facebook?.messengerAutoReply ?? true,
      },
      sms: {
        enabled: settings.omnichannelAutoReply?.sms?.enabled ?? settings.autoReplyOffline?.enabled ?? true,
        mode: settings.omnichannelAutoReply?.sms?.mode ?? 'scripted',
        scriptedMessage:
          settings.omnichannelAutoReply?.sms?.scriptedMessage ??
          `Hi! Thanks for reaching out to ${tenant?.name || 'us'}. We got your text and will reply shortly. For urgent needs call ${tenant?.phone || 'our office'}.`,
      },
      autoGbpPosting: settings.autoGbpPosting ?? true,
      reviewAutomation: settings.reviewAutomation ?? null,
      connectedChannels: {
        whatsapp: true, // Internal provider
        instagram: connectedPlatforms.has('instagram'),
        facebook: connectedPlatforms.has('facebook'),
        googlebusiness: connectedPlatforms.has('googlebusiness'),
      },
    };

    return NextResponse.json(autoReplyConfig);
  } catch (error: unknown) {
    console.error('Error fetching omnichannel auto-reply config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch auto-reply config' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/omnichannel/auto-reply
 * Update omnichannel auto-reply configuration.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });

    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant?.settingsJson || '{}');
    } catch {}

    const updatedOmnichannel = {
      ...(settings.omnichannelAutoReply || {}),
      ...(body.whatsapp ? { whatsapp: body.whatsapp } : {}),
      ...(body.instagram ? { instagram: body.instagram } : {}),
      ...(body.facebook ? { facebook: body.facebook } : {}),
      ...(body.sms ? { sms: body.sms } : {}),
    };

    settings.omnichannelAutoReply = updatedOmnichannel;

    if (typeof body.autoGbpPosting === 'boolean') {
      settings.autoGbpPosting = body.autoGbpPosting;
    }

    // Review automation (auto-reply 5★ reviews + automatic review request invites)
    if (body.reviewAutomation && typeof body.reviewAutomation === 'object') {
      const ra = body.reviewAutomation as Record<string, unknown>;
      settings.reviewAutomation = {
        ...(settings.reviewAutomation || {}),
        ...(typeof ra.enabled === 'boolean' ? { enabled: ra.enabled } : {}),
        ...(typeof ra.autoReplyFiveStar === 'boolean' ? { autoReplyFiveStar: ra.autoReplyFiveStar } : {}),
        ...(typeof ra.sendAfterCompletion === 'boolean' ? { sendAfterCompletion: ra.sendAfterCompletion } : {}),
        ...(typeof ra.completionDelay === 'string' ? { completionDelay: ra.completionDelay } : {}),
        ...(typeof ra.sendReminder === 'boolean' ? { sendReminder: ra.sendReminder } : {}),
        ...(typeof ra.reminderDelay === 'string' ? { reminderDelay: ra.reminderDelay } : {}),
        ...(typeof ra.includeDirectLink === 'boolean' ? { includeDirectLink: ra.includeDirectLink } : {}),
      };
      // Keep the Google review auto-reply behavior (read by /api/reviews/sync-google) in sync
      if (typeof ra.autoReplyFiveStar === 'boolean') {
        settings.autoReplyReviews = {
          ...(settings.autoReplyReviews || {}),
          enabled: ra.autoReplyFiveStar,
          minRating: 5,
        };
      }
    }

    // Keep legacy autoReplyOffline synced with WhatsApp/SMS toggles
    if (body.whatsapp || body.sms) {
      settings.autoReplyOffline = {
        ...(settings.autoReplyOffline || {}),
        enabled: body.whatsapp?.enabled ?? body.sms?.enabled ?? settings.autoReplyOffline?.enabled ?? true,
        mode: body.whatsapp?.mode || settings.autoReplyOffline?.mode || 'ai',
        scriptedMessage: body.whatsapp?.scriptedMessage || body.sms?.scriptedMessage || settings.autoReplyOffline?.scriptedMessage,
      };
    }

    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        settingsJson: JSON.stringify(settings),
      },
    });

    return NextResponse.json({
      success: true,
      omnichannelAutoReply: updatedOmnichannel,
      reviewAutomation: settings.reviewAutomation || null,
      autoGbpPosting: settings.autoGbpPosting ?? null,
      message: 'Settings updated successfully.',
    });
  } catch (error: unknown) {
    console.error('Error saving omnichannel auto-reply config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save auto-reply config' },
      { status: 500 },
    );
  }
}
