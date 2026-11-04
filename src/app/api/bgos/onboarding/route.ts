import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { trainBgosChatbotKnowledge } from '@/lib/bgos-onboarding-knowledge';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    let tenantSettings: Record<string, any> = {};
    if (tenant.settingsJson) {
      try {
        tenantSettings = typeof tenant.settingsJson === 'string'
          ? JSON.parse(tenant.settingsJson)
          : tenant.settingsJson;
      } catch {}
    }

    // Query genuine Google Business social accounts for this tenant
    const socialAccounts = await db.socialAccount.findMany({
      where: {
        tenantId: user.tenantId,
        platform: 'googlebusiness',
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const discoveredLocations = socialAccounts.map((sa) => {
      let meta: Record<string, any> = {};
      if (sa.metadata) {
        try {
          meta = typeof sa.metadata === 'string' ? JSON.parse(sa.metadata) : sa.metadata;
        } catch {}
      }
      return {
        id: String(sa.accountId || meta.locationId || sa.id),
        name: String(meta.locationTitle || sa.accountName || 'Google Business Profile')
          .replace(/\s*\([^)]*\)$/, '')
          .trim(),
        address: meta.address || '',
        category: meta.category || '',
        placeId: meta.placeId || null,
        mapsUri: meta.mapsUri || null,
        phone: meta.phone || '',
        website: meta.website || '',
        googleEmail: meta.googleEmail || '',
        isVerified: true,
      };
    });

    const activeLocationId = String(
      tenantSettings.activeGbpLocationId ||
      discoveredLocations[0]?.id || ''
    );
    const baseLocation = discoveredLocations.find((loc) => loc.id === activeLocationId) || discoveredLocations[0] || null;
    const effectiveWebsite =
      tenantSettings.locationWebsite ||
      tenantSettings.website ||
      baseLocation?.website ||
      (tenant as any).website ||
      '';

    const activeLocation = baseLocation
      ? {
          ...baseLocation,
          name: tenantSettings.locationName || baseLocation.name || tenant.name,
          address: tenantSettings.locationAddress || baseLocation.address || tenant.address || '',
          category: tenantSettings.locationCategory || baseLocation.category || tenant.industry || '',
          website: effectiveWebsite,
        }
      : null;

    let offerings: string[] = [];
    if (tenant.brandProfile?.services) {
      try {
        offerings = JSON.parse(tenant.brandProfile.services);
      } catch {}
    }
    if (!offerings.length && tenantSettings.offerings) {
      offerings = Array.isArray(tenantSettings.offerings) ? tenantSettings.offerings : [];
    }

    let keywords: string[] = [];
    if (tenantSettings.targetKeywords && Array.isArray(tenantSettings.targetKeywords)) {
      keywords = tenantSettings.targetKeywords;
    }

    const aboutText = tenant.brandProfile?.aiGeneratedSummary || tenantSettings.aboutBusiness || '';
    const hours = tenantSettings.businessHours || null;
    const automations = tenantSettings.gbpAutomations || {
      autoReplyReviews: true,
      autoGeneratePosts: true,
      autoPublishPhotos: true,
      enableChatbot: true,
    };

    const hasConnectedGbp = discoveredLocations.length > 0;
    const onboardingCompleted = Boolean(tenant.onboardingCompleted) && hasConnectedGbp;
    const step = tenant.onboardingStep || (hasConnectedGbp ? 2 : 1);

    return NextResponse.json({
      onboardingCompleted,
      onboardingStep: step,
      hasConnectedGbp,
      activeLocation,
      discoveredLocations,
      offerings,
      aboutText,
      keywords,
      hours,
      automations: {
        autoReplyReviews: true,
        autoGeneratePosts: true,
        autoPublishPhotos: true,
        enableChatbot: true,
        ...automations,
      },
      website: effectiveWebsite,
      businessName: activeLocation?.name || tenant.brandProfile?.businessName || '',
      industry: activeLocation?.category || tenant.industry || 'Field Services',
    });
  } catch (error) {
    console.error('[api/bgos/onboarding] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch onboarding state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      step,
      activeLocationId,
      locationName,
      locationAddress,
      locationCategory,
      locationPinCode,
      locationWebsite,
      website,
      offerings,
      aboutText,
      keywords,
      hours,
      automations,
      complete,
    } = body;

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    let tenantSettings: Record<string, any> = {};
    if (tenant.settingsJson) {
      try {
        tenantSettings = typeof tenant.settingsJson === 'string'
          ? JSON.parse(tenant.settingsJson)
          : tenant.settingsJson;
      } catch {}
    }

    // 1. If active location was selected
    if (activeLocationId) {
      tenantSettings.activeGbpLocationId = String(activeLocationId);
      const targetSa = await db.socialAccount.findFirst({
        where: {
          tenantId: user.tenantId,
          platform: 'googlebusiness',
          accountId: String(activeLocationId),
        },
      });
      if (targetSa) {
        let meta: Record<string, any> = {};
        try {
          meta = typeof targetSa.metadata === 'string' ? JSON.parse(targetSa.metadata) : (targetSa.metadata || {});
        } catch {}
        tenantSettings.activeGbpTitle = meta.locationTitle || targetSa.accountName;
      }
    }

    // 2. Offerings & About
    if (Array.isArray(offerings)) {
      tenantSettings.offerings = offerings;
      await db.brandProfile.upsert({
        where: { tenantId: user.tenantId },
        create: {
          tenantId: user.tenantId,
          businessName: tenantSettings.activeGbpTitle || tenant.name || 'Business',
          industry: tenant.industry || 'Services',
          services: JSON.stringify(offerings),
          aiGeneratedSummary: aboutText || undefined,
        },
        update: {
          services: JSON.stringify(offerings),
          ...(aboutText ? { aiGeneratedSummary: aboutText } : {}),
        },
      }).catch(() => {});
    }

    if (aboutText) {
      tenantSettings.aboutBusiness = aboutText;
    }

    // 3. Keywords
    if (Array.isArray(keywords)) {
      tenantSettings.targetKeywords = keywords;
    }

    // 4. Hours
    if (hours && typeof hours === 'object') {
      tenantSettings.businessHours = hours;
    }

    // 5. Automations
    if (automations && typeof automations === 'object') {
      tenantSettings.gbpAutomations = {
        ...tenantSettings.gbpAutomations,
        ...automations,
      };
    }

    // 6. Location customization from Step 2
    if (locationName) tenantSettings.locationName = String(locationName).trim();
    if (locationAddress) tenantSettings.locationAddress = String(locationAddress).trim();
    if (locationCategory) tenantSettings.locationCategory = String(locationCategory).trim();
    if (locationPinCode) tenantSettings.locationPinCode = String(locationPinCode).trim();
    const effectiveWebsite = typeof locationWebsite === 'string'
      ? locationWebsite.trim()
      : typeof website === 'string'
      ? website.trim()
      : undefined;
    if (effectiveWebsite !== undefined) {
      tenantSettings.locationWebsite = effectiveWebsite;
      tenantSettings.website = effectiveWebsite;
    }

    const nextStep = typeof step === 'number' ? Math.min(Math.max(step, 1), 5) : tenant.onboardingStep;
    const shouldComplete = complete === true || step === 5;

    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        settingsJson: JSON.stringify(tenantSettings),
        ...(locationName ? { name: String(locationName).trim() } : {}),
        ...(locationAddress ? { address: String(locationAddress).trim() } : {}),
        ...(locationCategory ? { industry: String(locationCategory).trim() } : {}),
        ...(effectiveWebsite !== undefined ? { website: effectiveWebsite } : {}),
        onboardingStep: shouldComplete ? 5 : nextStep,
        ...(shouldComplete ? { onboardingCompleted: true } : {}),
      },
    });

    // 7. Background AI Chatbot Training (Dual-Brain: Profile, Services, Hours + Website Crawl if available)
    void trainBgosChatbotKnowledge({
      tenantId: user.tenantId,
      userId: user.id,
      businessName: locationName || tenantSettings.locationName || tenantSettings.activeGbpTitle || tenant.name || 'Business',
      industry: locationCategory || tenantSettings.locationCategory || tenant.industry,
      address: locationAddress || tenantSettings.locationAddress || tenant.address,
      website: effectiveWebsite || tenantSettings.locationWebsite || tenantSettings.website,
      offerings: Array.isArray(offerings) ? offerings : tenantSettings.offerings,
      aboutText: aboutText || tenantSettings.aboutBusiness,
      hours: hours || tenantSettings.businessHours,
    }).catch((trainErr) => {
      console.warn('[api/bgos/onboarding] trainBgosChatbotKnowledge background warning:', trainErr);
    });

    return NextResponse.json({
      success: true,
      onboardingCompleted: shouldComplete,
      onboardingStep: shouldComplete ? 5 : nextStep,
      message: shouldComplete ? 'Onboarding completed successfully' : 'Progress saved',
    });
  } catch (error) {
    console.error('[api/bgos/onboarding] POST error:', error);
    return NextResponse.json({ error: 'Failed to update onboarding state' }, { status: 500 });
  }
}
