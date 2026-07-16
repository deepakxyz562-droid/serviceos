import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';

/**
 * AI Suggested Reply (ServiceOS V1.5)
 * -----------------------------------
 * POST /api/ai/suggested-reply
 *
 * Given the latest inbound customer message (and optional conversation +
 * customer-history context), the LLM returns 3 suggested replies in
 * different tones the agent can click to insert into the composer:
 *
 *   {
 *     replies: [
 *       { text: string, tone: "friendly"|"professional"|"concise" },
 *       ...
 *     ]
 *   }
 *
 * Pattern mirrors /api/ai/field-assistant/route.ts:
 *   - getAuthUser() + tenantId scoping
 *   - dynamic ZAI import via getZai() helper
 *   - callLLM() wrapper with response_format: { type: 'json_object' }
 *   - ActivityLog audit entry (non-fatal)
 *   - friendly 503 / 502 error envelopes
 */

// ─── Types ─────────────────────────────────────────────────────────────────

type Tone = 'friendly' | 'professional' | 'concise';

interface RequestBody {
  message: string;
  conversationId?: string;
  customerHistory?: string;
  workspaceId?: string;
}

interface SuggestedReply {
  text: string;
  tone: Tone;
}

interface SuggestedReplyResult {
  replies: SuggestedReply[];
}

// ─── Helpers (copied verbatim from field-assistant/route.ts) ──────────────

function truncate(s: string | null | undefined, max = 1500): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(d);
  }
}

async function getZai(): Promise<{ zai: any; error?: string } | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    return { zai };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/suggested-reply] ZAI.create() failed:', msg);
    return {
      zai: null,
      error:
        'AI assistant is not configured. Set ZAI_API_KEY to enable this feature.',
    };
  }
}

async function callLLMJson(
  zai: any,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7,
): Promise<{ text: string | null; error?: string }> {
  try {
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      response_format: { type: 'json_object' },
    });
    const text = response?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return { text: null, error: 'AI returned an empty response. Please retry.' };
    }
    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/suggested-reply] LLM call failed:', msg);
    return {
      text: null,
      error: `The AI service could not be reached (${msg}). Please try again in a moment.`,
    };
  }
}

// ─── Context loader ────────────────────────────────────────────────────────

/**
 * Load the conversation + recent messages + customer + linked job so the LLM
 * has full context to draft a relevant reply. All related loads are
 * best-effort — any failure degrades gracefully.
 */
