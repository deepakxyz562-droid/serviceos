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

    const campaign = await db.campaign.findUnique({
      where: { id },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ data: campaign })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = { ...body }

    // Handle date fields
    if (body.scheduledAt) updateData.scheduledAt = new Date(body.scheduledAt)
    if (body.approvedAt) updateData.approvedAt = new Date(body.approvedAt)

    // Remove id from update data
    delete updateData.id

    // ── When audience fields change, recompute totalRecipients live ──
    const audienceChanged =
      body.audienceType !== undefined ||
      body.audienceId !== undefined ||
      body.audienceFiltersJson !== undefined

    if (audienceChanged) {
      try {
        const user = await getAuthUser()
        // Fetch the merged campaign (existing values + incoming updates) so the
        // count reflects the post-edit audience.
        const existing = await db.campaign.findUnique({ where: { id } })
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

    const campaign = await db.campaign.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: campaign })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await db.campaign.delete({
      where: { id },
    })

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}
