import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendEmail, resolveSmtpConfig } from '@/lib/email-send'
import { hasMarketingConsent } from '@/lib/email-consent'
import { personalizeForRecipient } from '@/lib/broadcast-audience'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/campaigns/[id]/test-send
 *
 * Sends a SINGLE preview email of the campaign's content to a test
 * recipient address (the logged-in user's email by default, or any
 * address passed in the body).
 *
 * The preview send uses usageType='marketing' so the rendered email is
 * IDENTICAL to what real recipients would receive (with the List-
 * Unsubscribe header, the open-pixel, the click-redirect, etc.) — but
 * it goes to ONE address, doesn't bump Campaign.sentCount, and doesn't
 * create a CampaignMessage row. This makes it safe to use a non-audience
 * address (e.g. your own inbox or a teammate) for QA without polluting
 * campaign analytics.
 *
 * Body:
 *   { to?: string }  // optional — defaults to the logged-in user's email
 *
 * Returns: { success, messageId?, simulated?, error? }
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json().catch(() => ({})) as { to?: string }

    // ── Load the campaign ──
    const campaign = await db.campaign.findUnique({ where: { id } })
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    if (campaign.tenantId && user.tenantId && campaign.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // ── Resolve the test recipient ──
    const to = (body.to || user.email || '').trim().toLowerCase()
    if (!to) {
      return NextResponse.json(
        { error: 'No test recipient address — pass { to } in the body or log in with an email.' },
        { status: 400 },
      )
    }

    // ── Resolve a marketing provider (same logic as /api/campaigns/send) ──
    let providerId: string | undefined
    const defaultMarketing = await db.emailProvider.findFirst({
      where: {
        tenantId: user.tenantId || undefined,
        status: 'active',
        OR: [{ usageType: 'marketing' }, { usageType: 'both' }],
      },
      orderBy: [{ isDefaultMarketing: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    })
    if (defaultMarketing) providerId = defaultMarketing.id

    const preflight = await resolveSmtpConfig({ providerId, usageType: 'marketing' })
    if (preflight.marketingProviderRequired || !preflight.config) {
      return NextResponse.json(
        {
          error: 'MARKETING_PROVIDER_REQUIRED',
          message:
            'Connect SMTP, Resend, SendGrid, Amazon SES, Mailgun or Brevo in Settings → Providers before sending a test campaign email.',
          providerRequired: true,
        },
        { status: 409 },
      )
    }

    // ── Compose the email ──
    // Subject is stashed inside audienceFiltersJson.subject (the form does
    // this so the Campaign model's lack of a dedicated subject column is
    // worked around). Fall back to the campaign name.
    let subject = campaign.name
    try {
      const parsed = JSON.parse(campaign.audienceFiltersJson || '{}') as { subject?: string }
      if (parsed.subject) subject = parsed.subject
    } catch { /* ignore */ }

    const html = campaign.messageContent || ''
    const ctaText = campaign.ctaText
    const ctaUrl = campaign.ctaUrl
    const finalHtml = ctaUrl
      ? `${html}<br/><br/><a href="${ctaUrl}" style="display:inline-block;padding:10px 20px;background:#0f766e;color:#fff;border-radius:8px;text-decoration:none;">${ctaText || 'Learn More'}</a>`
      : html

    // Use a fake recipient so personalization produces visible placeholder
    // values rather than empty strings.
    const testRecipient = {
      email: to,
      name: 'Test Recipient',
      phone: '',
      company: 'Test Company',
      city: 'Test City',
      country: 'Test Country',
      refId: null,
      source: 'manual' as const,
      key: to,
      status: 'active',
      marketingConsent: true,
      unsubscribedAt: null,
    }
    // Skip the consent gate for test sends (the test address may not be in
    // the audience at all) — the recipient IS the sender.
    void hasMarketingConsent

    const personalizedSubject = personalizeForRecipient(subject, testRecipient)
    const personalizedHtml = personalizeForRecipient(finalHtml, testRecipient)

    // ── Send — usageType='marketing' so the email renders identically to
    //    a real blast (List-Unsubscribe header, open-pixel, click-redirect).
    //    We do NOT pass a campaignId, so no CampaignMessage row is created
    //    and the campaign's analytics counters are untouched.
    const result = await sendEmail({
      to,
      subject: `[TEST] ${personalizedSubject}`,
      html: personalizedHtml,
      providerId,
      usageType: 'marketing',
      tenantId: user.tenantId || undefined,
      // intentionally NO campaignId / recipientRefId / recipientSource —
      // this is a test send, not a real recipient send.
    })

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      simulated: result.simulated,
      providerUsed: result.providerUsed,
      error: result.error,
      sentTo: to,
    })
  } catch (error) {
    console.error('Error in /api/campaigns/[id]/test-send:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 },
    )
  }
}
