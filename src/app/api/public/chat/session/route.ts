/**
 * Public Chat — start a new chat session.
 *
 * POST /api/public/chat/session
 *
 * Unauthenticated endpoint called by the embeddable chat widget on a
 * business's public site. Creates a PublicChatSession + initial system
 * message, then the visitor can POST messages to
 * /api/public/chat/[sessionId]/messages.
 *
 * The business owner's admin inbox is notified via socket.io (emitted by
 * the caller / a separate worker); this endpoint only persists state.
 *
 * Body:
 *   {
 *     businessSlug: string,         // tenant slug OR publicSlug
 *     visitorName?: string,
 *     visitorPhone?: string,
 *     visitorEmail?: string,
 *     metadata?: { currentPage?, referrer?, browser?, os?, ... }
 *   }
 *
 * Rate-limited to 5 new sessions per hour per visitor fingerprint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createNotification } from '@/lib/notifications'
import { sendWebPushToUser } from '@/lib/web-push-send'

export const runtime = 'nodejs'

// --- Rate limiter (in-memory, per-instance) -------------------------------
// 5 new chat sessions per hour per visitor fingerprint. Fine for single-
// instance deploys; swap with Redis for multi-instance.
const RATE_LIMIT = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000  // 1 hour
const RATE_LIMIT_MAX = 5

function getVisitorFingerprint(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'
  // Simple hash — not cryptographic, just for rate-limit keying.
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

// CORS — widget is embedded on third-party sites.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(req: NextRequest) {
  // --- Rate limit ---------------------------------------------------------
  const fp = getVisitorFingerprint(req)
  if (!checkRateLimit(fp)) {
    return NextResponse.json(
      { error: 'Too many chat sessions started. Please try again later.' },
      { status: 429, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }

  // --- Parse body ---------------------------------------------------------
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }

  const businessSlug = typeof body.businessSlug === 'string' ? body.businessSlug.trim() : ''
  if (!businessSlug) {
    return NextResponse.json(
      { error: 'businessSlug is required' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }

  const visitorName = typeof body.visitorName === 'string' ? body.visitorName.trim() || null : null
  const visitorPhone = typeof body.visitorPhone === 'string' ? body.visitorPhone.trim() || null : null
  const visitorEmail = typeof body.visitorEmail === 'string' ? body.visitorEmail.trim() || null : null

  // Validate email format if provided.
  if (visitorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail)) {
    return NextResponse.json(
      { error: 'Please enter a valid email' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }

  // Optional metadata — store as JSON string. Sanitize to a flat object of
  // strings to avoid storing arbitrary nested junk.
  const rawMetadata = body.metadata
  let metadata: Record<string, string> = {}
  if (rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)) {
    const src = rawMetadata as Record<string, unknown>
    for (const [k, v] of Object.entries(src)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        metadata[k] = String(v).slice(0, 500)
      }
    }
  }

  // --- Look up tenant -----------------------------------------------------
  let tenant: { id: string; name: string; slug: string } | null = null
  try {
    tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { slug: businessSlug },
          { publicSlug: businessSlug },
        ],
        suspendedAt: null,
      },
      select: { id: true, name: true, slug: true },
    })
  } catch (err) {
    console.error('[public-chat/session] tenant lookup error:', err)
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }

  if (!tenant) {
    return NextResponse.json(
      { error: 'Business not found' },
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }

  // --- Create session + initial system message ---------------------------
  try {
    const session = await db.publicChatSession.create({
      data: {
        tenantId: tenant.id,
        visitorName,
        visitorPhone,
        visitorEmail,
        visitorFingerprint: fp,
        status: 'active',
        lastMessageAt: new Date(),
        // Start at 1 so the admin Live Chat view shows a red badge on the
        // new session immediately. The admin view's 5s poll will pick this
        // up and render the unread pill.
        unreadCount: 1,
        metadataJson: JSON.stringify(metadata),
      },
    })

    await db.publicChatMessage.create({
      data: {
        sessionId: session.id,
        senderType: 'system',
        body: 'Chat session started',
      },
    })

    // --- Notify tenant admins (owners + admins) -----------------------------
    // The header bell polls /api/notifications/unread-count every 60s, so
    // creating an AppNotification here makes the bell ring within a minute
    // of a visitor starting a chat — without needing socket.io. The admin
    // LiveChatView already polls /api/chat/sessions every 5s, so once the
    // admin clicks through, they get near-real-time message updates.
    try {
      const recipients = await db.user.findMany({
        where: {
          tenantId: tenant.id,
          role: { in: ['owner', 'admin'] },
          isActive: true,
        },
        select: { id: true },
      })

      const visitorLabel = visitorName || visitorEmail || 'A visitor'
      const messageText = visitorName
        ? `${visitorName} started a new live chat on your website`
        : visitorEmail
          ? `${visitorEmail} started a new live chat on your website`
          : 'A new live chat was started on your website'

      // Fire-and-forget — notification failures must not break chat creation.
      // For each recipient we do TWO things:
      //   1. createNotification() → in-app bell + inbox row (polled every 60s)
      //   2. sendWebPushToUser()  → REAL Web Push to the admin's device(s).
      //      This is what makes the chat alert behave like WhatsApp: a system
      //      notification appears even if the admin's browser/app is CLOSED,
      //      because the push goes through APNs (iOS) / FCM (Android) which
      //      wake the device. sendWebPushToUser() is a safe no-op (returns
      //      { sent: 0 }) when the admin has no PushSubscription — so admins
      //      who haven't enabled push yet are unaffected.
      //
      // The push uses tag=`livechat-{sessionId}` + requireInteraction=true so
      // the notification PERSISTS until the admin clicks it (WhatsApp-style:
      // the alert doesn't auto-vanish after 5 seconds). Subsequent visitor
      // messages reuse the SAME tag, so the notification is UPDATED in place
      // rather than stacking — exactly like WhatsApp shows one notification
      // per conversation, refreshed with the latest message.
      await Promise.all(
        recipients.map(async (r) => {
          await createNotification({
            tenantId: tenant.id,
            recipientId: r.id,
            type: 'reminder',
            category: 'customer',
            title: 'New live chat request',
            message: messageText,
            priority: 'high',
            actionUrl: '/?view=liveChat',
            actionLabel: 'Open Live Chat',
            senderType: 'system',
            metadataJson: JSON.stringify({
              sessionId: session.id,
              visitorName,
              visitorPhone,
              visitorEmail,
              source: 'public_chat',
            }),
          })

          // WhatsApp-style device push. Fire-and-forget — a push failure
          // must never break chat creation. The in-app notification above
          // already guarantees the bell rings.
          try {
            await sendWebPushToUser(r.id, tenant.id, {
              title: 'New live chat request',
              body: messageText,
              url: '/?view=liveChat',
              tag: `livechat-${session.id}`,
              requireInteraction: true,
              data: {
                type: 'live_chat_session',
                sessionId: session.id,
                view: 'liveChat',
                source: 'public_chat',
              },
            })
          } catch (pushErr) {
            console.warn('[public-chat/session] push send failed:', pushErr)
          }
        }),
      )
    } catch (notifErr) {
      console.warn('[public-chat/session] notification create failed:', notifErr)
    }

    return NextResponse.json(
      {
        sessionId: session.id,
        tenantName: tenant.name,
        message: 'Chat started',
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  } catch (err) {
    console.error('[public-chat/session] create error:', err)
    return NextResponse.json(
      { error: 'Could not start chat session. Please try again.' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }
}
