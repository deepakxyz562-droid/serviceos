import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const template = await db.campaignTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Campaign template not found' }, { status: 404 })
    }

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('Error fetching campaign template:', error)
    return NextResponse.json({ error: 'Failed to fetch campaign template' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}

    // Only allow specific fields to be updated
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.content !== undefined) updateData.content = body.content
    if (body.mediaUrl !== undefined) updateData.mediaUrl = body.mediaUrl
    if (body.mediaType !== undefined) updateData.mediaType = body.mediaType
    if (body.ctaText !== undefined) updateData.ctaText = body.ctaText
    if (body.ctaUrl !== undefined) updateData.ctaUrl = body.ctaUrl
    if (body.variablesJson !== undefined) updateData.variablesJson = body.variablesJson
    if (body.isApproved !== undefined) updateData.isApproved = body.isApproved
    if (body.externalId !== undefined) updateData.externalId = body.externalId
    if (body.usageCount !== undefined) updateData.usageCount = body.usageCount
    if (body.tenantId !== undefined) updateData.tenantId = body.tenantId
    if (body.workspaceId !== undefined) updateData.workspaceId = body.workspaceId

    // Auto-detect variables from content if content is being updated
    if (body.content !== undefined) {
      const variableMatches = body.content.match(/\{\{(\w+)\}\}/g)
      if (variableMatches) {
        const uniqueVars = [...new Set(variableMatches.map((v: string) => v.replace(/\{\{|\}\}/g, '')))]
        updateData.variablesJson = JSON.stringify(uniqueVars)
      } else {
        updateData.variablesJson = '[]'
      }
    }

    const template = await db.campaignTemplate.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('Error updating campaign template:', error)
    return NextResponse.json({ error: 'Failed to update campaign template' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await db.campaignTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    console.error('Error deleting campaign template:', error)
    return NextResponse.json({ error: 'Failed to delete campaign template' }, { status: 500 })
  }
}
