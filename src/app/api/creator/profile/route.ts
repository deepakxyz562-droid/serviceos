import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminUser } from '@/lib/admin-auth';
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
 * GET /api/creator/profile
 * Returns the current tenant's creator profile & offers settings.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!user.tenantId) {
      if (isSuperAdminUser(user)) {
        const defaultProfile: CreatorProfileData = {
          isEnabled: false,
          handle: user.email ? user.email.split('@')[0] : 'admin',
          displayName: user.name || 'Platform Administrator',
          headline: 'ServiceOS / Fieseros Platform Administrator',
          bio: 'Platform administration & system oversight.',
          themeColor: '#2563EB',
          verified: true,
          rating: 5.0,
          reviewCount: 0,
          sessionsCompleted: 0,
          socialLinks: {},
          aiAgentEnabled: true,
          aiWelcomeMessage: 'Hello! How can I assist you today?',
          offers: [],
        };
        return NextResponse.json({ success: true, profile: defaultProfile });
      }
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        logo: true,
        currency: true,
        settingsJson: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const settings = safeParse(tenant.settingsJson, {});
    let profile: CreatorProfileData = settings.creatorProfile;

    if (!profile) {
      profile = buildDefaultCreatorProfile(tenant);
    }

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch creator profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/creator/profile
 * Saves updated creator profile & offers settings to Tenant.settingsJson.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body: Partial<CreatorProfileData> = await request.json();

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, name: true, slug: true, settingsJson: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const settings = safeParse(tenant.settingsJson, {});
    const currentProfile = settings.creatorProfile || buildDefaultCreatorProfile(tenant as any);

    const updatedProfile: CreatorProfileData = {
      ...currentProfile,
      ...body,
      offers: Array.isArray(body.offers) ? body.offers : currentProfile.offers,
    };

    const nextSettings = {
      ...settings,
      creatorProfile: updatedProfile,
    };

    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        settingsJson: JSON.stringify(nextSettings),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Creator profile saved successfully',
      profile: updatedProfile,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update creator profile' },
      { status: 500 }
    );
  }
}
