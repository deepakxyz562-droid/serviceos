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
  category?: string;
  address?: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, name: true, phone: true, settingsJson: true },
    });

    let tenantSettings: Record<string, any> = {};
    if (tenant?.settingsJson) {
      try {
        tenantSettings = JSON.parse(tenant.settingsJson);
      } catch {}
    }

    const socialAccounts = await db.socialAccount.findMany({
      where: {
        tenantId: user.tenantId,
        platform: 'googlebusiness',
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    let googleEmail = user.email || '';
    const profiles: GbpDiscoveredProfile[] = [];

    for (const sa of socialAccounts) {
      let meta: Record<string, any> = {};
      if (sa.metadata) {
        try {
          meta = typeof sa.metadata === 'string' ? JSON.parse(sa.metadata) : sa.metadata;
          if (meta.googleEmail && !googleEmail) googleEmail = meta.googleEmail;
        } catch {}
      }

      const id = String(sa.accountId || meta.locationId || sa.id);
      const name = String(meta.locationTitle || sa.accountName || 'Google Business Profile')
        .replace(/\s*\([^)]*\)$/, '')
        .trim();
      const shortId = `#${id.slice(-4)}`;
      const initial = name.trim().charAt(0).toUpperCase() || 'B';
      const isPrimary = id === '10777612572223040949' || name.toLowerCase().includes('fieser');

      profiles.push({
        id,
        name,
        shortId,
        initial,
        isPrimary,
        category: meta.category || (isPrimary ? 'Software company' : undefined),
        address: meta.address,
      });
    }

    // Fallback if no social account connected
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

    // Sort profiles so FieserOS / Primary is always first
    profiles.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.name.localeCompare(b.name);
    });

    const activeProfileId = String(
      tenantSettings.activeGbpLocationId ||
        profiles.find((p) => p.isPrimary)?.id ||
        profiles[0].id,
    );
    const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

    return NextResponse.json({
      email: googleEmail,
      count: profiles.length,
      activeProfileId: activeProfile.id,
      activeProfile,
      profiles,
      phone: tenant?.phone || '',
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
      select: { id: true, name: true, settingsJson: true },
    });

    let tenantSettings: Record<string, any> = {};
    if (tenant?.settingsJson) {
      try {
        tenantSettings = JSON.parse(tenant.settingsJson);
      } catch {}
    }

    // Find target social account
    const targetAccount = await db.socialAccount.findFirst({
      where: {
        tenantId: user.tenantId,
        platform: 'googlebusiness',
        isActive: true,
        accountId: profileId,
      },
    });

    let targetName = 'Google Business';
    if (targetAccount) {
      let meta: Record<string, any> = {};
      try {
        meta = typeof targetAccount.metadata === 'string' ? JSON.parse(targetAccount.metadata) : (targetAccount.metadata || {});
      } catch {}
      targetName = meta.locationTitle || targetAccount.accountName.replace(/\s*\([^)]*\)$/, '').trim();

      // Touch updatedAt so it sorts to the top
      await db.socialAccount.update({
        where: { id: targetAccount.id },
        data: { updatedAt: new Date() },
      });
    }

    // Update tenant settings with active profile
    tenantSettings.activeGbpLocationId = profileId;
    tenantSettings.activeGbpTitle = targetName;

    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        settingsJson: JSON.stringify(tenantSettings),
      },
    });

    const targetShortId = `#${profileId.slice(-4)}`;
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
