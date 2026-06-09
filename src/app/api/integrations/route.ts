import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/integrations - List integration configs
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const active = searchParams.get('active')

    const where: Record<string, unknown> = {}

    if (authUser?.tenantId) {
      where.tenantId = authUser.tenantId
    }

    if (type) where.type = type
    if (active !== null && active !== undefined) {
      where.active = active === 'true'
    }

    const integrations = await db.integrationConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Parse configJson for each integration
    const result = integrations.map(int => ({
      ...int,
      config: safeJsonParse(int.configJson, {}),
    }))

    return NextResponse.json({ integrations: result })
  } catch (error) {
    console.error('Error listing integrations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/integrations - Create integration config
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const body = await request.json()

    const { name, type, config, active, workspaceId, tenantId } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'name and type are required' },
        { status: 400 }
      )
    }

    const validTypes = ['n8n', 'zapier', 'custom_webhook', 'google_sheets', 'slack']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const integration = await db.integrationConfig.create({
      data: {
        name,
        type,
        configJson: JSON.stringify(config || {}),
        active: active !== undefined ? active : true,
        workspaceId: workspaceId || null,
        tenantId: tenantId || authUser?.tenantId || null,
      },
    })

    return NextResponse.json({
      integration: {
        ...integration,
        config: safeJsonParse(integration.configJson, {}),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating integration:', error)
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
