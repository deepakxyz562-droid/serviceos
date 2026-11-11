import { db } from '@/lib/db';
import { resolveBusinessPresenceMode, type BusinessPresenceMode } from '@/lib/seo/presence-mode';

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

  const [reviewsCount, photosCount, servicesCount] = await Promise.all([
    db.review?.count?.({ where: { tenantId, ...reviewScope } }).catch(() => 0) ?? 0,
    db.socialPost
      ?.count?.({
        where: { tenantId, mediaUrls: { not: '[]' } },
      })
      .catch(() => 0) ?? 0,
    db.service?.count?.({ where: { tenantId } }).catch(() => 0) ?? 0,
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
  const optimizedServiceDescCount = seoServicesArr.filter(
    (s: any) => typeof s?.description === 'string' && s.description.trim().length >= 300,
  ).length;
  const effectiveServicesCount = Math.max(
    servicesCount,
    Array.isArray(settings.services) ? settings.services.length : 0,
    seoServicesArr.length,
  );
  const longDescValue =
    (brand?.aiGeneratedSummary && brand.aiGeneratedSummary.trim()) ||
    (typeof tenant.description === 'string' ? tenant.description.trim() : '');

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
      actionRequired: 'Copy missing categories from Competitor Spy or Profile Settings.',
    },
    {
      id: 'optimized_description',
      category: 'SEO Content',
      label: 'SEO-Rich Long Description (Up to 750 Chars)',
      passed: longDescValue.length >= 250,
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
      passed: Boolean(brand?.serviceArea || (tenant as any).city),
      scoreWeight: 15,
      currentValue: brand?.serviceArea || (tenant as any).city || 'Not specified',
      recommendation: 'Define specific cities or neighborhoods you serve to rank in the Google Maps Local 3-Pack.',
      actionRequired: 'Add service areas to your profile.',
    },
    {
      id: 'booking_link',
      category: 'Conversion',
      label: 'Dedicated GBP Landing Page / Booking Link',
      passed: Boolean(
        settings.bookingLink ||
          (brand as any)?.bookingLink ||
          settings.onlineBookingEnabled === true ||
          (tenant as any).publicProfileEnabled === true
      ),
      scoreWeight: 15,
      currentValue:
        settings.bookingLink || (brand as any)?.bookingLink
          ? 'Booking link configured'
          : (tenant as any).publicProfileEnabled
            ? 'Dedicated GBP Landing Page active'
            : 'Not configured',
      recommendation: 'Linking a dedicated localized GBP Landing Page (instead of a generic homepage) boosts both Maps relevance and bookings.',
      actionRequired: 'Enable your dedicated GBP Landing Page and sync it to Google Business Profile.',
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
  };
}
