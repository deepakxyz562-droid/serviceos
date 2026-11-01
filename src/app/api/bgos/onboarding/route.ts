import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

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
    const activeLocation = discoveredLocations.find((loc) => loc.id === activeLocationId) || discoveredLocations[0] || null;

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
      automations,
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

    const nextStep = typeof step === 'number' ? Math.min(Math.max(step, 1), 5) : tenant.onboardingStep;
    const shouldComplete = complete === true || step === 5;

    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        settingsJson: JSON.stringify(tenantSettings),
        onboardingStep: shouldComplete ? 5 : nextStep,
        ...(shouldComplete ? { onboardingCompleted: true } : {}),
      },
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
