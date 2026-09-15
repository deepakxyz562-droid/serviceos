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
