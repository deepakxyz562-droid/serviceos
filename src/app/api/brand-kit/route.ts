import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

/**
 * GET /api/brand-kit
 * Returns the current tenant's brand kit (creates a default one if none exists).
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = user.tenantId || 'default'

    let kit = await db.brandKit.findUnique({ where: { tenantId } })
    if (!kit) {
      kit = await db.brandKit.create({
        data: {
          tenantId,
          primaryColor: '#0f766e',
          secondaryColor: '#1f2937',
          accentColor: '#f59e0b',
        },
      })
    }

    return NextResponse.json({ data: kit })
  } catch (error) {
    console.error('Error fetching brand kit:', error)
    return NextResponse.json({ error: 'Failed to fetch brand kit' }, { status: 500 })
  }
}

/**
 * POST /api/brand-kit
 * Creates or updates the tenant's brand kit (upsert by tenantId).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = user.tenantId || 'default'

    const body = await request.json()
    const encodeJson = (val: unknown, defaultVal = '[]'): string => {
      if (val === undefined || val === null) return defaultVal
      if (typeof val === 'string') { try { JSON.parse(val); return val } catch { return defaultVal } }
      if (Array.isArray(val) || typeof val === 'object') return JSON.stringify(val)
      return defaultVal
    }

    const data = {
      logoUrl: body.logoUrl || null,
      primaryColor: body.primaryColor || '#0f766e',
      secondaryColor: body.secondaryColor || '#1f2937',
      accentColor: body.accentColor || '#f59e0b',
      fontFamily: body.fontFamily || 'Inter, sans-serif',
      footerHtml: body.footerHtml || null,
      companyName: body.companyName || null,
      address: body.address || null,
      website: body.website || null,
      email: body.email || null,
      phone: body.phone || null,
      socialLinksJson: encodeJson(body.socialLinksJson),
    }

    const kit = await db.brandKit.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    })

    return NextResponse.json({ data: kit })
  } catch (error) {
    console.error('Error saving brand kit:', error)
    return NextResponse.json({ error: 'Failed to save brand kit' }, { status: 500 })
  }
}
