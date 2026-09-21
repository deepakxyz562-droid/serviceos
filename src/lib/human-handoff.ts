/**
 * Human Handoff Service
 *
 * Manages the transition between AI and human operators in conversations.
 *
 * Flow:
 *   AI Conversation → Customer requests human → Conversation assigned →
 *   Human replies → AI paused → Human resolves → AI resumed (or closed)
 *
 * When a human operator sends a message in a conversation that was being
 * handled by AI, the AI is automatically paused (aiPaused=true). The AI
 * auto-reply system checks aiPaused and skips if true.
 */

import { db } from '@/lib/db';
import { callAI, isAiConfiguredAsync } from '@/lib/ai-client';
import { sendEmail } from '@/lib/email-send';
import { renderChatHandoffSummaryEmail } from '@/lib/email-templates/chat-handoff-summary';

export interface HandoffState {
  aiPaused: boolean;
  tookOverById: string | null;
  tookOverAt: Date | null;
}

/**
 * Take over a conversation from the AI.
 * Sets aiPaused=true, records the operator + timestamp.
 */
export async function takeOverConversation(
  conversationId: string,
  operatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        aiPaused: true,
        tookOverById: operatorId,
        tookOverAt: new Date(),
      },
    });
    return { success: true };
  } catch (error) {
    console.error('[takeOverConversation] Error:', error);
    return { success: false, error: 'Failed to take over conversation' };
  }
}

/**
 * Resume AI auto-replies for a conversation.
 * Called when the human operator explicitly hands back to AI, or when
 * the conversation is closed and a new inbound message arrives.
 */
export async function resumeAIConversation(
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        aiPaused: false,
        tookOverById: null,
        tookOverAt: null,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('[resumeAIConversation] Error:', error);
    return { success: false, error: 'Failed to resume AI conversation' };
  }
}

/**
 * Check if AI auto-reply should be skipped for a conversation.
 * Called by the auto-reply system before generating a response.
 *
 * Returns true (skip AI) if:
 * - aiPaused is true (human has taken over)
 * - OR tookOverAt is within the last 30 minutes (grace period after
 *   human's last reply — prevents AI from interrupting an active human chat)
 */
export async function shouldSkipAIReply(conversationId: string): Promise<boolean> {
  try {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { aiPaused: true, tookOverAt: true },
    });

    if (!conversation) return false;

    // Explicitly paused
    if (conversation.aiPaused) return true;

    // Grace period: if a human took over in the last 30 minutes, skip AI
    // even if aiPaused was reset (covers the case where the operator sent
    // a message but didn't explicitly "take over").
    if (conversation.tookOverAt) {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (conversation.tookOverAt > thirtyMinAgo) return true;
    }

    return false;
  } catch (error) {
    console.error('[shouldSkipAIReply] Error:', error);
    // On error, skip AI (fail-safe — don't let AI reply when uncertain)
    return true;
  }
}

/**
 * Mark that a human sent a message in this conversation.
 * This auto-pauses AI if it wasn't already paused, and updates the
 * tookOverAt timestamp to start/extend the grace period.
 */
export async function recordHumanReply(conversationId: string, operatorId: string): Promise<void> {
  try {
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        aiPaused: true,
        tookOverById: operatorId,
        tookOverAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[recordHumanReply] Error:', error);
  }
}

// ─── Email Notification for Human Handoff ──────────────────────────────────

/**
 * Notify tenant admins that a chat has been escalated to a human.
 *
 * This is called when the AI auto-reply decides it can't handle a message
 * (e.g., complex pricing question, customer frustration, explicit request
 * for a human). It:
 *   1. Generates an AI conversation summary from the chat history
 *   2. Pauses AI auto-reply (calls takeOverConversation)
 *   3. Sends an email to all tenant admins with the summary + chat link
 *
 * The email ensures the form owner knows about the escalation even if
 * they're not actively watching the dashboard — it's the email-first
 * notification path for human handoff.
 *
 * @param sessionId  The PublicChatSession ID
 * @param tenantId   The tenant ID
 * @param formId     Optional form ID (to look up form name for the email)
 * @returns true if notification was sent, false on failure
 */
