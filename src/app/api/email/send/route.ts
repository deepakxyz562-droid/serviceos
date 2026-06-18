import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email-send'

// POST /api/email/send — send a single email
// Body: { to, subject, html, text?, providerId?, credentialId?, contactId?, usageType? }
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, subject, html, text, providerId, credentialId, contactId, usageType } = body

    if (!to || !subject) {
      return NextResponse.json({ error: 'to and subject are required' }, { status: 400 })
    }

    const result = await sendEmail({
      to,
      subject,
      html,
      text,
      providerId,
      credentialId,
      usageType,
    })

    // Log to NotificationLog (type='email').
    // NOTE: don't set customerId unless it's a real Customer ID — Contact and Customer
    // are different models with separate FKs, so passing a Contact ID would throw P2003.
    try {
      await db.notificationLog.create({
        data: {
          type: 'email',
          recipient: to,
          subject,
          message: html || text || '',
          status: result.success ? 'sent' : 'failed',
          externalId: result.messageId || null,
          tenantId: user.tenantId || 'default',
          metadataJson: JSON.stringify({
            contactId: contactId || null,
            providerUsed: result.providerUsed,
            simulated: result.simulated || false,
            usageType: usageType || null,
            error: result.error || null,
          }),
        },
      })
    } catch (logErr) {
      console.error('Failed to log email send:', logErr)
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email', providerUsed: result.providerUsed },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      simulated: result.simulated || false,
      providerUsed: result.providerUsed,
    })
  } catch (error) {
    console.error('Error in /api/email/send:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

