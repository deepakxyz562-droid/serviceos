import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildDefaultCreatorProfile, CreatorProfileData } from '@/lib/creator-profile';

export const dynamic = 'force-dynamic';

function safeParse(json: string | null | undefined, fallback: any = {}): any {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * GET /api/public/profile/[handle]
 * Public endpoint to fetch creator profile, offers, forms, and AI agent configuration.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const cleanHandle = (handle || '').replace(/^@/, '').trim().toLowerCase();

    // 1. Try finding by tenant slug
    let tenant = await db.tenant.findUnique({
      where: { slug: cleanHandle },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        logo: true,
        currency: true,
        settingsJson: true,
        forms: {
          where: { status: 'active' },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            type: true,
          },
          take: 6,
        },
      },
    });

    // 2. If not found by slug, search all tenants for creatorProfile.handle match or fallback to primary tenant
    if (!tenant) {
      const candidates = await db.tenant.findMany({
        take: 10,
        select: {
          id: true,
          name: true,
          slug: true,
          industry: true,
          logo: true,
          currency: true,
          settingsJson: true,
          forms: {
            where: { status: 'active' },
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              type: true,
            },
            take: 6,
          },
        },
      });

      for (const c of candidates) {
        const parsed = safeParse(c.settingsJson, {});
        if (parsed?.creatorProfile?.handle?.toLowerCase() === cleanHandle) {
          tenant = c;
          break;
        }
      }

      // If still not matched, use primary candidate for high-fidelity fallback
      if (!tenant && candidates.length > 0) {
        tenant = candidates[0];
      }
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const settings = safeParse(tenant.settingsJson, {});
    let profile: CreatorProfileData = settings.creatorProfile;

    if (!profile) {
      profile = buildDefaultCreatorProfile(tenant);
    }

    // Ensure handle matches requested cleanHandle if tenant was matched by slug
    if (!profile.handle) {
      profile.handle = tenant.slug;
    }

    // Filter to only active offers
    const activeOffers = (profile.offers || []).filter((o) => o.isActive !== false);

    return NextResponse.json({
      success: true,
      creator: {
        id: tenant.id,
        ...profile,
        offers: activeOffers,
        forms: (tenant as any).forms || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch public creator profile' },
      { status: 500 }
    );
  }
}
