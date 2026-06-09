import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { JOB_EVENT_LABELS, createDefaultEventWebhooks, type JobEventType } from '@/lib/event-webhook-dispatcher'

/**
 * GET /api/event-webhooks
 * List all event webhooks, optionally filtered by event type or workspace
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const event = searchParams.get('event')
    const workspaceId = searchParams.get('workspaceId')
    const activeOnly = searchParams.get('active') === 'true'

    const where: Record<string, any> = {}
    if (event) where.event = event
    if (workspaceId) where.workspaceId = workspaceId
    if (activeOnly) where.active = true

    const webhooks = await db.eventWebhook.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Also return available event types for UI
    const eventTypes = Object.entries(JOB_EVENT_LABELS).map(([key, val]) => ({
      value: key,
      label: val.label,
      description: val.description,
      icon: val.icon,
    }))

    return NextResponse.json({ webhooks, eventTypes })
  } catch (error) {
    console.error('Error fetching event webhooks:', error)
    return NextResponse.json({ error: 'Failed to fetch event webhooks' }, { status: 500 })
  }
}

/**
 * POST /api/event-webhooks
 * Create a new event webhook
 *
 * Body: { name, event, url, method?, headersJson?, active?, retryOnFail?, maxRetries?, timeoutMs?, workspaceId?, tenantId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.event || !body.url) {
      return NextResponse.json(
        { error: 'name, event, and url are required' },
        { status: 400 }
      )
    }

    const validEvents = Object.keys(JOB_EVENT_LABELS)
    if (!validEvents.includes(body.event)) {
      return NextResponse.json(
        { error: `Invalid event. Must be one of: ${validEvents.join(', ')}` },
        { status: 400 }
      )
    }

    const webhook = await db.eventWebhook.create({
      data: {
        name: body.name,
        event: body.event,
        url: body.url,
        method: body.method || 'POST',
        headersJson: body.headersJson || '{}',
        active: body.active !== undefined ? body.active : true,
        retryOnFail: body.retryOnFail !== undefined ? body.retryOnFail : true,
        maxRetries: body.maxRetries || 3,
        timeoutMs: body.timeoutMs || 10000,
        workspaceId: body.workspaceId || null,
        tenantId: body.tenantId || null,
      },
    })

    return NextResponse.json({ webhook }, { status: 201 })
  } catch (error) {
    console.error('Error creating event webhook:', error)
    return NextResponse.json({ error: 'Failed to create event webhook' }, { status: 500 })
  }
}

/**
 * PUT /api/event-webhooks
 * Bulk setup: create default webhooks for all events pointing to a base URL
 *
 * Body: { action: 'setup-defaults', baseUrl, workspaceId?, tenantId? }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.action === 'setup-defaults') {
      if (!body.baseUrl) {
        return NextResponse.json(
          { error: 'baseUrl is required for setup-defaults' },
          { status: 400 }
        )
      }

      const created = await createDefaultEventWebhooks(
        body.baseUrl,
        body.workspaceId,
        body.tenantId
      )

      return NextResponse.json({ webhooks: created, count: created.length }, { status: 201 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error setting up default webhooks:', error)
    return NextResponse.json({ error: 'Failed to setup default webhooks' }, { status: 500 })
  }
}
