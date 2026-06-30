import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendEmail, resolveSmtpConfig } from '@/lib/email-send'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'
import { checkWhatsAppCredits, deductWhatsAppCredit } from '@/lib/credit-management'
import {
  resolveBroadcastAudience,
  resolveTenantId,
  personalizeForRecipient,
  type BroadcastRecipient,
} from '@/lib/broadcast-audience'

interface SendBroadcastBody {
  // Identification
  campaignId?: string
  name?: string
  // Email-channel fields
  subject?: string
  html?: string
  text?: string
  // WhatsApp/SMS body (defaults to html if not provided)
  message?: string
  // Audience selectors (one or more). If none provided and campaignId is set,
  // the audience is resolved from the stored campaign fields.
  contactIds?: string[]
  groupIds?: string[]
  customerIds?: string[]
  segmentId?: string
  allContacts?: boolean
  // Email provider (for email/multi channel)
  providerId?: string
  credentialId?: string
  // Channel override (defaults to the campaign's channel)
  channel?: 'email' | 'whatsapp' | 'sms' | 'multi'
}

interface SendLog {
  recipientKey: string
  refId: string
  source: 'contact' | 'customer'
  name: string
  email?: string | null
  phone?: string | null
  channel: 'email' | 'whatsapp' | 'sms' | 'multi'
  success: boolean
  messageId?: string
  simulated?: boolean
  error?: string
  skipped?: boolean
}