async function loadConversationContext(conversationId: string, tenantId: string) {
  try {
    const conversation = await db.conversation.findFirst({
      where: { conversationId, tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        lead: { select: { id: true, name: true, status: true, serviceType: true } },
        job: { select: { id: true, title: true, status: true, scheduledAt: true } },
      },
    });

    if (!conversation) return null;

    const messages = await db.inboxMessage.findMany({
      where: { conversationId: conversation.conversationId },
      orderBy: { createdAt: 'asc' },
      take: 12,
      select: {
        id: true,
        senderType: true,
        senderName: true,
        content: true,
        direction: true,
        isInternalNote: true,
        createdAt: true,
      },
    }).catch(() => []);

    return { conversation, messages };
  } catch {
    return null;
  }
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Could not resolve tenantId for this user.' },
        { status: 400 },
      );
    }

    const body = (await request.json()) as RequestBody;
    if (!body || !body.message || !body.message.trim()) {
      return NextResponse.json(
        { error: 'message is required.' },
        { status: 400 },
      );
    }

    const inboundMessage = body.message.trim();
    const conversationId = body.conversationId;

    // Optional conversation context (best-effort).
    const ctx = conversationId ? await loadConversationContext(conversationId, tenantId) : null;
    const customerName = ctx?.conversation.customer?.name || ctx?.conversation.customerName;
    const channel = ctx?.conversation.channel;

    // Get the ZAI client.
    const zaiResult = await getZai();
    if (!zaiResult || !zaiResult.zai) {
      const errMsg =
        zaiResult?.error ||
        'AI assistant is not configured. Set ZAI_API_KEY to enable this feature.';
      return NextResponse.json({ error: errMsg }, { status: 503 });
    }

    const systemPrompt =
      'You are a friendly, professional customer-support assistant for a field-service company. ' +
      'Given the latest customer message and any conversation context, draft THREE different reply ' +
      'options for the agent to choose from — one friendly, one professional, one concise. ' +
      'Each reply should answer the customer\'s question or acknowledge their request appropriately. ' +
      'Always respond as a single JSON object — no markdown, no prose, no code fences. ' +
      'The JSON shape MUST be exactly: ' +
      '{"replies": [{"text": string, "tone": "friendly"|"professional"|"concise"}, ...]}. ' +
      'Provide exactly 3 replies, one of each tone. Keep SMS/WhatsApp replies under 300 characters. ' +
      'Address the customer by name when known. Never invent prices, dates, or commitments the agent hasn\'t approved.';

    const recentMsgs = ctx?.messages?.slice(-8) ?? [];
    const userPrompt = `LATEST INBOUND CUSTOMER MESSAGE:
${truncate(inboundMessage, 1000)}
${customerName ? `
CUSTOMER: ${customerName}` : ''}
${channel ? `CHANNEL: ${channel}` : ''}
${ctx?.conversation.lead ? `LEAD: ${ctx.conversation.lead.name || '—'} [${ctx.conversation.lead.status}]${ctx.conversation.lead.serviceType ? ' · ' + ctx.conversation.lead.serviceType : ''}` : ''}
${ctx?.conversation.job ? `JOB: ${ctx.conversation.job.title} [${ctx.conversation.job.status}]${ctx.conversation.job.scheduledAt ? ' · scheduled ' + fmtDate(ctx.conversation.job.scheduledAt) : ''}` : ''}

${recentMsgs.length > 1 ? `RECENT CONVERSATION HISTORY (oldest → newest):
${recentMsgs.slice(0, -1).map((m) => `- [${m.direction === 'inbound' ? 'Customer' : (m.isInternalNote ? 'Note' : 'Agent')}] ${truncate(m.content, 200)}`).join('\n')}` : ''}
${body.customerHistory ? `
CUSTOMER HISTORY (provided by caller):
${truncate(body.customerHistory, 800)}` : ''}

Return only the JSON object with exactly 3 replies (one friendly, one professional, one concise).`;

    const result = await callLLMJson(zaiResult.zai, systemPrompt, userPrompt, 0.7);
    if (result.error || !result.text) {
      return NextResponse.json(
        { error: result.error || 'AI returned an empty response.' },
        { status: 502 },
      );
    }

    let parsed: Partial<SuggestedReplyResult> = {};
    try {
      parsed = JSON.parse(result.text) as Partial<SuggestedReplyResult>;
    } catch {
      return NextResponse.json(
        { error: 'AI response was not valid JSON.', raw: result.text },
        { status: 502 },
      );
    }

    const validTones: Tone[] = ['friendly', 'professional', 'concise'];
    const replies: SuggestedReply[] = Array.isArray(parsed.replies)
      ? parsed.replies
          .filter((r): r is SuggestedReply =>
            !!r && typeof r === 'object' && typeof r.text === 'string' && r.text.trim().length > 0,
          )
          .map((r) => ({
            text: String(r.text).trim().slice(0, 1200),
            tone: validTones.includes(r.tone as Tone) ? (r.tone as Tone) : 'professional',
          }))
          .slice(0, 5)
      : [];

    // Ensure at least one reply — fall back to a generic acknowledgement.
    if (replies.length === 0) {
      replies.push({
        text: `Hi${customerName ? ' ' + customerName : ''}, thanks for your message. We've received it and will get back to you shortly.`,
        tone: 'professional',
      });
    }

    const finalResult: SuggestedReplyResult = { replies };

    // Log the AI query (non-fatal).
    try {
      await logActivity({
        tenantId,
        actorId: user.id,
        actorName: user.name || user.email,
        actorType: 'ai',
        action: 'ai_query',
        entityType: 'conversation',
        entityId: conversationId || null,
        entityName: customerName || null,
        description: `AI suggested-reply for "${truncate(inboundMessage, 60)}" → ${replies.length} options`,
        metadataJson: JSON.stringify({
          action: 'suggested_reply',
          conversationId: conversationId || null,
          channel: channel || null,
          inboundPreview: truncate(inboundMessage, 200),
          replyCount: replies.length,
          tones: replies.map((r) => r.tone),
          success: true,
        }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[ai/suggested-reply] logActivity failed:', logErr);
    }

    return NextResponse.json(finalResult);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to process AI request';
    console.error('[/api/ai/suggested-reply] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
