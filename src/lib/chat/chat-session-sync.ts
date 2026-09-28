/**
 * Real-Time PublicChatSession & Message Sync Service
 *
 * Ensures every visitor-agent chat conversation is recorded into PublicChatSession
 * and PublicChatMessage so it instantly appears on the Live Chat dashboard board.
 */

import { db } from '@/lib/db';

export interface ChatSyncParams {
  sessionId?: string | null;
  tenantId?: string | null;
  workspaceId?: string | null;
  formId?: string | null;
  agentId?: string | null;
  visitorName?: string | null;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
  userMessage: string;
  aiReply: string;
  agentName?: string | null;
}

export interface ChatSyncResult {
  sessionId: string;
  isNewSession: boolean;
}

export async function syncChatConversation(params: ChatSyncParams): Promise<ChatSyncResult> {
  const {
    sessionId: incomingSessionId,
    tenantId,
    workspaceId,
    formId,
    visitorName = 'Chat Visitor',
    visitorEmail,
    visitorPhone,
    userMessage,
    aiReply,
    agentName = 'AI Assistant',
  } = params;

  let session = incomingSessionId
    ? await db.publicChatSession.findUnique({ where: { id: incomingSessionId } }).catch(() => null)
    : null;

  let isNewSession = false;

  if (!session) {
    isNewSession = true;

    // Verify foreign keys exist to avoid Postgres FK constraint errors
    let validTenantId: string | null = null;
    if (tenantId) {
      const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } }).catch(() => null);
      if (t) validTenantId = t.id;
    }

    let validWorkspaceId: string | null = null;
    if (workspaceId) {
      const w = await db.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } }).catch(() => null);
      if (w) validWorkspaceId = w.id;
    }

    let validFormId: string | null = null;
    if (formId) {
      const f = await db.form.findFirst({
        where: { OR: [{ id: formId }, { slug: formId }] },
        select: { id: true },
      }).catch(() => null);
      if (f) validFormId = f.id;
    }

    try {
      session = await db.publicChatSession.create({
        data: {
          tenantId: validTenantId,
          workspaceId: validWorkspaceId,
          formId: validFormId,
          visitorName: visitorName || 'Chat Visitor',
          visitorEmail: visitorEmail || null,
          visitorPhone: visitorPhone || null,
          status: 'active',
          unreadCount: 1,
          lastMessageAt: new Date(),
          metadataJson: JSON.stringify({
            agentName,
            channel: 'floating_ai_widget',
          }),
        },
      });
    } catch (err) {
      console.warn('[chat-session-sync] Failed to create session:', err);
      // Fallback: return pseudo session ID if DB constraint prevents creation
      return { sessionId: incomingSessionId || `temp_${Date.now()}`, isNewSession: false };
    }
  }

  if (!session) {
    return { sessionId: incomingSessionId || `temp_${Date.now()}`, isNewSession: false };
  }

  if (!isNewSession) {
    // Update existing session's lastMessageAt and unreadCount
    await db.publicChatSession.update({
      where: { id: session.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
    }).catch(() => null);
  }

  // Persist visitor's message
  if (userMessage && userMessage.trim()) {
    await db.publicChatMessage.create({
      data: {
        sessionId: session.id,
        senderType: 'visitor',
        body: userMessage.trim(),
      },
    }).catch(() => null);
  }

  // Persist AI's reply
  if (aiReply && aiReply.trim()) {
    await db.publicChatMessage.create({
      data: {
        sessionId: session.id,
        senderType: 'ai',
        body: aiReply.trim(),
      },
    }).catch(() => null);
  }

  return { sessionId: session.id, isNewSession };
}
