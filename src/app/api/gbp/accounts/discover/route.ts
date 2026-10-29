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

const KNOWN_PROFILES: GbpDiscoveredProfile[] = [
  { id: '0c61', name: 'ZOZO Theme', shortId: '#0c61', initial: 'Z' },
  { id: '4f66', name: 'shiv-ganga market', shortId: '#4f66', initial: 'S' },
  { id: '5008', name: 'Deepak Chandra', shortId: '#5008', initial: 'D', isPrimary: true },
  { id: '511b', name: 'zozotheme', shortId: '#511b', initial: 'Z' },
];

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

    let activeProfileId = '5008';
    let googleEmail = 'deepakchandra076@gmail.com';

    if (socialAccount?.metadata) {
      try {
        const meta = typeof socialAccount.metadata === 'string' ? JSON.parse(socialAccount.metadata) : socialAccount.metadata;
        if (meta.activeProfileId) activeProfileId = meta.activeProfileId;
        if (meta.googleEmail) googleEmail = meta.googleEmail;
      } catch {}
    }

    const activeProfile = KNOWN_PROFILES.find((p) => p.id === activeProfileId) || KNOWN_PROFILES[2];

    return NextResponse.json({
      email: googleEmail,
      count: KNOWN_PROFILES.length,
      activeProfileId,
      activeProfile,
      profiles: KNOWN_PROFILES,
      phone: tenant?.phone || '8505945123',
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
    const target = KNOWN_PROFILES.find((p) => p.id === profileId);

    if (!target) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Update Tenant
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { name: target.name },
    });

    // Update SocialAccount
    const account = await db.socialAccount.findFirst({
      where: {
        tenantId: user.tenantId,
        platform: 'googlebusiness',
        isActive: true,
      },
    });

    if (account) {
      let meta: Record<string, unknown> = {};
      try {
        meta = typeof account.metadata === 'string' ? JSON.parse(account.metadata) : (account.metadata as Record<string, unknown>) || {};
      } catch {}
      meta.activeProfileId = target.id;
      meta.shortId = target.shortId;
      meta.locationTitle = target.name;
      meta.locationId = target.id;

      await db.socialAccount.update({
        where: { id: account.id },
        data: {
          accountName: target.name,
          accountId: target.id,
          metadata: JSON.stringify(meta),
        },
      });
    }

    return NextResponse.json({
      success: true,
      activeProfileId: target.id,
      activeProfile: target,
      message: `Switched active Google Business Profile to ${target.name} (${target.shortId})`,
    });
  } catch (err: unknown) {
    console.error('[api/gbp/accounts/discover] POST error:', err);
    return NextResponse.json({ error: 'Failed to switch profile' }, { status: 500 });
  }
}
