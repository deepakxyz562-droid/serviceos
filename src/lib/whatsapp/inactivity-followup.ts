import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';

export interface InactivityResult {
  checkedCount: number;
  nudgedCount: number;
  conversations: Array<{ id: string; phone: string; followUpText: string }>;
}

/**
 * Scans open WhatsApp conversations that have gone quiet (>2h without customer response)
 * and dispatches an automated, context-aware nudge to bring them back.
 */
export async function processWhatsAppInactivityFollowups(params?: {
  inactivityHours?: number;
  maxAgeHours?: number;
  limit?: number;
}): Promise<InactivityResult> {
  const minHours = params?.inactivityHours ?? 2;
  const maxHours = params?.maxAgeHours ?? 48;
  const limit = params?.limit ?? 20;

  const now = Date.now();
  const minThreshold = new Date(now - minHours * 60 * 60 * 1000);
  const maxThreshold = new Date(now - maxHours * 60 * 60 * 1000);

  // 1. Find conversations where the last customer interaction is between 2h and 48h ago
  const quietConversations = await db.conversation.findMany({
    where: {
      channel: 'whatsapp',
      status: 'active',
      aiPaused: false,
      lastDirection: 'inbound',
      lastMessageAt: {
        lte: minThreshold,
        gte: maxThreshold,
      },
    },
    take: limit,
    orderBy: { lastMessageAt: 'asc' },
    select: {
      id: true,
      conversationId: true,
      tenantId: true,
      customerPhone: true,
      customerName: true,
      lastMessageBody: true,
      lastMessageAt: true,
      metadataJson: true,
    },
  });

  let nudgedCount = 0;
  const dispatched: Array<{ id: string; phone: string; followUpText: string }> = [];

  for (const conv of quietConversations) {
    if (!conv.customerPhone || !conv.tenantId) continue;

    // Guard: Prevent double-nudging if already sent an inactivity follow-up
    let meta: Record<string, any> = {};
    try {
      meta = typeof conv.metadataJson === 'string' ? JSON.parse(conv.metadataJson || '{}') : (conv.metadataJson || {});
    } catch {}

    if (meta.inactivityFollowUpSentAt) {
      continue;
    }

    const tenant = await db.tenant.findUnique({
      where: { id: conv.tenantId },
      include: { brandProfile: true },
    });

    const businessName = tenant?.brandProfile?.businessName || tenant?.name || 'our team';
    const customerName = conv.customerName || 'there';
    const lastTopic = (conv.lastMessageBody || '').slice(0, 120);

    const prompt = `You are a friendly, helpful assistant for "${businessName}".
A customer named ${customerName} inquired on WhatsApp earlier: "${lastTopic}".
The chat has gone quiet for a few hours.

Write a warm, polite 1-2 sentence WhatsApp message checking in to see if they still need help or would like to reserve a time slot.
Requirements:
1. Short and natural for WhatsApp (under 40 words).
2. Never pushy or aggressive.
3. Automatically match the language of their prior inquiry.`;

    let followUpText = `Hi ${customerName}! Still planning your visit with ${businessName}? Let us know if you would like help picking a convenient time slot! 😊`;
    try {
      const aiRes = await callAI({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        usageContext: {
          tenantId: conv.tenantId,
          feature: 'whatsapp_inactivity_followup',
        },
      });
      const generated = typeof aiRes === 'string' ? aiRes : (aiRes as any)?.content || (aiRes as any)?.text || '';
      if (generated.trim()) {
        followUpText = generated.trim();
      }
    } catch (aiErr) {
      console.warn('[inactivity-followup] AI nudge generation fallback:', aiErr);
    }

    // Send the WhatsApp follow-up message
    try {
      await sendWhatsAppMessage({
        tenantId: conv.tenantId,
        to: conv.customerPhone,
        body: followUpText,
      });

      // Save the message in InboxMessage
      await db.inboxMessage.create({
        data: {
          tenantId: conv.tenantId,
          conversationId: conv.conversationId || conv.id,
          channel: 'whatsapp',
          senderId: 'ai',
          senderName: businessName,
          senderType: 'ai',
          direction: 'outbound',
          content: followUpText,
          messageType: 'text',
          status: 'sent',
          metadataJson: {
            reason: 'inactivity_followup',
            nudgedAt: new Date().toISOString(),
          },
        },
      });

      // Mark the conversation metadata so it isn't repeatedly nudged
      meta.inactivityFollowUpSentAt = new Date().toISOString();
      await db.conversation.update({
        where: { id: conv.id },
        data: {
          lastMessageAt: new Date(),
          lastMessageBody: followUpText,
          lastDirection: 'outbound',
          metadataJson: JSON.stringify(meta),
        },
      });

      nudgedCount++;
      dispatched.push({ id: conv.id, phone: conv.customerPhone, followUpText });
    } catch (sendErr) {
      console.warn(`[inactivity-followup] Failed to send nudge to ${conv.customerPhone}:`, sendErr);
    }
  }

  return {
    checkedCount: quietConversations.length,
    nudgedCount,
    conversations: dispatched,
  };
}
