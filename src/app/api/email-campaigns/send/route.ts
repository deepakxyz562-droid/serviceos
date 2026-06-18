import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendEmail, personalize, getProviderStatus } from '@/lib/email-send'

interface SendCampaignBody {
  name: string
  subject: string
  html: string
  text?: string
  // Audience selectors — at least one required
  contactIds?: string[]
  groupIds?: string[]
  segmentId?: string
  // Optional: target all tenant contacts (use with care)
  allContacts?: boolean
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

    if (!body.contactIds?.length && !body.groupIds?.length && !body.segmentId && !body.allContacts) {
      return NextResponse.json(
        { error: 'Provide at least one of: contactIds, groupIds, segmentId, or allContacts=true' },
        { status: 400 }
      )
    }

    // ── Resolve audience contact IDs ────────────────────────────────────────
    const contactIdSet = new Set<string>()

    if (body.contactIds?.length) {
      body.contactIds.forEach((id) => contactIdSet.add(id))
    }

    if (body.groupIds?.length) {
      const memberships = await db.contactGroup.findMany({
        where: { groupId: { in: body.groupIds } },
        select: { contactId: true },
      })
      memberships.forEach((m) => contactIdSet.add(m.contactId))
    }

    if (body.segmentId) {
      const segMembers = await db.segmentMember.findMany({
        where: { segmentId: body.segmentId },
        select: { customerId: true },
      })
      segMembers.forEach((m) => contactIdSet.add(m.customerId))
    }

    if (body.allContacts) {
      const allContacts = await db.contact.findMany({
        where: { tenantId: user.tenantId || 'default' },
        select: { id: true },
      })
      allContacts.forEach((c) => contactIdSet.add(c.id))
    }

    if (contactIdSet.size === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        skipped: 0,
        message: 'No contacts matched the audience criteria',
      })
    }

    // ── Marketing provider gate ─────────────────────────────────────────────
    // Bulk/campaign email must be sent through the tenant's OWN marketing
    // provider (SMTP / Resend / SendGrid / SES / Mailgun / Brevo), never the
    // shared platform domain. When the caller did not explicitly choose a
    // provider, refuse early with a 409 so the UI can prompt them to connect one.
    if (!body.providerId && !body.credentialId) {
      const status = await getProviderStatus(user.tenantId || 'default')
      if (!status.marketingEmail.connected) {
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
    }

    // ── Fetch the actual contact rows ───────────────────────────────────────
    const contacts = await db.contact.findMany({
      where: {
        id: { in: Array.from(contactIdSet) },
        tenantId: user.tenantId || 'default',
      },
      select: {
        id: true, name: true, email: true, phone: true,
        company: true, city: true, country: true,
        status: true,
      },
    })

    // ── Send personalized emails ────────────────────────────────────────────
    const results: Array<{ contactId: string; email: string; success: boolean; messageId?: string; error?: string; simulated?: boolean }> = []
    let sentCount = 0
    let failedCount = 0
    let skippedCount = 0

    for (const contact of contacts) {
      // Skip contacts without email
      if (!contact.email || !contact.email.trim()) {
        results.push({
          contactId: contact.id,
          email: '(none)',
          success: false,
          error: 'No email address',
        })
        skippedCount++
        continue
      }

      // Skip unsubscribed
      if (contact.status === 'unsubscribed') {
        results.push({
          contactId: contact.id,
          email: contact.email,
          success: false,
          error: 'Contact unsubscribed',
        })
        skippedCount++
        continue
      }

      // Personalize subject + body
      const vars = {
        name: contact.name,
        email: contact.email,
        phone: contact.phone || undefined,
        company: contact.company || undefined,
        city: contact.city || undefined,
        country: contact.country || undefined,
      }
      const personalizedSubject = personalize(body.subject, vars)
      const personalizedHtml = personalize(body.html, vars)

      const sendResult = await sendEmail({
        to: contact.email,
        subject: personalizedSubject,
        html: personalizedHtml,
        text: body.text ? personalize(body.text, vars) : undefined,
        providerId: body.providerId,
        credentialId: body.credentialId,
        usageType: 'marketing',
      })

      // Log each send (don't set customerId — Contact and Customer are different models)
      try {
        await db.notificationLog.create({
          data: {
            type: 'email',
            recipient: contact.email,
            recipientName: contact.name,
            subject: personalizedSubject,
            message: personalizedHtml,
            status: sendResult.success ? 'sent' : 'failed',
            externalId: sendResult.messageId || null,
            tenantId: user.tenantId || 'default',
            metadataJson: JSON.stringify({
              campaignName: body.name,
              campaignId: body.campaignId || null,
              contactId: contact.id,
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
        contactId: contact.id,
        email: contact.email,
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
            totalRecipients: contacts.length,
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
      totalAudience: contacts.length,
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
