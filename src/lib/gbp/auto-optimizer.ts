import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { computeGbpAudit } from '@/lib/gbp/audit';
import { getTenantSeoContext, safeParseJsonObject } from '@/lib/gbp/seo-context';
import { generateLocalizedServiceDescriptions } from '@/lib/gbp/service-optimizer';
import { buildCompetitorGapSummary, type CompetitorSpyProfile } from '@/lib/gbp/competitor-spy';
import { ensureFreshCompetitorIntelligence } from '@/lib/gbp/competitor-intelligence';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { updateGoogleBusinessProfile } from '@/lib/social/adapters/googlebusiness';
import { invalidatePlacePayloadCache } from '@/app/api/gbp/place/route';
import { applyHostedOrActivationSeoFix } from '@/lib/seo/website-audit';
import {
  resolveTenantPublicUrls,
  syncGooglePlaceActionsForTenant,
  type PlaceActionsSyncResult,
} from '@/lib/gbp/place-actions-sync';

export type AutoOptimizeStepId =
  | 'description'
  | 'categories'
  | 'attributes'
  | 'services'
  | 'landing_page'
  | 'booking_link';

export interface AutoOptimizeActionPreview {
  id: AutoOptimizeStepId;
  title: string;
  subtitle: string;
  ready: boolean;
  alreadyOptimal: boolean;
  impact: 'high' | 'medium';
  previewData: Record<string, unknown>;
}

export interface UncoveredSearchDemand {
  keyword: string;
  count: number;
  isThreshold?: boolean;
  suggestedServiceName: string;
}

const SEARCH_STOP_WORDS = new Set([
  'near',
  'me',
  'best',
  'top',
  'in',
  'at',
  'for',
  'the',
  'and',
  'of',
  'to',
  'a',
  'an',
  'local',
  'services',
  'service',
  'company',
  'companies',
  'shop',
  'store',
  'center',
  'centre',
]);

function formatSuggestedServiceName(rawKeyword: string, city: string): string {
  const cityTokens = new Set(
    city
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2),
  );
  let cleaned = rawKeyword
    .replace(/\bnear\s*(me|by)?\b/gi, '')
    .replace(/\bin\s+[a-z0-9\s]+$/i, (match) => {
      const words = match
        .replace(/^in\s+/i, '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      return words.some((w) => cityTokens.has(w)) ? '' : match;
    })
    .replace(/\s+/g, ' ')
    .trim();

  if (cityTokens.size > 0 && cleaned) {
    const words = cleaned.split(/\s+/);
    while (words.length > 1 && cityTokens.has(words[words.length - 1].toLowerCase())) {
      words.pop();
    }
    while (words.length > 1 && cityTokens.has(words[0].toLowerCase())) {
      words.shift();
    }
    if (words[words.length - 1]?.toLowerCase() === 'in' && words.length > 1) {
      words.pop();
    }
    cleaned = words.join(' ').trim();
  }

  if (!cleaned) cleaned = rawKeyword.trim();

  return cleaned
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Identify top Google Search Terms from GBP discovery data that do not yet match
 * any existing structured service name or target keyword.
 */
export function findUncoveredSearchDemands(params: {
  searchTerms: Array<{ keyword: string; count: number; isThreshold?: boolean }>;
  services: Array<{ name: string; targetKeyword?: string; description: string }>;
  city: string;
  limit?: number;
}): UncoveredSearchDemand[] {
  const cityTokens = new Set(
    params.city
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2),
  );

  const existingTargets = params.services.map((s) => ({
    name: s.name.toLowerCase().trim(),
    targetKeyword: (s.targetKeyword || '').toLowerCase().trim(),
    hasFullSeoCopy: s.description.trim().length >= 300,
    descriptionLower: s.description.toLowerCase(),
  }));

  const sorted = [...params.searchTerms]
    .filter((t) => typeof t.keyword === 'string' && t.keyword.trim().length >= 3)
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  const seenSuggested = new Set<string>();
  const results: UncoveredSearchDemand[] = [];

  for (const term of sorted) {
    const kwLower = term.keyword.toLowerCase().trim();
    const meaningfulTokens = kwLower
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !SEARCH_STOP_WORDS.has(t) && !cityTokens.has(t));

    if (meaningfulTokens.length === 0) continue;

    const alreadyCovered = existingTargets.some((svc) => {
      if (svc.name === kwLower || svc.targetKeyword === kwLower) return true;
      if (svc.name.includes(kwLower) || kwLower.includes(svc.name)) return true;
      if (svc.targetKeyword && (svc.targetKeyword.includes(kwLower) || kwLower.includes(svc.targetKeyword))) {
        return true;
      }
      if (svc.hasFullSeoCopy && svc.descriptionLower.includes(kwLower)) return true;

      const combinedSvcText = `${svc.name} ${svc.targetKeyword}`.trim();
      const matchedCount = meaningfulTokens.filter((token) => combinedSvcText.includes(token)).length;
      return matchedCount >= meaningfulTokens.length;
    });

    if (alreadyCovered) continue;

    const suggestedServiceName = formatSuggestedServiceName(term.keyword, params.city);
    const dedupeKey = suggestedServiceName.toLowerCase();
    if (seenSuggested.has(dedupeKey)) continue;
    seenSuggested.add(dedupeKey);

    results.push({
      keyword: term.keyword.trim(),
      count: Number(term.count || 0),
      ...(term.isThreshold ? { isThreshold: true } : {}),
      suggestedServiceName,
    });

    if (results.length >= (params.limit ?? 5)) break;
  }

  return results;
}

