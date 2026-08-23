/**
 * InboxMessage Service — the canonical write path for Omnichannel messages.
 * ===========================================================================
 *
 * O1 architectural principle:
 *   Every inbound/outbound message from ANY channel (WhatsApp, SMS, Email,
 *   Live Chat, etc.) flows through this service and lands in exactly ONE
 *   table: `InboxMessage`.
 *
 *   - `Conversation.messagesJson` is kept as a read-only cache (NOT written by
 *     new code). It will be removed in a later cleanup.
 *   - `UnifiedMessage` is NOT written to by new code. Existing writes removed.
 *
 * IDEMPOTENCY (the critical O1 requirement):
 *   External channel webhooks (WhatsApp, Twilio SMS, etc.) can fire the same
 *   event more than once. The composite unique constraint on
 *   (tenantId, channel, externalId) prevents duplicate rows at the DB level.
 *   This service uses an idempotent upsert pattern: before creating a row,
 *   it checks for an existing row with the same (tenantId, channel, externalId).
 *   If found, it returns the existing row as a no-op (no duplicate, no error).
 *
 *   For messages with NO externalId (internal/system messages), idempotency
 *   is the caller's responsibility (they should not be retried).
 *
 * ARCHITECTURE BOUNDARY:
 *   Channel adapters (SMS inbound, WhatsApp callback, Live Chat, etc.) call
 *   `createInboundMessage()` / `createOutboundMessage()`. They do NOT write
 *   to InboxMessage directly.
 */

import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InboundMessageInput {
  tenantId: string;
  conversationId: string; // Conversation.conversationId (the @unique string, NOT the PK)
  channel: string; // whatsapp, sms, email, live_chat, messenger, instagram
  senderId?: string; // customer phone, email, or visitor ID
  senderName?: string;
  content: string;
  messageType?: string; // text, image, document, audio, video, location, template, interactive
  mediaUrl?: string;
  mediaCaption?: string;
  externalId?: string; // WhatsApp wamid, Twilio MessageSid, etc. — enables idempotency
  replyToId?: string; // ID of the InboxMessage being replied to
  metadataJson?: Record<string, unknown>;
  workspaceId?: string;
}

export interface OutboundMessageInput {
  tenantId: string;
  conversationId: string;
  channel: string;
  senderId?: string; // userId of the agent
  senderName?: string;
  content: string;
  messageType?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  externalId?: string; // provider message ID (may be unknown until sent — set after send)
  replyToId?: string;
  isInternalNote?: boolean;
  mentionsJson?: string; // JSON array of user IDs
  metadataJson?: Record<string, unknown>;
  workspaceId?: string;
  status?: string; // sent, delivered, read, failed (default: sent)
}

export interface CreateMessageResult {
  message: InboxMessageRow;
  created: boolean; // false if this was an idempotent retry (existing row returned)
}

export interface InboxMessageRow {
  id: string;
  conversationId: string;
  senderType: string;
  senderId: string | null;
  senderName: string | null;
  content: string;
  messageType: string;
  mediaUrl: string | null;
  mediaCaption: string | null;
  direction: string;
  status: string;
  externalId: string | null;
  replyToId: string | null;
  isInternalNote: boolean;
  mentionsJson: string;
  reactionsJson: string;
  metadataJson: string;
  channel: string | null;
  attachmentsJson: string;
  tenantId: string | null;
  createdAt: string | null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create an inbound message with idempotency.
 *
 * If a message with the same (tenantId, channel, externalId) already exists
 * (e.g., a webhook redelivery), return the existing row as a no-op.
 *
 * Also updates the parent Conversation's lastMessage* fields so the inbox
 * list shows the latest activity without a separate write.
 */
export async function createInboundMessage(
  input: InboundMessageInput,
): Promise<CreateMessageResult> {
  const {
    tenantId,
    conversationId,
    channel,
    senderId,
    senderName,
    content,
    messageType = 'text',
    mediaUrl,
    mediaCaption,
    externalId,
    replyToId,
    metadataJson,
    workspaceId,
  } = input;

  // ── 1. Idempotency check ──
  // If we have an externalId, check for an existing row with the same
  // (tenantId, channel, externalId). The DB-level @@unique constraint is
  // the final safety net, but checking first lets us return the existing
  // row (instead of throwing) on a redelivery.
  if (externalId) {
    const existing = await db.inboxMessage.findFirst({
      where: { tenantId, channel, externalId },
    });
    if (existing) {
      return { message: serialize(existing), created: false };
    }
  }

  // ── 2. Create the InboxMessage row ──
  let message;
  try {
    message = await db.inboxMessage.create({
      data: {
        conversationId,
        senderType: 'customer',
        senderId: senderId || null,
        senderName: senderName || null,
        content,
        messageType,
        mediaUrl: mediaUrl || null,
        mediaCaption: mediaCaption || null,
        direction: 'inbound',
        status: 'delivered',
        externalId: externalId || null,
        replyToId: replyToId || null,
        isInternalNote: false,
        mentionsJson: '[]',
        reactionsJson: '[]',
        metadataJson: JSON.stringify(metadataJson || {}),
        channel,
        attachmentsJson: '[]',
        tenantId,
        workspaceId: workspaceId || null,
      },
    });
  } catch (err: unknown) {
    // P2002 = unique constraint violation (race condition: another concurrent
    // webhook won). Retrieve the winner's row and return it as idempotent.
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
      const winner = await db.inboxMessage.findFirst({
        where: { tenantId, channel, externalId },
      });
      if (winner) {
        return { message: serialize(winner), created: false };
      }
    }
    throw err;
  }

