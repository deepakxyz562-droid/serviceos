import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/notification-logs
 * Fetch recent notification logs for the dispatch dashboard.
 * Query params: type, status, limit (default 50), jobId, employeeId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const jobId = searchParams.get('jobId')
    const employeeId = searchParams.get('employeeId')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (status) where.status = status
    if (jobId) where.jobId = jobId
    if (employeeId) where.employeeId = employeeId

    const logs = await db.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching notification logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification logs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notification-logs
 * Create a new notification log entry or resend a failed notification.
 * Body: { id? (for resend), type, recipient, recipientName, message, jobId?, employeeId?, status }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Resend mode: if id is provided, update status to 'sent' and create new log
    if (body.id) {
      const existing = await db.notificationLog.findUnique({
        where: { id: body.id },
      })
      if (!existing) {
        return NextResponse.json(
          { error: 'Notification log not found' },
          { status: 404 }
        )
      }

      // Create a new log entry for the resend
      const resent = await db.notificationLog.create({
        data: {
          type: existing.type,
          recipient: existing.recipient,
          recipientName: existing.recipientName,
          recipientRole: existing.recipientRole,
          subject: existing.subject,
          message: existing.message,
          status: 'sent',
          jobId: existing.jobId,
          employeeId: existing.employeeId,
          customerId: existing.customerId,
          tenantId: existing.tenantId,
          metadataJson: JSON.stringify({
            ...((() => { try { return JSON.parse(existing.metadataJson || '{}'); } catch { return {}; } })()),
            resentFrom: existing.id,
            resentAt: new Date().toISOString(),
          }),
        },
      })

      return NextResponse.json(resent, { status: 201 })
    }

    // Create new notification log
    const { type, recipient, recipientName, recipientRole, subject, message, status, jobId, employeeId, customerId, tenantId } = body

    if (!recipient || !message) {
      return NextResponse.json(
        { error: 'recipient and message are required' },
        { status: 400 }
      )
    }

    const log = await db.notificationLog.create({
      data: {
        type: type || 'whatsapp',
        recipient,
        recipientName: recipientName || null,
        recipientRole: recipientRole || null,
        subject: subject || null,
        message,
        status: status || 'sent',
        jobId: jobId || null,
        employeeId: employeeId || null,
        customerId: customerId || null,
        tenantId: tenantId || null,
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Error creating/resending notification log:', error)
    return NextResponse.json(
      { error: 'Failed to create notification log' },
      { status: 500 }
    )
  }
}
