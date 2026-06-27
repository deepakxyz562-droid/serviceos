import { db } from '@/lib/db'
import { getAuthUser, generateSlug } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { detectVariablesFromContent } from '@/lib/template-vars'

/**
 * GET /api/campaign-templates
 * List WhatsApp/campaign templates visible to the current tenant.
 * Auth required. Returns global (tenantId=null) + tenant's own templates.
 * Query: category, templateType, status, mine=true (only tenant's own)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = user.tenantId || 'default'

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const templateType = searchParams.get('templateType')
    const status = searchParams.get('status')
    const mine = searchParams.get('mine') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: Record<string, unknown> = mine
      ? { tenantId }
      : { OR: [{ tenantId: null }, { tenantId }] }
    if (category) where.category = category
    if (templateType) where.templateType = templateType
    if (status) where.status = status

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.campaignTemplate.findMany({
        where,
        orderBy: [{ isApproved: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.campaignTemplate.count({ where }),
    ])

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching campaign templates:', error)
    return NextResponse.json({ error: 'Failed to fetch campaign templates' }, { status: 500 })
  }
}

/**
 * POST /api/campaign-templates
 * Create a WhatsApp/campaign template for the current tenant.
 * Auth required. tenantId is set from auth (not body).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = user.tenantId || 'default'

    const body = await request.json()

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    // Normalize JSON fields
    const encodeJson = (val: unknown, defaultVal = '[]'): string => {
      if (val === undefined || val === null) return defaultVal
      if (typeof val === 'string') { try { JSON.parse(val); return val } catch { return defaultVal } }
      if (Array.isArray(val) || typeof val === 'object') return JSON.stringify(val)
      return defaultVal
    }

    // Derive flat fields from structure for backward compat with campaign sending
    const ctaButton = Array.isArray(body.buttons) ? body.buttons.find((b: { type: string }) => b.type === 'website') : null

    // Auto-detect variables from content + headerText + footerText
    const detectedVars = detectVariablesFromContent(
      body.content,
      body.headerText,
      body.footerText,
      JSON.stringify(body.buttons || [])
    )

    const template = await db.campaignTemplate.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        category: body.category || 'general',
        content: body.content,
        mediaUrl: body.headerMediaUrl || body.mediaUrl || null,
        mediaType: body.headerMediaType || body.mediaType || null,
        ctaText: ctaButton?.text || body.ctaText || null,
        ctaUrl: ctaButton?.value || body.ctaUrl || null,
        variablesJson: body.variablesJson ? encodeJson(body.variablesJson) : JSON.stringify(detectedVars),
        isApproved: body.isApproved ?? false,
        externalId: body.externalId || null,
        tenantId,
        workspaceId: user.workspaceId || null,
        // Template Studio extension fields
        language: body.language || 'en',
        templateType: body.templateType || 'text',
        headerText: body.headerText?.trim() || null,
        headerMediaUrl: body.headerMediaUrl || null,
        headerMediaType: body.headerMediaType || null,
        footerText: body.footerText?.trim() || null,
        buttonsJson: encodeJson(body.buttons),
        status: body.status || 'published',
        isFavorite: body.isFavorite || false,
        tagsJson: encodeJson(body.tagsJson),
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign template:', error)
    return NextResponse.json({ error: 'Failed to create campaign template' }, { status: 500 })
  }
}
