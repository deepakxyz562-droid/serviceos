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
        unreadCount: 0,
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
