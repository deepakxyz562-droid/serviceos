import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export interface GbpDiscoveredProfile {
  id: string;
  name: string;
  shortId: string;
  initial: string;
  isPrimary?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, name: true, phone: true },
    });

    const socialAccount = await db.socialAccount.findFirst({
      where: {
        tenantId: user.tenantId,
        platform: 'googlebusiness',
        isActive: true,
      },
    });

    let googleEmail = user.email || '';
    let meta: Record<string, any> = {};

    if (socialAccount?.metadata) {
      try {
        meta =
          typeof socialAccount.metadata === 'string'
            ? JSON.parse(socialAccount.metadata)
            : (socialAccount.metadata as Record<string, any>) || {};
        if (meta.googleEmail) googleEmail = meta.googleEmail;
      } catch {}
    }

    const profiles: GbpDiscoveredProfile[] = [];

    // 1. If tenant has linked locations in metadata, use them
    if (Array.isArray(meta.locations) && meta.locations.length > 0) {
      for (const loc of meta.locations) {
        const id = String(loc.locationId || (loc.name ? loc.name.split('/').pop() : '') || loc.id || '');
        if (!id) continue;
        const name = String(loc.title || loc.locationTitle || tenant?.name || 'Business Location');
        const shortId = `#${id.slice(-4)}`;
        const initial = name.trim().charAt(0).toUpperCase() || 'B';
        profiles.push({ id, name, shortId, initial });
      }
    }

    // 2. Or if socialAccount is connected, add its active location
    if (profiles.length === 0 && socialAccount) {
      const id = String(meta.locationId || socialAccount.accountId || 'primary');
      const rawName = String(
        meta.locationTitle || socialAccount.accountName || tenant?.name || 'Google Business Profile',
      );
      const cleanName = rawName.replace(/\s*\([^)]*\)$/, '').trim() || 'Google Business';
      const shortId = `#${id.slice(-4)}`;
      const initial = cleanName.charAt(0).toUpperCase() || 'B';
      profiles.push({ id, name: cleanName, shortId, initial, isPrimary: true });
    }

    // 3. If no social account connected or no profiles discovered, use tenant's business profile
    if (profiles.length === 0) {
      const tenantName = tenant?.name || 'My Business';
      const tenantIdShort = tenant?.id ? tenant.id.slice(-4) : '0001';
      profiles.push({
        id: tenantIdShort,
        name: tenantName,
        shortId: `#${tenantIdShort}`,
        initial: tenantName.charAt(0).toUpperCase() || 'B',
        isPrimary: true,
      });
    }

    const activeProfileId = String(meta.activeProfileId || profiles[0].id);
    const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

    return NextResponse.json({
      email: googleEmail,
      count: profiles.length,
      activeProfileId: activeProfile.id,
      activeProfile,
      profiles,
      phone: tenant?.phone || meta.phone || '',
      version: 'v2.83',
    });
  } catch (err: unknown) {
    console.error('[api/gbp/accounts/discover] GET error:', err);
    return NextResponse.json({ error: 'Failed to discover Google Business accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const profileId = String(body.profileId || '').trim();
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, name: true },
    });

    const socialAccount = await db.socialAccount.findFirst({
      where: {
        tenantId: user.tenantId,
        platform: 'googlebusiness',
        isActive: true,
      },
    });

    let meta: Record<string, any> = {};
    if (socialAccount?.metadata) {
      try {
        meta =
          typeof socialAccount.metadata === 'string'
            ? JSON.parse(socialAccount.metadata)
            : (socialAccount.metadata as Record<string, any>) || {};
      } catch {}
    }

    // Find target profile from existing locations or metadata
    let targetName = '';
    const targetShortId = `#${profileId.slice(-4)}`;
    if (Array.isArray(meta.locations)) {
      const match = meta.locations.find((l: any) => String(l.locationId || l.id) === profileId);
      if (match) targetName = match.title || match.locationTitle;
    }
    if (!targetName && socialAccount) {
      targetName = meta.locationTitle || socialAccount.accountName || tenant?.name || 'Google Business';
    }
    if (!targetName) {
      targetName = tenant?.name || 'Business Profile';
    }

    // Update SocialAccount metadata
    if (socialAccount) {
      meta.activeProfileId = profileId;
      meta.shortId = targetShortId;
      meta.locationTitle = targetName;
      meta.locationId = profileId;

      await db.socialAccount.update({
        where: { id: socialAccount.id },
        data: {
          accountId: profileId,
          metadata: JSON.stringify(meta),
        },
      });
    }

    const targetProfile: GbpDiscoveredProfile = {
      id: profileId,
      name: targetName,
      shortId: targetShortId,
      initial: targetName.charAt(0).toUpperCase() || 'B',
    };

    return NextResponse.json({
      success: true,
      activeProfileId: profileId,
      activeProfile: targetProfile,
      message: `Switched active Google Business Profile to ${targetName} (${targetShortId})`,
    });
  } catch (err: unknown) {
    console.error('[api/gbp/accounts/discover] POST error:', err);
    return NextResponse.json({ error: 'Failed to switch profile' }, { status: 500 });
  }
}
