/**
 * Public Business Hub — booking submission endpoint.
 *
 * POST /api/public/business/[slug]/book
 *
 * Accepts unauthenticated submissions from the public business hub page's
 * booking form. Creates BOTH a Lead (for CRM pipeline visibility) AND a
 * trackable Job (for customer-facing tracking + technician PIN verification)
 * in the matching tenant's CRM.
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
 * Response:
 *   {
 *     success: true,
 *     leadId: string,          // for the CRM Leads view
 *     jobId: string | null,    // for /portal/[id] tracking + PIN verification
 *     jobNumber: string | null,
 *     trackingUrl: string | null,  // '/portal/{jobId}'
 *     verificationPin: string, // 4-digit PIN (also SMS'd to customer on assign)
 *     message: string,
 *   }
 *
 * The lead source is set to 'public_booking' | 'public_quote' | 'public_request'
 * so businesses can filter by channel in their CRM. The Job's metadataJson
 * stores { leadId, source, intent, publicBooking: true } for back-traceability.
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

  // Auto-resolve or auto-create Customer account for seamless zero-friction booking
  let customer: { id: string; name: string; phone: string; email: string | null } | null = null;
  try {
    customer = await db.customer.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { phone },
          ...(email ? [{ email }] : []),
        ],
      },
      select: { id: true, name: true, phone: true, email: true },
    });

    if (!customer) {
      customer = await db.customer.create({
        data: {
          name,
          phone,
          email,
          address,
          tenantId: tenant.id,
        },
        select: { id: true, name: true, phone: true, email: true },
      });
    }
  } catch (err) {
    console.warn('[public-business/book] Customer auto-creation warning:', err);
  }

  // Generate 4-digit Job Verification PIN for fraud-proof arrival verification
  const verificationPin = Math.floor(1000 + Math.random() * 9000).toString();

  // Itemized service line items payload for CRM display
  const lineItems = service ? [
    {
      id: service.id,
      name: service.name,
      unitPrice: service.basePrice,
      quantity: 1,
      description: service.name,
    }
  ] : [];
  const lineItemsJson = JSON.stringify(lineItems);

  // Build the lead title and description.
  const source = SOURCE_BY_INTENT[intent]
  const title = `[${INTENT_TITLE[intent]}] ${name}${service ? ` — ${service.name}` : ''}`
  const descriptionParts: string[] = []
  if (message) descriptionParts.push(message)
  if (preferredDate) descriptionParts.push(`Preferred date: ${preferredDate}`)
  if (address) descriptionParts.push(`Address: ${address}`)
  descriptionParts.push(`Verification PIN: ${verificationPin}`)
  const description = descriptionParts.join('\n\n') || undefined

  // Create the Lead AND a trackable Job.
  //
  // Why both?
  //   - Lead → preserves CRM pipeline visibility (Leads → Deals → Quotes flow).
  //     The business owner sees this booking in their Leads view, can convert
  //     it to a Deal, send a Quote, etc.
  //   - Job → gives the CUSTOMER a trackable appointment. The public tracking
  //     page (/portal/[id]) fetches /api/jobs/[id], and the technician's
  //     "Start Work" PIN verification validates against job.verificationPin.
  //     Without a Job row, the SMS tracking link 404s and the PIN flow is dead.
  //
  // The Job is created with status 'pending' (no technician assigned yet) and
  // the verificationPin is pre-set so that when a tech IS later assigned (via
  // /api/jobs/[id] PUT → status 'assigned'), the existing PIN-generation guard
  // (`if (isAssignTransition && !existingJob.verificationPin)`) sees the PIN
  // already exists and does NOT regenerate/SMS a second time — the customer
  // already received this PIN in their booking confirmation.
  //
  // The two records are linked via Job.metadataJson.leadId + the Lead's
  // notesJson recording the jobId.
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
        customerId: customer?.id || undefined,
        tenantId: tenant.id,
        value: service?.basePrice || 0,
        notesJson: JSON.stringify([
          {
            at: new Date().toISOString(),
            by: 'system',
            text: `Lead captured from public business hub at /${tenant.slug}. Verification PIN: ${verificationPin}. Customer ID: ${customer?.id || 'none'}.`,
          },
        ]),
      },
    })

    // Resolve a workspace for this tenant so the Job is scoped correctly
    // (Job uses workspaceId, not tenantId, as its tenant link). Mirrors the
    // resolveWorkspaceId() pattern in /api/jobs/route.ts but tenant-scoped.
    let workspaceId: string | null = null
    try {
      const ws = await db.workspace.findFirst({
        where: { tenantId: tenant.id },
        select: { id: true },
      })
      if (ws) {
        workspaceId = ws.id
      } else {
        // No workspace for this tenant yet — create one so the Job isn't orphaned.
        const created = await db.workspace.create({
          data: {
            name: tenant.name,
            slug: tenant.slug,
            ownerId: 'system',
            tenantId: tenant.id,
          },
        })
        workspaceId = created.id
      }
    } catch (wsErr) {
      console.warn('[public-business/book] workspace resolution failed (non-fatal):', wsErr)
    }

    // Create the trackable Job. Best-effort: if this throws (e.g. schema drift),
    // the Lead still succeeded so the owner gets notified — we just won't have
    // a tracking link / PIN for this booking.
    let job: { id: string; jobNumber: string | null } | null = null
    try {
      job = await db.job.create({
        data: {
          title,
          description,
          status: 'pending',
          priority: intent === 'book' ? 'high' : 'medium',
          type: 'service',
          address: address || null,
          scheduledAt: preferredDate ? new Date(preferredDate) : null,
          notes: message || null,
          customerId: customer?.id || null,
          customerName: name,
          customerPhone: phone,
          customerEmail: email || null,
          serviceId: service?.id || null,
          quotedAmount: service?.basePrice || null,
          lineItemsJson: lineItemsJson,
          verificationPin,
          workspaceId,
          metadataJson: JSON.stringify({
            leadId: lead.id,
            source,
            intent,
            publicBooking: true,
            publicSlug: tenant.slug,
          }),
        },
        select: { id: true, jobNumber: true },
      })

      // Backlink: record the jobId on the Lead's notesJson so the CRM can
      // deep-link from the Lead card to the Job / tracking page.
      try {
        const existingNotes = (() => {
          try { return JSON.parse(lead.notesJson || '[]') as unknown[] } catch { return [] }
        })()
        existingNotes.push({
          at: new Date().toISOString(),
          by: 'system',
          text: `Trackable Job created: ${job.id}. Tracking link: /portal/${job.id}. Verification PIN: ${verificationPin}.`,
        })
        await db.lead.update({
          where: { id: lead.id },
          data: { notesJson: JSON.stringify(existingNotes) },
        })
      } catch (backlinkErr) {
        console.warn('[public-business/book] lead backlink failed (non-fatal):', backlinkErr)
      }
    } catch (jobErr) {
      console.error('[public-business/book] job creation failed (lead still created):', jobErr)
    }

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
      `View this lead in your Fieseros dashboard.`,
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
      <p style="margin-top:24px;color:#94a3b8;font-size:12px;">View this lead in your Fieseros dashboard.</p>
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
      jobId: job?.id || null,
      jobNumber: job?.jobNumber || null,
      // Tracking link for the customer — resolves to /portal/[id] which fetches
      // /api/jobs/[id]. Null only if Job creation failed (Lead still succeeded).
      trackingUrl: job?.id ? `/portal/${job.id}` : null,
      verificationPin,
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
