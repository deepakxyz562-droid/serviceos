import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/integrations - List all integration connections for the tenant
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      tenantId: auth.tenantId,
    }

    if (provider) where.provider = provider
    if (status) where.status = status

    const integrations = await db.integrationConnection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { orders: true, products: true, syncLogs: true },
        },
      },
    })

    // Parse JSON fields for each integration
    const result = integrations.map((int) => ({
      ...int,
      scopes: safeJsonParse(int.scopesJson, []),
      config: safeJsonParse(int.configJson, {}),
      syncSettings: safeJsonParse(int.syncSettingsJson, {}),
    }))

    return NextResponse.json({ integrations: result })
  } catch (error) {
    console.error('Error listing integration connections:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/integrations - Create a new integration connection
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      provider,
      name,
      storeUrl,
      accessToken,
      apiSecret,
      scopes,
      config,
      syncSettings,
      workspaceId,
    } = body

    if (!provider || !name) {
      return NextResponse.json(
        { error: 'provider and name are required' },
        { status: 400 }
      )
    }

    const validProviders = ['shopify', 'woocommerce', 'magento', 'bigcommerce']
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Valid providers: ${validProviders.join(', ')}` },
        { status: 400 }
      )
    }

    const integration = await db.integrationConnection.create({
      data: {
        provider,
        name,
        storeUrl: storeUrl || null,
        accessToken: accessToken || null,
        apiSecret: apiSecret || null,
        scopesJson: JSON.stringify(scopes || []),
        configJson: JSON.stringify(config || {}),
        syncSettingsJson: JSON.stringify(syncSettings || {}),
        status: 'disconnected',
        tenantId: auth.tenantId,
        workspaceId: workspaceId || auth.workspaceId || null,
      },
    })

    return NextResponse.json(
      {
        integration: {
          ...integration,
          scopes: safeJsonParse(integration.scopesJson, []),
          config: safeJsonParse(integration.configJson, {}),
          syncSettings: safeJsonParse(integration.syncSettingsJson, {}),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating integration connection:', error)
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
