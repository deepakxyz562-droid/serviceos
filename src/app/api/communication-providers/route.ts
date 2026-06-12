import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/communication-providers - List all communication providers
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const tenantId = authUser?.tenantId || null
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (type) where.type = type

    const providers = await db.communicationProvider.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    // Mask sensitive config values for display
    const masked = providers.map(p => {
      let config: Record<string, string> = {}
      try { config = JSON.parse(p.configJson) } catch { /* empty */ }
      const maskedConfig: Record<string, string> = {}
      for (const [key, value] of Object.entries(config)) {
        if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
          maskedConfig[key] = value ? '••••••••' : ''
        } else {
          maskedConfig[key] = value
        }
      }
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        provider: p.provider,
        status: p.status,
        isDefault: p.isDefault,
        sendingEnabled: p.sendingEnabled,
        dailyLimit: p.dailyLimit,
        monthlyLimit: p.monthlyLimit,
        sentToday: p.sentToday,
        sentThisMonth: p.sentThisMonth,
        totalSent: p.totalSent,
        totalDelivered: p.totalDelivered,
        totalFailed: p.totalFailed,
        lastUsedAt: p.lastUsedAt?.toISOString() || null,
        lastError: p.lastError,
        config: maskedConfig,
        createdAt: p.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ data: masked })
  } catch (error) {
    console.error('Error fetching communication providers:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}

// POST /api/communication-providers - Create a new provider
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const tenantId = authUser?.tenantId || null
    const workspaceId = authUser?.workspaceId || null
    const body = await request.json()

    const { name, type, provider, config, isDefault, sendingEnabled, dailyLimit, monthlyLimit } = body

    if (!name || !type || !provider) {
      return NextResponse.json({ error: 'name, type, and provider are required' }, { status: 400 })
    }

    const configJson = config ? JSON.stringify(config) : '{}'

    const result = await db.communicationProvider.create({
      data: {
        name,
        type,
        provider,
        configJson,
        isDefault: isDefault || false,
        sendingEnabled: sendingEnabled !== undefined ? sendingEnabled : true,
        dailyLimit: dailyLimit || 1000,
        monthlyLimit: monthlyLimit || 30000,
        tenantId,
        workspaceId,
      },
    })

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    console.error('Error creating communication provider:', error)
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 })
  }
}
