import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { detectVariablesFromContent } from '@/lib/template-vars'

/**
 * GET /api/campaign-templates/[id]
 * Auth required. Returns template if global or owned by current tenant.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = authUser.tenantId || 'default'

    const { id } = await params
    const template = await db.campaignTemplate.findUnique({ where: { id } })

    if (!template) {
      return NextResponse.json({ error: 'Campaign template not found' }, { status: 404 })
    }
    // Ownership: global (tenantId=null) OR owned by current tenant
    if (template.tenantId !== null && template.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Campaign template not found' }, { status: 404 })
    }

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('Error fetching campaign template:', error)
    return NextResponse.json({ error: 'Failed to fetch campaign template' }, { status: 500 })
  }
}

/**
 * PUT /api/campaign-templates/[id]
 * Auth required. Only update templates owned by current tenant (not global).
 * Accepts all Template Studio fields. tenantId/workspaceId cannot be changed via body.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = authUser.tenantId || 'default'

    const { id } = await params
    const existing = await db.campaignTemplate.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Campaign template not found' }, { status: 404 })
    }
    // Only allow editing tenant's own templates (not global/built-in)
    if (existing.tenantId !== null && existing.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Campaign template not found' }, { status: 404 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    // Whitelist editable fields (tenantId/workspaceId deliberately excluded)
    const allowedFields = [
      'name', 'description', 'category', 'content', 'mediaUrl', 'mediaType',
      'ctaText', 'ctaUrl', 'variablesJson', 'isApproved', 'externalId', 'usageCount',
      'language', 'templateType', 'headerText', 'headerMediaUrl', 'headerMediaType',
      'footerText', 'buttonsJson', 'status', 'isFavorite', 'tagsJson', 'lastUsedAt',
    ]
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Derive flat fields from buttons for backward compat
    if (body.buttons !== undefined) {
      const ctaButton = Array.isArray(body.buttons) ? body.buttons.find((b: { type: string }) => b.type === 'website') : null
      if (ctaButton) {
        updateData.ctaText = ctaButton.text
        updateData.ctaUrl = ctaButton.value
      }
      if (body.headerMediaUrl !== undefined) {
        updateData.mediaUrl = body.headerMediaUrl
        updateData.mediaType = body.headerMediaType || null
      }
    }

    // Auto-detect variables from content if content is being updated
    if (body.content !== undefined || body.headerText !== undefined || body.footerText !== undefined) {
      const detectedVars = detectVariablesFromContent(
        body.content ?? existing.content,
        body.headerText ?? existing.headerText,
        body.footerText ?? existing.footerText,
        JSON.stringify(body.buttons ?? JSON.parse(existing.buttonsJson || '[]'))
      )
      // Only overwrite if user didn't explicitly provide variablesJson
      if (body.variablesJson === undefined) {
        updateData.variablesJson = JSON.stringify(detectedVars)
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

/**
 * DELETE /api/campaign-templates/[id]
 * Auth required. Only delete templates owned by current tenant (not global).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = authUser.tenantId || 'default'

    const { id } = await params
    const existing = await db.campaignTemplate.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Campaign template not found' }, { status: 404 })
    }
    if (existing.tenantId !== null && existing.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Campaign template not found' }, { status: 404 })
    }

    await db.campaignTemplate.delete({ where: { id } })
    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    console.error('Error deleting campaign template:', error)
    return NextResponse.json({ error: 'Failed to delete campaign template' }, { status: 500 })
  }
}