  // ── 3. Update the parent Conversation's lastMessage* fields (non-fatal) ──
  await db.conversation
    .updateMany({
      where: { conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessageBody: content.slice(0, 500),
        lastDirection: 'inbound',
      },
    })
    .catch(() => {
      // non-fatal — the conversation might not exist yet (shouldn't happen if
      // the adapter created it first, but we don't fail the message save)
    });

  return { message: serialize(message), created: true };
}

/**
 * Create an outbound message (agent → customer).
 *
 * Idempotency applies only if `externalId` is provided (e.g., the provider
 * message ID after a successful send). Internal notes (isInternalNote=true)
 * are NOT idempotent — callers should not retry them.
 */
export async function createOutboundMessage(
  input: OutboundMessageInput,
): Promise<CreateMessageResult> {
  const {
    tenantId,
    conversationId,
    channel,
    senderId,
    senderName,
    content,
    messageType = 'text',
    mediaUrl,
    mediaCaption,
    externalId,
    replyToId,
    isInternalNote = false,
    mentionsJson = '[]',
    metadataJson,
    workspaceId,
    status = 'sent',
  } = input;

  // ── 1. Idempotency check (only if externalId provided) ──
  if (externalId) {
    const existing = await db.inboxMessage.findFirst({
      where: { tenantId, channel, externalId },
    });
    if (existing) {
      return { message: serialize(existing), created: false };
    }
  }

  // ── 2. Create the InboxMessage row ──
  let message;
  try {
    message = await db.inboxMessage.create({
      data: {
        conversationId,
        senderType: 'agent',
        senderId: senderId || null,
        senderName: senderName || null,
        content,
        messageType,
        mediaUrl: mediaUrl || null,
        mediaCaption: mediaCaption || null,
        direction: 'outbound',
        status,
        externalId: externalId || null,
        replyToId: replyToId || null,
        isInternalNote,
        mentionsJson,
        reactionsJson: '[]',
        metadataJson: JSON.stringify(metadataJson || {}),
        channel,
        attachmentsJson: '[]',
        tenantId,
        workspaceId: workspaceId || null,
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
      const winner = await db.inboxMessage.findFirst({
        where: { tenantId, channel, externalId },
      });
      if (winner) {
        return { message: serialize(winner), created: false };
      }
    }
    throw err;
  }

  // ── 3. Update the parent Conversation (non-fatal) ──
  await db.conversation
    .updateMany({
      where: { conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessageBody: content.slice(0, 500),
        lastDirection: 'outbound',
      },
    })
    .catch(() => {});

  return { message: serialize(message), created: true };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function serialize(m: Record<string, unknown>): InboxMessageRow {
  return {
    id: m.id as string,
    conversationId: m.conversationId as string,
    senderType: m.senderType as string,
    senderId: (m.senderId as string) || null,
    senderName: (m.senderName as string) || null,
    content: m.content as string,
    messageType: m.messageType as string,
    mediaUrl: (m.mediaUrl as string) || null,
    mediaCaption: (m.mediaCaption as string) || null,
    direction: m.direction as string,
    status: m.status as string,
    externalId: (m.externalId as string) || null,
    replyToId: (m.replyToId as string) || null,
    isInternalNote: m.isInternalNote as boolean,
    mentionsJson: m.mentionsJson as string,
    reactionsJson: m.reactionsJson as string,
    metadataJson: m.metadataJson as string,
    channel: (m.channel as string) || null,
    attachmentsJson: m.attachmentsJson as string,
    tenantId: (m.tenantId as string) || null,
    createdAt: (m.createdAt as string) || null,
  };
}
