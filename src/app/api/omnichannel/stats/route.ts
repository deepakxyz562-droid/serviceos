import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/omnichannel/stats - Return aggregated omnichannel stats in the format the frontend expects
export async function GET(request: NextRequest) {
  try {
    // ─── Auth ────────────────────────────────────────────────────
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // ─── Tenant scoping (mirrors /api/deals pattern) ──────────────
    // The caller's tenantId is the source of truth — never show cross-
    // tenant stats. Super-admins may pass ?tenantId= to scope to a
    // specific tenant. Authenticated users without a tenant get a
    // never-match filter so every aggregate returns zero (preserves the
    // response shape without leaking other tenants' data).
    const { searchParams } = new URL(request.url)
    let tenantFilter: Record<string, unknown>
    if (authUser.isSuperAdmin) {
      const queryTenantId = searchParams.get('tenantId')
      tenantFilter = queryTenantId ? { tenantId: queryTenantId } : {}
    } else if (authUser.tenantId) {
      tenantFilter = { tenantId: authUser.tenantId }
    } else {
      tenantFilter = { tenantId: '__NO_TENANT__' }
    }

    const ALL_OMNI_CHANNELS = ['website', 'facebook', 'instagram', 'google_ads', 'justdial', 'whatsapp'] as const
    type ChannelType = typeof ALL_OMNI_CHANNELS[number]

    // ── 1. Total conversations ──
    const totalConversations = await db.conversation.count({
      where: tenantFilter,
    })

    // ── 2. Leads created today ──
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const leadsToday = await db.lead.count({
      where: {
        createdAt: { gte: todayStart },
        source: { in: ALL_OMNI_CHANNELS },
        ...tenantFilter,
      },
    })

    // ── 3. Active channels (ChannelConfigs with status 'active') ──
    const activeChannels = await db.channelConfig.count({
      where: {
        status: 'active',
        ...tenantFilter,
      },
    })

    // ── 4. Unread count (inbound messages that haven't been read) ──
    const unreadCount = await db.inboxMessage.count({
      where: {
        direction: 'inbound',
        status: 'sent',
        ...tenantFilter,
      },
    })

    // ── 5. Conversations by channel ──
    const conversationsByChannel = await db.conversation.groupBy({
      by: ['channel'],
      where: tenantFilter,
      _count: { id: true },
    })

    // ── 6. Leads by source (for omnichannel sources) ──
    const leadsBySource = await db.lead.groupBy({
      by: ['source'],
      where: {
        source: { in: ALL_OMNI_CHANNELS },
        ...tenantFilter,
      },
      _count: { id: true },
    })

    // Build the byChannel map
    const convMap = new Map(conversationsByChannel.map(item => [item.channel, item._count.id]))
    const leadMap = new Map(leadsBySource.map(item => [item.source, item._count.id]))

    const byChannel: Record<string, { conversations: number; leads: number }> = {}
    for (const ch of ALL_OMNI_CHANNELS) {
      byChannel[ch] = {
        conversations: convMap.get(ch) || 0,
        leads: leadMap.get(ch) || 0,
      }
    }

    // Return the format the frontend expects
    return NextResponse.json({
      totalConversations,
      leadsToday,
      activeChannels,
      unreadCount,
      byChannel,
    })
  } catch (error) {
    console.error('[Omnichannel] Error fetching stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
