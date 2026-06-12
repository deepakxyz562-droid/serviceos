import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// Default channel configs to auto-create when none exist
const DEFAULT_CHANNELS = [
  { channel: 'whatsapp', name: 'WhatsApp Business', status: 'active', isDefault: true, autoCreateLead: true },
  { channel: 'website', name: 'Website Forms', status: 'active', isDefault: true, autoCreateLead: true },
  { channel: 'facebook', name: 'Facebook Messenger', status: 'inactive', isDefault: false, autoCreateLead: true },
  { channel: 'instagram', name: 'Instagram DM', status: 'inactive', isDefault: false, autoCreateLead: true },
  { channel: 'google_ads', name: 'Google Ads Lead Forms', status: 'inactive', isDefault: false, autoCreateLead: true },
  { channel: 'justdial', name: 'JustDial', status: 'inactive', isDefault: false, autoCreateLead: true },
]

// GET /api/omnichannel/channels - List all channel configs in the format the frontend expects
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const tenantId = authUser?.tenantId || null

    // Build where clause scoped to tenant
    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status

    // Check if any channels exist for this tenant
    const existingCount = await db.channelConfig.count({ where })

    // Auto-create default channels if none exist
    if (existingCount === 0) {
      await db.channelConfig.createMany({
        data: DEFAULT_CHANNELS.map((ch) => ({
          ...ch,
          configJson: '{}',
          autoReply: false,
          autoReplyMessage: '',
          leadSourceTag: '',
          tenantId,
        })),
      })
    }

    // Fetch all channels (including newly created defaults)
    const channels = await db.channelConfig.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    // Transform to the format the frontend expects:
    // { id, type, name, connected, config }
    const result = channels.map((ch) => {
      let config: Record<string, string> = {}
      try {
        config = ch.configJson ? JSON.parse(ch.configJson) : {}
      } catch {
        config = {}
      }

      return {
        id: ch.id,
        type: ch.channel,
        name: ch.name,
        connected: ch.status === 'active',
        config,
      }
    })

    // Return a flat array (the frontend expects ChannelConfig[], not { channels: [...] })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Omnichannel] Error listing channels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/omnichannel/channels - Create or update a channel config
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const body = await request.json()

    const {
      channel,
      name,
      configJson,
      config,
      connected,
      status,
      isDefault,
      autoCreateLead,
      autoReply,
      autoReplyMessage,
      webhookUrl,
      leadSourceTag,
      workspaceId,
    } = body

    if (!channel || !name) {
      return NextResponse.json(
        { error: 'channel and name are required' },
        { status: 400 }
      )
    }

    const tenantId = authUser?.tenantId || body.tenantId || null

    // Normalize `connected` to `status`
    const resolvedStatus = status || (connected ? 'active' : 'inactive')

    // Normalize `config` object to `configJson` string
    const resolvedConfigJson = configJson || (config ? JSON.stringify(config) : '{}')

    // Check if a channel config already exists for this channel+tenant
    const existing = await db.channelConfig.findFirst({
      where: {
        channel,
        tenantId,
      },
    })

    let result

    if (existing) {
      // Update existing config
      result = await db.channelConfig.update({
        where: { id: existing.id },
        data: {
          name,
          configJson: resolvedConfigJson !== '{}' ? resolvedConfigJson : existing.configJson,
          status: resolvedStatus !== 'inactive' ? resolvedStatus : existing.status,
          isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
          autoCreateLead: autoCreateLead !== undefined ? autoCreateLead : existing.autoCreateLead,
          autoReply: autoReply !== undefined ? autoReply : existing.autoReply,
          autoReplyMessage: autoReplyMessage !== undefined ? autoReplyMessage : existing.autoReplyMessage,
          webhookUrl: webhookUrl !== undefined ? webhookUrl : existing.webhookUrl,
          leadSourceTag: leadSourceTag !== undefined ? leadSourceTag : existing.leadSourceTag,
          workspaceId: workspaceId !== undefined ? workspaceId : existing.workspaceId,
        },
      })
    } else {
      // Create new config
      result = await db.channelConfig.create({
        data: {
          channel,
          name,
          configJson: resolvedConfigJson,
          status: resolvedStatus,
          isDefault: isDefault || false,
          autoCreateLead: autoCreateLead !== undefined ? autoCreateLead : true,
          autoReply: autoReply || false,
          autoReplyMessage: autoReplyMessage || '',
          webhookUrl: webhookUrl || null,
          leadSourceTag: leadSourceTag || '',
          tenantId,
          workspaceId: workspaceId || null,
        },
      })
    }

    // Transform response to match frontend format
    let configObj: Record<string, string> = {}
    try {
      configObj = result.configJson ? JSON.parse(result.configJson) : {}
    } catch { /* empty */ }

    return NextResponse.json({
      id: result.id,
      type: result.channel,
      name: result.name,
      connected: result.status === 'active',
      config: configObj,
    }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error('[Omnichannel] Error creating/updating channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
