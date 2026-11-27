import { db } from '@/lib/db';
import { resolveBusinessPresenceMode, type BusinessPresenceMode } from '@/lib/seo/presence-mode';
import {
  mergeStructuredServices,
  finalizeLocalizedServiceDescription,
  upsertTenantStructuredServices,
} from '@/lib/gbp/seo-context';
import {
  analyzeGbpSuspensionRisks,
  type GbpSuspensionShieldResult,
} from '@/lib/gbp/suspension-shield';

export interface AuditCheckItem {
  id: string;
  category: string;
  label: string;
  passed: boolean;
  scoreWeight: number;
  currentValue?: string;
  recommendation: string;
  actionRequired: string;
}

export interface GbpAuditResult {
  score: number;
  grade: string;
  isFullyOptimized: boolean;
  checks: AuditCheckItem[];
  missingCount: number;
  recommendations: string[];
  connectedToGoogle: boolean;
  reviewsCount: number;
  presenceMode?: BusinessPresenceMode;
  websiteSeoScore?: number | null;
  suspensionShield?: GbpSuspensionShieldResult;
}

function safeParseArray(json: string | null | undefined): string[] {
  try {
    const v = json ? JSON.parse(json) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * Deterministic 0-100% Google Business Profile completeness audit across the
 * local-ranking factors Google publishes (identity, SEO content, hours,
 * service area, booking conversion, catalog, media freshness).
 *
 * Shared by:
 *   - GET /api/gbp/audit          (audit UI)
 *   - GET /api/gbp/marketing-score (composite Marketing Score)
 *   - GET /api/gbp/growth-actions ("Complete your Profile" task card)
 */
export async function computeGbpAudit(tenantId: string): Promise<GbpAuditResult> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { brandProfile: true },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const { prepareGoogleAccount } = await import('@/lib/social/google-account-helper');
  const { googleReviewScope } = await import('@/lib/social/google-review-scope');

  const [googleAccount, reviewScope] = await Promise.all([
    prepareGoogleAccount(tenantId),
    googleReviewScope(tenantId),
  ]);

  const [reviewsCount, photosCount, servicesCount, dbServices] = await Promise.all([
    db.review?.count?.({ where: { tenantId, ...reviewScope } }).catch(() => 0) ?? 0,
    db.socialPost
      ?.count?.({
        where: { tenantId, mediaUrls: { not: '[]' } },
      })
      .catch(() => 0) ?? 0,
    db.service?.count?.({ where: { tenantId } }).catch(() => 0) ?? 0,
    db.service
      ?.findMany?.({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          longDescription: true,
          category: true,
          basePrice: true,
          duration: true,
        },
      })
      .catch(() => []) ?? [],
  ]);

  const brand = tenant.brandProfile;
  let settings: Record<string, any> = {};
  try {
    settings = JSON.parse(tenant.settingsJson || '{}');
  } catch {}
  const presence = resolveBusinessPresenceMode({ tenant });

  const additionalCats = Array.isArray(settings.additionalCategories)
    ? settings.additionalCategories.filter((c: unknown) => typeof c === 'string' && c.trim().length > 0)
    : [];
  const legacyServices = safeParseArray(brand?.services);
  const effectiveSecondaryCount = additionalCats.length > 0 ? additionalCats.length : legacyServices.length;

  const seoServicesArr = Array.isArray(settings.seoServices) ? settings.seoServices : [];
  const mergedServices = mergeStructuredServices(settings, dbServices);
  let optimizedServiceDescCount = mergedServices.filter(
    (s: any) => typeof s?.description === 'string' && s.description.trim().length >= 300,
  ).length;
  const effectiveServicesCount = Math.max(
    servicesCount,
    Array.isArray(settings.services) ? settings.services.length : 0,
    mergedServices.length,
  );

  if (effectiveServicesCount >= 3 && optimizedServiceDescCount < 2 && mergedServices.length > 0) {
    const tenantCity =
      tenant.city ||
      (brand as any)?.location ||
      (tenant.address ? tenant.address.split(',')[0].trim() : '') ||
      'Patna';
    const tenantBizName = (brand as any)?.businessName || tenant.name || 'our business';
    const tenantAreas = safeParseArray(tenant.serviceAreasJson);

    const healed = mergedServices.map((s) => ({
      ...s,
      description:
        s.description && s.description.trim().length >= 300
          ? s.description.trim().slice(0, 500)
          : finalizeLocalizedServiceDescription(s.description || '', {
              serviceName: s.name,
              targetKeyword: s.targetKeyword,
              city: tenantCity,
              businessName: tenantBizName,
              serviceAreas: tenantAreas,
            }),
    }));
    optimizedServiceDescCount = healed.filter((s) => s.description.length >= 300).length;
    void upsertTenantStructuredServices(tenantId, healed).catch(() => {});
  }
  const descCandidates = [
    typeof tenant.description === 'string' ? tenant.description.trim() : '',
    brand?.aiGeneratedSummary && typeof brand.aiGeneratedSummary === 'string' ? brand.aiGeneratedSummary.trim() : '',
    typeof settings.activeGbpDescription === 'string' ? settings.activeGbpDescription.trim() : '',
    typeof settings.aboutBusiness === 'string' ? settings.aboutBusiness.trim() : '',
    typeof settings.description === 'string' ? settings.description.trim() : '',
    typeof (tenant as any).seoDescription === 'string' ? (tenant as any).seoDescription.trim() : '',
  ].filter(Boolean);

  // Pick the best / longest populated candidate so a short stub never shadows a valid description
  descCandidates.sort((a, b) => b.length - a.length);
  const longDescValue = descCandidates[0] || '';

  // Auto-heal: if we have a valid description candidate and tenant.description is missing or too short, sync it
  if (longDescValue.length >= 120 && (!tenant.description || tenant.description.trim().length < 100)) {
    void db.tenant
      .update({
        where: { id: tenantId },
        data: { description: longDescValue },
      })
      .catch(() => {});
    if (brand?.id) {
      void db.brandProfile
        .update({
          where: { id: brand.id },
          data: { aiGeneratedSummary: longDescValue },
        })
        .catch(() => {});
    }
  }

  const effectivePhone = (
    tenant.phone ||
    (brand as any)?.phone ||
    settings.phone ||
    settings.primaryPhone ||
    ''
  ).trim();

  const effectiveWebsite = (
    (brand as any)?.website ||
    settings.website ||
    settings.websiteUrl ||
    settings.storeUrl ||
    ((tenant as any).website || '')
  ).trim();

  const effectiveAddress = (
    tenant.address ||
    (brand as any)?.address ||
    settings.address ||
    settings.businessAddress ||
    settings.streetAddress ||
    ((tenant as any).locationAddress || '')
  ).trim();

  const checks: AuditCheckItem[] = [
    {
      id: 'business_name_and_category',
      category: 'Core Identity',
      label: 'Business Name & Primary Category',
      passed: Boolean(tenant.name && (brand?.industry || (tenant as any).businessType)),
      scoreWeight: 15,
      currentValue: `${tenant.name} (${brand?.industry || (tenant as any).businessType || 'Missing Category'})`,
      recommendation: 'Ensure your primary category matches your highest-revenue local search query.',
      actionRequired: 'Set your primary business category in Business Settings.',
    },
    {
      id: 'business_address',
      category: 'Core Identity',
      label: 'Storefront Address & GPS Location',
      passed: Boolean(effectiveAddress && effectiveAddress.length >= 8),
      scoreWeight: 15,
      currentValue: effectiveAddress || 'Missing physical storefront address',
      recommendation: 'Google Maps requires an exact street address to rank your listing in "Near Me" searches and calculate driving directions.',
      actionRequired: 'Add your business street address and GPS pin in Business Profile.',
    },
    {
      id: 'phone_number',
      category: 'Contact & Conversion',
      label: 'Primary Phone Number & Direct Call Action',
      passed: Boolean(effectivePhone && effectivePhone.length >= 7),
      scoreWeight: 15,
      currentValue: effectivePhone || 'Missing phone number',
      recommendation: '60% of Google Maps mobile searchers call businesses directly. Adding a verified phone number boosts direct inquiries.',
      actionRequired: 'Add your primary business phone number.',
    },
    {
      id: 'website_url',
      category: 'Contact & Conversion',
      label: 'Website URL & Online Storefront Link',
      passed: Boolean(effectiveWebsite && effectiveWebsite.length > 3),
      scoreWeight: 10,
      currentValue: effectiveWebsite || 'Missing website link',
      recommendation: 'Profiles with a linked website receive 35% more clicks and drive qualified traffic to your online catalog.',
      actionRequired: 'Add your website or BGOS storefront link.',
    },
    {
      id: 'secondary_categories',
      category: 'Core Identity',
      label: 'Secondary Business Categories',
      passed: additionalCats.length >= 2,
      scoreWeight: 10,
      currentValue:
        additionalCats.length > 0
          ? `${additionalCats.length} secondary category(ies) set`
          : `${effectiveSecondaryCount} tag(s) — no secondary GBP categories saved yet`,
      recommendation: 'Add 2-5 competitor-backed secondary categories so Google indexes you for related nearby searches.',
      actionRequired: 'Run 1-Click Auto-Optimize inside Growth Actions or AI Growth Autopilot.',
    },
    {
      id: 'optimized_description',
      category: 'SEO Content',
      label: 'SEO-Rich Long Description (Up to 750 Chars)',
      passed: longDescValue.length >= 150,
      scoreWeight: 15,
      currentValue: longDescValue ? `${longDescValue.length} characters` : 'Empty or too short',
      recommendation: 'Google GBP descriptions support up to 750 characters. Include your city name, Search Terms, and service specialties.',
      actionRequired: 'Generate an SEO-optimized description with our 1-click AI optimizer.',
    },
    {
      id: 'business_hours',
      category: 'Operations',
      label: 'Complete Operating Hours & Weekend Schedule',
      passed:
        Boolean(settings.businessHours && Object.keys(settings.businessHours).length > 0) ||
        Boolean(settings.operatingHours && Object.keys(settings.operatingHours).length > 0) ||
        Boolean((tenant as any).businessHoursJson && (tenant as any).businessHoursJson !== '{}'),
      scoreWeight: 10,
      currentValue:
        settings.businessHours || settings.operatingHours || ((tenant as any).businessHoursJson && (tenant as any).businessHoursJson !== '{}')
          ? 'Operating hours configured'
          : 'Not configured',
      recommendation: 'Profiles with accurate opening hours receive 42% more direction requests on Google Maps.',
      actionRequired: 'Add your opening hours in Business Profile so Google can display them.',
    },
    {
      id: 'service_areas',
      category: 'Local Reach',
      label: 'Service Area Radius & Cities',
      passed: Boolean(
        safeParseArray((tenant as any).serviceAreasJson).length > 0 ||
          brand?.serviceArea ||
          (tenant as any).city,
      ),
      scoreWeight: 15,
      currentValue: (() => {
        const list = safeParseArray((tenant as any).serviceAreasJson);
        if (list.length > 0) return `${list.length} area(s): ${list.slice(0, 3).join(', ')}${list.length > 3 ? '…' : ''}`;
        return brand?.serviceArea || (tenant as any).city || 'Not specified';
      })(),
      recommendation: 'Define up to 20 nearby cities or neighborhoods you serve to rank in the Google Maps Local 3-Pack.',
      actionRequired: 'Add up to 20 local service areas in Manage Profile.',
    },
    {
      id: 'booking_link',
      category: 'Conversion',
      label: 'Dedicated GBP Landing Page / Booking Link',
      passed: Boolean(
        settings.googlePlaceActions?.appointmentUri ||
          settings.bookingLink ||
          (brand as any)?.bookingLink ||
          settings.onlineBookingEnabled === true ||
          (tenant as any).publicProfileEnabled === true
      ),
      scoreWeight: 15,
      currentValue:
        settings.googlePlaceActions?.appointmentUri
          ? 'Synced to Google Appointments button'
          : settings.bookingLink || (brand as any)?.bookingLink
            ? 'Booking link configured'
            : (tenant as any).publicProfileEnabled
              ? 'Dedicated GBP Landing Page active'
              : 'Not configured',
      recommendation: 'Linking a dedicated localized GBP Landing Page and Booking URL on Google Search & Maps converts discovery views directly into bookings.',
      actionRequired: 'Sync your BGOS Booking URL & Landing Page to Google Business Profile.',
    },
    {
      id: 'services_catalog',
      category: 'Catalog',
      label: 'Services with 300-500 Char Localized SEO Descriptions',
      passed: effectiveServicesCount >= 3 && optimizedServiceDescCount >= 2,
      scoreWeight: 10,
      currentValue: `${effectiveServicesCount} service(s) (${optimizedServiceDescCount} with 300-500 char SEO copy)`,
      recommendation: 'Write a 300-500 character description containing your target Search Term + city for each core service.',
      actionRequired: 'Open Services & Local SEO Studio to auto-write 300-500 char descriptions.',
    },
    {
      id: 'fresh_photos',
      category: 'Media Freshness',
      label: 'Media Gallery & Fresh Photos (Min 5)',
      passed: photosCount >= 3,
      scoreWeight: 10,
      currentValue: `${photosCount} photo(s) published/scheduled`,
      recommendation: 'Profiles with 10+ photos get 35% more clicks to their website. Keep fresh with weekly photo uploads.',
      actionRequired: 'Bulk upload photos using the AI Photo Scheduler.',
    },
  ];

  const passedWeight = checks.filter((c) => c.passed).reduce((sum, c) => sum + c.scoreWeight, 0);
  const totalWeight = checks.reduce((sum, c) => sum + c.scoreWeight, 0);
  const score = Math.round((passedWeight / totalWeight) * 100);
  const missingChecks = checks.filter((c) => !c.passed);

  const suspensionShield = analyzeGbpSuspensionRisks({
    name:
      (typeof settings.activeGbpTitle === 'string' && settings.activeGbpTitle.trim()) ||
      brand?.businessName ||
      tenant.name,
    address:
      (typeof settings.activeGbpAddress === 'string' && settings.activeGbpAddress.trim()) ||
      tenant.address ||
      brand?.location ||
      (tenant as any).city,
    phone: tenant.phone || settings.communicationPhone,
    website: effectiveWebsite,
    category:
      (typeof settings.activeGbpCategory === 'string' && settings.activeGbpCategory.trim()) ||
      brand?.industry ||
      (tenant as any).industry,
    openingDate: settings.openingDate,
  });

  return {
    score,
    grade: score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D',
    isFullyOptimized: score === 100,
    checks,
    missingCount: missingChecks.length,
    recommendations: missingChecks.map((m) => m.recommendation),
    connectedToGoogle: Boolean(googleAccount),
    reviewsCount,
    presenceMode: presence.mode,
    websiteSeoScore:
      typeof settings.seoAuditSnapshot?.websiteScore === 'number'
        ? settings.seoAuditSnapshot.websiteScore
        : null,
    suspensionShield,
  };
}
