import { getAuthUser } from '@/lib/auth'
import { publicChannelConfig } from '@/lib/channel-public-config'
import { POST as saveChannel } from '@/app/api/omnichannel/channels/route'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.tenantId || !['owner','admin','standalone_user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const tenantId = user.tenantId
    const channel = searchParams.get('channel')
    const status = searchParams.get('status')
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20') || 20))

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (channel) where.channel = channel
    if (status) where.status = status

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.channelConfig.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.channelConfig.count({ where }),
    ])

    return NextResponse.json({
      data: data.map(row => { let config = {}; try { config = JSON.parse(row.configJson) } catch {} return { ...row, configJson: JSON.stringify(publicChannelConfig(config)) } }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching channel configs:', error)
    return NextResponse.json({ error: 'Failed to fetch channel configs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const response = await saveChannel(request)
  const body = await response.json()
  return NextResponse.json(response.ok ? { data: body } : body, { status: response.status })
}
