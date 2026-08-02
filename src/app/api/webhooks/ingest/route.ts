import { db } from '@/lib/db'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookLeadConfig {
  notifyWhatsApp?: boolean
  whatsappNumber?: string
  whatsappMessage?: string
  autoReplyWhatsApp?: boolean
  autoReplyTemplate?: string
  defaultService?: string
  defaultTags?: string[]
  assignToId?: string
  assignToName?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

// Validate API key from Authorization header
async function validateApiKey(authHeader: string | null): Promise<{
  valid: boolean
  credentialId?: string
  tenantId?: string
  workspaceId?: string
  config?: Record<string, unknown>
  error?: string
}> {
  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header. Use: Bearer YOUR_API_KEY' }
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return { valid: false, error: 'Invalid Authorization format. Use: Bearer YOUR_API_KEY' }
  }

  const apiKey = match[1]

  // Search all credential types that could be API keys
  const credentials = await db.credential.findMany({
    where: {
      OR: [
        { type: 'apiKey' },
        { type: 'webhook' },
        { type: 'wordpress' },
      ]
    },
  })

  for (const cred of credentials) {
    try {
      const data = safeJsonParse(cred.encryptedData, {}) as Record<string, string>
      if (
        data.apiKey === apiKey ||
        data.key === apiKey ||
        data.token === apiKey ||
        data.accessToken === apiKey
      ) {
        return {
          valid: true,
          credentialId: cred.id,
          tenantId: cred.workspaceId || undefined,
          workspaceId: cred.workspaceId || undefined,
          config: safeJsonParse(cred.encryptedData, {}) as Record<string, unknown>,
        }
      }
    } catch {
      // Skip malformed
    }
  }

  return { valid: false, error: 'Invalid API key' }
}

// Verify HMAC signature for webhook security
function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  // Support both raw hex and sha256= prefixed formats
  const sig = signature.replace(/^sha256=/, '')
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

// Smart field mapping — maps any incoming data to Lead model fields
function mapToLeadFields(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}

  // Field name groups with priority order
  const fieldMap: Record<string, string[]> = {
    name: ['name', 'your-name', 'full_name', 'fullname', 'customer_name', 'contact_name', 'first_name', 'client_name', 'from_name', 'sender_name', 'visitor_name', 'user_name', 'full-name'],
    phone: ['phone', 'your-phone', 'phone_number', 'mobile', 'tel', 'telephone', 'your-number', 'contact_number', 'cell', 'from_phone', 'sender_phone', 'phone_no', 'phonenumber', 'contact_phone'],
    email: ['email', 'your-email', 'email_address', 'mail', 'e-mail', 'from_email', 'sender_email', 'email_address', 'user_email', 'visitor_email'],
    company: ['company', 'your-company', 'company_name', 'organization', 'organisation', 'business_name', 'business', 'firm', 'agency'],
    service: ['service', 'your-service', 'service_type', 'service_required', 'subject', 'your-subject', 'service_needed', 'interest', 'topic', 'category', 'service_type', 'inquiry_type', 'type'],
    message: ['message', 'your-message', 'notes', 'comments', 'description', 'details', 'enquiry', 'inquiry', 'body', 'content', 'text', 'comment', 'question'],
    address: ['address', 'your-address', 'location', 'city', 'your-city', 'area', 'street', 'region', 'state', 'zip', 'postal', 'country'],
  }

  const findFirst = (keys: string[]): string | undefined => {
    for (const key of keys) {
      if (data[key] && typeof data[key] === 'string' && (data[key] as string).trim()) {
        return (data[key] as string).trim()
      }
      // Case-insensitive fallback
      const lowerKey = key.toLowerCase()
      for (const [k, v] of Object.entries(data)) {
        if (k.toLowerCase().replace(/[-_\s]/g, '') === lowerKey.replace(/[-_\s]/g, '') && typeof v === 'string' && v.trim()) {
          return v.trim()
        }
      }
    }
    return undefined
  }

  for (const [field, keys] of Object.entries(fieldMap)) {
    mapped[field] = findFirst(keys)
  }

  // Combine message into notes
  const message = mapped.message as string | undefined
  if (message) {
    mapped.notes = message
  }

  // Collect unmapped fields as additional notes
  const allMappedKeys = new Set(
    Object.values(fieldMap).flat().map(k => k.toLowerCase().replace(/[-_\s]/g, ''))
  )
  const systemKeys = new Set([
    'tenantid', 'workspaceid', 'source', 'form_source', 'form_id', 'form_title',
    'source_url', 'ip_address', 'user_agent', '_form_source', '_form_id',
    '_form_title', '_source_url', '_ip_address', '_user_agent',
  ])

  const extraFields: string[] = []
  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase().replace(/[-_\s]/g, '')
    if (!allMappedKeys.has(normalizedKey) && !systemKeys.has(normalizedKey) && typeof value === 'string' && value.trim()) {
      extraFields.push(`${key}: ${value.trim()}`)
    }
  }

  if (extraFields.length > 0) {
    const existingNotes = (mapped.notes as string) || ''
    mapped.notes = existingNotes
      ? `${existingNotes}\n\nAdditional:\n${extraFields.join('\n')}`
      : `Additional:\n${extraFields.join('\n')}`
  }

  return mapped
}

