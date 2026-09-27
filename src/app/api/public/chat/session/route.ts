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
import { sendEmail } from '@/lib/email-send'
import { renderLiveChatNotificationEmail } from '@/lib/email-templates/live-chat-notification'

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
  const formId = typeof body.formId === 'string' ? body.formId.trim() || null : null

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

  // --- Look up form first (if formId provided) ----------------------------
  let formRecord: { id: string; name: string; tenantId: string | null; workspaceId: string | null } | null = null
  if (formId) {
    try {
      formRecord = await db.form.findFirst({
        where: { id: formId },
        select: { id: true, name: true, tenantId: true, workspaceId: true },
      })
    } catch (formErr) {
      console.warn('[public-chat/session] form lookup failed:', formErr)
    }
  }

  // --- Look up tenant or workspace ----------------------------------------
  let tenant: { id: string; name: string; slug: string } | null = null
  let workspace: { id: string; name: string; slug: string } | null = null

  if (formRecord?.tenantId) {
    tenant = await db.tenant.findUnique({
      where: { id: formRecord.tenantId },
      select: { id: true, name: true, slug: true },
    }).catch(() => null)
  }

  if (!tenant && businessSlug) {
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
    }
  }

  if (!tenant && businessSlug) {
    try {
      workspace = await db.workspace.findFirst({
        where: {
          OR: [
            { slug: businessSlug },
            { id: businessSlug },
          ],
        },
        select: { id: true, name: true, slug: true },
      })
    } catch (err) {
      console.error('[public-chat/session] workspace lookup error:', err)
    }
  }

  const effectiveTenantId = formRecord?.tenantId || tenant?.id || null
  const effectiveWorkspaceId = formRecord?.workspaceId || workspace?.id || null

  if (!effectiveTenantId && !effectiveWorkspaceId) {
    return NextResponse.json(
      { error: 'Business not found' },
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }

  // --- Create session + initial system message ---------------------------
  try {
    const session = await db.publicChatSession.create({
      data: {
        tenantId: effectiveTenantId,
        workspaceId: effectiveWorkspaceId,
        formId: formRecord?.id || null,  // link chat to the form it originated from
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

    // --- Notify tenant / workspace admins (owners + admins) -----------------
    try {
      const recipients = await db.user.findMany({
        where: {
          ...(effectiveTenantId ? { tenantId: effectiveTenantId } : { workspaceId: effectiveWorkspaceId }),
          role: { in: ['owner', 'admin'] },
          isActive: true,
        },
        select: { id: true, email: true },
      })

      const visitorLabel = visitorName || visitorEmail || 'A visitor'
      const messageText = visitorName
        ? `${visitorName} started a new live chat on your website`
        : visitorEmail
          ? `${visitorEmail} started a new live chat on your website`
          : 'A new live chat was started on your website'

      const businessName = tenant?.name || workspace?.name || formRecord?.name || 'Our Team'

      await Promise.all(
        recipients.map(async (r) => {
          await createNotification({
            tenantId: effectiveTenantId || undefined,
            workspaceId: effectiveWorkspaceId || undefined,
            recipientId: r.id,
            type: 'reminder',
            category: 'customer',
            title: 'New live chat request',
            message: messageText,
            priority: 'high',
            actionUrl: `/?view=liveChat&session=${session.id}`,
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

          // WhatsApp-style device push. Fire-and-forget
          try {
            await sendWebPushToUser(r.id, effectiveTenantId || effectiveWorkspaceId || '', {
              title: 'New live chat request',
              body: messageText,
              url: `/?view=liveChat&session=${session.id}`,
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

          // Email notification (email-first path). Fire-and-forget
          if (r.email) {
            try {
              const firstMessage = typeof body.firstMessage === 'string'
                ? body.firstMessage.slice(0, 200)
                : null
              const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com'}/?view=liveChat&session=${session.id}`
              const { subject, html, text } = renderLiveChatNotificationEmail({
                visitorName,
                visitorEmail,
                visitorPhone,
                firstMessage,
                tenantName: businessName,
                sessionId: session.id,
                dashboardUrl,
                formName: formRecord?.name || null,
              })
              await sendEmail({
                to: r.email,
                subject,
                html,
                text,
                tenantId: effectiveTenantId || undefined,
                usageType: 'transactional',
              })
            } catch (emailErr) {
              console.warn('[public-chat/session] email send failed:', emailErr)
            }
          }
        }),
      )
    } catch (notifErr) {
      console.warn('[public-chat/session] notification create failed:', notifErr)
    }

    return NextResponse.json(
      {
        sessionId: session.id,
        tenantId: effectiveTenantId,
        workspaceId: effectiveWorkspaceId,
        businessName: tenant?.name || workspace?.name || 'Our Team',
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