/**
 * POST /api/campaigns/send
 *
 * Unified broadcast dispatcher. Sends personalized emails and/or WhatsApp
 * messages to a resolved audience. Works for:
 *   - Email-channel broadcasts → sends emails via the selected provider
 *   - WhatsApp-channel broadcasts → sends WhatsApp messages via sendWhatsAppMessage
 *   - Multi-channel broadcasts → sends both email (where recipient has email)
 *     and WhatsApp (where recipient has phone)
 *
 * Updates the linked Campaign row's analytics + status (sentCount, failedCount,
 * totalRecipients, status='completed') regardless of audience size — so even
 * a 0-recipient send correctly flips the campaign to "completed".
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SendBroadcastBody = await request.json()

    // ── Resolve the linked campaign (if any) to inherit channel + audience ──
    let campaign: Awaited<ReturnType<typeof db.campaign.findUnique>> = null
    if (body.campaignId) {
      campaign = await db.campaign.findUnique({ where: { id: body.campaignId } })
    }

    const channel = body.channel || (campaign?.channel as SendBroadcastBody['channel']) || 'email'

    // ── Credit check for WhatsApp/SMS/Multi channel ────────────────────────
    if ((channel === 'whatsapp' || channel === 'sms' || channel === 'multi') && user.tenantId) {
      const creditCheck = await checkWhatsAppCredits(user.tenantId)
      if (!creditCheck.allowed) {
        return NextResponse.json(
          {
            error: creditCheck.reason || 'WhatsApp credits exhausted',
            creditExhausted: true,
            creditStatus: creditCheck,
          },
          { status: 403 },
        )
      }
    }

    // ── Validate inputs per channel ─────────────────────────────────────────
    if ((channel === 'email' || channel === 'multi') && (!body.subject || !body.html)) {
      return NextResponse.json(
        { error: 'subject and html are required for email/multi-channel broadcasts' },
        { status: 400 },
      )
    }
    if ((channel === 'whatsapp' || channel === 'sms') && !body.message && !body.html) {
      return NextResponse.json(
        { error: 'message (or html) is required for WhatsApp/SMS broadcasts' },
        { status: 400 },
      )
    }

    // ── Resolve audience ────────────────────────────────────────────────────
    const audience = await resolveBroadcastAudience({
      tenantId: user.tenantId,
      // Stored campaign fields (used when no direct selectors passed)
      audienceType: campaign?.audienceType,
      audienceId: campaign?.audienceId,
      audienceFiltersJson: campaign?.audienceFiltersJson,
      // Direct selectors (override stored fields)
      contactIds: body.contactIds,
      groupIds: body.groupIds,
      customerIds: body.customerIds,
      segmentId: body.segmentId,
      allContacts: body.allContacts,
      channel,
    })

    const recipients = audience.recipients
    const totalAudience = recipients.length

    // ── Marketing provider gate (email only) ────────────────────────────────
    // When sending email without an explicit providerId/credentialId, refuse
    // early so the UI can prompt the user to connect one.
    if ((channel === 'email' || channel === 'multi') && !body.providerId && !body.credentialId) {
      // Look up the tenant's default marketing EmailProvider directly.
      // First try the user's tenant, then fall back to any active marketing
      // provider (covers the admin case where tenantId is null and providers
      // may be stored under a different/default tenant id).
      let defaultMarketing = await db.emailProvider.findFirst({
        where: {
          tenantId: user.tenantId || undefined,
          status: 'active',
          OR: [{ usageType: 'marketing' }, { usageType: 'both' }],
        },
        orderBy: [{ isDefaultMarketing: 'desc' }, { createdAt: 'asc' }],
        select: { id: true },
      })
      if (!defaultMarketing) {
        defaultMarketing = await db.emailProvider.findFirst({
          where: {
            status: 'active',
            OR: [{ usageType: 'marketing' }, { usageType: 'both' }],
          },
          orderBy: [{ isDefaultMarketing: 'desc' }, { createdAt: 'asc' }],
          select: { id: true },
        })
      }
      if (!defaultMarketing) {
        return NextResponse.json(
          {
            error: 'MARKETING_PROVIDER_REQUIRED',
            message:
              'Email Provider Required — connect SMTP, Resend, SendGrid, Amazon SES, Mailgun or Brevo before sending email broadcasts.',
            providerRequired: true,
          },
          { status: 409 },
        )
      }
      // Auto-assign the default so we don't refuse the send.
      body.providerId = defaultMarketing.id
    }

    // ── Pre-flight: validate the resolved provider yields a usable SMTP config
    // BEFORE entering the per-recipient loop (email/multi channels only).
    //
    // Same guard as /api/email-campaigns/send: without this, the route returns
    // HTTP 200 but every recipient fails inside sendEmail() because
    // emailProviderToSmtpConfig() returned null for that provider. Failing
    // fast with 409 + a precise message is far better UX than "0 sent, N
    // failed — MARKETING_PROVIDER_REQUIRED".
    if (channel === 'email' || channel === 'multi') {
      const preflight = await resolveSmtpConfig({
        providerId: body.providerId,
        credentialId: body.credentialId,
        usageType: 'marketing',
      })
      if (preflight.marketingProviderRequired || !preflight.config) {
        const providerLabel = body.providerId
          ? `Provider "${body.providerId}" was found but its SMTP configuration is incomplete — verify the SMTP host, username and password fields in Settings → Email Providers, then retry.`
          : body.credentialId
            ? `Credential "${body.credentialId}" could not be resolved to a valid SMTP config.`
            : 'Connect SMTP, Resend, SendGrid, Amazon SES, Mailgun or Brevo before sending campaigns.'
        return NextResponse.json(
          {
            error: 'MARKETING_PROVIDER_REQUIRED',
            message: `Email Provider Required — ${providerLabel}`,
            providerRequired: true,
          },
          { status: 409 },
        )
      }
    }

    // ── Dispatch loop ───────────────────────────────────────────────────────
    const logs: SendLog[] = []
    let sentCount = 0
    let failedCount = 0
    let skippedCount = 0

    for (const recipient of recipients) {
      const log = await dispatchToRecipient(recipient, channel, body)
      logs.push(log)
      if (log.skipped) {
        skippedCount++
      } else if (log.success) {
        sentCount++
      } else {
        failedCount++
      }
      // Tiny delay to avoid SMTP/WhatsApp rate limits
      await new Promise((r) => setTimeout(r, 50))
    }

    // ── Persist notification logs ───────────────────────────────────────────
    // Resolve a real tenantId (auto-detects first tenant when user.tenantId is null)
    // so the FK constraint on NotificationLog.tenantId doesn't fail.
    const resolvedTenantId = await resolveTenantId(user.tenantId)
    await persistNotificationLogs(logs, body, resolvedTenantId)

    // ── Update campaign analytics + status ──────────────────────────────────
    if (campaign) {
      try {
        await db.campaign.update({
          where: { id: campaign.id },
          data: {
            totalRecipients: totalAudience,
            sentCount,
            deliveredCount: sentCount,
            failedCount,
            status: 'completed',
          },
        })
      } catch (campErr) {
        console.error('Failed to update campaign analytics:', campErr)
      }
    }

    return NextResponse.json({
      success: true,
      campaignName: body.name || campaign?.name,
      channel,
      totalAudience,
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
      results: logs,
    })
  } catch (error) {
    console.error('Error in /api/campaigns/send:', error)
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 })
  }
}

// ─── Dispatch helper ────────────────────────────────────────────────────────

async function dispatchToRecipient(
  recipient: BroadcastRecipient,
  channel: NonNullable<SendBroadcastBody['channel']>,
  body: SendBroadcastBody,
): Promise<SendLog> {
  const baseLog: SendLog = {
    recipientKey: recipient.key,
    refId: recipient.refId,
    source: recipient.source,
    name: recipient.name,
    email: recipient.email,
    phone: recipient.phone,
    channel: 'email',
    success: false,
  }

  // ── Email dispatch ──────────────────────────────────────────────────────
  if (channel === 'email') {
    if (!recipient.email || !recipient.email.trim()) {
      return { ...baseLog, channel: 'email', skipped: true, error: 'No email address' }
    }
    if (recipient.status === 'unsubscribed') {
      return { ...baseLog, channel: 'email', skipped: true, error: 'Contact unsubscribed' }
    }
    const subject = personalizeForRecipient(body.subject || '', recipient)
    const html = personalizeForRecipient(body.html || '', recipient)
    const text = body.text ? personalizeForRecipient(body.text, recipient) : undefined

    const result = await sendEmail({
      to: recipient.email,
      subject,
      html,
      text,
      providerId: body.providerId,
      credentialId: body.credentialId,
      usageType: 'marketing',
    })

    return {
      ...baseLog,
      channel: 'email',
      success: result.success,
      messageId: result.messageId,
      simulated: result.simulated,
      error: result.error,
    }
  }

  // ── WhatsApp dispatch ───────────────────────────────────────────────────
  if (channel === 'whatsapp') {
    if (!recipient.phone || !recipient.phone.trim()) {
      return { ...baseLog, channel: 'whatsapp', skipped: true, error: 'No phone number' }
    }
    if (recipient.status === 'unsubscribed') {
      return { ...baseLog, channel: 'whatsapp', skipped: true, error: 'Contact unsubscribed' }
    }
    const message = personalizeForRecipient(body.message || body.html || '', recipient)

    const result = await sendWhatsAppMessage({
      to: recipient.phone,
      message,
    })

    // Deduct credit after successful WhatsApp send
    if (result.success && tenantId) {
      await deductWhatsAppCredit(tenantId, 1).catch(err =>
        console.error('[Campaign] Credit deduction failed:', err)
      )
    }

    return {
      ...baseLog,
      channel: 'whatsapp',
      success: result.success,
      messageId: result.messageId,
      simulated: result.simulated,
      error: result.error,
    }
  }

  // ── SMS dispatch — uses WhatsApp provider as a stand-in (no real SMS infra) ──
  if (channel === 'sms') {
    if (!recipient.phone || !recipient.phone.trim()) {
      return { ...baseLog, channel: 'sms', skipped: true, error: 'No phone number' }
    }
    const message = personalizeForRecipient(body.message || body.html || '', recipient)
    const result = await sendWhatsAppMessage({
      to: recipient.phone,
      message,
    })

    // Deduct credit after successful SMS (via WhatsApp) send
    if (result.success && tenantId) {
      await deductWhatsAppCredit(tenantId, 1).catch(err =>
        console.error('[Campaign] Credit deduction failed:', err)
      )
    }

    return {
      ...baseLog,
      channel: 'sms',
      success: result.success,
      messageId: result.messageId,
      simulated: result.simulated,
      error: result.error,
    }
  }

  // ── Multi-channel dispatch ──────────────────────────────────────────────
  // Send email if recipient has email, WhatsApp if recipient has phone. Both
  // channels are attempted independently; success = at least one succeeded.
  if (channel === 'multi') {
    let anySuccess = false
    let lastError: string | undefined
    let messageId: string | undefined
    let simulated = false

    if (recipient.email && recipient.email.trim() && recipient.status !== 'unsubscribed') {
      const subject = personalizeForRecipient(body.subject || '', recipient)
      const html = personalizeForRecipient(body.html || '', recipient)
      const emailResult = await sendEmail({
        to: recipient.email,
        subject,
        html,
        text: body.text ? personalizeForRecipient(body.text, recipient) : undefined,
        providerId: body.providerId,
        credentialId: body.credentialId,
        usageType: 'marketing',
      })
      if (emailResult.success) {
        anySuccess = true
        messageId = emailResult.messageId
        simulated = simulated || !!emailResult.simulated
      } else {
        lastError = emailResult.error
      }
    }

    if (recipient.phone && recipient.phone.trim() && recipient.status !== 'unsubscribed') {
      const message = personalizeForRecipient(body.message || body.html || '', recipient)
      const waResult = await sendWhatsAppMessage({
        to: recipient.phone,
        message,
      })
      if (waResult.success) {
        anySuccess = true
        messageId = messageId || waResult.messageId
        simulated = simulated || !!waResult.simulated
        // Deduct credit after successful WhatsApp send
        if (tenantId) {
          await deductWhatsAppCredit(tenantId, 1).catch(err =>
            console.error('[Campaign] Credit deduction failed:', err)
          )
        }
      } else {
        lastError = lastError || waResult.error
      }
    }

    if (!recipient.email && !recipient.phone) {
      return { ...baseLog, channel: 'multi', skipped: true, error: 'No email or phone' }
    }

    return {
      ...baseLog,
      channel: 'multi',
      success: anySuccess,
      messageId,
      simulated,
      error: lastError,
    }
  }

  return { ...baseLog, error: `Unsupported channel: ${channel}` }
}

// ─── Notification log persistence ───────────────────────────────────────────

async function persistNotificationLogs(
  logs: SendLog[],
  body: SendBroadcastBody,
  tenantId: string | null,
) {
  for (const log of logs) {
    if (log.skipped) continue // skip logging for skipped recipients
    try {
      const type = log.channel === 'email' ? 'email' : 'whatsapp'
      const recipient = log.channel === 'email' ? log.email || '' : log.phone || ''
      await db.notificationLog.create({
        data: {
          type,
          recipient,
          recipientName: log.name,
          subject: log.channel === 'email' ? body.subject : null,
          message: (log.channel === 'email' ? body.html : (body.message || body.html)) || '',
          status: log.success ? 'sent' : 'failed',
          externalId: log.messageId || null,
          tenantId: tenantId || null,
          metadataJson: JSON.stringify({
            campaignName: body.name || null,
            campaignId: body.campaignId || null,
            recipientSource: log.source,
            recipientRefId: log.refId,
            channel: log.channel,
            simulated: log.simulated || false,
            error: log.error || null,
          }),
        },
      })
    } catch (logErr) {
      console.error('Failed to log broadcast send:', logErr)
    }
  }
}