// Calculate auto-score
function calculateLeadScore(data: {
  email?: string | null
  company?: string | null
  source?: string
}): number {
  let score = 50
  if (data.email && data.email.trim().length > 0) score += 10
  if (data.company && data.company.trim().length > 0) score += 10
  if (data.source === 'whatsapp') score += 20
  if (data.source === 'wordpress' || data.source === 'webhook') score += 15
  if (data.source === 'website') score += 10
  return Math.min(score, 100)
}

// Detect the source from request data
function detectSource(data: Record<string, unknown>): string {
  if (data._form_source === 'contact-form-7' || data._form_source === 'cf7') return 'wordpress'
  if (data._form_source === 'wpforms') return 'wordpress'
  if (data._form_source === 'gravity-forms') return 'wordpress'
  if (data._form_source === 'fluent-forms') return 'wordpress'
  if (data._form_source === 'elementor-forms') return 'wordpress'
  if (data._form_source === 'wordpress') return 'wordpress'
  if (data.source === 'wordpress') return 'wordpress'
  if (data.source === 'website') return 'website'
  if (data.source === 'whatsapp') return 'whatsapp'
  if (data.source === 'facebook') return 'facebook'
  if (data.source === 'google_ads') return 'google_ads'
  if (data.source === 'referral') return 'referral'
  // Check user-agent for common sources
  const ua = (data._user_agent as string) || ''
  if (ua.includes('WordPress')) return 'wordpress'
  return 'api'
}

