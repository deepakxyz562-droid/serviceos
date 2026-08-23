import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email-send'
import { createOutboundMessage } from '@/lib/inbox-message-service'

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
      tenantId: user.tenantId || undefined,
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
          tenantId: user.tenantId || undefined,
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

    // ── O5: record the outbound email in the canonical InboxMessage ──
    // Find or create a Conversation (channel='email') for this recipient so
    // the agent's email appears in the omnichannel inbox. Non-fatal.
    if (user.tenantId) {
      try {
        let conversation = await db.conversation.findFirst({
          where: { customerPhone: to, channel: 'email', status: 'active', tenantId: user.tenantId },
          orderBy: { lastMessageAt: 'desc' },
          select: { conversationId: true },
        })
        let conversationId = conversation?.conversationId
        if (!conversationId) {
          conversationId = `conv_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          await db.conversation.create({
            data: {
              conversationId,
              customerPhone: to, // email address stored in customerPhone field (no separate email field)
              channel: 'email',
              status: 'active',
              currentStage: 'greeting',
              lastMessageAt: new Date(),
              lastMessageBody: subject, // use the subject as the preview
              lastDirection: 'outbound',
              tenantId: user.tenantId,
            },
          })
        }
        await createOutboundMessage({
          tenantId: user.tenantId,
          conversationId,
          channel: 'email',
          senderId: user.id,
          senderName: user.name || user.email,
          content: text || subject, // plain text body for the inbox preview
          messageType: 'text',
          externalId: result.messageId || undefined,
          status: 'sent',
          metadataJson: {
            subject,
            contactId: contactId || null,
            providerUsed: result.providerUsed,
            simulated: result.simulated || false,
            usageType: usageType || null,
          },
        })
      } catch (err) {
        console.warn('[/api/email/send] InboxMessage create failed (non-fatal):', err)
      }
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

