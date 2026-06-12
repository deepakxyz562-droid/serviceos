import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// PUT /api/omnichannel/channels/[id] - Update a channel config
// Accepts both `connected` (mapped to status) and `config` (mapped to configJson)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    const { id } = await params
    const body = await request.json()

    // Verify the channel config exists and belongs to the user's tenant
    const existing = await db.channelConfig.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Channel config not found' }, { status: 404 })
    }

    // Scope check: if user has tenantId, ensure the config belongs to that tenant
    if (authUser?.tenantId && existing.tenantId !== authUser.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const {
      name,
      configJson,
      config,       // Frontend sends { config: { key: value } }
      connected,    // Frontend sends { connected: true/false }
      status,
      isDefault,
      autoCreateLead,
      autoReply,
      autoReplyMessage,
      webhookUrl,
      leadSourceTag,
    } = body

    // Normalize `connected` to `status`
    let resolvedStatus = status
    if (connected !== undefined) {
      resolvedStatus = connected ? 'active' : 'inactive'
    }

    // Normalize `config` object to `configJson` string
    let resolvedConfigJson = configJson
    if (config !== undefined) {
      resolvedConfigJson = JSON.stringify(config)
    }

    const updated = await db.channelConfig.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(resolvedConfigJson !== undefined && { configJson: resolvedConfigJson }),
        ...(resolvedStatus !== undefined && { status: resolvedStatus }),
        ...(isDefault !== undefined && { isDefault }),
        ...(autoCreateLead !== undefined && { autoCreateLead }),
        ...(autoReply !== undefined && { autoReply }),
        ...(autoReplyMessage !== undefined && { autoReplyMessage }),
        ...(webhookUrl !== undefined && { webhookUrl }),
        ...(leadSourceTag !== undefined && { leadSourceTag }),
      },
    })

    // Transform response to match frontend format
    let configObj: Record<string, string> = {}
    try {
      configObj = updated.configJson ? JSON.parse(updated.configJson) : {}
    } catch { /* empty */ }

    return NextResponse.json({
      id: updated.id,
      type: updated.channel,
      name: updated.name,
      connected: updated.status === 'active',
      config: configObj,
    })
  } catch (error) {
    console.error('[Omnichannel] Error updating channel config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/omnichannel/channels/[id] - Remove a channel config
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    const { id } = await params

    // Verify the channel config exists and belongs to the user's tenant
    const existing = await db.channelConfig.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Channel config not found' }, { status: 404 })
    }

    // Scope check: if user has tenantId, ensure the config belongs to that tenant
    if (authUser?.tenantId && existing.tenantId !== authUser.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.channelConfig.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Omnichannel] Error deleting channel config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