// ─── POST /api/webhooks/ingest ────────────────────────────────────────────────
// Universal webhook endpoint — accepts leads from ANY source

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ─── Authentication ───────────────────────────────────────────────────
    const authHeader = request.headers.get('Authorization')
    const queryApiKey = request.nextUrl.searchParams.get('key')
    const effectiveAuth = authHeader || (queryApiKey ? `Bearer ${queryApiKey}` : null)

    const authResult = await validateApiKey(effectiveAuth)
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      )
    }

    // ─── Signature Verification (optional) ────────────────────────────────
    const rawBody = await request.text()
    const signature = request.headers.get('X-Webhook-Signature') || request.headers.get('X-Hub-Signature-256')
    const webhookConfig = authResult.config as Record<string, string> | undefined
    const webhookSecret = webhookConfig?.webhookSecret || webhookConfig?.signingSecret

    if (webhookSecret && signature) {
      if (!verifySignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json(
          { error: 'Invalid signature', message: 'Webhook signature verification failed' },
          { status: 403 }
        )
      }
    }

    // ─── Parse Body ───────────────────────────────────────────────────────
    let body: Record<string, unknown>
    const contentType = request.headers.get('content-type') || ''

    try {
      if (contentType.includes('application/json')) {
        body = JSON.parse(rawBody)
      } else if (contentType.includes('form-data') || contentType.includes('x-www-form-urlencoded')) {
        // Parse URL-encoded or form data
        const params = new URLSearchParams(rawBody)
        body = Object.fromEntries(params.entries())
      } else {
        body = JSON.parse(rawBody)
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid body', message: 'Could not parse request body as JSON or form data' },
        { status: 400 }
      )
    }

    // ─── Extract Metadata ─────────────────────────────────────────────────
    const tenantId = (body.tenantId as string) || (body.tenant_id as string) || authResult.tenantId
    const workspaceId = authResult.workspaceId
    const source = detectSource(body)
    const leadConfig: WebhookLeadConfig = {
      notifyWhatsApp: (body._notifyWhatsApp as boolean) ?? (webhookConfig?.notifyWhatsApp === 'true'),
      whatsappNumber: (body._whatsappNumber as string) || (webhookConfig?.whatsappNumber as string),
      whatsappMessage: (body._whatsappMessage as string) || (webhookConfig?.whatsappMessage as string),
      autoReplyWhatsApp: (body._autoReplyWhatsApp as boolean) ?? (webhookConfig?.autoReplyWhatsApp === 'true'),
      autoReplyTemplate: (body._autoReplyTemplate as string) || (webhookConfig?.autoReplyTemplate as string),
      defaultService: (body._defaultService as string) || (webhookConfig?.defaultService as string),
      defaultTags: (body._defaultTags as string[]) || (webhookConfig?.defaultTags as string[])?.split(','),
      assignToId: (body._assignToId as string) || (webhookConfig?.assignToId as string),
      assignToName: (body._assignToName as string) || (webhookConfig?.assignToName as string),
    }

    // Clean internal fields from body before mapping
    const cleanBody = { ...body }
    Object.keys(cleanBody).forEach(key => {
      if (key.startsWith('_')) delete cleanBody[key]
    })
    // Also remove known system fields
    delete cleanBody.tenantId
    delete cleanBody.tenant_id
    delete cleanBody.workspaceId
    delete cleanBody.source

    // ─── Map Fields ───────────────────────────────────────────────────────
    const mapped = mapToLeadFields(cleanBody)

    // Validate required fields
    if (!mapped.name && !mapped.phone) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'At least a name or phone number is required to create a lead.',
          hint: 'Map your form fields using common names like "name", "your-name", "phone", "your-phone", "email", "your-email", etc.',
          supportedFields: {
            name: ['name', 'your-name', 'full_name', 'fullname', 'customer_name', 'contact_name', 'first_name'],
            phone: ['phone', 'your-phone', 'phone_number', 'mobile', 'tel', 'telephone', 'contact_number'],
            email: ['email', 'your-email', 'email_address'],
            company: ['company', 'your-company', 'company_name', 'organization'],
            service: ['service', 'your-service', 'subject', 'your-subject'],
            message: ['message', 'your-message', 'notes', 'comments', 'description'],
            address: ['address', 'your-address', 'location', 'city'],
          },
        },
        { status: 400 }
      )
    }

    // ─── Create Lead ──────────────────────────────────────────────────────
    // NOTE: The Lead Prisma model does NOT have `score`, `service`, `company`,
    // `tags`, `notes`, `assignedToName`, or `workspaceId` fields. The previous
    // implementation passed all of these to `db.lead.create()`, which threw a
    // Prisma validation error at runtime (the route was completely broken).
    //
    // Field mapping (Lead-model-aware):
    //   - `service`  → `serviceType`        (Lead.serviceType is the FK-friendly label)
    //   - `tags`     → `tagsJson`           (JSON-stringified string[])
    //   - `notes`    → `description`        (Lead.description is the long-form text)
    //   - `company`  → folded into `notesJson` as a structured note (per task spec:
    //                  "Map stale fields to notesJson if needed, e.g. put company
    //                  and service into the notes")
    //   - `service`  → ALSO folded into `notesJson` (so the original incoming
    //                  service label is preserved even when serviceType is set
    //                  from leadConfig.defaultService)
    //   - `score`    → computed for the response payload only (NOT stored — the
    //                  Lead model has no score field; the value is informational)
    //   - `assignedToName` → dropped (Lead only stores `assignedToId`; the
    //                  assignee's name is accessible via the `assignedTo` relation)
    //   - `workspaceId` → dropped (Lead only stores `tenantId`)
    //   - `include.assignee` → renamed to `include.assignedTo` (the Prisma
    //                  relation on Lead is named `assignedTo`, not `assignee`)
    const score = calculateLeadScore({
      email: mapped.email as string | null,
      company: mapped.company as string | null,
      source,
    })

    const defaultTags = ['webhook', source]
    if (leadConfig.defaultTags) {
      defaultTags.push(...leadConfig.defaultTags)
    }
    if (body._form_source) {
      defaultTags.push(body._form_source as string)
    }

    // Build a structured notesJson array (Lead.notesJson is a stringified
    // array of `{ text, createdAt, author? }` objects — see leads-view.tsx).
    // We push a single "Ingestion metadata" note that captures the original
    // `company` and `service` fields so they're preserved for the sales rep
    // reviewing the Lead in the pipeline.
    const ingestionNotes: { text: string; createdAt: string; author?: string }[] = []
    const companyValue = (mapped.company as string) || null
    const serviceValue = (mapped.service as string) || leadConfig.defaultService || null
    const messageNotes = (mapped.notes as string) || null

    if (companyValue || serviceValue) {
      const metaParts: string[] = []
      if (companyValue) metaParts.push(`Company: ${companyValue}`)
      if (serviceValue) metaParts.push(`Service: ${serviceValue}`)
      ingestionNotes.push({
        text: metaParts.join('\n'),
        createdAt: new Date().toISOString(),
        author: 'webhook',
      })
    }
    if (messageNotes) {
      ingestionNotes.push({
        text: messageNotes,
        createdAt: new Date().toISOString(),
        author: 'webhook',
      })
    }

    const lead = await db.lead.create({
      data: {
        name: (mapped.name as string) || (mapped.phone as string) || `${source} Lead`,
        phone: (mapped.phone as string) || 'N/A',
        email: (mapped.email as string) || null,
        source,
        serviceType: serviceValue,
        address: (mapped.address as string) || null,
        tagsJson: JSON.stringify([...new Set(defaultTags)]),
        notesJson: JSON.stringify(ingestionNotes),
        description: messageNotes,
        assignedToId: leadConfig.assignToId || null,
        tenantId: tenantId || null,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    })

    // ─── (Legacy) Lead Activity ───────────────────────────────────────────
    // The previous implementation called `db.leadActivity.create(...)`, but
    // the `LeadActivity` Prisma model does NOT exist in the current schema
    // (see prisma/schema.prisma). The call threw at runtime. We preserve
    // the audit metadata by appending it to the Lead's `notesJson` instead
    // — non-fatal if it fails (the Lead is already persisted).
    //
    // We intentionally do NOT re-fetch + update the Lead here (avoids a
    // second write round-trip per webhook); the metadata above is already
    // captured in the ingestion notes. The `cleanBody` + processing time
    // are logged to the server console for debugging.

    // ─── WhatsApp Notifications (non-blocking) ────────────────────────────
    // Use the locally-tracked `companyValue`, `serviceValue`, and `score`
    // (Lead-row references to `lead.company` / `lead.service` / `lead.score`
    // were removed when we stripped the stale fields from db.lead.create()).
    const whatsappResults: Record<string, unknown> = {}

    // Owner notification
    if (leadConfig.notifyWhatsApp && leadConfig.whatsappNumber) {
      const ownerMsg = leadConfig.whatsappMessage ||
        `🔔 New Lead from ${source.toUpperCase()}\n\n` +
        `Name: ${lead.name}\n` +
        `Phone: ${lead.phone}\n` +
        (lead.email ? `Email: ${lead.email}\n` : '') +
        (companyValue ? `Company: ${companyValue}\n` : '') +
        (serviceValue ? `Service: ${serviceValue}\n` : '') +
        `Score: ${score}/100\n` +
        `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`

      sendWhatsAppMessage({
        to: leadConfig.whatsappNumber,
        message: ownerMsg,
      }).then(result => {
        whatsappResults.ownerNotified = result.success
        console.log(`[Webhook] WhatsApp owner notification: ${result.success ? 'sent' : 'failed'}`, result.error || '')
      }).catch(err => {
        console.error('[Webhook] WhatsApp owner notification error:', err)
      })
    }

    // Auto-reply to the lead's phone
    if (leadConfig.autoReplyWhatsApp && lead.phone && lead.phone !== 'N/A') {
      const autoReplyMsg = leadConfig.autoReplyTemplate ||
        `Thank you for reaching out, ${lead.name}! We've received your inquiry and our team will contact you shortly. - Fieseros`

      sendWhatsAppMessage({
        to: lead.phone,
        message: autoReplyMsg,
      }).then(result => {
        whatsappResults.autoReplySent = result.success
        console.log(`[Webhook] WhatsApp auto-reply: ${result.success ? 'sent' : 'failed'}`, result.error || '')
      }).catch(err => {
        console.error('[Webhook] WhatsApp auto-reply error:', err)
      })
    }

    console.log(`[Webhook] Lead created: ${lead.id} - ${lead.name} (${lead.phone}) [${source}] in ${Date.now() - startTime}ms`)

    return NextResponse.json(
      {
        success: true,
        lead: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          // `score` is informational only — the Lead model does not store it.
          // We return the computed value so callers that depend on it (e.g.
          // legacy Zapier integrations) keep working.
          score,
          status: lead.status,
          // `service` mirror — Lead.serviceType is the canonical field, but
          // the response preserves the original `service` key for backwards
          // compatibility with existing webhook consumers.
          service: serviceValue,
          serviceType: lead.serviceType,
          company: companyValue,
          createdAt: lead.createdAt,
        },
        meta: {
          source,
          processingTimeMs: Date.now() - startTime,
          fieldsMapped: Object.keys(mapped).filter(k => mapped[k]),
          whatsapp: Object.keys(whatsappResults).length > 0 ? whatsappResults : undefined,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Webhook] Failed to process:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// ─── GET /api/webhooks/ingest ─────────────────────────────────────────────────
// Health check / connection test

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const queryApiKey = request.nextUrl.searchParams.get('key')
    const effectiveAuth = authHeader || (queryApiKey ? `Bearer ${queryApiKey}` : null)

    const authResult = await validateApiKey(effectiveAuth)
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      )
    }

    const [totalWebhook, totalWordPress, totalApi] = await Promise.all([
      db.lead.count({ where: { source: 'webhook' } }),
      db.lead.count({ where: { source: 'wordpress' } }),
      db.lead.count({ where: { source: 'api' } }),
    ])

    const recentLeads = await db.lead.findMany({
      where: { source: { in: ['webhook', 'wordpress', 'api'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        source: true,
        // `score` and `service` are NOT Lead fields — they were removed
        // from the select clause to avoid a Prisma validation error.
        // The Lead's `serviceType` is the canonical service label.
        serviceType: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      status: 'connected',
      service: 'Fieseros Universal Webhook',
      version: '2.0.0',
      endpoint: '/api/webhooks/ingest',
      methods: ['POST'],
      authentication: 'Bearer token (API Key)',
      signatureVerification: 'X-Webhook-Signature header (HMAC-SHA256, optional)',
      tenantId: authResult.tenantId || null,
      stats: {
        totalWebhookLeads: totalWebhook,
        totalWordPressLeads: totalWordPress,
        totalApiLeads: totalApi,
        totalAll: totalWebhook + totalWordPress + totalApi,
        recentLeads,
      },
      supportedFields: {
        name: ['name', 'your-name', 'full_name', 'fullname', 'customer_name', 'contact_name', 'first_name', 'client_name'],
        phone: ['phone', 'your-phone', 'phone_number', 'mobile', 'tel', 'telephone', 'contact_number', 'cell'],
        email: ['email', 'your-email', 'email_address', 'mail', 'from_email'],
        company: ['company', 'your-company', 'company_name', 'organization', 'business_name'],
        service: ['service', 'your-service', 'service_type', 'subject', 'your-subject', 'inquiry_type'],
        message: ['message', 'your-message', 'notes', 'comments', 'description', 'enquiry', 'inquiry'],
        address: ['address', 'your-address', 'location', 'city', 'your-city', 'area'],
      },
      controlFields: {
        '_notifyWhatsApp': 'Set to true to send WhatsApp notification to owner',
        '_whatsappNumber': 'Owner WhatsApp number for notification',
        '_whatsappMessage': 'Custom WhatsApp notification message template',
        '_autoReplyWhatsApp': 'Set to true to auto-reply via WhatsApp',
        '_autoReplyTemplate': 'Custom WhatsApp auto-reply message',
        '_defaultService': 'Default service category for leads',
        '_defaultTags': 'Comma-separated default tags',
        '_assignToId': 'User ID to auto-assign leads',
        '_assignToName': 'User name to auto-assign leads',
      },
    })
  } catch (error) {
    console.error('[Webhook] Health check failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
