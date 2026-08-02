import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { ALL_PACKS } from '@/lib/template-packs-data'

/**
 * GET /api/template-packs
 * Returns all available template packs (from the code definitions + DB install state).
 * Merges the static pack definitions with the DB records to show install status.
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = user.tenantId || 'default'

    // Get all installed template counts per slug for this tenant
    const installedPacks = await db.templatePack.findMany({
      where: { installedBy: tenantId, isInstalled: true },
      select: { slug: true },
    })
    const installedSlugs = new Set(installedPacks.map((p) => p.slug))

    // Merge static definitions with install state
    const packs = ALL_PACKS.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      category: p.category,
      industry: p.industry || null,
      icon: p.icon,
      color: p.color,
      templateCount: p.templates.length,
      isInstalled: installedSlugs.has(p.slug),
    }))

    return NextResponse.json({ data: packs })
  } catch (error) {
    console.error('Error fetching template packs:', error)
    return NextResponse.json({ error: 'Failed to fetch template packs' }, { status: 500 })
  }
}
