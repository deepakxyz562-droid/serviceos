import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveWhatsAppConfig } from '@/lib/whatsapp-config';
import { executeWorkflow, type NodeOutput } from '@/lib/workflow-executor';
import { maybeAutoReply } from '@/lib/auto-reply';
import { createInboundMessage } from '@/lib/inbox-message-service';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { recordWhatsAppOutboundInboxMessage } from '@/lib/whatsapp/inbox-sync';
import { sanitizePublicImageUrl } from '@/lib/bgos-business-sanitizers';
import { getAppUrl } from '@/lib/brand';
import { callAI, type ChatMessage } from '@/lib/ai-client';
import {
  extractBookingIntent,
  tryExecuteChatBooking,
  upsertWhatsAppInquiryLead,
} from '@/lib/scheduling/chat-booking-helper';
import { checkAvailability } from '@/lib/scheduling/ai-tools';
import { getLocalDateParts, resolveTenantLocale } from '@/lib/locale-timezone';
import crypto from 'crypto';

// Well-known dev fallback tokens — accepted ONLY outside production so local
// webhook setup keeps working. In production, verification requires a real
// configured token (resolveWhatsAppConfig / WHATSAPP_VERIFY_TOKEN / META_VERIFY_TOKEN).
const DEV_FALLBACK_TOKENS = ['fieseros_verify_token', 'flowforge_verify_token'];

/**
 * Verify the X-Hub-Signature-256 header sent by Meta.
 * Meta signs every webhook payload with HMAC-SHA256 using the App Secret.
 * Without this check, anyone can POST fake inbound messages to the webhook.
 *
 * Meta App Review specifically tests that unsigned payloads are rejected.
 */
function verifySignature(request: NextRequest, rawBody: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if (!appSecret) {
    // FAIL-CLOSED: if no app secret is configured, reject the payload.
    // Meta App Review specifically tests that unsigned/unverifiable
    // payloads are rejected. Silently allowing them is a spoofing
    // vulnerability — anyone could POST fake inbound messages.
    console.error('[whatsapp/callback] WHATSAPP_APP_SECRET not set — REJECTING payload (fail-closed). Set WHATSAPP_APP_SECRET in env to accept Meta webhooks.');
    return false;
  }

  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) {
    console.warn('[whatsapp/callback] Missing X-Hub-Signature-256 header — rejecting');
    return false;
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks.
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length) {
      console.warn('[whatsapp/callback] X-Hub-Signature-256 length mismatch — possible spoofing attempt');
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    console.warn('[whatsapp/callback] X-Hub-Signature-256 invalid format — rejecting');
    return false;
  }
}

/**
 * GET - Webhook verification endpoint
 * WhatsApp requires this to verify the webhook during setup
 */
export async function GET(request: NextRequest) {
  try {
    const config = await resolveWhatsAppConfig();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Production (NODE_ENV=production) with no configured token rejects
    // verification (fail-closed); outside production the dev fallback tokens
    // above are still accepted so local webhook setup doesn't break.
    const isProduction = process.env.NODE_ENV === 'production';
    const candidates = [
      config.verifyToken,
      process.env.WHATSAPP_VERIFY_TOKEN,
      process.env.META_VERIFY_TOKEN,
      ...(isProduction ? [] : DEV_FALLBACK_TOKENS),
    ].filter(Boolean) as string[];
    // The well-known dev tokens must never verify a production webhook, even
    // when the config fallback chain (whatsapp-config.ts) returns one of them.
    const validTokens = new Set(
      isProduction ? candidates.filter((t) => !DEV_FALLBACK_TOKENS.includes(t)) : candidates,
    );

    if (mode === 'subscribe' && token && validTokens.has(token)) {
      console.log('WhatsApp webhook verified successfully');
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.warn('WhatsApp webhook verification failed', { mode, token });
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 403 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook verification error';
    console.error('WhatsApp webhook verification error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST - Receive WhatsApp webhook callbacks
 * Handles:
 * - Message status updates (sent, delivered, read)
 * - Interactive message responses (button clicks, list item selections)
 * - On-select webhook triggers (dynamic list item selection → trigger webhook/workflow)
 * - Native updateJobAssignee action (update job table on selection)
 *
 * SECURITY: Verifies X-Hub-Signature-256 header before processing.
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification BEFORE parsing JSON
    const rawBody = await request.text();

    // Verify the webhook signature (Meta App Review requirement)
    if (!verifySignature(request, rawBody)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    console.log('WhatsApp webhook callback received:', JSON.stringify(body, null, 2));

    // WhatsApp sends an array of entry objects
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;

        // Handle message status updates
        if (value?.statuses) {
          for (const status of value.statuses) {
            await handleMessageStatus(status);
          }
        }

        // Handle Coexistence manual replies sent from owner's WhatsApp Business mobile app
        if (value?.message_echoes) {
          for (const echo of value.message_echoes) {
            await handleCoexistenceMessageEcho(echo, value);
          }
        }

        // Handle Coexistence initial history backfill (without firing AI auto-replies)
        if (change.field === 'history' || Array.isArray(value?.history)) {
          await handleCoexistenceHistorySync(value);
        }

        if (change.field === 'smb_app_state_sync' && value) {
          console.log('[WhatsApp Callback] smb_app_state_sync received');
        }

        if (change.field === 'account_update' && value) {
          console.log('[WhatsApp Callback] account_update event received:', JSON.stringify(value));
        }

        // Handle incoming messages (interactive responses + plain-text inbound)
        if (value?.messages) {
          for (const message of value.messages) {
            await handleIncomingMessage(message, value);
          }
        }
      }
    }

    // WhatsApp expects a 200 OK response quickly
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook callback error';
    console.error('WhatsApp webhook callback error:', message);
    // Still return 200 to prevent WhatsApp from retrying
    return NextResponse.json({ success: true, warning: message });
  }
}

/**
 * Handle message status updates from WhatsApp
 */
async function handleMessageStatus(status: Record<string, unknown>) {
  try {
    const { id: messageId, status: messageStatus, recipient_id: recipientId } = status as { id: string; status: string; recipient_id: string };

    console.log(`Message ${messageId} status: ${messageStatus} for recipient ${recipientId}`);

    // Find the job associated with this message
    const job = await db.job.findFirst({
      where: { whatsappMessageId: messageId },
    });

    if (!job) {
      console.warn(`No job found for WhatsApp message ID: ${messageId}`);
      return;
    }

    // Map WhatsApp status to our assignment status
    const statusMap: Record<string, string> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
    };

    const assignmentStatus = statusMap[messageStatus];
    if (assignmentStatus) {
      await db.job.update({
        where: { id: job.id },
        data: { assignmentStatus },
      });
    }
  } catch (error) {
    console.error('Error handling message status:', error);
  }
}

/**
 * Handle incoming message from WhatsApp.
 *
 * Two branches:
 * 1. Plain-text inbound (no `interactive` field): the visitor sent a chat
 *    message. We resolve the tenant from `value.metadata.phone_number_id`,
 *    create a Conversation + InboxMessage, then call maybeAutoReply which
 *    (when the tenant is offline) generates + saves + sends a reply back
 *    via sendWhatsAppMessage(). If the tenant is online, no auto-reply fires
 *    and the message simply lands in the inbox for an agent to handle.
 * 2. Interactive response (`interactive` field present): button_reply /
 *    list_reply handling for workflows and job assignment (unchanged).
 *
 * Supported:
 * 1. List reply (user selected an item from a list)
 * 2. Button reply (user clicked a quick reply button)
 * 3. On-select webhook triggers (configured in WhatsApp node config)
 * 4. Native updateJobAssignee action (update job assignee on selection)
 */
