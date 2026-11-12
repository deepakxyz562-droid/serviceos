/**
 * Live Chat Bridge — mirrors PublicChatMessage ↔ InboxMessage.
 * ===========================================================================
 *
 * O1 decision D: keep `PublicChatMessage` as the Live Chat transport/storage
 * required by the website widget, while `InboxMessage` becomes the canonical
 * unified Inbox representation. This service mirrors every live chat message
 * into InboxMessage so the omnichannel inbox shows live chat conversations
 * alongside WhatsApp/SMS/Email.
 *
 * Architecture:
 *   Website visitor
 *       ↓
 *   PublicChatSession (tenant-scoped, visitor info)
 *       ↓
 *   PublicChatMessage (widget transport — kept)
 *       ↓ (mirror)
 *   Conversation (channel='live_chat', customerPhone = visitor fingerprint)
 *       ↓
 *   InboxMessage (canonical — read by omnichannel inbox)
 *
 * The Conversation is created lazily on the first message and linked to the
 * PublicChatSession via a metadata field on the Conversation row. The
 * conversationId (the @unique string) is derived from the session ID so
 * repeated messages from the same session land in the same conversation.
 */

import { db } from '@/lib/db';
import { createInboundMessage, createOutboundMessage } from '@/lib/inbox-message-service';

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Find or create the Conversation for a PublicChatSession.
 *
 * The conversationId is deterministic: `live_chat_${sessionId}`. This lets us
 * find the conversation from the session ID without storing an explicit FK
 * (which would require a schema migration on PublicChatSession).
 *
 * Returns the conversationId (the @unique string, NOT the PK id).
 */
export function extractLiveChatSessionId(conversationId: string): string | null {
  if (!conversationId || !conversationId.startsWith('live_chat_')) {
    return null;
  }
  const sessionId = conversationId.slice('live_chat_'.length).trim();
  return sessionId || null;
}

export async function findOrCreateLiveChatConversation(
  sessionId: string,
  tenantId: string,
  visitorName?: string | null,
  visitorPhone?: string | null,
  visitorEmail?: string | null,
  workspaceId?: string | null,
): Promise<string> {
  const conversationId = `live_chat_${sessionId}`;

  // Resolve workspaceId if caller omitted it so BGOS mobile Inbox queries matching workspaceId still see it
  let resolvedWorkspaceId = workspaceId || null;
  if (!resolvedWorkspaceId && typeof (db as any).workspace?.findFirst === 'function') {
    const ws = await db.workspace
      .findFirst({ where: { tenantId }, select: { id: true }, orderBy: { createdAt: 'asc' } })
      .catch(() => null);
    resolvedWorkspaceId = ws?.id || null;
  }

  // Check if the conversation already exists
  const existing = await db.conversation.findFirst({
    where: { conversationId },
    select: { conversationId: true, workspaceId: true },
  });
  if (existing) {
    if (!existing.workspaceId && resolvedWorkspaceId) {
      await db.conversation
        .updateMany({ where: { conversationId, workspaceId: null }, data: { workspaceId: resolvedWorkspaceId } })
        .catch(() => {});
    }
    return existing.conversationId;
  }

  // Create the conversation
  // customerPhone: use visitorPhone if available, otherwise a synthetic value
  // derived from the session ID (so the phone field is never empty — it's NOT
  // NULL on the Conversation table).
  const customerPhone = visitorPhone || `visitor_${sessionId.slice(0, 12)}`;
  await db.conversation.create({
    data: {
      conversationId,
      customerPhone,
      customerName: visitorName || null,
      channel: 'livechat',  // Must match channel-meta registry ID (no underscore)
      status: 'active',
      currentStage: 'greeting',
      lastMessageAt: new Date(),
      tenantId,
      ...(resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : {}),
      metadataJson: JSON.stringify({
        liveChatSessionId: sessionId,
        visitorEmail: visitorEmail || null,
        // Flag: this conversation originated from the live chat widget
        source: 'live_chat_widget',
      }),
    },
  });

  return conversationId;
}

