import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/integrations/[id] - Get a single integration connection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser()
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const integration = await db.integrationConnection.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true, products: true, syncLogs: true },
        },
        syncLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (integration.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      integration: {
        ...integration,
        scopes: safeJsonParse(integration.scopesJson, []),
        config: safeJsonParse(integration.configJson, {}),
        syncSettings: safeJsonParse(integration.syncSettingsJson, {}),
      },
    })
  } catch (error) {
    console.error('Error fetching integration connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/integrations/[id] - Update integration (status, config, sync settings)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser()
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await db.integrationConnection.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (existing.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const {
      name,
      status,
      storeUrl,
      accessToken,
      apiSecret,
      scopes,
      config,
      syncSettings,
      webhookVerified,
    } = body

    const validStatuses = ['connected', 'disconnected', 'syncing', 'error']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Valid statuses: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (status !== undefined) updateData.status = status
    if (storeUrl !== undefined) updateData.storeUrl = storeUrl
    if (accessToken !== undefined) updateData.accessToken = accessToken
    if (apiSecret !== undefined) updateData.apiSecret = apiSecret
    if (scopes !== undefined) updateData.scopesJson = JSON.stringify(scopes)
    if (config !== undefined) updateData.configJson = JSON.stringify(config)
    if (syncSettings !== undefined) updateData.syncSettingsJson = JSON.stringify(syncSettings)
    if (webhookVerified !== undefined) updateData.webhookVerified = webhookVerified

    const integration = await db.integrationConnection.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      integration: {
        ...integration,
        scopes: safeJsonParse(integration.scopesJson, []),
        config: safeJsonParse(integration.configJson, {}),
        syncSettings: safeJsonParse(integration.syncSettingsJson, {}),
      },
    })
  } catch (error) {
    console.error('Error updating integration connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/integrations/[id] - Remove an integration connection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser()
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await db.integrationConnection.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (existing.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Cascade delete will remove related orders, products, and sync logs
    await db.integrationConnection.delete({ where: { id } })

    return NextResponse.json({ success: true, deletedId: id })
  } catch (error) {
    console.error('Error deleting integration connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function safeJsonParse(jsonStr: string, fallback: unknown = {}) {
  try {
    return JSON.parse(jsonStr)
  } catch {
    return fallback
  }
}
