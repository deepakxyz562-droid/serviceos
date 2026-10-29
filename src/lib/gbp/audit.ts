import { db } from '@/lib/db';

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

  const [googleAccount, reviewsCount, photosCount, servicesCount] = await Promise.all([
    db.socialAccount.findFirst({
      where: { tenantId, platform: 'googlebusiness', isActive: true },
    }),
    db.review.count({ where: { tenantId } }),
    db.socialPost.count({
      where: { tenantId, mediaUrls: { not: '[]' } },
    }),
    db.service.count({ where: { tenantId } }),
  ]);

  const brand = tenant.brandProfile;
  let settings: Record<string, any> = {};
  try {
    settings = JSON.parse(tenant.settingsJson || '{}');
  } catch {}

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
      passed: safeParseArray(brand?.services).length >= 2,
      scoreWeight: 10,
      currentValue: `${safeParseArray(brand?.services).length} services configured`,
      recommendation: 'Add 3-5 secondary categories so Google indexes you for related nearby searches.',
      actionRequired: 'Add secondary service tags in Brand Profile.',
    },
    {
      id: 'optimized_description',
      category: 'SEO Content',
      label: 'SEO-Rich Long Description (Up to 750 Chars)',
      passed: Boolean(brand?.aiGeneratedSummary && brand.aiGeneratedSummary.length >= 250),
      scoreWeight: 15,
      currentValue: brand?.aiGeneratedSummary ? `${brand.aiGeneratedSummary.length} characters` : 'Empty or too short',
      recommendation: 'Google GBP descriptions support up to 750 characters. Include your city name, service specialties, and guarantees.',
      actionRequired: 'Generate an SEO-optimized description with our 1-click AI optimizer.',
    },
    {
      id: 'business_hours',
      category: 'Operations',
      label: 'Complete Operating Hours & Weekend Schedule',
      passed:
        Boolean(settings.businessHours && Object.keys(settings.businessHours).length > 0) ||
        Boolean(settings.operatingHours && Object.keys(settings.operatingHours).length > 0),
      scoreWeight: 10,
      currentValue: settings.businessHours || settings.operatingHours ? 'Operating hours configured' : 'Not configured',
      recommendation: 'Profiles with accurate opening hours receive 42% more direction requests on Google Maps.',
      actionRequired: 'Add your opening hours in Settings → Business Profile so Google can display them.',
    },
    {
      id: 'service_areas',
      category: 'Local Reach',
      label: 'Service Area Radius & Cities',
      passed: Boolean(brand?.serviceArea || (tenant as any).city),
      scoreWeight: 15,
      currentValue: brand?.serviceArea || (tenant as any).city || 'Not specified',
      recommendation: 'Define specific cities or zip codes you serve to rank in the Google Maps Local 3-Pack.',
      actionRequired: 'Add service areas to your brand profile.',
    },
    {
      id: 'booking_link',
      category: 'Conversion',
      label: 'Instant Appointment / Direct Booking Link',
      passed: Boolean(settings.bookingLink || (brand as any)?.bookingLink || settings.onlineBookingEnabled === true),
      scoreWeight: 15,
      currentValue: settings.bookingLink || (brand as any)?.bookingLink ? 'Booking link configured' : 'Not configured',
      recommendation: 'Direct appointment links turn Maps searchers into booked revenue immediately.',
      actionRequired: 'Add your booking link in Settings → Business Profile, then sync it to your GBP profile.',
    },
    {
      id: 'services_catalog',
      category: 'Catalog',
      label: 'Core Services Listed with Descriptions',
      passed: servicesCount >= 3,
      scoreWeight: 10,
      currentValue: `${servicesCount} service(s) configured`,
      recommendation: 'List all services individually so Google displays service chips directly on mobile search results.',
      actionRequired: 'Add at least 3 distinct services in Services Catalog.',
    },
    {
      id: 'fresh_photos',
      category: 'Media Freshness',
      label: 'Media Gallery & Fresh Photos (Min 5)',
      passed: photosCount >= 3,
      scoreWeight: 10,
      currentValue: `${photosCount} photo(s) published/scheduled`,
      recommendation: 'Profiles with 10+ photos get 35% more clicks to their website. Keep fresh with weekly photo uploads.',
      actionRequired: 'Bulk upload photos using the AI Photo Drip Scheduler.',
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
  };
}
