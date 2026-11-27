import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';

export interface InactivityResult {
  checkedCount: number;
  nudgedCount: number;
  conversations: Array<{ id: string; phone: string; followUpText: string }>;
}

interface AgentFollowUpPrefs {
  enabled: boolean;
  delayMinutes: number;
  languageMode: 'auto' | 'english' | 'hinglish';
}

async function resolveTenantFollowUpPrefs(
  tenantId: string,
  defaultDelayMinutes: number,
  cache: Map<string, AgentFollowUpPrefs>,
): Promise<AgentFollowUpPrefs> {
  const cached = cache.get(tenantId);
  if (cached) return cached;

  const fallback: AgentFollowUpPrefs = {
    enabled: true,
    delayMinutes: defaultDelayMinutes,
    languageMode: 'auto',
  };

  try {
    const findAgent = (db as any)?.formAgent?.findFirst;
    if (typeof findAgent !== 'function') {
      cache.set(tenantId, fallback);
      return fallback;
    }

    const agent = await findAgent({
      where: { tenantId, status: 'active' },
      orderBy: { updatedAt: 'desc' },
      select: { configJson: true },
    });

    if (agent?.configJson) {
      const cfg =
        typeof agent.configJson === 'string'
          ? JSON.parse(agent.configJson || '{}')
          : agent.configJson;
      const followUp = cfg?.settings?.followUp;
      if (followUp && typeof followUp === 'object') {
        const delayMinutes =
          typeof followUp.delayMinutes === 'number' && followUp.delayMinutes >= 5
            ? Math.min(1440, Math.round(followUp.delayMinutes))
            : defaultDelayMinutes;
        const languageMode: AgentFollowUpPrefs['languageMode'] =
          followUp.languageMode === 'hinglish' || followUp.languageMode === 'english'
            ? followUp.languageMode
            : 'auto';
        const resolved: AgentFollowUpPrefs = {
          enabled: followUp.enabled !== false,
          delayMinutes,
          languageMode,
        };
        cache.set(tenantId, resolved);
        return resolved;
      }
    }
  } catch {
    // Non-fatal: fall back to defaults
  }

  cache.set(tenantId, fallback);
  return fallback;
}

/**
 * Scans open WhatsApp conversations that have gone quiet without customer response
 * and dispatches an automated, context-aware nudge to bring them back.
 */
export async function processWhatsAppInactivityFollowups(params?: {
  inactivityHours?: number;
  maxAgeHours?: number;
  limit?: number;
}): Promise<InactivityResult> {
  const explicitHours = typeof params?.inactivityHours === 'number' ? params.inactivityHours : null;
  const defaultDelayMinutes = explicitHours !== null ? Math.round(explicitHours * 60) : 120;
  // Query floor allows tenants configured for 10-min fast follow-up while respecting explicit overrides
  const queryFloorHours = explicitHours !== null ? explicitHours : 10 / 60;
  const maxHours = params?.maxAgeHours ?? 48;
  const limit = params?.limit ?? 20;

  const now = Date.now();
  const minThreshold = new Date(now - queryFloorHours * 60 * 60 * 1000);
  const maxThreshold = new Date(now - maxHours * 60 * 60 * 1000);

  // 1. Find conversations where the last customer interaction is within the quiet window
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
  const prefsCache = new Map<string, AgentFollowUpPrefs>();

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

    const prefs = await resolveTenantFollowUpPrefs(conv.tenantId, defaultDelayMinutes, prefsCache);
    if (!prefs.enabled) {
      continue;
    }

    // Enforce per-tenant quiet delay (unless overridden explicitly in params)
    const effectiveDelayMs = (explicitHours !== null ? explicitHours * 60 : prefs.delayMinutes) * 60 * 1000;
    const lastMsgMs = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
    if (lastMsgMs > 0 && now - lastMsgMs < effectiveDelayMs) {
      continue;
    }

    const tenant = await db.tenant.findUnique({
      where: { id: conv.tenantId },
      include: { brandProfile: true },
    });

    const businessName = tenant?.brandProfile?.businessName || tenant?.name || 'our team';
    const customerName = conv.customerName || 'there';
    const lastTopic = (conv.lastMessageBody || '').slice(0, 120);

    const languageRule =
      prefs.languageMode === 'hinglish'
        ? '3. Write in warm, natural Hinglish (friendly conversational mix of English and Hindi in Latin script), unless the customer used a strictly non-Latin script.'
        : prefs.languageMode === 'english'
          ? '3. Write in clear, friendly English.'
          : '3. Automatically match the language and script of their prior inquiry (including Hinglish or Hindi if they used it).';

    const prompt = `You are a friendly, helpful assistant for "${businessName}".
A customer named ${customerName} inquired on WhatsApp earlier: "${lastTopic}".
The chat has gone quiet.

Write a warm, polite 1-2 sentence WhatsApp message checking in to see if they still need help or would like to reserve a time slot.
Requirements:
1. Short and natural for WhatsApp (under 40 words).
2. Never pushy or aggressive.
${languageRule}`;

    let followUpText =
      prefs.languageMode === 'hinglish'
        ? `Hi ${customerName}! Still planning your visit with ${businessName}? Batayein agar main aapke liye koi convenient time slot book karne mein help kar sakoon! 😊`
        : `Hi ${customerName}! Still planning your visit with ${businessName}? Let us know if you would like help picking a convenient time slot! 😊`;
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
      const sendRes = await sendWhatsAppMessage({
        tenantId: conv.tenantId,
        to: conv.customerPhone,
        message: followUpText,
      });

      if (sendRes && sendRes.success === false) {
        console.warn(`[inactivity-followup] Send blocked/failed for ${conv.customerPhone}:`, sendRes.error);
        continue;
      }

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