async function handleIncomingMessage(
  message: Record<string, unknown>,
  value?: Record<string, unknown>,
) {
  try {
    const { from: senderPhone, interactive, id: messageId, context: messageContext } = message as {
      from: string;
      interactive: Record<string, unknown> | undefined;
      id: string;
      context?: { id?: string; forwarded?: boolean };
    };

    // ─── Template Button Quick Reply branch (Meta sends message.type === 'button') ─
    const messageType = (message as { type?: string }).type;
    if (messageType === 'button') {
      const btn = (message as { button?: { text?: string; payload?: string } }).button;
      const btnText = btn?.text || btn?.payload || '';
      console.log(`[WhatsApp Callback] Template button clicked: text="${btnText}", from=${senderPhone}`);
      await handleJobAcceptanceOrDecline({
        buttonText: btnText,
        senderPhone,
      });
      return;
    }

    // ─── Plain-text inbound branch ──────────────────────────────────────────
    // Triggered when there's no `interactive` field. Delegates to
    // handlePlainTextInbound which creates a Conversation + InboxMessage and
    // calls maybeAutoReply. Interactive messages fall through to the original
    // list/button reply handlers below.
    if (!interactive) {
      if (messageType === 'text') {
        const textBody = ((message as { text?: { body?: string } }).text?.body || '').trim().toLowerCase();
        // Check if technician sent "accept job", "accept", "decline", or "reject"
        if (textBody === 'accept job' || textBody === 'accept' || textBody === 'decline' || textBody === 'reject job' || textBody === 'reject') {
          console.log(`[WhatsApp Callback] Text command received: "${textBody}", from=${senderPhone}`);
          await handleJobAcceptanceOrDecline({
            buttonText: textBody,
            senderPhone,
          });
          return;
        }
        await handlePlainTextInbound(message, value);
      } else {
        // Other non-text, non-interactive types (image, audio, location,
        // document, etc.) — log and ignore. Auto-reply only fires on text.
        console.log('[WhatsApp Callback] Non-text non-interactive message received, ignoring');
      }
      return;
    }

    // ─── Handle list reply (user selected an item from list) ────────────────
    if (interactive.type === 'list_reply') {
      const listReply = interactive.list_reply as Record<string, string> | undefined;
      const selectedId = listReply?.id;       // e.g., "driver_xxxxx" or "dynamic_1"
      const selectedTitle = listReply?.title;  // e.g., "Rahul Kumar"
      const selectedDescription = listReply?.description;

      console.log(`[WhatsApp Callback] List reply: id=${selectedId}, title=${selectedTitle}, from=${senderPhone}`);

      // Check if there's a stored message action for the original message
      const originalMessageId = messageContext?.id;
      if (originalMessageId) {
        await handleOnSelectAction(originalMessageId, {
          selectedId: selectedId || '',
          selectedTitle: selectedTitle || '',
          selectedDescription: selectedDescription || '',
          senderPhone,
          interactiveType: 'list_reply',
        });
      }

      // Legacy: handle driver_ prefixed IDs for job assignment
      if (selectedId?.startsWith('driver_')) {
        await handleDriverSelection(selectedId, senderPhone);
      }
    }

    // ─── Handle button reply (user clicked a quick reply button) ────────────
    if (interactive.type === 'button_reply') {
      const buttonReply = interactive.button_reply as Record<string, string> | undefined;
      const buttonId = buttonReply?.id || '';
      const buttonTitle = buttonReply?.title || '';

      console.log(`[WhatsApp Callback] Button reply: id=${buttonId}, title=${buttonTitle}, from=${senderPhone}`);

      // Check for on-select workflow action
      const originalMessageId = messageContext?.id;
      let hasWorkflowAction = false;
      if (originalMessageId) {
        hasWorkflowAction = await db.whatsAppMessageAction
          .findUnique({ where: { whatsappMessageId: originalMessageId }, select: { id: true } })
          .then((row) => Boolean(row))
          .catch(() => false);
        await handleOnSelectAction(originalMessageId, {
          selectedId: buttonId,
          selectedTitle: buttonTitle,
          selectedDescription: '',
          senderPhone,
          interactiveType: 'button_reply',
        });
      }

      // Handle accept/decline action for field technicians
      const handledJobAction = await handleJobAcceptanceOrDecline({
        buttonId,
        buttonText: buttonTitle,
        senderPhone,
      });

      // Route customer interactive button taps (e.g., View Brochure / Book a Slot / Offer CTAs)
      // straight to brochure delivery or the Multilingual Chat AI Agent.
      if (!hasWorkflowAction && !handledJobAction && (buttonTitle || buttonId)) {
        const phoneNumberId =
          (value as { metadata?: { phone_number_id?: string } })?.metadata?.phone_number_id || '';
        const tenantId = await resolveTenantIdByPhoneNumberId(phoneNumberId, true);

        if (buttonId === 'bgos_view_brochure' && tenantId) {
          const tenantRow = await db.tenant
            .findUnique({
              where: { id: tenantId },
              select: { name: true, settingsJson: true },
            })
            .catch(() => null);
          let brochureUrl: string | null = null;
          let bizName = tenantRow?.name || 'Our Team';
          if (tenantRow?.settingsJson) {
            try {
              const s = JSON.parse(tenantRow.settingsJson) as Record<string, any>;
              brochureUrl = sanitizePublicImageUrl(s?.brochureUrl) || null;
              if (typeof s?.bookingPageConfig?.businessName === 'string' && s.bookingPageConfig.businessName.trim()) {
                bizName = s.bookingPageConfig.businessName.trim();
              }
            } catch {}
          }

          if (brochureUrl) {
            const safeFilename = `${bizName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Business'}-Brochure.pdf`;
            const caption = `Here is our updated brochure & rates for ${bizName} 📄 Reply with any question or let me know when you'd like to book a slot!`;
            const docRes = await sendWhatsAppMessage({
              tenantId,
              to: senderPhone,
              message: caption,
              type: 'document',
              mediaUrl: brochureUrl,
              mediaFilename: safeFilename,
            });
            if (docRes.success) {
              await recordWhatsAppOutboundInboxMessage({
                tenantId,
                phone: senderPhone,
                content: caption,
                messageType: 'document',
                mediaUrl: brochureUrl,
                externalId: docRes.messageId || null,
                senderName: `${bizName} AI`,
                metadataJson: { reason: 'interactive_view_brochure', brochureUrl },
              });
              return;
            }
          }
        }

        const mappedPrompt =
          buttonId === 'bgos_book_slot'
            ? 'I would like to book a slot. Which days and times are available?'
            : buttonId === 'bgos_view_brochure'
              ? 'Could you share your brochure, services, and rates?'
              : buttonTitle || buttonId;

        await handlePlainTextInbound(
          {
            ...message,
            type: 'text',
            text: { body: mappedPrompt },
          },
          value,
        );
      }
    }
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

/**
 * Handle plain-text inbound WhatsApp messages (auto-reply path).
 *
 * The WhatsApp Cloud API webhook payload for a text message looks like:
 *   {
 *     "entry": [{
 *       "changes": [{
 *         "value": {
 *           "metadata": { "phone_number_id": "..." },
 *           "messages": [{ "from": "...", "id": "wamid...", "type": "text",
 *                          "text": { "body": "Hi" }, "timestamp": "..." }]
 *         }
 *       }]
 *     }]
 *   }
 *
 * Flow:
 *   1. Extract `from`, `id`, `text.body`, `timestamp` from `message`.
 *   2. Resolve the tenant from `value.metadata.phone_number_id` — looks up
 *      a CommunicationProvider with type='whatsapp' whose configJson or
 *      linked credential contains the matching phoneNumberId. If no tenant
 *      is found, log and bail (we can't attribute the message).
 *   3. Idempotency: if a UnifiedMessage already exists with this externalId
 *      (wamid), skip (WhatsApp retries webhooks).
 *   4. Find or create a Conversation (channel='whatsapp', customerPhone=from).
 *   5. Create an InboxMessage (senderType='customer', direction='inbound').
 *   6. Call maybeAutoReply — the orchestrator checks subscription + config +
 *      presence + cooldown, then generates + saves + sends the reply via
 *      sendWhatsAppMessage() internally. If the tenant is online, no
 *      auto-reply fires.
 */
async function resolveTenantIdByPhoneNumberId(
  phoneNumberId: string,
  allowPlatformFallback = true,
): Promise<string | null> {
  if (phoneNumberId) {
    try {
      const provider = await db.communicationProvider.findFirst({
        where: {
          type: 'whatsapp',
          status: 'active',
          configJson: { contains: phoneNumberId },
        },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        select: { id: true, tenantId: true },
      });
      if (provider?.tenantId) {
        return provider.tenantId;
      }
    } catch (err) {
      console.warn('[WhatsApp Callback] tenant lookup failed:', err);
    }
  }

  if (!allowPlatformFallback) {
    return null;
  }

  // Dynamic platform fallback: resolve active default platform provider for shared-number trial mode
  try {
    const defaultProvider = await db.communicationProvider.findFirst({
      where: {
        type: 'whatsapp',
        status: 'active',
        isDefault: true,
      },
      orderBy: { updatedAt: 'desc' },
      select: { tenantId: true },
    });
    if (defaultProvider?.tenantId) {
      return defaultProvider.tenantId;
    }
    const anyActiveProvider = await db.communicationProvider.findFirst({
      where: {
        type: 'whatsapp',
        status: 'active',
      },
      orderBy: { updatedAt: 'desc' },
      select: { tenantId: true },
    });
    return anyActiveProvider?.tenantId || null;
  } catch (fallbackErr) {
    console.warn('[WhatsApp Callback] dynamic provider fallback lookup failed:', fallbackErr);
    return null;
  }
}

async function upsertWhatsAppInboxConversation(params: {
  tenantId: string;
  customerPhone: string;
  direction: 'inbound' | 'outbound';
  previewBody: string;
  timestamp?: Date;
  pauseAi?: boolean;
}): Promise<string> {
  const { tenantId, customerPhone, direction, previewBody, timestamp, pauseAi = false } = params;
  const digits = customerPhone.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const conv = await db.conversation.findFirst({
    where: {
      tenantId,
      channel: 'whatsapp',
      status: 'active',
      OR: [
        { customerPhone },
        ...(digits ? [{ customerPhone: `+${digits}` }, { customerPhone: digits }] : []),
        ...(last10.length >= 10 ? [{ customerPhone: { endsWith: last10 } }] : []),
      ],
    },
    orderBy: { lastMessageAt: 'desc' },
  }).catch(() => null);

  const eventDate = timestamp || new Date();
  if (conv) {
    const isNewer = !conv.lastMessageAt || eventDate >= new Date(conv.lastMessageAt);
    if (isNewer || pauseAi) {
      await db.conversation.update({
        where: { id: conv.id },
        data: {
          ...(isNewer
            ? {
                lastMessageAt: eventDate,
                lastMessageBody: previewBody,
                lastDirection: direction,
              }
            : {}),
          ...(pauseAi ? { aiPaused: true } : {}),
        },
      });
    }
    return conv.conversationId;
  }

  const conversationId = `conv_wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.conversation.create({
    data: {
      conversationId,
      customerPhone,
      channel: 'whatsapp',
      status: 'active',
      aiPaused: pauseAi,
      currentStage: pauseAi ? 'human_takeover' : 'new',
      lastMessageAt: eventDate,
      lastMessageBody: previewBody,
      lastDirection: direction,
      tenantId,
      messagesJson: '[]',
    },
  });
  return conversationId;
}

/**
 * Sync manual replies sent from the owner's WhatsApp Business phone app (Coexistence)
 * into BGOS Inbox and auto-pause the AI agent on that conversation so AI never talks over the owner.
 */
async function handleCoexistenceMessageEcho(
  echo: Record<string, unknown>,
  value?: Record<string, unknown>,
) {
  try {
    const customerPhone = ((echo as { to?: string }).to || '').trim();
    const businessFrom = ((echo as { from?: string }).from || '').trim();
    const messageId = ((echo as { id?: string }).id || '').trim();
    const msgType = ((echo as { type?: string }).type || 'text').trim();
    const textBody = (
      (echo as { text?: { body?: string } }).text?.body ||
      (echo as { caption?: string }).caption ||
      (echo as { image?: { caption?: string } }).image?.caption ||
      (echo as { document?: { caption?: string } }).document?.caption ||
      `[Sent ${msgType} via WhatsApp Business App]`
    ).toString();

    if (!customerPhone || !textBody) return;

    const phoneNumberId =
      (value as { metadata?: { phone_number_id?: string } })?.metadata?.phone_number_id || '';
    const tenantId = await resolveTenantIdByPhoneNumberId(phoneNumberId, false);
    if (!tenantId) {
      console.warn('[WhatsApp Callback] Coexistence echo skipped — no tenant matched phone_number_id:', phoneNumberId);
      return;
    }

    if (messageId) {
      const dup = await db.inboxMessage.findFirst({
        where: { tenantId, channel: 'whatsapp', externalId: messageId },
        select: { id: true },
      }).catch(() => null);
      if (dup) return;
    }

    const conversationId = await upsertWhatsAppInboxConversation({
      tenantId,
      customerPhone,
      direction: 'outbound',
      previewBody: textBody,
      pauseAi: true,
    });

    await db.inboxMessage.create({
      data: {
        tenantId,
        conversationId,
        channel: 'whatsapp',
        senderId: businessFrom || 'owner',
        senderName: 'Owner (WhatsApp App)',
        senderType: 'human',
        direction: 'outbound',
        content: textBody,
        messageType: msgType === 'image' || msgType === 'document' ? msgType : 'text',
        externalId: messageId || null,
        status: 'delivered',
        metadataJson: JSON.stringify({
          coexistenceEcho: true,
          whatsappMessageId: messageId || undefined,
          phoneNumberId: phoneNumberId || undefined,
        }),
      },
    });
  } catch (err) {
    console.warn('[WhatsApp Callback] Coexistence echo handling error:', err);
  }
}

/**
 * Backfill historical 1-to-1 chats synced by Meta Coexistence (`history` webhook)
 * into BGOS Inbox without triggering AI auto-replies.
 */
async function handleCoexistenceHistorySync(value?: Record<string, unknown>) {
  try {
    if (!value) return;
    const phoneNumberId =
      (value as { metadata?: { phone_number_id?: string } })?.metadata?.phone_number_id || '';
    const businessDigits = (
      (value as { metadata?: { display_phone_number?: string } })?.metadata?.display_phone_number || ''
    ).replace(/\D/g, '');
    const tenantId = await resolveTenantIdByPhoneNumberId(phoneNumberId, false);
    if (!tenantId) return;

    const historyChunks = Array.isArray((value as { history?: unknown[] }).history)
      ? ((value as { history?: Array<Record<string, unknown>> }).history || [])
      : [{ threads: (value as { threads?: unknown[] }).threads }];

    for (const chunk of historyChunks) {
      const threads = Array.isArray(chunk?.threads)
        ? (chunk.threads as Array<Record<string, unknown>>)
        : [];
      for (const thread of threads) {
        const threadPhone = String(thread?.id || '').trim();
        const messages = Array.isArray(thread?.messages)
          ? (thread.messages as Array<Record<string, unknown>>)
          : [];
        for (const msg of messages) {
          const messageId = String(msg?.id || '').trim();
          const fromStr = String(msg?.from || '').trim();
          const toStr = String(msg?.to || '').trim();
          const historyCtx = msg?.history_context as { from_me?: boolean } | undefined;
          const fromDigits = fromStr.replace(/\D/g, '');
          const isOutbound =
            Boolean(historyCtx?.from_me) ||
            (businessDigits.length >= 7 && fromDigits === businessDigits);
          const customerPhone = threadPhone || (isOutbound ? toStr : fromStr);
          if (!customerPhone) continue;

          const msgType = String(msg?.type || 'text').trim();
          const content = String(
            (msg?.text as { body?: string } | undefined)?.body ||
              (msg?.image as { caption?: string } | undefined)?.caption ||
              (msg?.document as { caption?: string } | undefined)?.caption ||
              `[${msgType}]`,
          ).trim();
          if (!content) continue;

          if (messageId) {
            const dup = await db.inboxMessage.findFirst({
              where: { tenantId, channel: 'whatsapp', externalId: messageId },
              select: { id: true },
            }).catch(() => null);
            if (dup) continue;
          }

          const rawTs = Number(msg?.timestamp);
          const msgDate =
            Number.isFinite(rawTs) && rawTs > 0
              ? new Date(rawTs > 1e12 ? rawTs : rawTs * 1000)
              : new Date();

          const conversationId = await upsertWhatsAppInboxConversation({
            tenantId,
            customerPhone,
            direction: isOutbound ? 'outbound' : 'inbound',
            previewBody: content,
            timestamp: msgDate,
            pauseAi: false,
          });

          await db.inboxMessage.create({
            data: {
              tenantId,
              conversationId,
              channel: 'whatsapp',
              senderId: isOutbound ? businessDigits || 'owner' : customerPhone,
              senderName: isOutbound ? 'Owner (History Sync)' : customerPhone,
              senderType: isOutbound ? 'human' : 'customer',
              direction: isOutbound ? 'outbound' : 'inbound',
              content,
              messageType: msgType === 'image' || msgType === 'document' ? msgType : 'text',
              externalId: messageId || null,
              status: isOutbound ? 'delivered' : 'read',
              metadataJson: JSON.stringify({
                coexistenceHistory: true,
                whatsappMessageId: messageId || undefined,
                phoneNumberId: phoneNumberId || undefined,
              }),
            },
          });
        }
      }
    }
  } catch (err) {
    console.warn('[WhatsApp Callback] Coexistence history sync error:', err);
  }
}

async function handlePlainTextInbound(
  message: Record<string, unknown>,
  value?: Record<string, unknown>,
) {
  try {
    const from = (message as { from?: string }).from || '';
    const messageId = (message as { id?: string }).id || '';
    const timestamp = (message as { timestamp?: string }).timestamp;
    const textBody =
      ((message as { text?: { body?: string } }).text?.body || '').toString();
    const waContacts = (value as { contacts?: Array<{ wa_id?: string; profile?: { name?: string } }> })?.contacts;
    const contactProfileName =
      waContacts?.find((c) => !c.wa_id || c.wa_id === from)?.profile?.name?.trim() || undefined;

    if (!from || !textBody) {
      console.warn('[WhatsApp Callback] Plain-text inbound missing from/body');
      return;
    }

    // ── 1. Resolve tenant from phone_number_id ────────────────────────────
    const phoneNumberId =
      (value as { metadata?: { phone_number_id?: string } })?.metadata?.phone_number_id || '';
    const tenantId = await resolveTenantIdByPhoneNumberId(phoneNumberId, true);


    if (!tenantId) {
      console.warn(
        '[WhatsApp Callback] Could not resolve tenant for phone_number_id:',
        phoneNumberId,
        '— skipping auto-reply (message not saved)',
      );
      return;
    }

    // ── 2. Idempotency check on wamid (O1: via InboxMessage) ──────────────
    if (messageId && tenantId) {
      try {
        const existing = await db.inboxMessage.findFirst({
          where: { tenantId, channel: 'whatsapp', externalId: messageId },
          select: { id: true },
        });
        if (existing) {
          // Already processed — WhatsApp is retrying the webhook.
          return;
        }
      } catch (err) {
        console.warn('[WhatsApp Callback] idempotency check failed:', err);
      }
    }

    // ── 3. Find or create a Conversation ──────────────────────────────────
    const digitsOnly = from.replace(/\D/g, '');
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
    const matchedCustomer = await db.customer.findFirst({
      where: {
        tenantId,
        OR: [
          { phone: from },
          ...(digitsOnly ? [{ phone: `+${digitsOnly}` }] : []),
          ...(last10.length >= 10 ? [{ phone: { endsWith: last10 } }] : []),
        ],
      },
      select: { id: true },
    }).catch(() => null);

    let conversationId: string;
    try {
      const existingConv = await db.conversation.findFirst({
        where: {
          customerPhone: from,
          channel: 'whatsapp',
          status: 'active',
          tenantId,
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      if (existingConv) {
        conversationId = existingConv.conversationId;
        await db.conversation.update({
          where: { id: existingConv.id },
          data: {
            lastMessageAt: new Date(),
            lastMessageBody: textBody,
            lastDirection: 'inbound',
            ...(matchedCustomer?.id && !existingConv.customerId
              ? { customerId: matchedCustomer.id }
              : {}),
          },
        });
      } else {
        conversationId = `conv_wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.conversation.create({
          data: {
            conversationId,
            customerId: matchedCustomer?.id || null,
            customerPhone: from,
            channel: 'whatsapp',
            status: 'active',
            currentStage: 'greeting',
            lastMessageAt: new Date(),
            lastMessageBody: textBody,
            lastDirection: 'inbound',
            messagesJson: JSON.stringify([
              {
                id: messageId,
                direction: 'inbound',
                body: textBody,
                timestamp: timestamp ? new Date(Number(timestamp) * 1000).toISOString() : new Date().toISOString(),
                providerSid: messageId || undefined,
              },
            ]),
            tenantId,
          },
        });
      }
    } catch (err) {
      console.error('[WhatsApp Callback] Conversation save failed:', err);
      return;
    }

    // ── 4. Create the canonical InboxMessage (O1) ──────────────────────
    // Replaces the direct db.inboxMessage.create + db.unifiedMessage.create.
    // Idempotent via the (tenantId, channel, externalId) unique constraint.
    //
    // RESILIENCE: if the O1 DDL migration hasn't been applied yet (the
    // `channel` column doesn't exist on InboxMessage), the create throws a
    // 42703 error. We catch it and fall back to the legacy UnifiedMessage
    // write so the WhatsApp webhook keeps recording messages during the
    // rollout window.
    if (tenantId) {
      let inboxWritten = false;
      try {
        await createInboundMessage({
          tenantId,
          conversationId,
          channel: 'whatsapp',
          senderId: from,
          senderName: contactProfileName || from,
          content: textBody,
          messageType: 'text',
          externalId: messageId || undefined,
          metadataJson: {
            whatsappMessageId: messageId,
            phoneNumberId,
          },
        });
        inboxWritten = true;
      } catch (err) {
        console.error('[WhatsApp Callback] InboxMessage create failed (pre-O1 migration?), falling back to UnifiedMessage:', err);
      }
      if (!inboxWritten) {
        // Fallback: write to the legacy UnifiedMessage table so the message
        // is at least recorded (pre-O1 migration state).
        try {
          await db.unifiedMessage.create({
            data: {
              channel: 'whatsapp',
              direction: 'inbound',
              senderId: from,
              recipientId: phoneNumberId,
              content: textBody,
              contentType: 'text',
              externalId: messageId || null,
              status: 'delivered',
              tenantId,
            },
          });
        } catch (fallbackErr) {
          console.warn('[WhatsApp Callback] UnifiedMessage fallback also failed (non-fatal):', fallbackErr);
        }
      }
    }

    // ── 5. UnifiedMessage write REMOVED (O1) ───────────────────────────
    // New code no longer writes to UnifiedMessage. The table is kept for
    // backward compat with any existing reads, but canonical reads come
    // from InboxMessage via the omnichannel conversations API.
    // (The fallback above is only used during the pre-migration rollout window.)

    // ── 5.5 Commerce Engine (NEW) ─────────────────────────────────────
    // Check if this tenant has a commerce config. If so, route the
    // message through the commerce state machine instead of the
    // regular auto-reply flow. The state machine handles product
    // ordering, field extraction, order creation, and payment links.
    try {
      const commerceConfig = await db.gptformCommerceConfig.findFirst({
        where: {
          businessId: tenantId,
          isActive: true,
        },
      });

      if (commerceConfig) {
        const { processCommerceMessage } = await import('@/lib/commerce/state-machine');
        const { sendWhatsAppMessage } = await import('@/lib/whatsapp-send');

        const config = {
          id: commerceConfig.id,
          businessId: commerceConfig.businessId,
          agentId: commerceConfig.agentId,
          catalogJson: commerceConfig.catalogJson,
          fieldsJson: commerceConfig.fieldsJson,
          upiId: commerceConfig.upiId,
          deliveryAreasJson: commerceConfig.deliveryAreasJson,
          businessHoursJson: commerceConfig.businessHoursJson,
          greetingMessage: commerceConfig.greetingMessage,
          currency: commerceConfig.currency,
          currencySymbol: commerceConfig.currencySymbol,
        };

        const result = await processCommerceMessage(
          commerceConfig.businessId,
          from,
          textBody,
          config
        );

        // Send the state machine response via WhatsApp
        if (result.response) {
          await sendWhatsAppMessage({
            tenantId,
            to: from,
            message: result.response,
          }).catch((err: any) =>
            console.warn('[WhatsApp Commerce] send failed:', err.message)
          );
        }

        // If order was created, also notify the business owner
        if (result.orderCreated && result.orderId) {
          const order = await db.gptformCommerceOrder.findUnique({
            where: { id: result.orderId },
          });
          if (order) {
            const items = JSON.parse(order.itemsJson || '[]');
            const ownerMsg = `📦 New Order #${order.id.slice(-6).toUpperCase()}\n\n` +
              `Customer: ${order.customerName || order.customerPhone}\n` +
              `Items: ${items.map((i: any) => `${i.name} ×${i.qty} = ${commerceConfig.currencySymbol}${i.amount}`).join(', ')}\n` +
              `Total: ${commerceConfig.currencySymbol}${order.total}\n` +
              `Status: ${order.status}\n` +
              `Payment: ${order.paymentStatus}`;
            // Send WhatsApp notification to the business owner (best-effort)
            try {
              // The owner is the tenant — find their WhatsApp number from the
              // CommunicationProvider (same tenant) to send them a notification.
              const ownerProvider = await db.communicationProvider.findFirst({
                where: { tenantId, type: 'whatsapp', status: 'active', sendingEnabled: true },
                orderBy: { updatedAt: 'desc' },
              });
              if (ownerProvider) {
                // The business owner's WhatsApp number is stored in configJson
                // as display_phone_number. We need to send TO that number.
                // But WhatsApp Business API can only send FROM the business number
                // TO the customer — not to itself. So we use the tenant's phone
                // field or the business phone to notify.
                // For now, we just log — the owner sees the order in the dashboard.
                console.log('[WhatsApp Commerce] New order for owner:', ownerMsg);
              } else {
                console.log('[WhatsApp Commerce] New order for owner:', ownerMsg);
              }
            } catch (notifyErr) {
              console.warn('[WhatsApp Commerce] Owner notification failed:', notifyErr);
            }
          }
        }

        return; // Commerce flow handled — skip regular auto-reply
      }
    } catch (commerceErr) {
      console.warn('[WhatsApp Commerce] Failed, falling back to regular flow:', commerceErr);
      // Fall through to regular auto-reply if commerce fails
    }

    // ── 5.6 FormAgent Chatbot Engine ──────────────────────────────────
    // If the tenant has an active FormAgent (trained receptionist / AI employee),
    // route the inbound conversation to the agent so customer questions are answered
    // with trained business knowledge, FAQs, and persona.
    let leadCaptured = false;
    try {
      // Check if conversation AI is paused by an operator
      const [convRecord, tenantLocaleRow] = await Promise.all([
        db.conversation.findFirst({
          where: { conversationId, tenantId },
          select: { aiPaused: true },
        }),
        db.tenant
          .findUnique({
            where: { id: tenantId },
            select: { country: true, settingsJson: true },
          })
          .catch(() => null),
      ]);

      const tenantTz = resolveTenantLocale({
        tenantCountry: tenantLocaleRow?.country,
        settingsJson: tenantLocaleRow?.settingsJson,
      }).timeZone;

      if (!convRecord?.aiPaused) {
        const activeAgent = await db.formAgent.findFirst({
          where: { tenantId, status: 'active' },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, name: true, configJson: true, voiceTone: true },
        });

        if (activeAgent) {
          let agentConfig: any = {};
          try {
            agentConfig = activeAgent.configJson ? JSON.parse(activeAgent.configJson) : {};
          } catch {}

          const agentName = activeAgent.name || agentConfig.name || 'AI Assistant';
          let systemPrompt =
            agentConfig.knowledge?.systemPrompt ||
            agentConfig.systemPrompt ||
            `You are ${agentName}, an intelligent and friendly assistant for this business. Answer concisely and helpfully (1-3 sentences) in natural WhatsApp style. Assist the customer with information, bookings, and inquiries.`;

          const followUpLangMode = agentConfig?.settings?.followUp?.languageMode;
          if (followUpLangMode === 'hinglish') {
            systemPrompt += `\n\nCRITICAL MULTILINGUAL INSTRUCTION: Reply in warm, natural Hinglish (friendly mix of Hindi & English in Latin script, e.g. "Aapke liye Saturday 11:30 AM slot available hai") unless the customer clearly prefers pure English or a non-Latin script.`;
          } else if (followUpLangMode === 'english') {
            systemPrompt += `\n\nLANGUAGE INSTRUCTION: Reply concisely and warmly in clear English (unless the customer explicitly writes in another language).`;
          } else {
            systemPrompt += `\n\nCRITICAL MULTILINGUAL INSTRUCTION: Automatically detect the customer's language (e.g. Hindi, Hinglish, Spanish, Arabic, French, English) and reply fluently in that exact same language. Keep responses natural, warm, and concise for WhatsApp.`;
          }

          // Fetch recent conversation history for multi-turn context
          const recentMsgs = await db.inboxMessage.findMany({
            where: { tenantId, conversationId },
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: { direction: true, content: true },
          }).catch(() => []);

          const conversationHistory: ChatMessage[] = recentMsgs
            .reverse()
            .map((m) => ({
              role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
              content: m.content,
            }));

          // Check for natural language booking intent and live slot availability
          try {
            const bookingIntent = extractBookingIntent(
              textBody,
              conversationHistory,
              undefined,
              {
                customerPhone: from,
                customerName: contactProfileName,
                timezone: tenantTz,
              },
            );
            if (bookingIntent.hasIntent) {
              leadCaptured = true;
              const autoBooking = await tryExecuteChatBooking({
                tenantId,
                agentId: activeAgent.id,
                message: textBody,
                history: conversationHistory,
                customerPhone: from,
                customerName: contactProfileName,
                timezone: tenantTz,
              }).catch(() => null);

              if (autoBooking?.success && autoBooking.booking) {
                const bookingTime = autoBooking.booking.scheduledAt
                  ? new Date(autoBooking.booking.scheduledAt).toLocaleString('en-US', {
                      timeZone: tenantTz,
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'your scheduled time';
                systemPrompt += `\n\nAPPOINTMENT CONFIRMED: Appointment ID ${autoBooking.booking.id} has been scheduled for ${bookingTime}. Provide an enthusiastic, concise confirmation with these details.`;
              } else {
                const nowParts = getLocalDateParts(new Date(), tenantTz);
                const tomorrowStr = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + 1))
                  .toISOString()
                  .split('T')[0];
                const checkDate = bookingIntent.dateStr || tomorrowStr;
                const availability = await checkAvailability({
                  tenantId,
                  date: checkDate,
                  timezone: tenantTz,
                }).catch(() => null);

                if (availability?.success && availability.slots.length > 0) {
                  const slotSummary = availability.slots.slice(0, 5).map((s) => s.label).join(', ');
                  systemPrompt += `\n\nLIVE AVAILABILITY ON ${checkDate}: Available slots: ${slotSummary}. Offer these exact slots to the customer and ask which time suits them best.`;
                } else {
                  let alternateSummary = '';
                  const baseTime = new Date(`${checkDate}T12:00:00Z`).getTime() || Date.now();
                  for (let offset = 1; offset <= 3; offset++) {
                    const altDate = new Date(baseTime + offset * 86400000).toISOString().split('T')[0];
                    const altAvail = await checkAvailability({
                      tenantId,
                      date: altDate,
                      timezone: tenantTz,
                    }).catch(() => null);
                    if (altAvail?.success && altAvail.slots.length > 0) {
                      const altSlots = altAvail.slots.slice(0, 4).map((s) => s.label).join(', ');
                      alternateSummary = `${altDate} has open slots: ${altSlots}`;
                      break;
                    }
                  }
                  if (alternateSummary) {
                    systemPrompt += `\n\nCALENDAR NOTICE: No openings on ${checkDate} (${availability?.message || 'full'}), BUT ${alternateSummary}. Tell the customer warmly and offer those alternate slots.`;
                  } else if (availability && !availability.success) {
                    systemPrompt += `\n\nCALENDAR NOTICE: No available slots on ${checkDate} (${availability.message}). Suggest an alternate day or time.`;
                  }
                }
              }
            }
          } catch (bookingErr) {
            console.warn('[WhatsApp Callback] Booking intent check notice:', bookingErr);
          }

          if (!leadCaptured) {
            leadCaptured = true;
            await upsertWhatsAppInquiryLead({
              tenantId,
              customerPhone: from,
              customerName: contactProfileName,
              message: textBody,
              agentId: activeAgent.id,
              timezone: tenantTz,
            }).catch(() => null);
          }

          const aiResult = await callAI({
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
            ],
            temperature: 0.7,
            maxTokens: 350,
            usageContext: {
              tenantId,
              feature: 'whatsapp_agent_chatbot',
            },
          }).catch((err) => {
            console.error('[WhatsApp Callback] FormAgent callAI error:', err);
            return null;
          });

          const replyText = aiResult?.content?.trim();
          if (replyText) {
            // Save the outbound reply message in InboxMessage
            try {
              await db.inboxMessage.create({
                data: {
                  tenantId,
                  conversationId,
                  channel: 'whatsapp',
                  senderId: 'ai',
                  senderName: agentName,
                  senderType: 'ai',
                  direction: 'outbound',
                  content: replyText,
                  messageType: 'text',
                  status: 'sent',
                  metadataJson: {
                    agentId: activeAgent.id,
                    agentName,
                    feature: 'form_agent_chatbot',
                  },
                },
              });

              await db.conversation.update({
                where: { conversationId },
                data: {
                  lastMessageAt: new Date(),
                  lastMessageBody: replyText,
                  lastDirection: 'outbound',
                },
              });
            } catch (saveErr) {
              console.warn('[WhatsApp Callback] Error saving AI reply InboxMessage:', saveErr);
            }

            // Send via WhatsApp
            await sendWhatsAppMessage({
              tenantId,
              to: from,
              message: replyText,
            }).catch((sendErr) => {
              console.warn('[WhatsApp Callback] FormAgent sendWhatsAppMessage failed:', sendErr);
            });

            console.log(`[WhatsApp Callback] FormAgent ${activeAgent.id} successfully replied to ${from}`);
            return; // Chatbot handled the message!
          }
        }
      }
    } catch (agentErr) {
      console.warn('[WhatsApp Callback] FormAgent processing failed, falling back:', agentErr);
    }

    if (!leadCaptured) {
      await upsertWhatsAppInquiryLead({
        tenantId,
        customerPhone: from,
        customerName: contactProfileName,
        message: textBody,
      }).catch(() => null);
    }

    // ── 6. Auto-reply when tenant is offline ──────────────────────────────
    // maybeAutoReply checks subscription + config + presence + cooldown
    // internally and never throws. For the whatsapp channel, it sends the
    // reply via sendWhatsAppMessage() best-effort — if sending fails, the
    // InboxMessage is still saved so the inbox shows the would-be reply.
    try {
      await maybeAutoReply({
        tenantId,
        conversationId,
        visitorMessage: textBody,
        channel: 'whatsapp',
        visitorPhone: from,
      });
    } catch (err) {
      console.warn('[WhatsApp Callback] maybeAutoReply failed:', err);
    }
  } catch (error) {
    console.error('[WhatsApp Callback] handlePlainTextInbound error:', error);
  }
}

