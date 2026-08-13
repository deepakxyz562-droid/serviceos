import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { callOpenRouter, extractJson } from '@/lib/ai-client'
import { getBrandContext } from '@/lib/brand-context'

/**
 * AI Suggested Reply for SMS conversations (InboxView → SMS channel).
 * ---------------------------------------------------------------
 * POST /api/ai/sms-suggested-reply
 *
 * Counterpart to /api/ai/chat-suggested-reply (which is WhatsApp/Live-Chat
 * specific and loads from PublicChatSession). This endpoint loads the last
 * 10 messages from a `Conversation` row (channel='sms') via its
 * `messagesJson` column — the same storage the SMS backend uses for both
 * inbound Twilio webhooks and outbound /api/sms/send.
 *
 * Request body:
 *   { conversationId: string }
 *
 * Response:
 *   { replies: [{ text: string, tone: 'friendly'|'professional'|'urgent' }] }
 *
 * Status codes:
 *   200 — success
 *   400 — missing conversationId / no messages
 *   401 — not authenticated
 *   404 — conversation not found (or not in caller's tenant)
 *   503 — OPENROUTER_API_KEY not set
 *   502 — AI call failed
 *   500 — unexpected error
 */

export const runtime = 'nodejs'

type Tone = 'friendly' | 'professional' | 'urgent'

interface SuggestedReply {
  text: string
  tone: Tone
}

interface SmsMessage {
  id?: string
  direction?: string
  body?: string
  timestamp?: string
  providerSid?: string
  userId?: string
  userName?: string
}

interface RequestBody {
  conversationId?: string
}

const VALID_TONES: Tone[] = ['friendly', 'professional', 'urgent']

export async function POST(request: NextRequest) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    // ── 2. Parse + validate body ─────────────────────────────────────────
    const body = (await request.json().catch(() => null)) as RequestBody | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const conversationId = (body.conversationId || '').trim()
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required.' },
        { status: 400 },
      )
    }

    // ── 3. AI service check (fast-fail before DB work) ───────────────────
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured. Set OPENROUTER_API_KEY.' },
        { status: 503 },
      )
    }

    // ── 4. Load the conversation (tenant-scoped) ────────────────────────
    // Superadmins can read any tenant; everyone else is restricted to their
    // own tenant. Mirrors the pattern in /api/ai/chat-suggested-reply.
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        ...(user.isSuperAdmin ? {} : { tenantId: user.tenantId ?? undefined }),
      },
      select: {
        id: true,
        channel: true,
        customerPhone: true,
        customerName: true,
        messagesJson: true,
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'SMS conversation not found.' },
        { status: 404 },
      )
    }

    // ── 5. Parse messagesJson and take the last 10 ──────────────────────
    let messages: SmsMessage[] = []
    try {
      const parsed = JSON.parse(conversation.messagesJson || '[]')
      if (Array.isArray(parsed)) {
        messages = parsed as SmsMessage[]
      }
    } catch {
      messages = []
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages in this conversation yet.' },
        { status: 400 },
      )
    }

    const last10 = messages.slice(-10)

    // Build conversation history text. direction='inbound' = Customer,
    // direction='outbound' = Agent. Anything else (or missing) is treated
    // as Customer to be safe (Twilio webhook always sets direction).
    const historyLines: string[] = []
    for (const msg of last10) {
      if (!msg || typeof msg.body !== 'string' || !msg.body.trim()) continue
      const speaker = msg.direction === 'outbound' ? 'Agent' : 'Customer'
      historyLines.push(`${speaker}: ${msg.body}`)
    }

    if (historyLines.length === 0) {
      return NextResponse.json(
        { error: 'No conversation messages to analyze.' },
        { status: 400 },
      )
    }

    const conversationText = historyLines.join('\n')
    const contextLine =
      conversation.customerName || conversation.customerPhone
        ? `Customer: ${conversation.customerName || conversation.customerPhone}`
        : ''

    // ── 6. Call OpenRouter with the SMS-specific prompt ─────────────────
    // Note: SMS replies should be SHORT (160 chars per segment) and
    // action-oriented. We ask for 3 tones matching the task spec:
    // friendly, professional, urgent.
    //
    // Brand Brain (Engine 4): prepend the tenant's brand context so the
    // suggested replies match their voice/CTA/forbidden phrases. The
    // context is non-fatal — if it returns a generic fallback the route
    // still works.
    const brandContext = await getBrandContext(user.tenantId)

    const system =
      'You are an AI assistant helping a field-service agent reply to a customer SMS. ' +
      'Read the conversation history and suggest 3 short reply options with different tones: ' +
      'friendly, professional, urgent. ' +
      'Each reply MUST be under 300 characters (SMS-friendly), directly address the customer\'s ' +
      'last message, and be ready to send as-is (no placeholders, no quotes, no explanations). ' +
      'Output ONLY a valid JSON object: `{"replies": [{"text": "...", "tone": "friendly"|"professional"|"urgent"}]}`\n\n' +
      'BRAND CONTEXT (stay on-brand):\n' + brandContext

    const userPrompt = contextLine
      ? `${contextLine}\n\nConversation:\n${conversationText}`
      : `Conversation:\n${conversationText}`

    let raw: string
    try {
      const result = await callOpenRouter({
        system,
        user: userPrompt,
        json: true,
        temperature: 0.7,
        maxTokens: 800,
      })
      raw = result.content
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[/api/ai/sms-suggested-reply] callOpenRouter failed:', msg)
      return NextResponse.json(
        { error: `AI generation failed: ${msg.slice(0, 200)}` },
        { status: 502 },
      )
    }

    // ── 7. Parse + validate the AI response ─────────────────────────────
    let parsed: { replies?: unknown }
    try {
      parsed = extractJson<{ replies?: unknown }>(raw)
    } catch {
      return NextResponse.json(
        { error: 'AI returned a response that could not be parsed as JSON.', raw: raw.slice(0, 500) },
        { status: 502 },
      )
    }

    const replies: SuggestedReply[] = Array.isArray(parsed.replies)
      ? parsed.replies
          .filter(
            (r): r is Record<string, unknown> =>
              !!r && typeof r === 'object' && typeof (r as Record<string, unknown>).text === 'string',
          )
          .map((r) => {
            const text = String(r.text).trim().slice(0, 320)
            const toneCandidate = typeof r.tone === 'string' ? (r.tone as Tone) : 'professional'
            const tone: Tone = VALID_TONES.includes(toneCandidate) ? toneCandidate : 'professional'
            return { text, tone }
          })
          .filter((r) => r.text.length > 0)
          .slice(0, 5)
      : []

    if (replies.length === 0) {
      return NextResponse.json(
        { error: 'AI did not return any reply options. Please try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ replies })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to process AI request'
    console.error('[/api/ai/sms-suggested-reply] error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
