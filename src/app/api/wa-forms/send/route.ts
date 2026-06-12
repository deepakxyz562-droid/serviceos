import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formId, phone, customMessage, tenantId } = body

    if (!formId || !phone) {
      return NextResponse.json(
        { error: 'formId and phone are required' },
        { status: 400 }
      )
    }

    // Validate phone format (basic)
    const cleanedPhone = phone.replace(/[^0-9+]/g, '')
    if (cleanedPhone.length < 7) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Look up the form
    const form = await db.wAForm.findUnique({
      where: { id: formId },
    })

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }

    // Simulate WhatsApp Business API call
    // In production, this would call the WhatsApp Business API
    const messageId = `wa_msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const formLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.serviceos.io'}/form/${formId}`

    // Create a notification log for the sent form
    const notificationLog = await db.notificationLog.create({
      data: {
        type: 'whatsapp',
        recipient: cleanedPhone,
        recipientRole: 'customer',
        subject: form.name,
        message: customMessage || form.welcomeMessage || `Please fill out: ${form.name}`,
        status: 'sent',
        externalId: messageId,
        tenantId: tenantId || form.tenantId,
        metadataJson: JSON.stringify({
          formId,
          formName: form.name,
          formType: form.type,
          formLink,
          customMessage: customMessage || null,
          deliveryStatus: 'sent',
          sentAt: new Date().toISOString(),
        }),
      },
    })

    // Simulate delivery statuses that would come from webhooks
    // In a real implementation, these would be updated via WhatsApp webhook callbacks
    const deliveryTimeline = {
      sent: new Date().toISOString(),
      delivered: new Date(Date.now() + 2000).toISOString(),
      opened: null as string | null,
      completed: null as string | null,
    }

    // Simulate "delivered" status update after a brief moment
    setTimeout(async () => {
      try {
        await db.notificationLog.update({
          where: { id: notificationLog.id },
          data: {
            status: 'delivered',
            metadataJson: JSON.stringify({
              formId,
              formName: form.name,
              formType: form.type,
              formLink,
              customMessage: customMessage || null,
              deliveryStatus: 'delivered',
              sentAt: deliveryTimeline.sent,
              deliveredAt: deliveryTimeline.delivered,
            }),
          },
        })
      } catch {
        // Silent fail for background update
      }
    }, 3000)

    return NextResponse.json({
      data: {
        messageId,
        formId,
        phone: cleanedPhone,
        formLink,
        deliveryStatus: 'sent',
        deliveryTimeline,
        notificationLogId: notificationLog.id,
        sentAt: new Date().toISOString(),
        message: customMessage || form.welcomeMessage || `Please fill out: ${form.name}`,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error sending WA form:', error)
    return NextResponse.json(
      { error: 'Failed to send form via WhatsApp' },
      { status: 500 }
    )
  }
}