/**
 * Handle on-select action: perform native actions, call webhook URL, and/or trigger another workflow
 * when the user selects a list item or clicks a button.
 *
 * Supported action types:
 * - "webhook": Call the configured webhook URL
 * - "workflow": Trigger another FlowForge workflow
 * - "updateJobAssignee": Update the job table with the selected assignee
 *
 * For "updateJobAssignee", the flow is:
 * 1. Perform native updateJobAssignee action (update job table)
 * 2. Then call webhook if a URL is provided (combined actions)
 * 3. Then trigger workflow if a workflowId is provided (combined actions)
 */
async function handleOnSelectAction(
  originalMessageId: string,
  selectionData: {
    selectedId: string;
    selectedTitle: string;
    selectedDescription: string;
    senderPhone: string;
    interactiveType: string;
  },
) {
  try {
    // Look up the stored message action
    const messageAction = await db.whatsAppMessageAction.findUnique({
      where: { whatsappMessageId: originalMessageId },
    });

    if (!messageAction) {
      console.log(`[WhatsApp Callback] No stored action for message ${originalMessageId}`);
      return;
    }

    const nodeConfig = JSON.parse(messageAction.nodeConfigJson || '{}');
    const onSelectAction = nodeConfig.onSelectAction || {};
    const actionType: string = onSelectAction.actionType || 'webhook';

    const payload = {
      event: 'whatsapp_interactive_response',
      interactiveType: selectionData.interactiveType,
      selection: {
        id: selectionData.selectedId,
        title: selectionData.selectedTitle,
        description: selectionData.selectedDescription,
      },
      sender: {
        phone: selectionData.senderPhone,
      },
      originalMessage: {
        whatsappMessageId: originalMessageId,
        workflowId: messageAction.workflowId,
        nodeId: messageAction.nodeId,
        recipientPhone: messageAction.phoneRecipient,
      },
      // Pass resolved context data (e.g., jobId) from the stored onSelectAction
      // so triggered workflows can access dynamic values from the originating workflow
      contextData: onSelectAction.contextData || {},
      timestamp: new Date().toISOString(),
    };

    console.log(`[WhatsApp Callback] On-select action payload:`, JSON.stringify(payload, null, 2));
    console.log(`[WhatsApp Callback] Action type: ${actionType}`);

    // ─── 1. Native updateJobAssignee action ─────────────────────────────────
    if (actionType === 'updateJobAssignee') {
      try {
        // Extract employee ID from selectedId (strip "driver_" prefix if present)
        let employeeId = selectionData.selectedId;
        if (employeeId.startsWith('driver_')) {
          employeeId = employeeId.replace('driver_', '');
        }

        console.log(`[WhatsApp Callback] updateJobAssignee: looking up employee ${employeeId}`);

        // Find the employee by ID
        const employee = await db.employee.findUnique({
          where: { id: employeeId },
        });

        if (!employee) {
          console.warn(`[WhatsApp Callback] updateJobAssignee: Employee not found with ID: ${employeeId}`);
        } else {
          // Find the job - prefer stored job ID from contextData for Two-Step Workflow reliability
          const phoneRecipient = messageAction.phoneRecipient;
          const contextJobId = onSelectAction.contextData?.jobId || nodeConfig.jobId;
          let job;

          if (contextJobId) {
            // Direct lookup by job ID - most reliable for Two-Step Workflows
            // In Two-Step Workflows, the LIST message goes to the admin (not the employee),
            // so matching by phoneRecipient or whatsappMessageId would fail.
            // The jobId is passed via onSelectAction.contextData which was resolved at send time.
            job = await db.job.findUnique({ where: { id: contextJobId } });
            console.log(`[WhatsApp Callback] updateJobAssignee: Found job by contextData.jobId ${contextJobId}`);
          } else {
            // Fallback: find job by WhatsApp message ID or phone recipient
            job = await db.job.findFirst({
              where: {
                OR: [
                  { whatsappMessageId: originalMessageId },
                  {
                    assigneePhone: { contains: phoneRecipient.replace(/[^0-9]/g, '') },
                    assignmentStatus: { in: ['sent', 'delivered', 'read'] as string[] },
                    assigneeId: null,
                  },
                ],
              },
              orderBy: { updatedAt: 'desc' },
            });
          }

          if (!job) {
            console.warn(`[WhatsApp Callback] updateJobAssignee: No matching job found for phone ${phoneRecipient} or message ${originalMessageId}`);
          } else {
            // Update the job with the selected assignee
            await db.job.update({
              where: { id: job.id },
              data: {
                assigneeId: employee.id,
                assigneeName: employee.name,
                assigneePhone: employee.phone,
                status: 'assigned',
                assignmentStatus: 'accepted',
              },
            });

            // Update the employee status to 'busy'
            await db.employee.update({
              where: { id: employee.id },
              data: { status: 'busy' },
            });

            console.log(`[WhatsApp Callback] updateJobAssignee: Job ${job.id} assigned to ${employee.name} (${employee.id})`);

            // TODO: Send WhatsApp notification to the assigned employee informing them of the new assignment.
            // This would complete the Two-Step Workflow flow:
            //   1. Admin receives LIST message with available employees
            //   2. Admin selects an employee (this handler fires)
            //   3. Employee receives a notification about their new job assignment
            // Implementation would use the WhatsApp Business API to send a message
            // to employee.phone with job details (job.title, job.description, etc.).
          }
        }
      } catch (assignError: any) {
        console.error(`[WhatsApp Callback] updateJobAssignee failed: ${assignError.message}`);
      }
    }

    // ─── 2. Call the configured webhook URL (if any) ────────────────────────
    // For actionType "updateJobAssignee", this acts as a combined action
    // (native action is done first above, then webhook is called)
    if (messageAction.onSelectWebhookUrl || onSelectAction.webhookUrl) {
      const webhookUrl = messageAction.onSelectWebhookUrl || onSelectAction.webhookUrl;
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: onSelectAction.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });

        if (webhookResponse.ok) {
          console.log(`[WhatsApp Callback] Webhook called successfully: ${webhookUrl}`);
        } else {
          console.warn(`[WhatsApp Callback] Webhook returned ${webhookResponse.status}: ${webhookUrl}`);
        }
      } catch (webhookError: any) {
        console.error(`[WhatsApp Callback] Webhook call failed: ${webhookError.message}`);
      }
    }

    // ─── 3. Trigger another FlowForge workflow (if configured) ──────────────
    // For actionType "updateJobAssignee", this also acts as a combined action
    if (messageAction.onSelectWorkflowId || onSelectAction.workflowId) {
      const targetWorkflowId = messageAction.onSelectWorkflowId || onSelectAction.workflowId;
      try {
        const targetWorkflow = await db.workflow.findUnique({
          where: { id: targetWorkflowId },
        });

        if (targetWorkflow) {
          const nodes = JSON.parse(targetWorkflow.nodesJson || '[]');
          const edges = JSON.parse(targetWorkflow.edgesJson || '[]');

          if (nodes.length > 0) {
            // Create execution record
            const execution = await db.execution.create({
              data: {
                workflowId: targetWorkflow.id,
                status: 'running',
                mode: 'trigger',
                startedAt: new Date(),
                dataJson: JSON.stringify({
                  trigger: {
                    type: 'whatsapp_callback',
                    originalMessageId,
                    selectionData: payload,
                  },
                }),
              },
            });

            // Build trigger input from the selection data
            const triggerInput: NodeOutput[] = [{ json: payload }];
            const triggerData = {
              body: payload,
              headers: {},
              queryParams: {},
              method: 'INTERNAL',
            };

            // Execute in background (fire-and-forget)
            executeWorkflow({
              nodes: nodes.map((n: any) => ({
                id: n.id,
                type: n.type || n.data?.nodeType,
                name: n.name || n.data?.nodeType || 'Node',
                data: {
                  nodeType: n.data?.nodeType || n.type,
                  config: n.data?.config || {},
                  disabled: n.data?.disabled || false,
                },
              })),
              edges: edges.map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourcePort: e.sourcePort || e.sourceHandle,
                targetPort: e.targetPort || e.targetHandle,
              })),
              triggerInput,
              triggerData,
              workflowId: targetWorkflow.id,
            }).then(async (result) => {
              // Save execution results
              const nodeDataRecords = result.nodeResults.map((nr) => ({
                executionId: execution.id,
                nodeName: nr.nodeName,
                nodeId: nr.nodeId,
                inputJson: JSON.stringify(nr.input),
                outputJson: JSON.stringify(nr.output),
                durationMs: nr.durationMs,
                status: nr.status as 'success' | 'error',
                ...(nr.status === 'error' && nr.error
                  ? { errorJson: JSON.stringify({ message: nr.error, nodeType: nr.nodeType }) }
                  : {}),
              }));

              if (nodeDataRecords.length > 0) {
                await db.executionNodeData.createMany({ data: nodeDataRecords });
              }

              await db.execution.update({
                where: { id: execution.id },
                data: {
                  status: result.status,
                  finishedAt: new Date(),
                  durationMs: result.durationMs,
                },
              });

              console.log(`[WhatsApp Callback] Triggered workflow ${targetWorkflow.id}: status=${result.status}`);
            }).catch(async (execError: any) => {
              await db.execution.update({
                where: { id: execution.id },
                data: {
                  status: 'error',
                  finishedAt: new Date(),
                  errorJson: JSON.stringify({ message: execError.message || 'Execution failed' }),
                },
              });
              console.error(`[WhatsApp Callback] Workflow execution failed: ${execError.message}`);
            });
          }
        } else {
          console.warn(`[WhatsApp Callback] Target workflow not found: ${targetWorkflowId}`);
        }
      } catch (workflowError: any) {
        console.error(`[WhatsApp Callback] Failed to trigger workflow: ${workflowError.message}`);
      }
    }
  } catch (error: any) {
    console.error(`[WhatsApp Callback] Error handling on-select action: ${error.message}`);
  }
}

