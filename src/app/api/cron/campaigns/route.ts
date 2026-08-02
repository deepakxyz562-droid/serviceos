import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveBroadcastAudience, personalizeForRecipient } from '@/lib/broadcast-audience'
import { sendEmail, resolveSmtpConfig } from '@/lib/email-send'
import { hasMarketingConsent } from '@/lib/email-consent'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * POST /api/cron/campaigns
 *
 * Executes scheduled email campaigns whose scheduledAt has passed.
 *
 * Background: Campaign.status='scheduled' was previously cosmetic — nothing
 * transitioned it to 'running'/'completed'. This endpoint picks up due
 * scheduled email campaigns, sends them, and marks them completed.
 *
 * Auth: shared secret via x-cron-secret header OR Authorization: Bearer
 * OR ?secret= query (CRON_SECRET env). Same scheme as the other /api/cron/*
 * routes so netlify cron-daily.js (which sends x-cron-secret) works
 * without modification.
 *
 * Schedule: every 15 minutes (vercel.json) + daily safety-net (netlify
 * cron-daily.js).
 */

export async function POST(request: NextRequest) {
  const auth = verifyCronAuth(request)
  if (!auth.ok) return auth.response

  const now = new Date()
  let processed = 0
  let sentTotal = 0
  let failedTotal = 0
  const errors: string[] = []

  // Find due scheduled email campaigns.
  const due = await db.campaign.findMany({
    where: {
      status: 'scheduled',
      channel: 'email',
      scheduledAt: { lte: now },
    },
    take: 10, // process a bounded batch per invocation
  })

  for (const campaign of due) {
    try {
      // Mark running so a parallel cron doesn't pick it up.
      await db.campaign.update({ where: { id: campaign.id }, data: { status: 'running' } })

      // Resolve the audience from the stored campaign fields.
      const audience = await resolveBroadcastAudience({
        tenantId: campaign.tenantId,
        audienceType: campaign.audienceType,
        audienceId: campaign.audienceId,
        audienceFiltersJson: campaign.audienceFiltersJson,
        channel: 'email',
      })

      const subject =
        campaign.audienceFiltersJson &&
        JSON.parse(campaign.audienceFiltersJson || '{}').subject
          ? JSON.parse(campaign.audienceFiltersJson || '{}').subject
          : campaign.name
      const html = campaign.messageContent || ''
      const ctaText = campaign.ctaText
      const ctaUrl = campaign.ctaUrl
      const finalHtml = ctaUrl
        ? `${html}<br/><br/><a href="${ctaUrl}" style="display:inline-block;padding:10px 20px;background:#0f766e;color:#fff;border-radius:8px;text-decoration:none;">${ctaText || 'Learn More'}</a>`
        : html

      // Resolve a marketing provider.
      let providerId: string | undefined
      const defaultMarketing = await db.emailProvider.findFirst({
        where: {
          tenantId: campaign.tenantId || undefined,
          status: 'active',
          OR: [{ usageType: 'marketing' }, { usageType: 'both' }],
        },
        orderBy: [{ isDefaultMarketing: 'desc' }, { createdAt: 'asc' }],
        select: { id: true },
      })
      if (defaultMarketing) providerId = defaultMarketing.id

      const preflight = await resolveSmtpConfig({ providerId, usageType: 'marketing' })
      if (preflight.marketingProviderRequired || !preflight.config) {
        await db.campaign.update({
          where: { id: campaign.id },
          data: { status: 'draft' }, // back to draft so the user can fix the provider
        })
        errors.push(`Campaign ${campaign.id}: no marketing provider`)
        continue
      }

      let sentCount = 0
      let failedCount = 0
      let skippedCount = 0

      for (const recipient of audience.recipients) {
        if (!recipient.email || !recipient.email.trim()) {
          skippedCount++
          continue
        }
        if (!hasMarketingConsent(recipient)) {
          skippedCount++
          continue
        }
        const personalizedSubject = personalizeForRecipient(subject, recipient)
        const personalizedHtml = personalizeForRecipient(finalHtml, recipient)

        const result = await sendEmail({
          to: recipient.email,
          subject: personalizedSubject,
          html: personalizedHtml,
          providerId,
          usageType: 'marketing',
          tenantId: campaign.tenantId || undefined,
          campaignId: campaign.id,
          recipientRefId: recipient.refId,
          recipientSource: recipient.source,
        })

        if (result.success) {
          sentCount++
          try {
            await db.campaignMessage.create({
              data: {
                campaignId: campaign.id,
                recipientPhone: recipient.phone || recipient.email || '',
                recipientEmail: recipient.email,
                recipientName: recipient.name || null,
                recipientId: recipient.source === 'customer' ? recipient.refId : null,
                status: 'sent',
                externalId: result.messageId || null,
                sentAt: new Date(),
                metadataJson: JSON.stringify({
                  recipientSource: recipient.source,
                  recipientRefId: recipient.refId,
                  providerUsed: result.providerUsed,
                  simulated: result.simulated || false,
                  scheduledSend: true,
                }),
              },
            })
          } catch { /* non-fatal */ }
        } else {
          failedCount++
        }
        await new Promise((r) => setTimeout(r, 50))
      }

      await db.campaign.update({
        where: { id: campaign.id },
        data: {
          totalRecipients: audience.total,
          sentCount,
          deliveredCount: sentCount,
          failedCount,
          status: 'completed',
        },
      })

      processed++
      sentTotal += sentCount
      failedTotal += failedCount
    } catch (err) {
      errors.push(`Campaign ${campaign.id}: ${err instanceof Error ? err.message : String(err)}`)
      // Reset to scheduled so the next cron run retries it.
      try {
        await db.campaign.update({ where: { id: campaign.id }, data: { status: 'scheduled' } })
      } catch { /* ignore */ }
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    sent: sentTotal,
    failed: failedTotal,
    errors: errors.slice(0, 20),
    ranAt: now.toISOString(),
  })
}
