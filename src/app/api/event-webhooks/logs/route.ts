import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/event-webhooks/logs
 * Get event webhook dispatch logs
 *
 * Query params:
 *   - eventWebhookId: filter by webhook
 *   - event: filter by event type
 *   - jobId: filter by job
 *   - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventWebhookId = searchParams.get('eventWebhookId')
    const event = searchParams.get('event')
    const jobId = searchParams.get('jobId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, any> = {}
    if (eventWebhookId) where.eventWebhookId = eventWebhookId
    if (event) where.event = event
    if (jobId) where.jobId = jobId

    const logs = await db.eventWebhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const total = await db.eventWebhookLog.count({ where })

    return NextResponse.json({ logs, total })
  } catch (error) {
    console.error('Error fetching event webhook logs:', error)
    return NextResponse.json({ error: 'Failed to fetch event webhook logs' }, { status: 500 })
  }
}
