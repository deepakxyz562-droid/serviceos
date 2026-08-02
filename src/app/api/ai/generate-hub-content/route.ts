import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { generateHubContent } from '@/lib/ai-client'

/**
 * POST /api/ai/generate-hub-content
 *
 * Generates per-tenant hub content (tagline, description, FAQs, and
 * per-service descriptions) via OpenRouter. Returns the generated
 * JSON — does NOT write to the database. Callers (e.g. the Settings →
 * Public Hub "Regenerate with AI" button, or the seed flow) decide
 * whether to persist the result.
 *
 * Body: { tenantId?: string }
 *   - If tenantId omitted, uses the authenticated user's tenantId.
 *
 * Returns: { data: HubContent } | { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const tenantId = body.tenantId || user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    // Tenant must belong to the authenticated user (or be a superadmin).
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    if (tenant.id !== user.tenantId && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch the tenant's services (names drive per-service copy).
    // Limit to 8 — the AI prompt asks for one service entry per input name.
    // OpenRouter models have proper context windows (4k+ output tokens) so
    // longer service lists no longer risk truncation.
    const services = await db.service.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { name: true },
      take: 8,
      orderBy: { createdAt: 'asc' },
    })

    const content = await generateHubContent({
      businessName: tenant.name,
      industry: tenant.industry || 'Home Services',
      city: tenant.city,
      state: tenant.state,
      phone: tenant.phone,
      services: services.map((s) => s.name).filter(Boolean),
    })

    if (!content) {
      // AI failed — return 502 so the client can fall back gracefully.
      return NextResponse.json(
        { error: 'AI generation failed. Please try again or use the default content.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ data: content })
  } catch (error) {
    console.error('Error generating hub content:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate hub content: ${message}` },
      { status: 500 },
    )
  }
}