export async function notifyHumanHandoff(
  sessionId: string,
  tenantId: string,
  formId?: string | null,
): Promise<boolean> {
  try {
    // 1. Load the chat session + recent messages
    const session = await db.publicChatSession.findFirst({
      where: { id: sessionId, tenantId },
      select: {
        id: true,
        visitorName: true,
        visitorEmail: true,
        visitorPhone: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20, // last 20 messages for the summary
          select: { senderType: true, body: true, createdAt: true },
        },
      },
    });

    if (!session) {
      console.warn('[notifyHumanHandoff] Session not found:', sessionId);
      return false;
    }

    // 2. Look up the tenant name
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const tenantName = tenant?.name || 'Your business';

    // 3. Look up the form name (if formId provided)
    let formName: string | null = null;
    if (formId) {
      const form = await db.form.findFirst({
        where: { id: formId, tenantId },
        select: { name: true },
      });
      formName = form?.name || null;
    }

    // 4. Generate AI conversation summary
    const conversationSummary = await generateConversationSummary(session.messages);

    // 5. Find tenant admins to notify
    const recipients = await db.user.findMany({
      where: {
        tenantId,
        role: { in: ['owner', 'admin'] },
        isActive: true,
      },
      select: { id: true, email: true },
    });

    if (recipients.length === 0) {
      console.warn('[notifyHumanHandoff] No admin recipients found for tenant:', tenantId);
      return false;
    }

    // 6. Take over the conversation (pause AI)
    // We do this on the PublicChatSession by updating its status.
    await db.publicChatSession.update({
      where: { id: sessionId },
      data: {
        status: 'claimed',
        lastMessageAt: new Date(),
      },
    });

    // 7. Send email to all admins
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com'}/?view=liveChat&session=${sessionId}`;
    const { subject, html, text } = renderChatHandoffSummaryEmail({
      visitorName: session.visitorName,
      visitorEmail: session.visitorEmail,
      visitorPhone: session.visitorPhone,
      tenantName,
      formName,
      sessionId,
      conversationSummary,
      dashboardUrl,
    });

    await Promise.all(
      recipients.map(async (r) => {
        if (!r.email) return;
        try {
          await sendEmail({
            to: r.email,
            subject,
            html,
            text,
            tenantId,
            usageType: 'transactional',
          });
        } catch (emailErr) {
          console.warn('[notifyHumanHandoff] Email send failed for', r.email, ':', emailErr);
        }
      }),
    );

    console.log(`[notifyHumanHandoff] Notified ${recipients.length} admins for session ${sessionId}`);
    return true;
  } catch (error) {
    console.error('[notifyHumanHandoff] Error:', error);
    return false;
  }
}

/**
 * Generate a concise AI summary of the conversation.
 *
 * If AI is not configured, falls back to a simple last-message preview.
 */
async function generateConversationSummary(
  messages: Array<{ senderType: string; body: string; createdAt: Date }>,
): Promise<string> {
  // Build a transcript for the AI to summarize
  const transcript = messages
    .map((m) => {
      const sender = m.senderType === 'visitor' ? 'Visitor' :
                     m.senderType === 'admin' ? 'Agent' : 'System';
      return `${sender}: ${m.body}`;
    })
    .join('\n');

  if (!transcript.trim()) {
    return 'No messages in this conversation yet.';
  }

  // Try AI summary
  try {
    const aiConfigured = await isAiConfiguredAsync();
    if (!aiConfigured) {
      return generateFallbackSummary(messages);
    }

    const result = await callAI({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes live chat conversations for customer service agents. Create a concise summary (3-5 bullet points) of the key points: what the visitor needs, any contact info provided, urgency level, and what action the agent should take. Start each bullet with "•". Keep it under 200 words.',
        },
        {
          role: 'user',
          content: `Please summarize this conversation:\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 300,
    });

    const summary = (result?.content || '').trim();
    return summary || generateFallbackSummary(messages);
  } catch (err) {
    console.warn('[generateConversationSummary] AI failed, using fallback:', err);
    return generateFallbackSummary(messages);
  }
}

/**
 * Fallback summary when AI is unavailable — just shows the last visitor message.
 */
function generateFallbackSummary(
  messages: Array<{ senderType: string; body: string }>,
): string {
  const lastVisitorMsg = [...messages].reverse().find((m) => m.senderType === 'visitor');
  if (lastVisitorMsg) {
    return `• Visitor's last message: "${lastVisitorMsg.body.slice(0, 150)}"\n• Please review the full conversation and respond.`;
  }
  return '• A visitor is waiting for a response. Please open the chat to see the full conversation.';
}
