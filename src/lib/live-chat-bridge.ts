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
export async function findOrCreateLiveChatConversation(
  sessionId: string,
  tenantId: string,
  visitorName?: string | null,
  visitorPhone?: string | null,
  visitorEmail?: string | null,
): Promise<string> {
  const conversationId = `live_chat_${sessionId}`;

  // Check if the conversation already exists
  const existing = await db.conversation.findFirst({
    where: { conversationId },
    select: { conversationId: true },
  });
  if (existing) {
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
    select: { visitorName: true, visitorPhone: true, visitorEmail: true, tenantId: true },
  });
  if (!session) {
    return; // session doesn't exist — can't mirror
  }

  const conversationId = await findOrCreateLiveChatConversation(
    sessionId,
    tenantId,
    session.visitorName,
    session.visitorPhone,
    session.visitorEmail,
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
