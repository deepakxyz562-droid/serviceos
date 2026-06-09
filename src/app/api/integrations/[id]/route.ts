import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/integrations/[id] - Get integration config
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const integration = await db.integrationConfig.findUnique({ where: { id } })

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    let config = {}
    try {
      config = JSON.parse(integration.configJson || '{}')
    } catch {
      config = {}
    }

    return NextResponse.json({
      integration: {
        ...integration,
        config,
      },
    })
  } catch (error) {
    console.error('Error fetching integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/integrations/[id] - Update integration config
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    const { id } = await params
    const body = await request.json()

    const existing = await db.integrationConfig.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    const { name, type, config, active } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (config !== undefined) updateData.configJson = JSON.stringify(config)
    if (active !== undefined) updateData.active = active

    const integration = await db.integrationConfig.update({
      where: { id },
      data: updateData,
    })

    let parsedConfig = {}
    try {
      parsedConfig = JSON.parse(integration.configJson || '{}')
    } catch {
      parsedConfig = {}
    }

    return NextResponse.json({
      integration: {
        ...integration,
        config: parsedConfig,
      },
    })
  } catch (error) {
    console.error('Error updating integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/integrations/[id] - Delete integration config
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.integrationConfig.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    await db.integrationConfig.delete({ where: { id } })

    return NextResponse.json({ success: true, deletedId: id })
  } catch (error) {
    console.error('Error deleting integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
