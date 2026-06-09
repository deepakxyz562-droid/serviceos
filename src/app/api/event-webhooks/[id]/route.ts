import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/event-webhooks/[id]
 * Get a single event webhook
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const webhook = await db.eventWebhook.findUnique({ where: { id } })
    if (!webhook) {
      return NextResponse.json({ error: 'Event webhook not found' }, { status: 404 })
    }
    return NextResponse.json({ webhook })
  } catch (error) {
    console.error('Error fetching event webhook:', error)
    return NextResponse.json({ error: 'Failed to fetch event webhook' }, { status: 500 })
  }
}

/**
 * PUT /api/event-webhooks/[id]
 * Update an event webhook
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.eventWebhook.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Event webhook not found' }, { status: 404 })
    }

    const webhook = await db.eventWebhook.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.event !== undefined ? { event: body.event } : {}),
        ...(body.url !== undefined ? { url: body.url } : {}),
        ...(body.method !== undefined ? { method: body.method } : {}),
        ...(body.headersJson !== undefined ? { headersJson: body.headersJson } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.retryOnFail !== undefined ? { retryOnFail: body.retryOnFail } : {}),
        ...(body.maxRetries !== undefined ? { maxRetries: body.maxRetries } : {}),
        ...(body.timeoutMs !== undefined ? { timeoutMs: body.timeoutMs } : {}),
        ...(body.workspaceId !== undefined ? { workspaceId: body.workspaceId } : {}),
        ...(body.tenantId !== undefined ? { tenantId: body.tenantId } : {}),
      },
    })

    return NextResponse.json({ webhook })
  } catch (error) {
    console.error('Error updating event webhook:', error)
    return NextResponse.json({ error: 'Failed to update event webhook' }, { status: 500 })
  }
}

/**
 * DELETE /api/event-webhooks/[id]
 * Delete an event webhook
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.eventWebhook.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Event webhook not found' }, { status: 404 })
    }

    // Delete related logs first
    await db.eventWebhookLog.deleteMany({ where: { eventWebhookId: id } })
    await db.eventWebhook.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event webhook:', error)
    return NextResponse.json({ error: 'Failed to delete event webhook' }, { status: 500 })
  }
}