/**
 * Mirror a live chat message to InboxMessage.
 *
 * Called after the PublicChatMessage is created. The senderType mapping:
 *   visitor → 'customer' (inbound)
 *   admin   → 'agent'    (outbound)
 *   system  → 'system'   (internal, no externalId)
 *
 * Idempotent: uses the PublicChatMessage.id as the externalId, so duplicate
 * mirror calls (e.g., from a retry) return the existing InboxMessage row.
 */
export async function mirrorLiveChatMessageToInbox(
  publicChatMessageId: string,
  sessionId: string,
  tenantId: string,
  senderType: string, // 'visitor' | 'admin' | 'system'
  body: string,
  senderId?: string | null,
  senderName?: string | null,
): Promise<void> {
  // Find or create the conversation
  const session = await db.publicChatSession.findUnique({
    where: { id: sessionId },
    select: { visitorName: true, visitorPhone: true, visitorEmail: true, tenantId: true, workspaceId: true },
  });
  if (!session) {
    return; // session doesn't exist — can't mirror
  }

  let effectiveWorkspaceId = session.workspaceId || null;
  if (!effectiveWorkspaceId && typeof (db as any).workspace?.findFirst === 'function') {
    const ws = await db.workspace
      .findFirst({ where: { tenantId }, select: { id: true }, orderBy: { createdAt: 'asc' } })
      .catch(() => null);
    effectiveWorkspaceId = ws?.id || null;
  }

  const conversationId = await findOrCreateLiveChatConversation(
    sessionId,
    tenantId,
    session.visitorName,
    session.visitorPhone,
    session.visitorEmail,
    effectiveWorkspaceId,
  );

  // Map sender type
  const isInbound = senderType === 'visitor';
  const externalId = `livechat_${publicChatMessageId}`;

  if (isInbound) {
    await createInboundMessage({
      tenantId,
      conversationId,
      channel: 'livechat',  // Must match channel-meta registry ID (no underscore)
      senderId: `visitor_${sessionId.slice(0, 12)}`,
      senderName: senderName || session.visitorName || undefined,
      content: body,
      messageType: 'text',
      externalId, // idempotency key
      workspaceId: effectiveWorkspaceId || undefined,
      metadataJson: {
        liveChatSessionId: sessionId,
        publicChatMessageId,
      },
    });
  } else if (senderType === 'admin') {
    await createOutboundMessage({
      tenantId,
      conversationId,
      channel: 'livechat',  // Must match channel-meta registry ID (no underscore)
      senderId: senderId || undefined,
      senderName: senderName || undefined,
      content: body,
      messageType: 'text',
      externalId, // idempotency key
      workspaceId: effectiveWorkspaceId || undefined,
      metadataJson: {
        liveChatSessionId: sessionId,
        publicChatMessageId,
      },
    });
  }
  // 'system' messages are not mirrored — they're internal widget state
  // (e.g., "session started", "visitor joined") and don't belong in the
  // unified inbox.
}

/**
 * Mirror an outbound reply or takeover notice sent from Omnichannel Inbox
 * (mobile or web) back into `PublicChatMessage` so the visitor widget polling
 * `/api/public/chat/[sessionId]/messages` receives it immediately.
 */
export async function mirrorInboxReplyToLiveChat(params: {
  conversationId: string;
  senderType: 'admin' | 'system';
  senderId?: string | null;
  senderName?: string | null;
  body: string;
}): Promise<{ messageId: string; sessionId: string } | null> {
  const sessionId = extractLiveChatSessionId(params.conversationId);
  if (!sessionId) return null;

  const session = await db.publicChatSession
    .findUnique({ where: { id: sessionId }, select: { id: true, status: true } })
    .catch(() => null);
  if (!session) return null;

  const text = params.body.trim();
  if (!text) return null;

  const msg = await db.publicChatMessage.create({
    data: {
      sessionId,
      senderType: params.senderType,
      senderId: params.senderId || null,
      senderName: params.senderName || (params.senderType === 'admin' ? 'Business Owner' : 'System'),
      body: text,
    },
    select: { id: true },
  });

  await db.publicChatSession
    .update({
      where: { id: sessionId },
      data: {
        lastMessageAt: new Date(),
        ...(params.senderType === 'admin' ? { unreadCount: 0, status: 'claimed' } : {}),
      },
    })
    .catch(() => {});

  return { messageId: msg.id, sessionId };
}