/**
 * Generate a 450-730 char GBP business description naturally weaving real Search Terms,
 * local services, and service cities without keyword-stuffing.
 */
export async function generateSearchTermBusinessDescription(opts: {
  businessName: string;
  category: string;
  city: string;
  serviceAreas: string[];
  keywords: string[];
  services: string[];
}): Promise<string> {
  const kwList = opts.keywords.slice(0, 5);
  const svcList = opts.services.slice(0, 6);
  const areaList = [opts.city, ...opts.serviceAreas.filter((a) => a.toLowerCase() !== opts.city.toLowerCase())]
    .filter(Boolean)
    .slice(0, 4);

  try {
    const res = await callAI({
      messages: [
        {
          role: 'system',
          content:
            'You write Google Business Profile descriptions (strictly 450-730 characters, single plain-text paragraph, no quotes, no markdown, no URLs or phone numbers, never keyword-stuff the business name). Naturally weave real customer Search Terms, services, and service cities.',
        },
        {
          role: 'user',
          content: [
            `Business: ${opts.businessName}`,
            `Primary Category: ${opts.category}`,
            `Primary City: ${opts.city || 'Local area'}`,
            areaList.length > 0 ? `Areas Served: ${areaList.join(', ')}` : '',
            kwList.length > 0 ? `Real Google Search Terms: ${kwList.join(', ')}` : '',
            svcList.length > 0 ? `Core Services: ${svcList.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      maxTokens: 320,
      temperature: 0.45,
      timeoutMs: 8000,
    });

    const raw = (typeof res === 'string' ? res : res?.content || '')
      .replace(/^["']|["']$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (raw.length >= 280 && raw.length <= 750) {
      return raw;
    }
    if (raw.length > 750) {
      const cut = raw.slice(0, 745);
      const lastPeriod = cut.lastIndexOf('.');
      return lastPeriod >= 300 ? cut.slice(0, lastPeriod + 1) : `${cut.trim()}.`;
    }
  } catch {
    // Fall back to deterministic localized paragraph below
  }

  const cityLabel = opts.city || 'your local area';
  const areaText = areaList.length > 1 ? areaList.join(', ') : cityLabel;
  const serviceText =
    svcList.length > 0
      ? svcList.slice(0, 4).join(', ')
      : `${opts.category.toLowerCase()} consultations, tailored treatments, and ongoing support`;
  const kwText =
    kwList.length > 0
      ? ` Customers searching in ${cityLabel} rely on our team for ${kwList.slice(0, 3).join(', ')}.`
      : '';

  return `${opts.businessName} is a trusted ${opts.category.toLowerCase()} provider serving ${areaText}. Our experienced team specializes in ${serviceText}, combining transparent estimates, verified standards, and responsive local scheduling.${kwText} Contact us to check availability or book your appointment today.`.slice(
    0,
    740,
  );
}

/**
 * Build the complete 1-click GBP optimization plan from Search Terms, audit gaps,
 * localized services, landing page status, and background competitor intelligence.
 */
export async function buildAutoOptimizePlan(
  tenantId: string,
  opts: { syncCompetitors?: boolean } = {},
) {
  const [tenant, seoCtx, audit] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      include: { brandProfile: true },
    }),
    getTenantSeoContext(tenantId),
    computeGbpAudit(tenantId),
  ]);

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const settings = safeParseJsonObject(tenant.settingsJson);
  const businessName = seoCtx?.businessName || tenant.brandProfile?.businessName || tenant.name;
  const category = seoCtx?.category || tenant.brandProfile?.industry || tenant.industry || 'Local Services';
  const city = seoCtx?.city || tenant.city || tenant.brandProfile?.location || '';
  const serviceAreas = seoCtx?.serviceAreas || [];
  const keywords = seoCtx?.priorityKeywords || [];
  const services = seoCtx?.seoServices || [];

  const currentDescription =
    (tenant.brandProfile?.aiGeneratedSummary && tenant.brandProfile.aiGeneratedSummary.trim()) ||
    (tenant.description && tenant.description.trim()) ||
    '';
  const descOptimal =
    currentDescription.length >= 300 &&
    (!city || currentDescription.toLowerCase().includes(city.toLowerCase()));

  // Extract competitor intelligence behind the scenes (auto-sync silently from Google Places when missing/stale)
  const spyCache = settings.competitorSpyCache;
  let spyInsights = spyCache?.spyInsights || null;
  const cacheAgeMs = spyCache?.updatedAt ? Date.now() - Date.parse(spyCache.updatedAt) : Number.POSITIVE_INFINITY;
  const isCacheStale = !spyInsights || !Number.isFinite(cacheAgeMs) || cacheAgeMs > 24 * 60 * 60 * 1000;

  if (opts.syncCompetitors !== false && isCacheStale) {
    try {
      const freshIntel = await ensureFreshCompetitorIntelligence(tenantId, { maxAgeMs: 24 * 60 * 60 * 1000 });
      if (freshIntel.insights) {
        spyInsights = freshIntel.insights;
      }
    } catch {
      // Non-fatal: continue with available cache/SEO context
    }
  }

  if (!spyInsights && spyCache) {
    const cachedPeers: CompetitorSpyProfile[] = Array.isArray(spyCache.competitors)
      ? (spyCache.competitors as CompetitorSpyProfile[])
      : spyCache.byKey && typeof spyCache.byKey === 'object'
        ? Object.entries(spyCache.byKey).map(([key, val]: [string, any]) => ({
            id: key,
            name: key,
            rating: null,
            reviewCount: null,
            distanceKm: null,
            address: null,
            category: val?.primaryCategoryLabel || null,
            primaryCategoryLabel: val?.primaryCategoryLabel || null,
            secondaryCategories: Array.isArray(val?.secondaryCategories) ? val.secondaryCategories : [],
            attributesList: Array.isArray(val?.attributesList) ? val.attributesList : [],
            recentReviews: Array.isArray(val?.recentReviews) ? val.recentReviews : [],
            photoCount: typeof val?.photoCount === 'number' ? val.photoCount : undefined,
            mapsRank: typeof val?.mapsRank === 'number' ? val.mapsRank : null,
            placeId: null,
            mapsUrl: null,
            source: 'places_cache',
          }))
        : [];
    if (cachedPeers.length > 0) {
      spyInsights = buildCompetitorGapSummary({
        queryUsed: spyCache.queryUsed || category,
        locationUsed: spyCache.locationUsed || city,
        self: {
          name: businessName,
          primaryCategory: category,
          rating: Number(tenant.rating) || 0,
          reviewCount: Number(tenant.reviewCount) || 0,
          mapsRank: spyCache.selfMapsRank ?? null,
          additionalCategories: seoCtx?.additionalCategories || [],
          attributes: seoCtx?.attributes || {},
          hasWebsite: Boolean(tenant.website || tenant.publicProfileEnabled),
        },
        competitors: cachedPeers,
      });
    }
  }

  const currentCats = seoCtx?.additionalCategories || [];
  const remainingCatSlots = Math.max(0, 9 - currentCats.length);
  const suggestedCategories: string[] = Array.isArray(spyInsights?.missingCategories)
    ? spyInsights.missingCategories
        .map((c: any) => String(c?.category || '').trim())
        .filter((cat: string) => cat && !currentCats.some((existing) => existing.toLowerCase() === cat.toLowerCase()))
        .slice(0, Math.min(4, remainingCatSlots))
    : [];

  const currentAttrs = seoCtx?.attributes || {};
  const suggestedAttributes: Array<{ key: string; label: string }> = Array.isArray(spyInsights?.missingAttributes)
    ? spyInsights.missingAttributes
        .filter((a: any) => a?.key && currentAttrs[a.key] !== true)
        .slice(0, 5)
    : [];

  const servicesNeedingSeo = services.filter(
    (s) =>
      s.description.trim().length < 300 ||
      s.description.trim().length > 500 ||
      (city && !s.description.toLowerCase().includes(city.toLowerCase())),
  );

  const uncoveredSearchTerms = findUncoveredSearchDemands({
    searchTerms: seoCtx?.searchTerms || [],
    services,
    city,
    limit: 5,
  });

  const publicUrls = resolveTenantPublicUrls(tenant, settings);
  const landingUrl = publicUrls.profileUrl;
  const bookingUrl = publicUrls.bookingUrl;
  const landingOptimal = Boolean(tenant.publicProfileEnabled && tenant.claimed && (tenant.seoTitle || '').length >= 25);
  const placeActionsOptimal = Boolean(
    settings.googlePlaceActions?.appointmentUri === bookingUrl &&
      (settings.bookingLink === bookingUrl ||
        (tenant.brandProfile as { bookingLink?: string | null } | null)?.bookingLink === bookingUrl),
  );

  const actions: AutoOptimizeActionPreview[] = [
    {
      id: 'description',
      title: 'SEO-Rich Business Description (Search Terms + City)',
      subtitle: descOptimal
        ? `${currentDescription.length} chars already include local context`
        : `Rewrite from ${currentDescription.length} chars to ~550 chars weaving real customer Search Terms + ${city || 'local area'}`,
      ready: true,
      alreadyOptimal: descOptimal,
      impact: 'high',
      previewData: {
        currentLength: currentDescription.length,
        keywordsUsed: keywords.slice(0, 4),
      },
    },
    {
      id: 'categories',
      title: 'Auto-Add High-Impact Secondary Categories',
      subtitle:
        suggestedCategories.length > 0
          ? `BGOS detected missing top-ranking categories: ${suggestedCategories.join(', ')}`
          : currentCats.length >= 2
            ? `${currentCats.length} secondary categories configured`
            : 'No category gaps flagged in your local market right now',
      ready: suggestedCategories.length > 0,
      alreadyOptimal: currentCats.length >= 2 && suggestedCategories.length === 0,
      impact: 'high',
      previewData: {
        suggestedCategories,
        currentCategories: currentCats,
      },
    },
    {
      id: 'attributes',
      title: 'Enable Competitor Trust Attributes',
      subtitle:
        suggestedAttributes.length > 0
          ? `Add ${suggestedAttributes.map((a) => a.label).join(', ')}`
          : 'No unconfigured competitor attributes flagged',
      ready: suggestedAttributes.length > 0,
      alreadyOptimal: suggestedAttributes.length === 0,
      impact: 'medium',
      previewData: {
        suggestedAttributes,
      },
    },
    {
      id: 'services',
      title: 'Write 300-500 Char Localized Service Descriptions',
      subtitle:
        servicesNeedingSeo.length > 0
          ? `Upgrade ${servicesNeedingSeo.length} service(s) with Search Term + ${city || 'city'} descriptions`
          : services.length > 0
            ? `All ${services.length} services already have 300-500 char localized copy`
            : 'Add services first to generate 300-500 char SEO copy',
      ready: servicesNeedingSeo.length > 0,
      alreadyOptimal: services.length >= 3 && servicesNeedingSeo.length === 0,
      impact: 'high',
      previewData: {
        servicesCount: services.length,
        needingUpgradeCount: servicesNeedingSeo.length,
        sampleServices: servicesNeedingSeo.slice(0, 4).map((s) => s.name),
      },
    },
    {
      id: 'landing_page',
      title: 'Dedicated GBP Landing Page & Schema Sync',
      subtitle: landingOptimal
        ? `Dedicated GBP page active at ${landingUrl}`
        : `Publish & enrich ${landingUrl} with Search Terms + FAQs and link to Google Business Profile`,
      ready: true,
      alreadyOptimal: landingOptimal,
      impact: 'high',
      previewData: {
        landingUrl,
        currentWebsite: tenant.website || null,
        publicProfileEnabled: tenant.publicProfileEnabled,
      },
    },
    {
      id: 'booking_link',
      title: 'Sync Booking & Order Buttons to Google',
      subtitle: placeActionsOptimal
        ? `Google Appointments button synced to ${bookingUrl}`
        : `Automatically connect ${bookingUrl} to your Google Business Booking button`,
      ready: true,
      alreadyOptimal: placeActionsOptimal,
      impact: 'high',
      previewData: {
        bookingUrl,
        currentAppointmentUri: settings.googlePlaceActions?.appointmentUri || null,
      },
    },
  ];

  return {
    tenant,
    settings,
    seoCtx,
    audit,
    businessName,
    category,
    city,
    serviceAreas,
    keywords,
    services,
    servicesNeedingSeo,
    uncoveredSearchTerms,
    suggestedCategories,
    suggestedAttributes,
    landingUrl,
    actions,
  };
}

export async function getAutoOptimizeOverview(
  tenantId: string,
  opts: { syncCompetitors?: boolean } = {},
) {
  const plan = await buildAutoOptimizePlan(tenantId, opts);

  return {
    score: plan.audit.score,
    grade: plan.audit.grade,
    connectedToGoogle: plan.audit.connectedToGoogle,
    pendingCount: plan.actions.filter((a) => !a.alreadyOptimal && a.ready).length,
    landingUrl: plan.landingUrl,
    searchTermsUsed: plan.keywords.slice(0, 8),
    actions: plan.actions,
    uncoveredSearchTerms: plan.uncoveredSearchTerms,
    hasRollback: Boolean(plan.settings.autoOptimizeRollback),
  };
}

export async function previewAutoOptimizePlan(tenantId: string) {
  const plan = await buildAutoOptimizePlan(tenantId);
  const sampleDescription = await generateSearchTermBusinessDescription({
    businessName: plan.businessName,
    category: plan.category,
    city: plan.city,
    serviceAreas: plan.serviceAreas,
    keywords: plan.keywords,
    services: plan.services.map((s) => s.name),
  });

  return {
    mode: 'preview' as const,
    score: plan.audit.score,
    grade: plan.audit.grade,
    sampleDescription,
    suggestedCategories: plan.suggestedCategories,
    suggestedAttributes: plan.suggestedAttributes,
    servicesToUpgrade: plan.servicesNeedingSeo.map((s) => s.name),
    uncoveredSearchTerms: plan.uncoveredSearchTerms,
    landingUrl: plan.landingUrl,
    actions: plan.actions,
  };
}

export async function rollbackAutoOptimize(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  const settings = safeParseJsonObject(tenant?.settingsJson);
  const snap = settings.autoOptimizeRollback;
  if (!snap) {
    return {
      success: false as const,
      notFound: true as const,
      error: 'No previous auto-optimize snapshot found',
    };
  }
  settings.additionalCategories = Array.isArray(snap.additionalCategories) ? snap.additionalCategories : [];
  settings.attributes = snap.attributes && typeof snap.attributes === 'object' ? snap.attributes : {};
  delete settings.autoOptimizeRollback;

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      description: snap.description ?? null,
      website: snap.website ?? null,
      publicProfileEnabled: Boolean(snap.publicProfileEnabled),
      claimed: Boolean(snap.claimed),
      settingsJson: JSON.stringify(settings),
    },
  });
  invalidatePlacePayloadCache(tenantId);
  const auditAfter = await computeGbpAudit(tenantId);
  return {
    success: true as const,
    notFound: false as const,
    rolledBack: true as const,
    scoreAfter: auditAfter.score,
    gradeAfter: auditAfter.grade,
  };
}

export async function executeAutoOptimize(
  tenantId: string,
  opts: {
    steps?: AutoOptimizeStepId[];
    pushToGoogle?: boolean;
    locationId?: string;
    syncCompetitors?: boolean;
  } = {},
) {
  const plan = await buildAutoOptimizePlan(tenantId, {
    syncCompetitors: opts.syncCompetitors ?? true,
  });

  const selectedSteps = new Set<AutoOptimizeStepId>(
    Array.isArray(opts.steps) && opts.steps.length > 0
      ? opts.steps
      : ['description', 'categories', 'attributes', 'services', 'landing_page', 'booking_link'],
  );
  const pushToGoogle = opts.pushToGoogle !== false;
  const scoreBefore = plan.audit.score;

  // Save clean rollback snapshot
  const freshSettings = safeParseJsonObject(plan.tenant.settingsJson);
  freshSettings.autoOptimizeRollback = {
    savedAt: new Date().toISOString(),
    description: plan.tenant.description ?? null,
    website: plan.tenant.website ?? null,
    publicProfileEnabled: plan.tenant.publicProfileEnabled,
    claimed: plan.tenant.claimed,
    additionalCategories: plan.seoCtx?.additionalCategories || [],
    attributes: plan.seoCtx?.attributes || {},
  };

  const googlePayload: {
    description?: string;
    additionalCategories?: string[];
    attributes?: Record<string, boolean>;
    serviceItems?: Array<{ name: string; description?: string; categoryName?: string }>;
    regionCode?: string;
  } = {
    regionCode: (plan.tenant.country || 'IN').toUpperCase(),
  };

  const appliedSteps: string[] = [];
  const googleWarnings: string[] = [];
  const appliedMasks: string[] = [];
  let nextDescription: string | undefined;

  // 1. SEO Business Description
  if (selectedSteps.has('description')) {
    nextDescription = await generateSearchTermBusinessDescription({
      businessName: plan.businessName,
      category: plan.category,
      city: plan.city,
      serviceAreas: plan.serviceAreas,
      keywords: Array.from(
        new Set([...plan.keywords, ...(plan.seoCtx?.competitorReviewThemes || [])]),
      ).slice(0, 8),
      services: plan.services.map((s) => s.name),
    });
    googlePayload.description = nextDescription;
    appliedSteps.push('description');
  }

  // 2. Missing Competitor Secondary Categories
  if (selectedSteps.has('categories') && plan.suggestedCategories.length > 0) {
    const mergedCats = [...(plan.seoCtx?.additionalCategories || []), ...plan.suggestedCategories].slice(0, 9);
    freshSettings.additionalCategories = mergedCats;
    googlePayload.additionalCategories = mergedCats;
    appliedSteps.push('categories');
  }

  // 3. Missing Competitor Attributes
  if (selectedSteps.has('attributes') && plan.suggestedAttributes.length > 0) {
    const mergedAttrs: Record<string, unknown> = { ...(plan.seoCtx?.attributes || {}) };
    const boolPatch: Record<string, boolean> = {};
    for (const attr of plan.suggestedAttributes) {
      mergedAttrs[attr.key] = true;
      boolPatch[attr.key] = true;
    }
    freshSettings.attributes = mergedAttrs;
    googlePayload.attributes = boolPatch;
    appliedSteps.push('attributes');
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      ...(nextDescription ? { description: nextDescription } : {}),
      settingsJson: JSON.stringify(freshSettings),
    },
  });

  if (nextDescription && plan.tenant.brandProfile?.id && (db as any).brandProfile?.update) {
    await (db as any).brandProfile
      .update({
        where: { id: plan.tenant.brandProfile.id },
        data: { aiGeneratedSummary: nextDescription },
      })
      .catch(() => {});
  }

  // 4. Batch 300-500 char Localized Services
  let upgradedServicesCount = 0;
  if (selectedSteps.has('services') && plan.servicesNeedingSeo.length > 0) {
    const svcResult = await generateLocalizedServiceDescriptions({
      tenantId,
      services: plan.servicesNeedingSeo.map((s) => ({
        id: s.id,
        name: s.name,
        targetKeyword: s.targetKeyword,
        existingDescription: s.description,
        category: s.category,
      })),
      save: true,
      pushToGoogle: false,
    });
    upgradedServicesCount = svcResult.services.length;
    if (upgradedServicesCount > 0) {
      appliedSteps.push('services');
      googlePayload.serviceItems = svcResult.services.map((s) => ({
        name: s.name,
        description: s.description,
        categoryName: s.category,
      }));
    }
  }

  // Single consolidated Google Business Profile PATCH (except websiteUri handled cleanly by landing_page step)
  let syncedToGoogle = false;
  const hasGoogleMutations = Boolean(
    googlePayload.description ||
      googlePayload.additionalCategories ||
      googlePayload.attributes ||
      (googlePayload.serviceItems && googlePayload.serviceItems.length > 0),
  );
  if (pushToGoogle && hasGoogleMutations) {
    try {
      const googleAccount = await prepareGoogleAccount(tenantId, opts.locationId);
      if (googleAccount?.accessToken) {
        const patchRes = await updateGoogleBusinessProfile(googleAccount, googlePayload);
        appliedMasks.push(...patchRes.appliedMasks);
        googleWarnings.push(...patchRes.warnings);
        syncedToGoogle = patchRes.appliedMasks.length > 0;
      } else {
        googleWarnings.push('Google Business account not connected; changes saved to BGOS.');
      }
    } catch (err: unknown) {
      googleWarnings.push(err instanceof Error ? err.message : 'Google Business sync notice');
    }
  }

  // 5. Dedicated GBP Landing Page + Schema + websiteUri sync
  let landingResult: { websiteUrl: string; canonicalUrl: string; syncedToGoogle: boolean } | null = null;
  if (selectedSteps.has('landing_page')) {
    const fixRes = await applyHostedOrActivationSeoFix({
      tenantId,
      actionKey: plan.tenant.publicProfileEnabled ? 'hosted_seo_enrich' : 'activate_hosted_site',
      syncToGoogle: pushToGoogle,
    });
    landingResult = {
      websiteUrl: fixRes.websiteUrl,
      canonicalUrl: fixRes.canonicalUrl,
      syncedToGoogle: fixRes.syncedToGoogle,
    };
    if (fixRes.syncedToGoogle) {
      syncedToGoogle = true;
      if (!appliedMasks.includes('websiteUri')) appliedMasks.push('websiteUri');
    }
    appliedSteps.push('landing_page');
  }

  // 6. Booking & Ordering Place Action Links sync to Google Business Profile
  let bookingSyncResult: { appointmentUri?: string; orderUri?: string; syncedActions: string[] } | null = null;
  if (selectedSteps.has('booking_link') || (selectedSteps.has('landing_page') && pushToGoogle)) {
    if (pushToGoogle) {
      const actionRes: PlaceActionsSyncResult = await syncGooglePlaceActionsForTenant({
        tenantId,
        includeAppointment: true,
      }).catch((err: unknown): PlaceActionsSyncResult => ({
        attempted: true,
        connected: false,
        syncedActions: [],
        warnings: [err instanceof Error ? err.message : 'Place Action link sync warning'],
      }));
      bookingSyncResult = {
        appointmentUri: actionRes.appointmentUri,
        orderUri: actionRes.orderUri,
        syncedActions: actionRes.syncedActions,
      };
      if (actionRes.syncedActions.length > 0) {
        syncedToGoogle = true;
        if (!appliedMasks.includes('placeActionLinks')) appliedMasks.push('placeActionLinks');
      }
      if (actionRes.warnings.length > 0) {
        googleWarnings.push(...actionRes.warnings);
      }
    }
    if (selectedSteps.has('booking_link')) {
      appliedSteps.push('booking_link');
    }
  }

  invalidatePlacePayloadCache(tenantId);
  const auditAfter = await computeGbpAudit(tenantId);

  return {
    success: true as const,
    appliedSteps,
    upgradedServicesCount,
    suggestedCategoriesApplied: selectedSteps.has('categories') ? plan.suggestedCategories : [],
    suggestedAttributesApplied: selectedSteps.has('attributes') ? plan.suggestedAttributes.map((a) => a.key) : [],
    generatedDescription: nextDescription,
    landingResult,
    bookingSyncResult,
    syncedToGoogle,
    appliedMasks,
    googleWarnings,
    scoreBefore,
    scoreAfter: auditAfter.score,
    gradeAfter: auditAfter.grade,
    auditAfter,
  };
}
