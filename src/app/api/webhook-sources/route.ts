import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (status) where.status = status

    const sources = await db.webhookSource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(sources)
  } catch (error) {
    console.error('Error fetching webhook sources:', error)
    return NextResponse.json({ error: 'Failed to fetch webhook sources' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, configJson, status, workspaceId } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const source = await db.webhookSource.create({
      data: {
        name,
        type,
        configJson: configJson ? JSON.stringify(configJson) : '{}',
        status: status || 'active',
        workspaceId,
      },
    })

    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    console.error('Error creating webhook source:', error)
    return NextResponse.json({ error: 'Failed to create webhook source' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Webhook source ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { ...data }
    if (data.configJson) updateData.configJson = JSON.stringify(data.configJson)

    const source = await db.webhookSource.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error updating webhook source:', error)
    return NextResponse.json({ error: 'Failed to update webhook source' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Webhook source ID is required' }, { status: 400 })
    }

    await db.webhookSource.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting webhook source:', error)
    return NextResponse.json({ error: 'Failed to delete webhook source' }, { status: 500 })
  }
}
