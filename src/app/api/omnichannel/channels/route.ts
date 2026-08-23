import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { DEFAULT_CHANNEL_SEED } from '@/lib/channel-meta'

// GET /api/omnichannel/channels - List all channel configs in the format the frontend expects
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const tenantId = authUser?.tenantId || null

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status

    const existingCount = await db.channelConfig.count({ where })

    // Auto-create the 10 default channels if none exist
    if (existingCount === 0) {
      await db.channelConfig.createMany({
        data: DEFAULT_CHANNEL_SEED.map((ch) => ({
          channel: ch.channel,
          name: ch.name,
          status: ch.status,
          isDefault: ch.isDefault,
          autoCreateLead: ch.autoCreateLead,
          configJson: '{}',
          autoReply: false,
          autoReplyMessage: '',
          leadSourceTag: '',
          channelType: ch.channelType,
          tier: ch.tier,
          setupCompleted: ch.setupCompleted,
          setupStep: ch.setupStep,
          tenantId,
        })),
      })
    }

    const channels = await db.channelConfig.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    // ── O1.6: Filter channels by the platform ChannelCatalog ──────────────
    // The Superadmin controls which channels Fieseros offers. Hidden channels
    // (enabled=false AND comingSoon=false) are excluded from the tenant UI
    // entirely. "Coming soon" channels are included but marked so the UI can
    // show a badge and disable the "Configure" button.
    //
    // If the ChannelCatalog table doesn't exist yet (pre-O1 migration), we
    // fall back to showing all channels (legacy behavior) so the UI doesn't
    // break during the rollout window.
    let catalogMap: Map<string, { enabled: boolean; comingSoon: boolean }> | null = null;
    try {
      const catalog = await db.channelCatalog.findMany();
      catalogMap = new Map(catalog.map((c) => [c.channel, { enabled: c.enabled, comingSoon: c.comingSoon }]));
    } catch {
      // ChannelCatalog table doesn't exist yet — fall back to showing all
      catalogMap = null;
    }

    const result = channels
      .filter((ch) => {
        // If no catalog, show all (legacy behavior during rollout)
        if (!catalogMap) return true;
        const entry = catalogMap.get(ch.channel);
        // If the channel isn't in the catalog, show it (legacy channel like 'website')
        if (!entry) return true;
        // Hidden: enabled=false AND comingSoon=false → exclude
        if (!entry.enabled && !entry.comingSoon) return false;
        return true;
      })
      .map((ch) => {
      let config: Record<string, unknown> = {}
      try {
        config = ch.configJson ? JSON.parse(ch.configJson) : {}
      } catch {
        config = {}
      }

      // Look up the catalog entry for this channel (if catalog exists)
      const catalogEntry = catalogMap?.get(ch.channel);
      const comingSoon = catalogEntry?.comingSoon ?? false;
      const platformEnabled = catalogEntry?.enabled ?? true;

      return {
        id: ch.id,
        type: ch.channel,
        name: ch.name,
        connected: ch.status === 'active',
        setupCompleted: ch.setupCompleted,
        setupStep: ch.setupStep,
        tier: ch.tier,
        channelType: ch.channelType,
        lastTestedAt: ch.lastTestedAt,
        lastTestStatus: ch.lastTestStatus,
        config,
        // O1.6: platform availability flags from ChannelCatalog
        comingSoon,
        platformEnabled,
      }
    })

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
      setupCompleted,
      setupStep,
      lastTestStatus,
      tier,
      channelType,
    } = body

    if (!channel || !name) {
      return NextResponse.json(
        { error: 'channel and name are required' },
        { status: 400 },
      )
    }

    const tenantId = authUser?.tenantId || body.tenantId || null
    const resolvedStatus = status || (connected ? 'active' : 'inactive')
    const resolvedConfigJson = configJson || (config ? JSON.stringify(config) : '{}')

    const existing = await db.channelConfig.findFirst({
      where: { channel, tenantId },
    })

    const updateData: Record<string, unknown> = {
      name,
      configJson: resolvedConfigJson !== '{}' ? resolvedConfigJson : existing?.configJson || '{}',
      status: resolvedStatus !== 'inactive' ? resolvedStatus : existing?.status || 'inactive',
    }
    if (isDefault !== undefined) updateData.isDefault = isDefault
    if (autoCreateLead !== undefined) updateData.autoCreateLead = autoCreateLead
    if (autoReply !== undefined) updateData.autoReply = autoReply
    if (autoReplyMessage !== undefined) updateData.autoReplyMessage = autoReplyMessage
    if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl
    if (leadSourceTag !== undefined) updateData.leadSourceTag = leadSourceTag
    if (workspaceId !== undefined) updateData.workspaceId = workspaceId
    if (setupCompleted !== undefined) updateData.setupCompleted = setupCompleted
    if (setupStep !== undefined) updateData.setupStep = setupStep
    if (lastTestStatus !== undefined) {
      updateData.lastTestStatus = lastTestStatus
      updateData.lastTestedAt = new Date()
    }
    if (tier !== undefined) updateData.tier = tier
    if (channelType !== undefined) updateData.channelType = channelType

    let result
    if (existing) {
      result = await db.channelConfig.update({
        where: { id: existing.id },
        data: updateData,
      })
    } else {
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
          channelType: channelType || null,
          tier: tier || null,
          setupCompleted: setupCompleted || false,
          setupStep: setupStep || 0,
          ...(lastTestStatus !== undefined ? { lastTestStatus, lastTestedAt: new Date() } : {}),
        },
      })
    }

    let configObj: Record<string, unknown> = {}
    try {
      configObj = result.configJson ? JSON.parse(result.configJson) : {}
    } catch { /* empty */ }

    return NextResponse.json(
      {
        id: result.id,
        type: result.channel,
        name: result.name,
        connected: result.status === 'active',
        setupCompleted: result.setupCompleted,
        setupStep: result.setupStep,
        tier: result.tier,
        channelType: result.channelType,
        lastTestedAt: result.lastTestedAt,
        lastTestStatus: result.lastTestStatus,
        config: configObj,
      },
      { status: existing ? 200 : 201 },
    )
  } catch (error) {
    console.error('[Omnichannel] Error creating/updating channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
