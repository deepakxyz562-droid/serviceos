import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { callAI, type ChatMessage } from '@/lib/ai-client';
import { decryptToken } from '@/lib/social/crypto';

export const dynamic = 'force-dynamic';

/**
 * /api/meta/webhook — Meta Webhooks receiver for Instagram DMs + Messenger.
 * ─────────────────────────────────────────────────────────────────────────
 * Meta's Webhooks product sends ALL subscribed fields to ONE URL. We
 * configure the Meta App Dashboard to point at this route for both:
 *   - Instagram → "messages" field (Instagram Messaging)
 *   - Messenger → "messages" field (Page Messaging)
 *
 * The payload's `entry[].messaging[].recipient.id` tells us which Page /
 * IG Business Account received the message, which we map to a tenant via
 * the SocialAccount table.
 *
 * SECURITY: verifies X-Hub-Signature-256 (HMAC-SHA256 with APP_SECRET).
 * Fail-closed — rejects unsigned payloads (Meta App Review requires this).
 *
 * GET: webhook verification (hub.mode=subscribe, hub.verify_token).
 * POST: inbound DM → route to tenant's AI agent → reply via Send API.
 */

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;

function verifySignature(request: NextRequest, rawBody: string): boolean {
  if (!APP_SECRET) {
    console.error('[meta/webhook] META_APP_SECRET not set — REJECTING payload (fail-closed).');
    return false;
  }
  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) {
    console.warn('[meta/webhook] Missing X-Hub-Signature-256 header — rejecting');
    return false;
  }
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest('hex');
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// GET — webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const validTokens = new Set(
    [
      VERIFY_TOKEN,
      process.env.WHATSAPP_VERIFY_TOKEN,
      process.env.META_VERIFY_TOKEN,
      'fieseros_verify_token',
      'flowforge_verify_token',
    ].filter(Boolean) as string[],
  );

  if (mode === 'subscribe' && token && validTokens.has(token)) {
    return new NextResponse(challenge || '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST — inbound DM (Instagram or Messenger)
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifySignature(request, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const object = body?.object;
  const entries = body?.entry || [];

  if (object !== 'instagram' && object !== 'page') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  for (const entry of entries) {
    const messaging = entry?.messaging || [];
    for (const event of messaging) {
      await processMessagingEvent(object, event);
    }
  }

  return NextResponse.json({ ok: true });
}

async function processMessagingEvent(platform: string, event: any) {
  const senderId = event?.sender?.id;
  const recipientId = event?.recipient?.id;
  const message = event?.message;

  if (!senderId || !recipientId || !message) return;

  const messageText = message.text || '';
  if (!messageText) return;

  const socialAccount = await db.socialAccount.findFirst({
    where: {
      platform: platform === 'instagram' ? 'instagram' : 'facebook',
      accountId: recipientId,
      isActive: true,
    },
    select: { id: true, tenantId: true, accessToken: true, metadata: true },
  }).catch(() => null);

  if (!socialAccount) {
    console.warn(`[meta/webhook] No SocialAccount for ${platform} recipient ${recipientId}`);
    return;
  }

  const agent = await db.formAgent.findFirst({
    where: { tenantId: socialAccount.tenantId, status: 'active' },
    select: { id: true, slug: true, configJson: true },
  }).catch(() => null);

  if (!agent) {
    console.warn(`[meta/webhook] No active FormAgent for tenant ${socialAccount.tenantId}`);
    return;
  }

  console.log(`[meta/webhook] inbound DM on ${platform}: tenant=${socialAccount.tenantId} agent=${agent.id} from=${senderId} text="${messageText.slice(0, 50)}"`);

  // 1. Persist inbound message
  try {
    await db.unifiedMessage.create({
      data: {
        tenantId: socialAccount.tenantId,
        channel: platform === 'instagram' ? 'instagram' : 'messenger',
        direction: 'inbound',
        senderId,
        recipientId,
        content: messageText,
        externalId: message.mid || `${senderId}-${Date.now()}`,
        status: 'received',
      },
    });
  } catch (e) {
    console.warn(`[meta/webhook] failed to persist UnifiedMessage:`, e instanceof Error ? e.message : e);
  }

  // 2. Resolve Page/IG access token
  const accessToken = socialAccount.accessToken ? decryptToken(socialAccount.accessToken) : null;
  if (!accessToken) {
    console.warn(`[meta/webhook] Missing access token for ${platform} account ${recipientId}`);
    return;
  }

  // 3. Load recent conversation history for context
  const recentMessages = await db.unifiedMessage.findMany({
    where: {
      tenantId: socialAccount.tenantId,
      channel: platform === 'instagram' ? 'instagram' : 'messenger',
      OR: [
        { senderId, recipientId },
        { senderId: recipientId, recipientId: senderId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: { direction: true, content: true },
  }).catch(() => []);

  const conversationHistory: ChatMessage[] = recentMessages
    .reverse()
    .map((m) => ({
      role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }));

  // 4. Resolve agent system prompt & persona
  let agentConfig: any = {};
  try {
    agentConfig = agent.configJson ? JSON.parse(agent.configJson) : {};
  } catch {}

  const agentName = agentConfig.name || 'AI Assistant';
  const systemPrompt =
    agentConfig.knowledge?.systemPrompt ||
    `You are ${agentName}, a polite and helpful assistant for this business. Provide brief, friendly answers (1-3 sentences) to customer inquiries.`;

  // 5. Generate AI response
  const aiResult = await callAI({
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: messageText },
    ],
    temperature: 0.7,
    maxTokens: 350,
    usageContext: {
      tenantId: socialAccount.tenantId,
      feature: platform === 'instagram' ? 'instagram_dm' : 'messenger_dm',
    },
  }).catch((err) => {
    console.error('[meta/webhook] callAI error:', err);
    return null;
  });

  const replyText = aiResult?.content?.trim();
  if (!replyText) {
    console.warn('[meta/webhook] AI returned empty response — skipping outbound reply');
    return;
  }

  // 6. Send reply via Meta Graph Send API
  try {
    const sendUrl = 'https://graph.facebook.com/v21.0/me/messages';
    const sendPayload: Record<string, unknown> = {
      recipient: { id: senderId },
      message: { text: replyText },
    };
    if (platform !== 'instagram') {
      sendPayload.messaging_type = 'RESPONSE';
    }

    const metaSendRes = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(sendPayload),
    });

    const sendData = await metaSendRes.json().catch(() => ({}));
    const sentOk = metaSendRes.ok;
    if (!sentOk) {
      console.warn(`[meta/webhook] Send API error (${metaSendRes.status}):`, sendData);
    }

    // 7. Persist outbound message in UnifiedMessage
    await db.unifiedMessage.create({
      data: {
        tenantId: socialAccount.tenantId,
        channel: platform === 'instagram' ? 'instagram' : 'messenger',
        direction: 'outbound',
        senderId: recipientId,
        recipientId: senderId,
        content: replyText,
        externalId: sendData?.message_id || `out_${senderId}_${Date.now()}`,
        status: sentOk ? 'sent' : 'failed',
      },
    });
  } catch (sendErr) {
    console.error('[meta/webhook] Send API fetch failed:', sendErr);
  }
}
