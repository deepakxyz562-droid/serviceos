import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { resolveBroadcastAudience } from '@/lib/broadcast-audience'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const broadcast = await db.campaign.findUnique({
      where: { id },
    })

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    }

    if (broadcast.type !== 'broadcast') {
      return NextResponse.json({ error: 'Campaign is not a broadcast' }, { status: 400 })
    }

    return NextResponse.json({ data: broadcast })
  } catch (error) {
    console.error('Error fetching broadcast:', error)
    return NextResponse.json({ error: 'Failed to fetch broadcast' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Verify the campaign is a broadcast
    const existing = await db.campaign.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    }
    if (existing.type !== 'broadcast') {
      return NextResponse.json({ error: 'Campaign is not a broadcast' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { ...body }

    // Ensure type stays as broadcast
    updateData.type = 'broadcast'

    // Handle date fields
    if (body.scheduledAt) updateData.scheduledAt = new Date(body.scheduledAt)
    if (body.approvedAt) updateData.approvedAt = new Date(body.approvedAt)

    // Remove id from update data
    delete updateData.id
    delete updateData.createdAt
    delete updateData.updatedAt

    // ── When audience fields change, recompute totalRecipients live ──
    const audienceChanged =
      body.audienceType !== undefined ||
      body.audienceId !== undefined ||
      body.audienceFiltersJson !== undefined

    if (audienceChanged) {
      try {
        const user = await getAuthUser()
        const merged = {
          audienceType: (body.audienceType !== undefined ? body.audienceType : existing?.audienceType) || 'all',
          audienceId: body.audienceId !== undefined ? body.audienceId : existing?.audienceId,
          audienceFiltersJson:
            body.audienceFiltersJson !== undefined
              ? body.audienceFiltersJson
              : existing?.audienceFiltersJson,
          channel: (body.channel !== undefined ? body.channel : existing?.channel) || 'email',
        }
        const audience = await resolveBroadcastAudience({
          tenantId: user?.tenantId || null,
          audienceType: merged.audienceType,
          audienceId: merged.audienceId,
          audienceFiltersJson: merged.audienceFiltersJson,
          channel: merged.channel as 'email' | 'whatsapp' | 'sms' | 'multi',
        })
        updateData.totalRecipients = audience.total
      } catch {
        // Non-fatal
      }
    }

    const broadcast = await db.campaign.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: broadcast })
  } catch (error) {
    console.error('Error updating broadcast:', error)
    return NextResponse.json({ error: 'Failed to update broadcast' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify the campaign is a broadcast
    const existing = await db.campaign.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    }
    if (existing.type !== 'broadcast') {
      return NextResponse.json({ error: 'Campaign is not a broadcast' }, { status: 400 })
    }

    await db.campaign.delete({
      where: { id },
    })

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    console.error('Error deleting broadcast:', error)
    return NextResponse.json({ error: 'Failed to delete broadcast' }, { status: 500 })
  }
}
