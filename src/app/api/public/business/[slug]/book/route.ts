/**
 * Public Business Hub — lead submission endpoint.
 *
 * POST /api/public/business/[slug]/book
 *
 * Accepts unauthenticated submissions from the public business hub page's
 * booking form. Creates a Lead in the matching tenant's CRM.
 *
 * Body:
 *   {
 *     intent: 'book' | 'quote' | 'request',
 *     name: string,        phone: string,
 *     email?: string,      address?: string,
 *     serviceId?: string,  preferredDate?: string,
 *     message?: string,
 *   }
 *
 * The lead source is set to 'public_booking' | 'public_quote' | 'public_request'
 * so businesses can filter by channel in their CRM.
 *
 * Rate-limited by visitor fingerprint (IP + User-Agent hash) to 10 submissions
 * per hour per visitor — prevents abuse without breaking legitimate use.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyOwner } from '@/lib/owner-notifications'

export const runtime = 'nodejs'

const SOURCE_BY_INTENT: Record<string, string> = {
  book: 'public_booking',
  quote: 'public_quote',
  request: 'public_request',
}

const INTENT_TITLE: Record<string, string> = {
  book: 'Online Booking',
  quote: 'Quote Request',
  request: 'Service Request',
}

// Simple in-memory rate limiter (per visitor fingerprint, 10/hour).
// Fine for single-instance deployment. For multi-instance, swap with Redis.
const RATE_LIMIT = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000  // 1 hour
const RATE_LIMIT_MAX = 10

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

// Phone validation: accept digits, +, spaces, dashes, parentheses. Min 7 digits.
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '')
  return digits.length >= 7 && digits.length <= 15
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  // Rate limit check.
  const fp = getVisitorFingerprint(req)
  if (!checkRateLimit(fp)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 },
    )
  }

  // Parse body.
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const intent = typeof body.intent === 'string' ? body.intent : 'book'
  if (!['book', 'quote', 'request'].includes(intent)) {
    return NextResponse.json({ error: 'Invalid intent' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() || undefined : undefined
  const address = typeof body.address === 'string' ? body.address.trim() || undefined : undefined
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId || undefined : undefined
  const preferredDate = typeof body.preferredDate === 'string' ? body.preferredDate || undefined : undefined
  const message = typeof body.message === 'string' ? body.message.trim() || undefined : undefined

  // Validate required fields.
  if (!name || name.length < 2 || name.length > 200) {
    return NextResponse.json({ error: 'Please enter your name' }, { status: 400 })
  }
  if (!phone || !isValidPhone(phone)) {
    return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
  }

  // Look up tenant by slug (or publicSlug).
  let tenant: { id: string; name: string; slug: string; email: string | null; phone: string | null; currency: string } | null = null
  try {
    tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { slug },
          { publicSlug: slug },
        ],
        suspendedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        currency: true,
      },
    })
  } catch (err) {
    console.error('[public-business/book] tenant lookup error:', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }

  if (!tenant) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Optionally validate serviceId belongs to this tenant.
  let service: { id: string; name: string; basePrice: number } | null = null
  if (serviceId) {
    try {
      service = await db.service.findFirst({
        where: { id: serviceId, tenantId: tenant.id, isActive: true },
        select: { id: true, name: true, basePrice: true },
      })
    } catch {
      // Service table might not have isPublic yet — ignore
    }
  }

  // Build the lead title and description.
  const source = SOURCE_BY_INTENT[intent]
  const title = `[${INTENT_TITLE[intent]}] ${name}${service ? ` — ${service.name}` : ''}`
  const descriptionParts: string[] = []
  if (message) descriptionParts.push(message)
  if (preferredDate) descriptionParts.push(`Preferred date: ${preferredDate}`)
  if (address) descriptionParts.push(`Address: ${address}`)
  const description = descriptionParts.join('\n\n') || undefined

  // Create the Lead.
  try {
    const lead = await db.lead.create({
      data: {
        title,
        name,
        phone,
        email,
        source,
        status: 'new',
        priority: intent === 'book' ? 'high' : 'medium',
        description,
        address,
        serviceType: service?.name || undefined,
        serviceId: service?.id || undefined,
        tenantId: tenant.id,
        value: service?.basePrice || 0,
        notesJson: JSON.stringify([
          {
            at: new Date().toISOString(),
            by: 'system',
            text: `Lead captured from public business hub at /${tenant.slug}`,
          },
        ]),
      },
    })

    // Fire-and-forget: notify the business owner via Email + in-app Bell
    // notification (the two channels the user asked for).
    //
    // notifyOwner() is the modern multi-channel orchestrator. We pass:
    //   - emailSubject + emailText + emailHtml  → email with full body
    //   - leadId + actionUrl                    → bell links to the lead
    //   - smsMessage: false                     → no SMS (user didn't ask for it)
    //   - (no whatsappMessage)                  → no WhatsApp (user didn't ask)
    // Web push still fires if the owner has browser push enabled (that's the
    // bell on mobile/desktop — harmless if not configured).
    //
    // Don't block the response — the visitor shouldn't wait for email delivery.
    const intentLabel =
      intent === 'book' ? 'New Online Booking' :
      intent === 'quote' ? 'New Quote Request' :
      'New Service Request'

    const emailLines = [
      `${intentLabel} from your public business hub.`,
      ``,
      `Name: ${name}`,
      `Phone: ${phone}`,
      ...(email ? [`Email: ${email}`] : []),
      ...(message ? [``, `Message:`, message] : []),
      ``,
      `View this lead in your ServiceOS dashboard.`,
    ]
    const emailText = emailLines.join('\n')
    const emailHtml = `
      <h2 style="margin:0 0 12px 0;color:#0f172a;">${intentLabel}</h2>
      <p style="margin:0 0 16px 0;color:#475569;">From your public business hub.</p>
      <table style="border-collapse:collapse;font-size:14px;color:#0f172a;">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Name:</td><td>${name}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Phone:</td><td>${phone}</td></tr>
        ${email ? `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">Email:</td><td>${email}</td></tr>` : ''}
      </table>
      ${message ? `<p style="margin:16px 0 4px 0;font-weight:600;color:#0f172a;">Message:</p><p style="margin:0;color:#475569;white-space:pre-wrap;">${message.replace(/</g, '&lt;')}</p>` : ''}
      <p style="margin-top:24px;color:#94a3b8;font-size:12px;">View this lead in your ServiceOS dashboard.</p>
    `

    notifyOwner(tenant.id, {
      eventType: 'lead.created',
      eventLabel: intentLabel,
      leadId: lead.id,
      actionUrl: `/leads`,
      smsMessage: false,             // user requested email + bell only
      emailSubject: `${intentLabel}: ${name}`,
      emailText,
      emailHtml,
      pushTitle: intentLabel,
      pushBody: `${name} (${phone}) submitted a ${intent} from your public page.`,
    }).catch((err) => {
      console.error('[public-business/book] notification error:', err)
    })

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: `${INTENT_TITLE[intent]} received. ${tenant.name} will contact you shortly.`,
    })
  } catch (err) {
    console.error('[public-business/book] lead create error:', err)
    return NextResponse.json(
      { error: 'Could not submit your request. Please try again or call the business directly.' },
      { status: 500 },
    )
  }
}

// Pre-flight OPTIONS for CORS (in case the form is embedded on another domain).
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