/**
 * Legacy: Handle driver selection from list (driver_ prefixed IDs)
 */
async function handleDriverSelection(selectedId: string, senderPhone: string) {
  try {
    const employeeId = selectedId.replace('driver_', '');

    // Find the job that was sent to this phone number with pending assignment
    const job = await db.job.findFirst({
      where: {
        assignmentStatus: { in: ['sent', 'delivered', 'read'] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!job) {
      console.warn('No pending assignment job found for phone:', senderPhone);
      return;
    }

    // Verify the employee exists and is available
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      console.warn('Employee not found:', employeeId);
      return;
    }

    // Assign the job to the selected driver
    await db.job.update({
      where: { id: job.id },
      data: {
        assigneeId: employee.id,
        assigneeName: employee.name,
        assigneePhone: employee.phone,
        status: 'assigned',
        assignmentStatus: 'accepted',
      },
    });

    // Mark the employee as busy
    await db.employee.update({
      where: { id: employee.id },
      data: { status: 'busy' },
    });

    console.log(`Job ${job.id} assigned to ${employee.name} (${employee.id})`);
  } catch (error) {
    console.error('Error handling driver selection:', error);
  }
}

/**
 * Handle accept/reject actions from buttons (interactive or template) or plain text.
 * When a technician accepts:
 * 1. Updates job.assignmentStatus = 'accepted', job.status = 'assigned'.
 * 2. Marks technician employee.status = 'busy'.
 * 3. Immediately sends a WhatsApp confirmation back with customer details and
 *    a 1-tap deep link to open the job in the app (https://fieseros.com/?view=jobs&job={id}).
 */
async function handleJobAcceptanceOrDecline({
  buttonId = '',
  buttonText = '',
  senderPhone,
}: {
  buttonId?: string;
  buttonText?: string;
  senderPhone: string;
}): Promise<boolean> {
  try {
    const cleanPhone = senderPhone.replace(/[^0-9]/g, '');
    const last10 = cleanPhone.slice(-10);

    const textLower = buttonText.trim().toLowerCase();
    const isAccept =
      buttonId.startsWith('accept_') ||
      textLower === 'accept job' ||
      textLower === 'accept' ||
      textLower.includes('accept');

    const isDecline =
      buttonId.startsWith('reject_') ||
      buttonId.startsWith('decline_') ||
      textLower === 'decline' ||
      textLower === 'reject job' ||
      textLower === 'reject' ||
      textLower.includes('decline') ||
      textLower.includes('reject');

    if (!isAccept && !isDecline) return false;

    // Find the employee by matching phone number
    const employee = await db.employee.findFirst({
      where: {
        OR: [
          { phone: { contains: last10 } },
          { whatsappId: { contains: last10 } },
        ],
      },
    });

    // Find the relevant job:
    let job = null;
    if (buttonId.startsWith('accept_') || buttonId.startsWith('reject_') || buttonId.startsWith('decline_')) {
      const explicitId = buttonId.replace('accept_', '').replace('reject_', '').replace('decline_', '');
      job = await db.job.findUnique({ where: { id: explicitId } });
    }

    if (!job && employee) {
      // Find latest pending or assigned job for this employee
      job = await db.job.findFirst({
        where: {
          assigneeId: employee.id,
          assignmentStatus: { in: ['pending', 'sent', 'delivered', 'read'] },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Fallback: any recent job assigned to this employee
      if (!job) {
        job = await db.job.findFirst({
          where: {
            assigneeId: employee.id,
          },
          orderBy: { updatedAt: 'desc' },
        });
      }
    }

    if (!job) {
      console.warn(`[WhatsApp Callback] No job found to ${isAccept ? 'accept' : 'decline'} for phone: ${senderPhone}`);
      return false;
    }

    const appUrl = getAppUrl();
    const jobNumber = job.jobNumber ? `#${job.jobNumber}` : `#${job.id.slice(-6)}`;
    const viewJobUrl = `${appUrl}/?view=jobs&job=${job.id}`;

    if (isAccept) {
      await db.job.update({
        where: { id: job.id },
        data: {
          status: 'assigned',
          assignmentStatus: 'accepted',
          ...(employee ? {
            assigneeId: employee.id,
            assigneeName: employee.name,
            assigneePhone: employee.phone,
          } : {}),
        },
      });

      if (employee) {
        await db.employee.update({
          where: { id: employee.id },
          data: { status: 'busy' },
        });
      }

      console.log(`[WhatsApp Callback] Job ${job.id} ACCEPTED by ${employee?.name || senderPhone}`);

      // Send 1-tap confirmation reply with deep-link into the Fieseros app
      const confirmMsg = [
        `✅ *Job ${jobNumber} Accepted!*`,
        '',
        `Customer: ${job.customerName || 'Customer on file'}`,
        `Service: ${job.title || 'Service details in app'}`,
        `Address: ${job.address || job.location || 'Address in app'}`,
        '',
        `👉 *Open Job & Navigate in App:*`,
        viewJobUrl,
      ].join('\n');

      await sendWhatsAppMessage({
        to: senderPhone,
        message: confirmMsg,
        tenantId: job.tenantId || employee?.tenantId || undefined,
      });
    } else if (isDecline) {
      await db.job.update({
        where: { id: job.id },
        data: {
          assignmentStatus: 'rejected',
        },
      });

      console.log(`[WhatsApp Callback] Job ${job.id} DECLINED by ${employee?.name || senderPhone}`);

      await sendWhatsAppMessage({
        to: senderPhone,
        message: `Job ${jobNumber} declined. Dispatch has been notified.`,
        tenantId: job.tenantId || employee?.tenantId || undefined,
      });
    }
    return Boolean(isAccept || isDecline);
  } catch (error) {
    console.error('[WhatsApp Callback] Error in handleJobAcceptanceOrDecline:', error);
    return false;
  }
}

/**
 * Legacy: Handle accept/reject button replies
 */
async function handleButtonReply(buttonId: string, senderPhone: string) {
  return handleJobAcceptanceOrDecline({ buttonId, senderPhone });
}
