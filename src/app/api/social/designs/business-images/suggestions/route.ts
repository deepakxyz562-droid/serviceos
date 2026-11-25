import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  getOrGenerateCachedSceneSuggestions,
  SceneGenerationError,
  type DetailedBusinessServiceContext,
} from '@/lib/designs/business-image-suggestions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const cleanLocationValue = (v?: string | null): string => {
  const s = (v || '').trim();
  return !s || /^(not specified|n\/a|na|none|null|undefined|unknown|your city)$/i.test(s) ? '' : s;
};

/**
 * GET /api/social/designs/business-images/suggestions
 * Returns AI-generated, schema-validated, context-cached commercial photography scene concepts.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const businessNameParam = searchParams.get('businessName');
    const refreshParam = searchParams.get('refresh') === 'true';

    const [tenant, brandProfile, gbpAccount, merchantServices] = await Promise.all([
      db.tenant
        .findUnique({
          where: { id: user.tenantId },
          select: {
            name: true,
            industry: true,
            description: true,
            city: true,
            settingsJson: true,
          },
        })
        .catch(() => null),
      (
        db.brandProfile?.findUnique({
          where: { tenantId: user.tenantId },
        }) ?? Promise.resolve(null)
      ).catch(() => null),
      (
        db.socialAccount?.findFirst({
          where: { tenantId: user.tenantId, platform: 'googlebusiness', isActive: true },
        }) ?? Promise.resolve(null)
      ).catch(() => null),
      (
        db.service?.findMany({
          where: { tenantId: user.tenantId },
          select: { name: true, description: true, longDescription: true },
          take: 15,
        }) ?? Promise.resolve([])
      ).catch(() => []),
    ]);

    let gbpCategory = '';
    let gbpTitle = '';
    let gbpCity = '';
    let gbpServiceAreas: string[] = [];
    if (gbpAccount?.metadata) {
      try {
        const meta =
          typeof gbpAccount.metadata === 'string'
            ? JSON.parse(gbpAccount.metadata)
            : (gbpAccount.metadata as Record<string, any>);
        gbpCategory = meta.primaryCategory || meta.category || '';
        gbpTitle = meta.locationTitle || meta.businessName || '';
        gbpCity = meta.city || '';
        if (Array.isArray(meta.serviceAreas)) {
          gbpServiceAreas = meta.serviceAreas.filter((a: unknown): a is string => typeof a === 'string');
        }
      } catch {
        // ignore malformed metadata
      }
    }

    let parsedSettings: Record<string, any> = {};
    if (tenant?.settingsJson) {
      try {
        const parsed = JSON.parse(tenant.settingsJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          parsedSettings = parsed;
        }
      } catch {
        // ignore malformed settingsJson
      }
    }

    if (!gbpCategory) gbpCategory = parsedSettings.activeGbpCategory || '';
    if (!gbpTitle) gbpTitle = parsedSettings.activeGbpTitle || '';
    const settingsCity = parsedSettings.activeGbpCity || '';

    const businessName =
      businessNameParam ||
      brandProfile?.businessName ||
      gbpTitle ||
      tenant?.name ||
      'Local Business';

    const category =
      categoryParam ||
      brandProfile?.industry ||
      gbpCategory ||
      tenant?.industry ||
      'Services';

    const city =
      cleanLocationValue(gbpCity) ||
      cleanLocationValue(settingsCity) ||
      cleanLocationValue(tenant?.city) ||
      cleanLocationValue(brandProfile?.location) ||
      cleanLocationValue(brandProfile?.serviceArea?.split(',')[0]) ||
      '';

    const serviceAreas =
      gbpServiceAreas.length > 0
        ? gbpServiceAreas
        : brandProfile?.serviceArea
          ? brandProfile.serviceArea
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

    // Merge detailed service names & descriptions across DB Service rows, GBP seoServices, and Brand Brain
    const servicesDetailedMap = new Map<string, DetailedBusinessServiceContext>();
    const addServiceEntry = (name?: string | null, description?: string | null, targetKeyword?: string | null) => {
      const cleanName = (name || '').trim();
      if (!cleanName) return;
      const key = cleanName.toLowerCase();
      const prev = servicesDetailedMap.get(key);
      servicesDetailedMap.set(key, {
        name: cleanName,
        description: (description || '').trim() || prev?.description || null,
        targetKeyword: (targetKeyword || '').trim() || prev?.targetKeyword || null,
      });
    };

    for (const s of merchantServices as Array<{ name?: string; description?: string | null; longDescription?: string | null }>) {
      addServiceEntry(s?.name, s?.description || s?.longDescription);
    }
    if (Array.isArray(parsedSettings.seoServices)) {
      for (const s of parsedSettings.seoServices) {
        if (s && typeof s === 'object') {
          addServiceEntry(s.name, s.description, s.targetKeyword);
        }
      }
    }
    if (brandProfile?.services) {
      try {
        const bpServices = JSON.parse(brandProfile.services);
        if (Array.isArray(bpServices)) {
          for (const item of bpServices) {
            if (typeof item === 'string') addServiceEntry(item);
          }
        }
      } catch {}
    }

    const brandBrain = (parsedSettings.brandBrain || {}) as Record<string, any>;
    const brandDetails = (brandBrain.brandDetails || {}) as Record<string, any>;
    if (Array.isArray(brandBrain.sellingItems)) {
      for (const it of brandBrain.sellingItems) {
        if (it && typeof it === 'object') {
          addServiceEntry(it.name, it.description);
        }
      }
    }

    const servicesDetailed = Array.from(servicesDetailedMap.values());
    const services = servicesDetailed.map((s) => s.name);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22_000);

    try {
      const result = await getOrGenerateCachedSceneSuggestions({
        tenantId: user.tenantId,
        existingSettingsJson: tenant?.settingsJson,
        signal: controller.signal,
        context: {
          tenantId: user.tenantId,
          businessName,
          category,
          businessDescription: brandProfile?.aiGeneratedSummary || tenant?.description || null,
          services,
          servicesDetailed,
          city,
          serviceAreas,
          usps: brandProfile?.usps || null,
          targetCustomer: brandProfile?.targetCustomer || null,
          customerPainPoints: brandProfile?.customerPainPoints || null,
          currentOffers: brandProfile?.currentOffers || null,
          brandStory: brandDetails.businessStory || null,
          tone: brandProfile?.tone || null,
          voiceDescription: brandProfile?.voiceDescription || null,
          brandColors: {
            primary: brandDetails.brandColor || null,
            secondary: brandDetails.secondaryColor || null,
          },
          isRefresh: refreshParam,
        },
      });

      return NextResponse.json({
        success: true,
        businessName,
        category,
        city,
        brandVisualDirection: result.brandVisualDirection,
        contextHash: result.contextHash,
        fromCache: result.fromCache,
        suggestions: result.suggestions,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: unknown) {
    console.error('[business-images/suggestions] Error:', error);
    const isAiErr = error instanceof SceneGenerationError;
    return NextResponse.json(
      {
        success: false,
        retryable: isAiErr ? error.retryable : true,
        code: isAiErr ? error.code : 'AI_SCENE_GENERATION_FAILED',
        error:
          error instanceof Error
            ? error.message
            : 'Could not generate AI scene ideas right now. Please try again.',
        suggestions: [],
      },
      { status: isAiErr ? 503 : 500 },
    );
  }
}
