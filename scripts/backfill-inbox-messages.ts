/**
 * O1.2 — Backfill Conversation.messagesJson → InboxMessage rows.
 *
 * Reads every Conversation row, parses its `messagesJson` array, and creates
 * a canonical InboxMessage row for each entry. Idempotent: if an InboxMessage
 * with the same (tenantId, channel, externalId) already exists, it's skipped.
 *
 * Validation:
 *   - Prints before/after counts
 *   - Skips conversations with no tenantId (orphaned)
 *   - Skips messages with no body/content (metadata-only entries)
 *
 * Run after the O1 DDL migration has been applied to Supabase (which adds the
 * `InboxMessage.channel` column and the unique constraint).
 *
 * Usage: bun run scripts/backfill-inbox-messages.ts
 */

import { db } from '../src/lib/db';

interface MessagesJsonEntry {
  id?: string;
  direction?: string; // 'inbound' | 'outbound'
  body?: string;
  content?: string;
  message?: string;
  timestamp?: string;
  createdAt?: string;
  senderType?: string; // 'customer' | 'agent' | 'system' | 'bot'
  senderName?: string;
  senderId?: string;
  externalId?: string; // providerSid, wamid, etc.
  messageType?: string;
  mediaUrl?: string;
  status?: string;
}

async function main() {
  console.log('=== O1.2 Backfill: Conversation.messagesJson → InboxMessage ===\n');

  // Fetch all conversations (limit 1000 per batch to avoid memory issues)
  const BATCH_SIZE = 100;
  let processed = 0;
  let created = 0;
  let skippedExisting = 0;
  let skippedEmpty = 0;
  let skippedOrphan = 0;
  let errors = 0;
  let offset = 0;

  while (true) {
    const conversations = await db.conversation.findMany({
      skip: offset,
      take: BATCH_SIZE,
      select: {
        id: true,
        conversationId: true,
        channel: true,
        messagesJson: true,
        tenantId: true,
      },
    });

    if (conversations.length === 0) break;

    for (const conv of conversations) {
      processed++;

      // Skip orphaned conversations (no tenant)
      if (!conv.tenantId) {
        skippedOrphan++;
        continue;
      }

      // Parse messagesJson
      let messages: MessagesJsonEntry[] = [];
      try {
        messages = JSON.parse(conv.messagesJson || '[]');
      } catch {
        // malformed JSON — skip this conversation
        errors++;
        continue;
      }

      for (const msg of messages) {
        // Get the message body (different fields in different code paths)
        const body = msg.body || msg.content || msg.message || '';
        if (!body || !body.trim()) {
          skippedEmpty++;
          continue;
        }

        // Skip if an InboxMessage already exists for this (tenant, channel, externalId)
        if (msg.externalId && conv.channel && conv.tenantId) {
          const existing = await db.inboxMessage.findFirst({
            where: {
              tenantId: conv.tenantId,
              channel: conv.channel,
              externalId: msg.externalId,
            },
            select: { id: true },
          });
          if (existing) {
            skippedExisting++;
            continue;
          }
        }

        // Determine direction + senderType
        const direction = msg.direction || 'inbound';
        const senderType = msg.senderType || (direction === 'outbound' ? 'agent' : 'customer');

        // Create the InboxMessage row
        try {
          await db.inboxMessage.create({
            data: {
              conversationId: conv.conversationId,
              senderType,
              senderId: msg.senderId || null,
              senderName: msg.senderName || null,
              content: body,
              messageType: msg.messageType || 'text',
              mediaUrl: msg.mediaUrl || null,
              direction,
              status: msg.status || 'delivered',
              externalId: msg.externalId || null,
              isInternalNote: false,
              mentionsJson: '[]',
              reactionsJson: '[]',
              metadataJson: '{}',
              channel: conv.channel,
              attachmentsJson: '[]',
              tenantId: conv.tenantId,
            },
          });
          created++;
        } catch (err: unknown) {
          // P2002 = unique constraint — concurrent backfill or pre-existing row
          if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
            skippedExisting++;
          } else {
            errors++;
            console.error(`  Error on conversation ${conv.conversationId}:`, (err as Error).message);
          }
        }
      }
    }

    offset += BATCH_SIZE;
    if (offset % 200 === 0 || conversations.length < BATCH_SIZE) {
      console.log(`  Processed ${processed} conversations... (created ${created}, skipped existing ${skippedExisting}, empty ${skippedEmpty}, orphan ${skippedOrphan}, errors ${errors})`);
    }

    if (conversations.length < BATCH_SIZE) break;
  }

  console.log('\n=== Backfill complete ===');
  console.log(`Conversations processed: ${processed}`);
  console.log(`InboxMessage rows created: ${created}`);
  console.log(`Skipped (already existed): ${skippedExisting}`);
  console.log(`Skipped (empty body): ${skippedEmpty}`);
  console.log(`Skipped (orphaned, no tenant): ${skippedOrphan}`);
  console.log(`Errors: ${errors}`);

  // Validate counts
  const totalInbox = await db.inboxMessage.count();
  console.log(`\nTotal InboxMessage rows in DB: ${totalInbox}`);
}

main().catch((e) => {
  console.error('Backfill failed:', e.message);
  process.exit(1);
});
