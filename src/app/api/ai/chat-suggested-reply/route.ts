import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { callOpenRouter, extractJson } from '@/lib/ai-client'

/**
 * AI Suggested Reply / Summarize for the Live Chat admin view.
 * -----------------------------------------------------------
 * POST /api/ai/chat-suggested-reply
 *
 * Replaces the older ZAI-based `/api/ai/suggested-reply` endpoint for the
 * live-chat use case. Uses the generic OpenRouter client (`callOpenRouter`)
 * introduced in phase-1, with the multi-model fallback + 429 retry built in.
 *
 * Request body:
 *   {
 *     sessionId:    string,                              // required
 *     messageType?: 'reply' | 'summary'                  // default 'reply'
 *   }
 *
 * Response (messageType='reply'):
 *   { replies: [{ text: string, tone: 'friendly'|'professional'|'concise' }, ...] }
 *
 * Response (messageType='summary'):
 *   { summary: string }
 *
 * Status codes:
 *   200 — success
 *   400 — missing sessionId / invalid messageType
 *   401 — not authenticated
 *   404 — session not found (or not in caller's tenant)
 *   503 — OPENROUTER_API_KEY not set
 *   502 — AI call failed (all models exhausted, empty content, bad JSON)
 *   500 — unexpected error
 */

export const runtime = 'nodejs'

// ─── Types ─────────────────────────────────────────────────────────────────

type MessageType = 'reply' | 'summary'
type Tone = 'friendly' | 'professional' | 'concise'

interface SuggestedReply {
  text: string
  tone: Tone
}

interface RequestBody {
  sessionId?: string
  messageType?: string
}

const VALID_TONES: Tone[] = ['friendly', 'professional', 'concise']

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    // 2. Parse + validate body
    const body = (await request.json().catch(() => null)) as RequestBody | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const sessionId = (body.sessionId || '').trim()
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required.' },
        { status: 400 },
      )
    }

    const messageTypeRaw = (body.messageType || 'reply').trim()
    if (messageTypeRaw !== 'reply' && messageTypeRaw !== 'summary') {
      return NextResponse.json(
        { error: "messageType must be 'reply' or 'summary'." },
        { status: 400 },
      )
    }
    const messageType: MessageType = messageTypeRaw

    // 3. AI service check (503 if not configured). Checked before DB work so
    //    the client gets a fast, clear "not configured" signal.
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured. Set OPENROUTER_API_KEY.' },
        { status: 503 },
      )
    }

    // 4. Load the conversation — tenant-scoped so a user can't pull AI
    //    context for another tenant's chat. Mirrors the pattern in
    //    /api/chat/sessions/[sessionId]/messages/route.ts.
    //    Prisma model names: PublicChatSession / PublicChatMessage
    //    (NOT ChatSession/ChatMessage — those don't exist in the schema).
    const session = await db.publicChatSession.findFirst({
      where: {
        id: sessionId,
        ...(user.isSuperAdmin ? {} : { tenantId: user.tenantId ?? undefined }),
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 200 },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found.' },
        { status: 404 },
      )
    }

    // 5. Build the conversation history text. senderType is 'visitor' | 'admin' | 'system'.
    //    We label visitor as Customer and admin as Agent; system messages are
    //    skipped (they're internal events like "session claimed").
    const historyLines: string[] = []
    for (const msg of session.messages) {
      if (msg.senderType === 'system') continue
      const speaker = msg.senderType === 'visitor' ? 'Customer' : 'Agent'
      historyLines.push(`${speaker}: ${msg.body}`)
    }

    if (historyLines.length === 0) {
      return NextResponse.json(
        { error: 'No conversation messages to analyze.' },
        { status: 400 },
      )
    }

    const conversationText = historyLines.join('\n')

    // 6. Branch on messageType
    if (messageType === 'summary') {
      return await handleSummary(conversationText)
    }
    return await handleReply(conversationText)
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to process AI request'
    console.error('[/api/ai/chat-suggested-reply] error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── Reply branch ──────────────────────────────────────────────────────────

async function handleReply(conversationText: string) {
  const system =
    'You are an AI assistant helping a customer service agent. Based on the conversation, ' +
    'suggest 3 reply options with different tones: friendly, professional, concise. ' +
    "Each reply should directly address the customer's last message. " +
    'Output JSON: `{ replies: [{ text, tone }] }`'

  let raw: string
  try {
    const result = await callOpenRouter({
      system,
      user: conversationText,
      json: true,
      temperature: 0.7,
      maxTokens: 800,
    })
    raw = result.content
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ai/chat-suggested-reply] callOpenRouter (reply) failed:', msg)
    return NextResponse.json(
      { error: `AI generation failed: ${msg.slice(0, 200)}` },
      { status: 502 },
    )
  }

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
          const text = String(r.text).trim().slice(0, 1200)
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
}

// ─── Summary branch ────────────────────────────────────────────────────────

async function handleSummary(conversationText: string) {
  const system =
    'Summarize this customer chat conversation in 1-2 sentences, focusing on the customer\'s ' +
    'issue and current status. Output JSON: `{ summary: string }`'

  let raw: string
  try {
    const result = await callOpenRouter({
      system,
      user: conversationText,
      json: true,
      temperature: 0.3,
      maxTokens: 200,
    })
    raw = result.content
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ai/chat-suggested-reply] callOpenRouter (summary) failed:', msg)
    return NextResponse.json(
      { error: `AI generation failed: ${msg.slice(0, 200)}` },
      { status: 502 },
    )
  }

  let parsed: { summary?: unknown }
  try {
    parsed = extractJson<{ summary?: unknown }>(raw)
  } catch {
    return NextResponse.json(
      { error: 'AI returned a response that could not be parsed as JSON.', raw: raw.slice(0, 500) },
      { status: 502 },
    )
  }

  const summary =
    typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 600) : ''

  if (!summary) {
    return NextResponse.json(
      { error: 'AI returned an empty summary. Please try again.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ summary })
}
