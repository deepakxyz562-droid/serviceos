import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { getAuthUser } from '@/lib/auth';
import { requirePlanFeature } from '@/lib/plan-gate';
import { checkWhatsAppCredits } from '@/lib/credit-management';
import { db } from '@/lib/db';
import { createOutboundMessage } from '@/lib/inbox-message-service';

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ────────────────────────────────────────────────────
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Plan-tier gating: WhatsApp integration is locked on trial/starter ──
    // Sending WhatsApp messages requires the WhatsApp feature flag. GET
    // endpoints (conversations, sessions) remain open so users can read past
    // messages after a downgrade — only POST (send) is gated.
    const gate = await requirePlanFeature('whatsapp');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const body = await request.json();
    const { to, message, type, credentialId, templateLanguage, templateName } = body;

    if (!to || !message) {
      return NextResponse.json({ error: 'to and message are required' }, { status: 400 });
    }

    // ── Credit check ──────────────────────────────────────────────────
    if (user.tenantId) {
      const creditCheck = await checkWhatsAppCredits(user.tenantId);

      if (!creditCheck.allowed) {
        return NextResponse.json(
          {
            error: creditCheck.reason || 'WhatsApp credits exhausted',
            creditExhausted: true,
            creditStatus: creditCheck,
          },
          { status: 403 },
        );
      }
    }

    // ── Send via the shared sendWhatsAppMessage utility ─────────────────
    // This resolves credentials from: CommunicationProvider (tenant → platform fallback) → Credential → env vars
    const result = await sendWhatsAppMessage({
      to,
      message,
      credentialId,
      type: type || 'text',
      templateName,
      templateLanguage,
      tenantId: user.tenantId || undefined,
    });

    if (result.success) {
      // ── O4: record the outbound message in the canonical InboxMessage ──
      // Find or create a Conversation for this recipient so the agent's reply
      // appears in the omnichannel inbox alongside the customer's inbound.
      // Non-fatal — if this fails, the message was still sent successfully.
      if (user.tenantId) {
        try {
          // Find existing active WhatsApp conversation with this recipient
          let conversation = await db.conversation.findFirst({
            where: { customerPhone: to, channel: 'whatsapp', status: 'active', tenantId: user.tenantId },
            orderBy: { lastMessageAt: 'desc' },
            select: { conversationId: true },
          });
          let conversationId = conversation?.conversationId;
          if (!conversationId) {
            // Create a new conversation for this outbound-only thread
            conversationId = `conv_whatsapp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await db.conversation.create({
              data: {
                conversationId,
                customerPhone: to,
                channel: 'whatsapp',
                status: 'active',
                currentStage: 'greeting',
                lastMessageAt: new Date(),
                lastMessageBody: message,
                lastDirection: 'outbound',
                tenantId: user.tenantId,
              },
            });
          }
          await createOutboundMessage({
            tenantId: user.tenantId,
            conversationId,
            channel: 'whatsapp',
            senderId: user.id,
            senderName: user.name || user.email,
            content: message,
            externalId: result.messageId || undefined,
            status: 'sent',
            metadataJson: { credentialUsed: result.credentialUsed, simulated: !!result.simulated },
          });
        } catch (err) {
          console.warn('[/api/whatsapp/send] InboxMessage create failed (non-fatal):', err);
        }
      }

      // Credit deduction is handled inside sendWhatsAppMessage:
      //   - Platform usage: increments both whatsappUsageCount + trialWhatsappUsed
      //   - Own WA usage:   increments only whatsappUsageCount (unlimited)
      // No double deduction here.

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        simulated: result.simulated || false,
        credentialUsed: result.credentialUsed,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          credentialUsed: result.credentialUsed,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 });
  }
}
