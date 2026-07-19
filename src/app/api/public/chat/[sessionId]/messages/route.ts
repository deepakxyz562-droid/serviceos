/**
 * Public Chat — send a message (POST) and poll for new messages (GET).
 *
 * POST /api/public/chat/[sessionId]/messages
 *   Body: { body: string, visitorName?: string }
 *   - Creates a PublicChatMessage with senderType='visitor'
 *   - Bumps session.lastMessageAt and unreadCount
 *   - Optionally backfills session.visitorName if missing
 *   - Returns { messageId, createdAt }
 *
 * GET /api/public/chat/[sessionId]/messages?since={ISO_DATE}
 *   - Returns messages with createdAt > since (or all if omitted), ASC
 *   - Marks admin messages as read (readAt=now) — visitor has now seen them
 *   - Returns { messages: [...] }
 *
 * Both handlers are unauthenticated — the chat widget is embedded on
 * third-party sites and the sessionId acts as the visitor's capability
 * token. Rate-limited by visitor fingerprint.
 *
 * The business owner's admin inbox receives the message in real time via
 * socket.io (emitted separately); this endpoint only persists state. The
 * GET poll is a fallback for when the websocket is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createNotification } from '@/lib/notifications'

export const runtime = 'nodejs'

// --- Rate limiter (in-memory, per-instance) -------------------------------
// 30 messages per hour per visitor fingerprint — generous enough for an
// active back-and-forth but blocks spam bots.
const RATE_LIMIT = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000  // 1 hour
const RATE_LIMIT_MAX = 30

function getVisitorFingerprint(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'
  let hash = 0
  const str = `${ip}:${ua}`
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return `fp_${Math.abs(hash).toString(36)}`
}

function checkRateLimit(fp: string): boolean {
  const now = Date.now()
  const entry = RATE_LIMIT.get(fp)
  if (!entry || entry.resetAt < now) {
    RATE_LIMIT.set(fp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' }

// CORS — widget is embedded on third-party sites.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// ---------------------------------------------------------------------------
// POST — visitor sends a message
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params

  // Rate limit (POST only — GET polling is cheap and not rate-limited here).
  const fp = getVisitorFingerprint(req)
  if (!checkRateLimit(fp)) {
    return NextResponse.json(
      { error: 'Too many messages. Please slow down.' },
      { status: 429, headers: CORS_HEADERS },
    )
  }

  // Parse body.
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!text) {
    return NextResponse.json(
      { error: 'Message body is required' },
      { status: 400, headers: CORS_HEADERS },
    )
  }
  if (text.length > 5000) {
    return NextResponse.json(
      { error: 'Message too long (max 5000 chars)' },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const visitorName =
    typeof body.visitorName === 'string' ? body.visitorName.trim() || null : null

  // Look up the session.
  // We also fetch tenantId + unreadCount so we can notify the tenant when a
  // visitor sends the first message since the admin last caught up. We only
  // fire a notification when the previous unreadCount was 0 — this avoids
  // spamming the bell with one notification per message in a rapid back-and-
  // forth (the session-creation notification, or the prior message's
  // notification, is still unread and already alerts the tenant).
  let session: {
    id: string
    status: string
    visitorName: string | null
    visitorEmail: string | null
    tenantId: string
    unreadCount: number
  } | null = null
  try {
    session = await db.publicChatSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        visitorName: true,
        visitorEmail: true,
        tenantId: true,
        unreadCount: true,
      },
    })
  } catch (err) {
    console.error('[public-chat/messages POST] lookup error:', err)
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 500, headers: CORS_HEADERS },
    )
  }

  if (!session) {
    return NextResponse.json(
      { error: 'Chat session not found' },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  if (session.status === 'closed') {
    return NextResponse.json(
      { error: 'Chat session is closed' },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  // Create the message + bump the session in parallel-ish (Prisma doesn't
  // support true parallel transactions across models without $transaction,
  // but two await calls in a row are fine here — both are tiny writes).
  try {
    const now = new Date()
    const message = await db.publicChatMessage.create({
      data: {
        sessionId: session.id,
        senderType: 'visitor',
        body: text,
      },
    })

    // Update session: lastMessageAt + unreadCount++, and backfill visitorName
    // if the visitor didn't give one at session-start but did now.
    await db.publicChatSession.update({
      where: { id: session.id },
      data: {
        lastMessageAt: now,
        unreadCount: { increment: 1 },
        ...(visitorName && !session.visitorName ? { visitorName } : {}),
      },
    })

    // --- Notify tenant admins (owners + admins) -----------------------------
    // Only fire when the admin had previously caught up (unreadCount was 0).
    // If unreadCount was already > 0, the tenant already has an unread live-
    // chat notification from session creation or a prior message — the admin
    // LiveChatView polls every 5s and the bell badge already reflects the
    // unread state, so a duplicate notification would just be noise.
    //
    // The header bell polls /api/notifications/unread-count every 60s, so
    // the tenant sees the alert within a minute of the visitor's message —
    // without needing socket.io.
    if (session.unreadCount === 0) {
      try {
        const recipients = await db.user.findMany({
          where: {
            tenantId: session.tenantId,
            role: { in: ['owner', 'admin'] },
            isActive: true,
          },
          select: { id: true },
        })

        const visitorLabel = session.visitorName || session.visitorEmail || 'A visitor'
        // Trim the message body for the notification preview (max 120 chars).
        const preview = text.length > 120 ? text.slice(0, 117) + '...' : text
        const messageText = `${visitorLabel}: ${preview}`

        await Promise.all(
          recipients.map((r) =>
            createNotification({
              tenantId: session.tenantId,
              recipientId: r.id,
              type: 'reminder',
              category: 'customer',
              title: 'New live chat message',
              message: messageText,
              priority: 'normal',
              actionUrl: '/?view=liveChat',
              actionLabel: 'Open Live Chat',
              senderType: 'system',
              metadataJson: JSON.stringify({
                sessionId: session.id,
                visitorName: session.visitorName,
                visitorEmail: session.visitorEmail,
                source: 'public_chat_message',
              }),
            }),
          ),
        )
      } catch (notifErr) {
        // Notification failures must never break message delivery.
        console.warn('[public-chat/messages POST] notification create failed:', notifErr)
      }
    }

    return NextResponse.json(
      { messageId: message.id, createdAt: message.createdAt },
      { headers: CORS_HEADERS },
    )
  } catch (err) {
    console.error('[public-chat/messages POST] create error:', err)
    return NextResponse.json(
      { error: 'Could not send message. Please try again.' },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}

// ---------------------------------------------------------------------------
// GET — visitor polls for new messages (socket.io fallback)
// ---------------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params

  // Parse ?since=ISO_DATE (optional). Invalid date → ignore (return all).
  const sinceParam = req.nextUrl.searchParams.get('since')
  let since: Date | null = null
  if (sinceParam) {
    const parsed = new Date(sinceParam)
    if (!isNaN(parsed.getTime())) since = parsed
  }

  // Look up session.
  try {
    const session = await db.publicChatSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    })
    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404, headers: CORS_HEADERS },
      )
    }

    // Fetch messages after `since` (or all), ordered ASC.
    const messages = await db.publicChatMessage.findMany({
      where: {
        sessionId,
        ...(since ? { createdAt: { gt: since } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        senderType: true,
        senderName: true,
        body: true,
        createdAt: true,
        readAt: true,
      },
    })

    // Mark all unread admin messages as read (visitor has now seen them).
    // Done in a background fire — we don't want to delay the response. But
    // since this is a small write and the visitor will poll again, we just
    // await it. If it fails, no big deal — next poll will retry.
    try {
      await db.publicChatMessage.updateMany({
        where: {
          sessionId,
          senderType: 'admin',
          readAt: null,
        },
        data: { readAt: new Date() },
      })
    } catch (err) {
      // Non-fatal — log and move on.
      console.warn('[public-chat/messages GET] mark-read failed:', err)
    }

    return NextResponse.json(
      { messages },
      { headers: CORS_HEADERS },
    )
  } catch (err) {
    console.error('[public-chat/messages GET] error:', err)
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}
