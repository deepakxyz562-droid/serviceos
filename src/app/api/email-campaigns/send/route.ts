import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendEmail, resolveSmtpConfig } from '@/lib/email-send'
import {
  resolveBroadcastAudience,
  resolveTenantId,
  personalizeForRecipient,
} from '@/lib/broadcast-audience'

interface SendCampaignBody {
  name: string
  subject: string
  html: string
  text?: string
  // Audience selectors — at least one required
  contactIds?: string[]
  groupIds?: string[]
  customerIds?: string[]
  segmentId?: string
  // Optional: target all tenant contacts (use with care)
  allContacts?: boolean
  // Optional: stored campaign audience fields (used when no direct selectors passed)
  audienceType?: string
  audienceId?: string
  audienceFiltersJson?: string
  // EmailProvider ID (preferred) OR legacy Credential ID
  providerId?: string
  credentialId?: string
  // Campaign record id (if tied to a Campaign row)
  campaignId?: string
}

// POST /api/email-campaigns/send — batch send personalized emails to a contact audience
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SendCampaignBody = await request.json()

    if (!body.subject || !body.html) {
      return NextResponse.json({ error: 'subject and html are required' }, { status: 400 })
    }

    // Validate audience selectors — accept either direct selectors or stored
    // campaign audience fields (audienceType/audienceId/audienceFiltersJson).
    const hasDirectSelector =
      !!body.contactIds?.length ||
      !!body.groupIds?.length ||
      !!body.customerIds?.length ||
      !!body.segmentId ||
      !!body.allContacts ||
      !!body.audienceType
    if (!hasDirectSelector) {
      return NextResponse.json(
        { error: 'Provide at least one of: contactIds, groupIds, customerIds, segmentId, allContacts=true, or audienceType' },
        { status: 400 }
      )
    }

    // ── Resolve a real tenantId (admin may have tenantId=null) ─────────────
    // Previously this used `user.tenantId || 'default'`, but 'default' is not
    // a real Tenant row → FK violation on NotificationLog.create, and contact
    // queries returned 0 rows because contacts are stored under the real
    // tenant id. resolveTenantId returns the first real tenant id (or null).
    const resolvedTenantId = await resolveTenantId(user.tenantId)

    // ── Optionally load the linked Campaign to inherit stored audience ──────
    // When campaignId is provided, pull the stored audience fields so that
    // segment / contact_list / custom (manual-email) audiences resolve the
    // same way they do in /api/campaigns/audience-count.
    let storedCampaign: Awaited<ReturnType<typeof db.campaign.findUnique>> = null
    if (body.campaignId) {
      storedCampaign = await db.campaign.findUnique({
        where: { id: body.campaignId },
        select: {
          id: true, name: true,
          audienceType: true, audienceId: true, audienceFiltersJson: true,
        },
      })
    }

    // ── Marketing provider gate ─────────────────────────────────────────────
    // Bulk/campaign email must be sent through the tenant's OWN marketing
    // provider (SMTP / Resend / SendGrid / SES / Mailgun / Brevo), never the
    // shared platform domain.
    //
    // When the caller did NOT explicitly choose a provider, look up the
    // tenant's default marketing EmailProvider and AUTO-ASSIGN it. This is the
    // same behavior as /api/campaigns/send. Without the auto-assignment, the
    // gate would PASS (a provider exists) but the downstream sendEmail() call
    // would receive providerId=undefined and fail per-recipient with
    // "MARKETING_PROVIDER_REQUIRED" — because sendEmail's resolveSmtpConfig
    // can't infer the tenant for admin users (tenantId=null).
    if (!body.providerId && !body.credentialId) {
      // First try the user's own tenant, then fall back to any active marketing
      // provider (covers the admin case where tenantId is null and providers
      // may be stored under a different tenant id).
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
              'Marketing Email Provider Required — connect SMTP, Resend, SendGrid, Amazon SES, Mailgun or Brevo before sending campaigns.',
            providerRequired: true,
          },
          { status: 409 }
        )
      }
      // Auto-assign so sendEmail() below receives a concrete providerId and
      // doesn't re-fail with MARKETING_PROVIDER_REQUIRED per-recipient.
      body.providerId = defaultMarketing.id
    }

    // ── Pre-flight: validate the resolved provider actually yields a usable
    // SMTP config BEFORE entering the per-recipient loop.
    //
    // This is the critical guard against the "0 sent, N failed —
    // MARKETING_PROVIDER_REQUIRED" symptom. Without it, the route returns
    // HTTP 200 (because the gate passed) but every recipient fails inside
    // sendEmail() because emailProviderToSmtpConfig() returned null for that
    // provider (e.g. SES provider whose configJson lacks smtpHost, or any
    // provider with incomplete credentials).
    //
    // By resolving the config once up-front we can:
    //   1. Fail fast with HTTP 409 + a precise, actionable message.
    //   2. Avoid wasting time attempting (and logging) N failed sends.
    //   3. Tell the user EXACTLY which provider is broken so they can fix it
    //      in Settings → Email Providers instead of guessing.
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
          message: `Marketing Email Provider Required — ${providerLabel}`,
          providerRequired: true,
        },
        { status: 409 }
      )
    }

    // ── Resolve the audience via the shared broadcast-audience helper ───────
    // This is the SAME resolver used by /api/campaigns/audience-count and
    // /api/campaigns/send, so the count shown in the UI matches the actual
    // recipients sent. It:
    //   1. Fetches both Contacts AND Customers (the old code only fetched Contacts,
    //      causing the "Skipped 20 of 20" mismatch when the audience was mostly
    //      Customers).
    //   2. Pre-filters by email for channel='email' (so phone-only recipients are
    //      excluded from the count AND the send, instead of being fetched and then
    //      skipped one-by-one).
    //   3. Deduplicates by email/phone so the same person isn't emailed twice.
    const audience = await resolveBroadcastAudience({
      tenantId: user.tenantId,
      // Stored campaign audience fields (used when no direct selectors passed)
      audienceType: body.audienceType || storedCampaign?.audienceType,
      audienceId: body.audienceId || storedCampaign?.audienceId,
      audienceFiltersJson: body.audienceFiltersJson || storedCampaign?.audienceFiltersJson,
      // Direct selectors (override stored fields)
      contactIds: body.contactIds,
      groupIds: body.groupIds,
      customerIds: body.customerIds,
      segmentId: body.segmentId,
      allContacts: body.allContacts,
      channel: 'email',
    })

    const recipients = audience.recipients
    const totalAudience = recipients.length

    if (totalAudience === 0) {
      // No email-eligible recipients — return a clean 0/0/0 result instead of
      // a confusing "skipped N of N". The audience-count endpoint already
      // reflects 0 for this case, so the UI is consistent.
      return NextResponse.json({
        success: true,
        campaignName: body.name,
        totalAudience: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        results: [],
        message: 'No recipients with email addresses matched the audience criteria',
      })
    }

    // ── Send personalized emails ────────────────────────────────────────────
    const results: Array<{ contactId: string; email: string; success: boolean; messageId?: string; error?: string; simulated?: boolean }> = []
    let sentCount = 0
    let failedCount = 0
    let skippedCount = 0

    for (const recipient of recipients) {
      // resolveBroadcastAudience already filtered by email for channel='email',
      // but double-guard against empty/whitespace emails just in case.
      if (!recipient.email || !recipient.email.trim()) {
        results.push({
          contactId: recipient.refId,
          email: '(none)',
          success: false,
          error: 'No email address',
        })
        skippedCount++
        continue
      }

      // Skip unsubscribed contacts (customers are always 'active' per the resolver)
      if (recipient.status === 'unsubscribed') {
        results.push({
          contactId: recipient.refId,
          email: recipient.email,
          success: false,
          error: 'Contact unsubscribed',
        })
        skippedCount++
        continue
      }

      // Personalize subject + body using the shared recipient helper
      const personalizedSubject = personalizeForRecipient(body.subject, recipient)
      const personalizedHtml = personalizeForRecipient(body.html, recipient)
      const personalizedText = body.text ? personalizeForRecipient(body.text, recipient) : undefined

      const sendResult = await sendEmail({
        to: recipient.email,
        subject: personalizedSubject,
        html: personalizedHtml,
        text: personalizedText,
        providerId: body.providerId,
        credentialId: body.credentialId,
        usageType: 'marketing',
        tenantId: user.tenantId || undefined,
      })

      // Log each send (don't set customerId — Contact and Customer are different models)
      try {
        await db.notificationLog.create({
          data: {
            type: 'email',
            recipient: recipient.email,
            recipientName: recipient.name,
            subject: personalizedSubject,
            message: personalizedHtml,
            status: sendResult.success ? 'sent' : 'failed',
            externalId: sendResult.messageId || null,
            tenantId: resolvedTenantId || null,
            metadataJson: JSON.stringify({
              campaignName: body.name,
              campaignId: body.campaignId || null,
              recipientKey: recipient.key,
              recipientSource: recipient.source,
              recipientRefId: recipient.refId,
              providerUsed: sendResult.providerUsed,
              simulated: sendResult.simulated || false,
              error: sendResult.error || null,
            }),
          },
        })
      } catch (logErr) {
        console.error('Failed to log campaign email:', logErr)
      }

      if (sendResult.success) {
        sentCount++
      } else {
        failedCount++
      }

      results.push({
        contactId: recipient.refId,
        email: recipient.email,
        success: sendResult.success,
        messageId: sendResult.messageId,
        error: sendResult.error,
        simulated: sendResult.simulated,
      })

      // Tiny delay to avoid SMTP rate limit
      await new Promise((r) => setTimeout(r, 100))
    }

    // ── Optionally update the Campaign row analytics ────────────────────────
    if (body.campaignId) {
      try {
        await db.campaign.update({
          where: { id: body.campaignId },
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
      campaignName: body.name,
      totalAudience,
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
      results,
    })
  } catch (error) {
    console.error('Error in /api/email-campaigns/send:', error)
    return NextResponse.json({ error: 'Failed to send email campaign' }, { status: 500 })
  }
}
