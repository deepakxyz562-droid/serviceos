import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { invalidatePlacePayloadCache } from '@/app/api/gbp/place/route';
import { normalizeRegionState } from '@/lib/bgos-business-sanitizers';

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
    const tenantId = user.tenantId;

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

    let googleEmail = '';
    const profiles: GbpDiscoveredProfile[] = [];

    for (const sa of socialAccounts) {
      let meta: Record<string, any> = {};
      if (sa.metadata) {
        try {
          meta = typeof sa.metadata === 'string' ? JSON.parse(sa.metadata) : sa.metadata;
          if (meta.googleEmail && !googleEmail) googleEmail = String(meta.googleEmail);
        } catch {}
      }

      const id = String(sa.accountId || meta.locationId || sa.id);
      const name = String(meta.locationTitle || sa.accountName || 'Google Business Profile')
        .replace(/\s*\([^)]*\)$/, '')
        .trim();
      const shortId = `#${id.slice(-4)}`;
      const initial = name.trim().charAt(0).toUpperCase() || 'B';
      const isPrimary = tenantSettings.activeGbpLocationId
        ? id === String(tenantSettings.activeGbpLocationId)
        : profiles.length === 0;

      profiles.push({
        id,
        name,
        shortId,
        initial,
        isPrimary,
        category: meta.category,
        address: meta.address,
      });
    }

    if (!googleEmail) {
      googleEmail = user.email || '';
    }

    // Honest handling: if no genuine Google Business account is connected, return empty
    if (profiles.length === 0) {
      return NextResponse.json({
        email: googleEmail,
        count: 0,
        hasConnectedGbp: false,
        activeProfileId: null,
        savedPublishingAccountId: null,
        activeProfile: null,
        profiles: [],
        phone: tenant?.phone || '',
        version: 'BGOS v2.0',
      });
    }

    // Sort profiles so the selected/active profile is first
    profiles.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.name.localeCompare(b.name);
    });

    const activeProfileId = String(
      tenantSettings.activeGbpLocationId ||
        profiles.find((p) => p.isPrimary)?.id ||
        profiles[0]?.id || '',
    );
    const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;

    const activeSocialAccount = socialAccounts.find((sa) => {
      let meta: Record<string, any> = {};
      if (sa.metadata) {
        try {
          meta = typeof sa.metadata === 'string' ? JSON.parse(sa.metadata) : sa.metadata;
        } catch {}
      }
      const id = String(sa.accountId || meta.locationId || sa.id);
      return id === activeProfileId || sa.id === activeProfileId;
    });

    return NextResponse.json({
      email: googleEmail,
      count: profiles.length,
      hasConnectedGbp: true,
      activeProfileId: activeProfile ? activeProfile.id : null,
      savedPublishingAccountId: tenantSettings.activeGbpLocationId ? activeSocialAccount?.id ?? null : null,
      activeProfile,
      profiles,
      phone: tenant?.phone || '',
      version: 'BGOS v2.0',
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
    const tenantId = user.tenantId;

    const body = await request.json().catch(() => ({}));
    const profileId = String(body.profileId || '').trim();
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const customBusinessName = typeof body.businessName === 'string' ? body.businessName.trim() : '';
    const customCategory = typeof body.category === 'string' ? body.category.trim() : '';
    const customProducts = Array.isArray(body.products)
      ? body.products.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim())
      : undefined;
    const customServices = Array.isArray(body.services)
      ? body.services.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
      : undefined;

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        settingsJson: true,
        industry: true,
        state: true,
        country: true,
        address: true,
        city: true,
      },
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
    let gbpCategory = '';
    let gbpAddress = '';
    let gbpPlaceId = '';
    let gbpCity = '';
    if (targetAccount) {
      let meta: Record<string, any> = {};
      try {
        meta = typeof targetAccount.metadata === 'string' ? JSON.parse(targetAccount.metadata) : (targetAccount.metadata || {});
      } catch {}
      targetName = meta.locationTitle || targetAccount.accountName.replace(/\s*\([^)]*\)$/, '').trim();
      gbpCategory = meta.category || '';
      gbpAddress = meta.address || '';
      gbpPlaceId = meta.placeId || '';
      if (gbpAddress) {
        const parts = gbpAddress.split(',').map((s: string) => s.trim()).filter(Boolean);
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          if (/^\d{5,6}$/.test(p)) continue;
          if (/(bihar|uttar pradesh|haryana|delhi|maharashtra|karnataka|punjab|gujarat|tamil nadu|rajasthan|texas|california)/i.test(p)) continue;
          if (p.length > 2 && !/near|opp|behind|floor|suite|road|rd|chowk|street|st|lane|highway|nh/i.test(p)) {
            gbpCity = p;
            break;
          }
        }
        if (!gbpCity && parts.length > 2) gbpCity = parts[parts.length - 2];
      }

      // Touch updatedAt so it sorts to the top
      await db.socialAccount.update({
        where: { id: targetAccount.id },
        data: { updatedAt: new Date() },
      });
    }

    const finalName = customBusinessName || targetName;

    // Resolve intelligent category: user input > GBP category (if not generic) > inferred from name
    let finalCategory = customCategory;
    if (!finalCategory) {
      if (gbpCategory && !/corporate|holding|community centre/i.test(gbpCategory)) {
        finalCategory = gbpCategory;
      } else if (/(market|grocery|supermarket|mart|kirana|retail|store|bazaar|provisions)/i.test(finalName)) {
        finalCategory = 'Grocery & Supermarket';
      } else if (/(pool|swimming|farmhouse|resort|villa|cottage|homestay|retreat)/i.test(finalName)) {
        finalCategory = 'Farmhouse & Resort';
      } else if (/(cake|bakery|pastry|dessert|mithai|sweet|patisserie)/i.test(finalName)) {
        finalCategory = 'Bakery & Cake Shop';
      } else if (/(hardware|tool|fastener|plumbing|sanitary|pipe)/i.test(finalName)) {
        finalCategory = 'Hardware & Tools';
      } else if (/(paint|color|wall finish|coating|decor)/i.test(finalName)) {
        finalCategory = 'Paint & Home Decor';
      } else if (gbpCategory) {
        finalCategory = gbpCategory;
      } else {
        finalCategory = 'Retail & Local Services';
      }
    }

    // Update tenant settings with active profile
    tenantSettings.activeGbpLocationId = profileId;
    tenantSettings.activeGbpTitle = finalName;
    tenantSettings.activeGbpCategory = finalCategory;
    if (gbpAddress) tenantSettings.activeGbpAddress = gbpAddress;
    if (gbpCity) tenantSettings.activeGbpCity = gbpCity;
    if (gbpPlaceId) tenantSettings.activeGbpPlaceId = gbpPlaceId;
    if (customProducts) tenantSettings.activeGbpProducts = customProducts;
    if (customServices) tenantSettings.activeGbpServices = customServices;

    const nextAddress = gbpAddress || tenant?.address || null;
    const nextCity = gbpCity || tenant?.city || null;
    const sanitizedState = normalizeRegionState({
      state: tenant?.state ?? null,
      country: tenant?.country ?? null,
      address: nextAddress,
      city: nextCity,
    });

    // Atomically synchronize Tenant and BrandProfile
    await Promise.all([
      db.tenant.update({
        where: { id: user.tenantId },
        data: {
          settingsJson: JSON.stringify(tenantSettings),
          industry: finalCategory,
          name: finalName,
          ...(gbpAddress ? { address: gbpAddress } : {}),
          ...(gbpCity ? { city: gbpCity } : {}),
          ...(gbpPlaceId ? { googlePlaceId: gbpPlaceId } : {}),
          ...(sanitizedState !== (tenant?.state ?? null) ? { state: sanitizedState } : {}),
        },
      }),
      // Purge cached competitors so the new profile loads fresh local competitors
      db.competitor.deleteMany({ where: { tenantId: user.tenantId } }).catch(() => {}),
      (async () => {
        const existingBp = await db.brandProfile.findUnique({ where: { tenantId } }).catch(() => null);
        const dataToSave: any = {
          businessName: finalName,
          industry: finalCategory,
          ...(gbpCity ? { location: gbpCity } : {}),
        };
        if (customProducts) dataToSave.products = JSON.stringify(customProducts);
        if (customServices) dataToSave.services = JSON.stringify(customServices);

        if (existingBp) {
          await db.brandProfile.update({
            where: { id: existingBp.id },
            data: dataToSave,
          });
        } else {
          await db.brandProfile.create({
            data: {
              tenantId,
              ...dataToSave,
            },
          });
        }
      })(),
    ]);

    invalidatePlacePayloadCache(user.tenantId);

    const targetShortId = `#${profileId.slice(-4)}`;
    const targetProfile: GbpDiscoveredProfile = {
      id: profileId,
      name: finalName,
      shortId: targetShortId,
      initial: finalName.charAt(0).toUpperCase() || 'B',
      category: finalCategory,
    };

    return NextResponse.json({
      success: true,
      activeProfileId: profileId,
      activeProfile: targetProfile,
      message: `Switched active Google Business Profile to ${finalName} (${targetShortId})`,
    });
  } catch (err: unknown) {
    console.error('[api/gbp/accounts/discover] POST error:', err);
    return NextResponse.json({ error: 'Failed to switch profile' }, { status: 500 });
  }
}
