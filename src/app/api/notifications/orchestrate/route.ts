import { NextRequest, NextResponse } from 'next/server'
import { orchestrateNotification, type NotificationChannel, type NotificationTemplate } from '@/lib/notification-orchestrator'
import { getAuthUser } from '@/lib/auth'

// POST /api/notifications/orchestrate - Send orchestrated notification
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const body = await request.json()

    const {
      channels,
      recipient,
      template,
      templateData,
      context,
      alwaysInApp,
      maxRetries,
      subject,
      customMessage,
    } = body

    // Validate required fields
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return NextResponse.json(
        { error: 'channels is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!recipient) {
      return NextResponse.json(
        { error: 'recipient is required' },
        { status: 400 }
      )
    }

    if (!template) {
      return NextResponse.json(
        { error: 'template is required' },
        { status: 400 }
      )
    }

    // Validate channels
    const validChannels: NotificationChannel[] = ['whatsapp', 'email', 'sms', 'push', 'in_app']
    const invalidChannels = channels.filter((c: string) => !validChannels.includes(c as NotificationChannel))
    if (invalidChannels.length > 0) {
      return NextResponse.json(
        { error: `Invalid channels: ${invalidChannels.join(', ')}. Valid: ${validChannels.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate template
    const validTemplates: NotificationTemplate[] = [
      'job_assigned', 'job_started', 'job_completed', 'review_request',
      'booking_confirmed', 'job_cancelled', 'payment_received', 'payment_failed',
      'lead_created', 'custom',
    ]
    if (!validTemplates.includes(template as NotificationTemplate)) {
      return NextResponse.json(
        { error: `Invalid template: ${template}. Valid: ${validTemplates.join(', ')}` },
        { status: 400 }
      )
    }

    // Orchestrate the notification
    const result = await orchestrateNotification({
      channels: channels as NotificationChannel[],
      recipient: {
        phone: recipient.phone,
        email: recipient.email,
        name: recipient.name,
        userId: recipient.userId,
        role: recipient.role,
        whatsappId: recipient.whatsappId,
      },
      template: template as NotificationTemplate,
      templateData: templateData || {},
      context: {
        tenantId: context?.tenantId || authUser?.tenantId || undefined,
        workspaceId: context?.workspaceId || undefined,
        jobId: context?.jobId || undefined,
        employeeId: context?.employeeId || undefined,
        customerId: context?.customerId || undefined,
        userId: context?.userId || authUser?.id || undefined,
      },
      alwaysInApp: alwaysInApp !== undefined ? alwaysInApp : true,
      maxRetries: maxRetries || 2,
      subject: subject || undefined,
      customMessage: customMessage || undefined,
    })

    return NextResponse.json({
      success: result.success,
      successfulChannel: result.successfulChannel,
      totalDurationMs: result.totalDurationMs,
      attempts: result.attempts,
      inAppNotificationId: result.inAppNotificationId,
    })
  } catch (error) {
    console.error('Error orchestrating notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
