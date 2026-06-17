import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/companies/search?q=abc
 *
 * Search companies by name or slug (case-insensitive, prefix match).
 * Used by the "Find your company" search box on the landing page.
 *
 * Returns up to 10 matches with { name, slug, logo, industry }.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim().toLowerCase();

    if (!q || q.length < 2) {
      return NextResponse.json({ companies: [] });
    }

    // SQLite is case-insensitive by default for ASCII; no need for mode: 'insensitive'
    const tenants = await db.tenant.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } },
        ],
        suspendedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        industry: true,
      },
      take: 10,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      companies: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        logo: t.logo,
        industry: t.industry,
      })),
    });
  } catch (error) {
    console.error('[Companies Search Error]', error);
    return NextResponse.json({ companies: [] });
  }
}
