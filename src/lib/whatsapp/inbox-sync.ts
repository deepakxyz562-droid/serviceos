import { db } from '@/lib/db';
import { createOutboundMessage } from '@/lib/inbox-message-service';

export interface OutboundWhatsAppInboxSyncInput {
  tenantId: string;
  workspaceId?: string | null;
  phone: string;
  customerName?: string | null;
  leadId?: string | null;
  content: string;
  messageType?: string;
  mediaUrl?: string | null;
  mediaCaption?: string | null;
  externalId?: string | null;
  senderId?: string;
  senderName?: string;
  metadataJson?: Record<string, unknown>;
}

/**
 * Extracts normalized digit variations for matching customer phones across
 * Conversation and Customer records regardless of leading '+' or spaces.
 */
export function normalizePhoneVariants(phone?: string | null): {
  cleaned: string;
  digits: string;
  last10: string;
} {
  const cleaned = (phone || '').trim();
  const digits = cleaned.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return { cleaned, digits, last10 };
}

/**
 * Finds the active WhatsApp Conversation for a phone number or creates a canonical
 * Conversation linked to any matching Customer/Lead, then records the outbound
 * InboxMessage so the Omnichannel Inbox and AI Chat Agent share seamless context.
 */
export async function recordWhatsAppOutboundInboxMessage(
  input: OutboundWhatsAppInboxSyncInput,
): Promise<{ conversationId: string | null }> {
  try {
    const { cleaned, digits, last10 } = normalizePhoneVariants(input.phone);
    if (!input.tenantId || !digits) {
      return { conversationId: null };
    }

    const phoneClauses: Array<Record<string, unknown>> = [
      { customerPhone: cleaned },
      { customerPhone: digits },
      { customerPhone: `+${digits}` },
    ];
    if (last10.length >= 10) {
      phoneClauses.push({ customerPhone: { endsWith: last10 } });
    }

    let conversation = await db.conversation
      .findFirst({
        where: {
          tenantId: input.tenantId,
          channel: 'whatsapp',
          status: 'active',
          OR: phoneClauses,
        },
        orderBy: { lastMessageAt: 'desc' },
      })
      .catch(() => null);

    if (!conversation) {
      const custClauses: Array<Record<string, unknown>> = [
        { phone: cleaned },
        { phone: digits },
        { phone: `+${digits}` },
      ];
      if (last10.length >= 10) {
        custClauses.push({ phone: { endsWith: last10 } });
      }
      const matchedCustomer = await db.customer
        .findFirst({
          where: { tenantId: input.tenantId, OR: custClauses },
          select: { id: true, name: true },
        })
        .catch(() => null);

      const newConvId = `conv_wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const canonicalPhone = digits.length === 10 ? `91${digits}` : digits;

      conversation = await db.conversation
        .create({
          data: {
            conversationId: newConvId,
            tenantId: input.tenantId,
            workspaceId: input.workspaceId || null,
            customerId: matchedCustomer?.id || null,
            leadId: input.leadId || null,
            customerName: input.customerName?.trim() || matchedCustomer?.name || canonicalPhone,
            customerPhone: canonicalPhone,
            channel: 'whatsapp',
            status: 'active',
            currentStage: 'greeting',
            lastMessageAt: new Date(),
            lastMessageBody: input.content.slice(0, 500),
            lastDirection: 'outbound',
            messagesJson: '[]',
          },
        })
        .catch(() => null);
    } else if (input.leadId && !conversation.leadId) {
      await db.conversation
        .updateMany({
          where: { id: conversation.id },
          data: { leadId: input.leadId },
        })
        .catch(() => {});
    }

    if (!conversation) {
      return { conversationId: null };
    }

    await createOutboundMessage({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId || undefined,
      conversationId: conversation.conversationId,
      channel: 'whatsapp',
      senderId: input.senderId || 'ai',
      senderName: input.senderName || 'BGOS AI Agent',
      content: input.content,
      messageType: input.messageType || 'text',
      mediaUrl: input.mediaUrl || undefined,
      mediaCaption: input.mediaCaption || undefined,
      externalId: input.externalId || undefined,
      metadataJson: input.metadataJson,
      status: 'sent',
    });

    return { conversationId: conversation.conversationId };
  } catch (err) {
    console.warn('[WhatsApp Inbox Sync] Failed to record outbound message:', err);
    return { conversationId: null };
  }
}
