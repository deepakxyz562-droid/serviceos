import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const location = searchParams.get('location')

    const where: Record<string, unknown> = {}

    if (type) where.type = type
    if (status) where.status = status
    if (location) where.location = { contains: location }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { location: { contains: search } },
      ]
    }

    const resources = await db.resource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(resources)
  } catch (error) {
    console.error('Error fetching resources:', error)
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, type, status, skills, location, avatar, whatsappId, rating, completedJobs, metadataJson, workspaceId } = body

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    const resource = await db.resource.create({
      data: {
        name,
        phone,
        type: type || 'driver',
        status: status || 'available',
        skills: skills ? JSON.stringify(skills) : '[]',
        location,
        avatar,
        whatsappId,
        rating: rating ?? 0,
        completedJobs: completedJobs ?? 0,
        metadataJson: metadataJson ? JSON.stringify(metadataJson) : undefined,
        workspaceId,
      },
    })

    return NextResponse.json(resource, { status: 201 })
  } catch (error) {
    console.error('Error creating resource:', error)
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { ...data }
    if (data.skills) updateData.skills = JSON.stringify(data.skills)
    if (data.metadataJson) updateData.metadataJson = JSON.stringify(data.metadataJson)

    const resource = await db.resource.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(resource)
  } catch (error) {
    console.error('Error updating resource:', error)
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 })
    }

    await db.resource.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resource:', error)
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
  }
}
